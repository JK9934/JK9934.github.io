import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { initCamera, initRenderer, initOrbitControls, initDefaultDirectionalLighting } from "./util.js";

// ============================================================
// 1. 파일 경로 설정
// 캐릭터 FBX와 애니메이션 FBX 파일의 위치만 모아둔 구역입니다.
// ============================================================

const characterFolder = "character/";
const animationFolder = "animation/";
const characterFiles = {
  yoo: `${characterFolder}유재석.fbx`, ma: `${characterFolder}마동석.fbx`, kim: `${characterFolder}김동현.fbx`,
  son: `${characterFolder}손흥민.fbx`, eren: `${characterFolder}에렌.fbx`, zombie: `${characterFolder}좀비.fbx`,
};
const animationFiles = {
  walk: `${animationFolder}walking.fbx`, death: `${animationFolder}death.fbx`, victory: `${animationFolder}victory.fbx`,
  yooPunch: `${animationFolder}yoo_punch.fbx`, maPunch1: `${animationFolder}ma_punch_1.fbx`, maPunch2: `${animationFolder}ma_punch_2.fbx`,
  kimPunch: `${animationFolder}kim_punch.fbx`, kimKick1: `${animationFolder}kim_kick_1.fbx`, kimKick2: `${animationFolder}kim_kick_2.fbx`,
  sonKick1: `${animationFolder}son_kick_1.fbx`, sonKick2: `${animationFolder}son_kick_2.fbx`, erenPunch: `${animationFolder}eren_attack.fbx`,
  zombieRun: `${animationFolder}jombie_running.fbx`, zombieBite: `${animationFolder}jombie_bite.fbx`,
};
const damageLeadSecondsByAnimation = { yooPunch: 0, maPunch1: 1.5, maPunch2: 1, kimPunch: 0.5, kimKick1: 0.5, kimKick2: 0.5, sonKick1: 0.5, sonKick2: 0.5, erenPunch: 3, zombieBite: 2.5 };

// ============================================================
// 2. 캐릭터 능력치 설정
// 체력, 방어력, 이동 속도, 공격 애니메이션, 공격 범위를 이곳에서 조정합니다.
// ============================================================

const characterConfigs = {
  yoo: { name: "유재석", model: characterFiles.yoo, scale: 0.077, health: 100, defense: 5, attackSpeed: 1, moveSpeed: 10, moveAnimation: "walk", attacks: { punch: { animations: ["yooPunch"], damage: 10, range: 5, cooldown: 0.5, knockback: 0 } } },
  ma: { name: "마동석", model: characterFiles.ma, scale: 0.091, health: 300, defense: 30, attackSpeed: 0.8, moveSpeed: 10, moveAnimation: "walk", attacks: { punch: { animations: ["maPunch1", "maPunch2"], damage: 60, range: 6, cooldown: 0.4, knockback: 12 } } },
  kim: { name: "김동현", model: characterFiles.kim, scale: 0.085, health: 180, defense: 15, attackSpeed: 2, moveSpeed: 15, moveAnimation: "walk", attacks: { punch: { animations: ["kimPunch"], damage: 25, range: 6, cooldown: 0.4, knockback: 5 }, kick: { animations: ["kimKick1", "kimKick2"], damage: 40, range: 9, cooldown: 0.5, knockback: 7 } } },
  son: { name: "손흥민", model: characterFiles.son, scale: 0.081, health: 130, defense: 10, attackSpeed: 2.2, moveSpeed: 18, moveAnimation: "walk", attacks: { kick: { animations: ["sonKick1", "sonKick2"], damage: 30, range: 9, cooldown: 0.3, knockback: 6 } } },
  eren: { name: "에렌 예거", model: characterFiles.eren, scale: 0.2, health: 2000, defense: 80, attackSpeed: 0.5, moveSpeed: 8, moveAnimation: "walk", knockbackResist: 1, boss: true, attacks: { punch: { animations: ["erenPunch"], damage: 150, range: 10, cooldown: 1, knockback: 15, aoe: { radius: 16 } } } },
  zombie: { name: "좀비", model: characterFiles.zombie, scale: 0.083, health: 150, defense: 8, attackSpeed: 1.5, moveSpeed: 20, moveAnimation: "zombieRun", attacks: { punch: { animations: ["zombieBite"], damage: 30, range: 4, cooldown: 0.5, knockback: 0 } } },
};

// ============================================================
// 3. Three.js 화면 구성
// 장면, 카메라, 조명, 배경, 바닥, 렌더링 상태를 준비합니다.
// ============================================================

const scene = new THREE.Scene();
const camera = initCamera();
camera.position.set(0, 50, 120);

const renderer = initRenderer();
window.addEventListener("resize", resizeRenderer);
function resizeRenderer() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }

const orbitControls = initOrbitControls(camera, renderer);
orbitControls.enableDamping = true;

// ----- 카메라 캐릭터 고정(추적/1인칭) -----
// 캐릭터를 클릭하면 카메라가 따라가고(3인칭), V 키로 1인칭과 전환, 빈 곳 클릭 또는 ESC로 해제합니다.
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const followTarget = new THREE.Vector3();
const followShift = new THREE.Vector3();
const eyeProbe = new THREE.Vector3();
let lockedFighter = null;
let firstPerson = false;
let pointerDownAt = null;
function findFighter(object) { while (object) { if (object.userData.fighter) return object.userData.fighter; object = object.parent; } return null; }
function updateHint() {
  if (!lockedFighter) { interfaceElements.hintText.textContent = "캐릭터를 클릭하면 카메라가 따라갑니다."; return; }
  interfaceElements.hintText.textContent = firstPerson
    ? `🔒 ${lockedFighter.config.name} 1인칭 — V: 3인칭, ESC: 해제`
    : `🔒 ${lockedFighter.config.name} 추적(3인칭) — V: 1인칭, 빈 곳 클릭/ESC: 해제`;
}
function lockCamera(fighter) {
  firstPerson = firstPerson && lockedFighter !== null; // 1인칭으로 보던 중 다른 캐릭터를 클릭하면 그 캐릭터 1인칭으로 이어 봅니다.
  lockedFighter = fighter; orbitControls.enabled = !firstPerson; updateHint();
}
function unlockCamera() {
  if (!lockedFighter) return;
  lockedFighter = null; firstPerson = false; orbitControls.enabled = true; updateHint();
}
function toggleFirstPerson() {
  if (!lockedFighter) return;
  firstPerson = !firstPerson; orbitControls.enabled = !firstPerson;
  if (!firstPerson) placeBehindFighter(lockedFighter); // 3인칭 복귀 시 캐릭터 뒤쪽으로 카메라를 재배치
  updateHint();
}
// 캐릭터 등 뒤 위쪽에 카메라를 놓아 궤도(3인칭) 시점을 자연스럽게 시작/복귀합니다.
function placeBehindFighter(fighter) {
  const ry = fighter.root.rotation.y, position = fighter.root.position, pivotY = fighter.healthBarHeight * 0.45;
  orbitControls.target.set(position.x, pivotY, position.z);
  camera.position.set(position.x - Math.sin(ry) * 32, pivotY + 22, position.z - Math.cos(ry) * 32);
}
renderer.domElement.addEventListener("pointerdown", event => { pointerDownAt = { x: event.clientX, y: event.clientY }; });
renderer.domElement.addEventListener("pointerup", event => {
  if (!pointerDownAt) return;
  const dragged = Math.hypot(event.clientX - pointerDownAt.x, event.clientY - pointerDownAt.y);
  pointerDownAt = null;
  if (dragged > 6) return; // 궤도 회전 드래그는 선택으로 보지 않습니다.
  pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  for (const hit of raycaster.intersectObjects(battleGroup.children, true)) {
    const fighter = findFighter(hit.object);
    if (fighter) return lockCamera(fighter);
  }
  unlockCamera();
});
window.addEventListener("keydown", event => {
  if (event.key === "Escape") unlockCamera();
  else if (event.key === "v" || event.key === "V" || event.key === "ㅍ") toggleFirstPerson();
});

const clock = new THREE.Clock();
const groundProbe = new THREE.Vector3();
const knockbackProbe = new THREE.Vector3();
// 프레임마다 1회만 갱신하는 팀 캐시(생존자 목록과 중심점). 유닛별 전체 배열 순회를 없앱니다.
const teamCaches = [{ living: [], center: new THREE.Vector3() }, { living: [], center: new THREE.Vector3() }];
// 겹침 방지용 공간 해시 그리드. 프레임당 1회 구성하고 3x3 이웃 셀만 검사해 O(N)으로 분리합니다.
const collisionGrid = new Map();
const collisionCellSize = 9;

const loader = new FBXLoader();
const loadedAssets = new Map();
const activeFighters = [];
const battleGroup = new THREE.Group();
let battleRunning = false, winningTeam = null, winnerName = null;

initDefaultDirectionalLighting(scene, new THREE.Vector3(-65, 95, 55));
scene.add(new THREE.HemisphereLight(0xffffff, 0x56616f, 1.1), battleGroup);
new THREE.TextureLoader().load("background.png", texture => { texture.colorSpace = THREE.SRGBColorSpace; scene.background = texture; });

// 단순한 절차적 텍스처: 바닥색 + 미세 노이즈 + 타일 격자선을 캔버스에 그려 반복(Repeat)으로 깔아둡니다.
function makeGroundTexture() {
  const size = 256, canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#15315a"; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2200; i++) { const v = 30 + Math.random() * 45; ctx.fillStyle = `rgba(${v},${v + 22},${v + 55},0.22)`; ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2); }
  ctx.strokeStyle = "rgba(120,165,215,0.32)"; ctx.lineWidth = 2; ctx.strokeRect(1, 1, size - 2, size - 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(40, 40); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 96), new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness: 0.95, metalness: 0 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ============================================================
// 3-2. 전투 이펙트(타격 스파크 / 충격파 링)
// 풀에서 객체를 재사용해 할당·GC를 피합니다(CPU 절약). 데미지 적중 순간에만 잠깐 보였다 사라집니다.
// ============================================================

function makeImpactTexture() {
  const size = 64, canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)"); gradient.addColorStop(0.3, "rgba(255,225,140,0.9)"); gradient.addColorStop(1, "rgba(255,120,40,0)");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const impactTexture = makeImpactTexture();
const impactPool = [], activeImpacts = [];
function spawnImpact(x, y, z, color) {
  let sprite = impactPool.pop();
  if (!sprite) sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: impactTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sprite.material.color.set(color); sprite.material.opacity = 1;
  sprite.position.set(x, y, z); sprite.scale.setScalar(3); sprite.userData.age = 0;
  scene.add(sprite); activeImpacts.push(sprite);
}
const shockwaveGeometry = new THREE.RingGeometry(0.55, 1, 36);
const shockwavePool = [], activeShockwaves = [];
function spawnShockwave(x, z, color, peakScale = 26) {
  let ring = shockwavePool.pop();
  if (!ring) { ring = new THREE.Mesh(shockwaveGeometry, new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; }
  ring.material.color.set(color); ring.material.opacity = 0.85;
  ring.position.set(x, 0.3, z); ring.scale.setScalar(2); ring.userData.age = 0; ring.userData.peak = peakScale;
  scene.add(ring); activeShockwaves.push(ring);
}
// 데미지 숫자: 값별로 캔버스 텍스처를 캐싱(매치업당 데미지 값 종류가 적음)하고 스프라이트는 풀 재사용 → 많이 떠도 부담이 거의 없습니다.
const damageTextures = new Map();
function getDamageTexture(value) {
  let texture = damageTextures.get(value);
  if (!texture) {
    const text = String(value), height = 48, canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
    ctx.font = "bold 38px system-ui, sans-serif";
    canvas.width = Math.ceil(ctx.measureText(text).width) + 14; canvas.height = height; // 자릿수에 맞춰 폭 조정
    ctx.font = "bold 38px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.strokeText(text, canvas.width / 2, height / 2); // 검은 외곽선으로 가독성 확보
    ctx.fillStyle = "#ffffff"; ctx.fillText(text, canvas.width / 2, height / 2);
    texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.userData = { aspect: canvas.width / height };
    damageTextures.set(value, texture);
  }
  return texture;
}
const damageNumberPool = [], activeDamageNumbers = [];
function spawnDamageNumber(x, y, z, value) {
  const texture = getDamageTexture(value), big = value >= 50, scale = big ? 6.5 : 4.2;
  let sprite = damageNumberPool.pop();
  if (!sprite) sprite = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, depthWrite: false, transparent: true }));
  sprite.material.map = texture; sprite.material.color.set(big ? 0xffb454 : 0xffffff); sprite.material.opacity = 1; // 흰색 텍스처를 큰 데미지엔 주황으로 틴트
  sprite.userData.age = 0; sprite.userData.scale = scale; sprite.userData.aspect = texture.userData.aspect;
  sprite.scale.set(scale * texture.userData.aspect, scale, 1);
  sprite.position.set(x + (Math.random() - 0.5) * 2, y, z + (Math.random() - 0.5) * 2); // 살짝 흩어 겹침 완화
  scene.add(sprite); activeDamageNumbers.push(sprite);
}
function updateEffects(deltaSeconds) {
  for (let i = activeImpacts.length - 1; i >= 0; i--) {
    const sprite = activeImpacts[i], age = (sprite.userData.age += deltaSeconds), life = 0.3;
    if (age >= life) { scene.remove(sprite); activeImpacts.splice(i, 1); impactPool.push(sprite); continue; }
    const t = age / life; sprite.scale.setScalar(3 + t * 11); sprite.material.opacity = 1 - t;
  }
  for (let i = activeShockwaves.length - 1; i >= 0; i--) {
    const ring = activeShockwaves[i], age = (ring.userData.age += deltaSeconds), life = 0.5;
    if (age >= life) { scene.remove(ring); activeShockwaves.splice(i, 1); shockwavePool.push(ring); continue; }
    const t = age / life; ring.scale.setScalar(2 + t * (ring.userData.peak - 2)); ring.material.opacity = 0.85 * (1 - t);
  }
  for (let i = activeDamageNumbers.length - 1; i >= 0; i--) {
    const sprite = activeDamageNumbers[i], age = (sprite.userData.age += deltaSeconds), life = 0.85;
    if (age >= life) { scene.remove(sprite); activeDamageNumbers.splice(i, 1); damageNumberPool.push(sprite); continue; }
    const t = age / life;
    sprite.position.y += deltaSeconds * 11; // 위로 떠오름
    const pop = t < 0.16 ? 0.7 + 0.3 * (t / 0.16) : 1, s = sprite.userData.scale * pop; // 처음에 살짝 커지는 팝
    sprite.scale.set(s * sprite.userData.aspect, s, 1);
    sprite.material.opacity = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35; // 마지막 35%에 페이드아웃
  }
}

// ============================================================
// 4. HTML UI 연결
// 선택 박스, 인원 입력, 시작 버튼, 상태 문구를 코드와 연결합니다.
// ============================================================

const interfaceElements = {
  firstTeamType: document.getElementById("a-type"), firstTeamCount: document.getElementById("a-count"),
  secondTeamType: document.getElementById("b-type"), secondTeamCount: document.getElementById("b-count"),
  startButton: document.getElementById("start"), statusText: document.getElementById("status"), hintText: document.getElementById("hint"),
};
Object.entries(characterConfigs).forEach(([key, config]) => {
  interfaceElements.firstTeamType.add(new Option(config.name, key));
  interfaceElements.secondTeamType.add(new Option(config.name, key));
});
interfaceElements.firstTeamType.value = "ma";
interfaceElements.secondTeamType.value = "kim";
interfaceElements.startButton.onclick = startBattle;


// ============================================================
// 5. 파일 로딩 함수
// 한 번 불러온 FBX는 loadedAssets에 저장해서 다시 다운로드하지 않습니다.
// ============================================================

function loadAsset(path) {
  if (!loadedAssets.has(path)) loadedAssets.set(path, new Promise((resolve, reject) => loader.load(encodeURI(path), resolve, undefined, reject)));
  return loadedAssets.get(path);
}
async function loadAnimationClip(animationKey) {
  const asset = await loadAsset(animationFiles[animationKey]);
  return asset.animations[0];
}
// 정제(트랙 제거/보정)된 클립을 애니메이션·모드별로 1회만 생성해 캐싱합니다. 불변 데이터이므로 모든 유닛이 공유합니다.
const cleanedClips = new Map();
async function loadCleanClip(animationKey, positionMode) {
  const cacheKey = animationKey + "|" + positionMode;
  if (!cleanedClips.has(cacheKey)) cleanedClips.set(cacheKey, cleanAnimationClip(await loadAnimationClip(animationKey), positionMode));
  return cleanedClips.get(cacheKey);
}

// ============================================================
// 6. 애니메이션 준비 함수
// 위치 이동 트랙 제거, 사망 애니메이션 위치 보정, 반복 여부 설정을 담당합니다.
// ============================================================

function cleanAnimationClip(sourceClip, positionMode = "strip") {
  if (positionMode === "strip") return new THREE.AnimationClip(sourceClip.name, sourceClip.duration, sourceClip.tracks.filter(track => !track.name.endsWith(".position")));
  const tracks = sourceClip.tracks.map((track) => {
    if (positionMode !== "relative" || !track.name.endsWith(".position")) return track.clone();
    const clonedTrack = track.clone(), values = clonedTrack.values, baseHeight = values[1] || 0;
    for (let index = 0; index < values.length; index += 3) { values[index] = 0; values[index + 1] -= baseHeight; values[index + 2] = 0; }
    return clonedTrack;
  });
  return new THREE.AnimationClip(sourceClip.name, sourceClip.duration, tracks);
}
function configureAction(action, shouldLoop) {
  action.enabled = true; action.loop = shouldLoop ? THREE.LoopRepeat : THREE.LoopOnce; action.clampWhenFinished = !shouldLoop;
  return action.setEffectiveWeight(1);
}

// ============================================================
// 7. 모델과 체력바 생성
// 캐릭터 크기 보정, 그림자 설정, 머리 위 체력바 생성을 담당합니다.
// ============================================================

// 동일 종류는 지오메트리가 같으므로 스케일/바닥 오프셋을 1회만 계산해 캐싱합니다(유닛마다 Box3 2회 계산 제거).
const modelMetrics = new Map();
function prepareModel(model, characterKey, targetHeight) {
  let metrics = modelMetrics.get(characterKey);
  if (!metrics) {
    model.position.set(0, 0, 0); model.scale.setScalar(1); model.updateMatrixWorld(true);
    const scale = targetHeight / new THREE.Box3().setFromObject(model).getSize(groundProbe).y;
    model.scale.setScalar(scale); model.updateMatrixWorld(true);
    metrics = { scale, offsetY: -new THREE.Box3().setFromObject(model).min.y };
    modelMetrics.set(characterKey, metrics);
  }
  model.scale.setScalar(metrics.scale); model.position.set(0, metrics.offsetY, 0);
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true; object.receiveShadow = true;
  });
}
// 보스(에렌) 전용 머리 위 체력바. 어두운 배경(깎인 체력) + 빨강 채움(남은 체력). depthTest:false로 항상 위에 보임.
// 주의: 두 층 모두 불투명 + renderOrder로 그리기 순서 고정. (배경을 반투명으로 두면 불투명 채움보다 나중에 그려져 빨강 위에 검정이 덧칠돼 칙칙해짐)
function createBossHealthBar() {
  const group = new THREE.Group(), width = 18, height = 1.4;
  const background = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.9, height + 0.6), new THREE.MeshBasicMaterial({ color: 0x0a0a0a, depthTest: false }));
  background.renderOrder = 1;
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: 0xe23b2e, depthTest: false }));
  fill.position.z = 0.02; fill.renderOrder = 2;
  group.add(background, fill); group.fill = fill; group.fillWidth = width;
  return group;
}
// ============================================================
// 8. 전투 캐릭터 생성
// 모델, 믹서, 애니메이션 액션을 묶어 하나의 fighter 객체로 만듭니다.
// ============================================================

async function createFighter(characterKey, team, position) {
  const config = characterConfigs[characterKey], model = cloneSkeleton(await loadAsset(config.model));
  const root = new THREE.Group(), mixer = new THREE.AnimationMixer(model), actions = {};
  prepareModel(model, characterKey, 180 * config.scale); root.add(model); placeFighter(root, team, position); battleGroup.add(root);
  let headBone = null; // 1인칭 카메라를 머리 위치에 두기 위한 본(없으면 root 기준으로 대체)
  model.traverse(object => { if (object.isBone && !headBone && /head$/i.test(object.name)) headBone = object; });
  await addAction(actions, mixer, "move", config.moveAnimation, true);
  await Promise.all([addAction(actions, mixer, "death", "death", false, "relative"), addAction(actions, mixer, "victory", "victory", true)]);
  for (const [attackName, attack] of Object.entries(config.attacks)) for (const animationKey of attack.animations) await addAction(actions, mixer, attackName, animationKey, false, "strip", animationKey);
  // 유닛마다 다른 난수 성향을 부여해 같은 종류라도 똑같이 움직이지 않게 합니다.
  const fighter = { config, team, root, mixer, actions, health: config.health, maxHealth: config.health, alive: true, grounded: false, groundOffset: 0, state: "idle", target: null, velocity: new THREE.Vector3(), currentAction: null, cooldown: Math.random(), attackTimer: 0, attackApplied: false, activeAttackName: null, activeAttackKey: null, activeAttack: null, deathRotation: root.rotation.y, healthBarHeight: 180 * config.scale + 2.5,
    radius: 180 * config.scale * 0.16, speedScale: 0.82 + Math.random() * 0.36, stopJitter: Math.random(), centerBias: 0.18 + Math.random() * 0.2, reactionTimer: Math.random() * 0.6, wanderPhase: Math.random() * Math.PI * 2, wanderSpeed: 1.3 + Math.random() * 1.4, headBone,
    knockbackResist: config.knockbackResist || 0, decisionTimer: Math.random() * 0.15, planDirX: 0, planDirZ: 0, planApproach: 0, moving: false, retargetAt: 0, sidePref: Math.random() < 0.5 ? -1 : 1, healthBar: null };
  if (config.boss) { fighter.healthBar = createBossHealthBar(); battleGroup.add(fighter.healthBar); } // 보스(에렌)만 체력바 표시. battleGroup에 넣어 새 전투 시작 시 함께 정리됨.
  root.userData.fighter = fighter; // 클릭 레이캐스트가 이 유닛을 찾을 수 있도록 역참조를 답니다.
  playAction(fighter, "move", 0); // idle 클립이 없으므로 walk를 제자리 재생해 바인드(T) 포즈 노출을 막습니다.
  fighter.mixer.update(Math.random() * fighter.currentAction.getClip().duration); // 시작 프레임을 분산해 모두 같은 보폭으로 멈춰 있지 않게 합니다.
  return fighter;
}
// 일자 대형 대신, 각 팀을 두 그룹으로 나눠 서로 떨어진 두 구역(z축으로 분리)에 무작위로 흩뿌립니다. 구역 위치도 매번 살짝 달라집니다. 거부 샘플링으로 최소 간격 확보.
function buildSpawnPositions(team, count) {
  const side = team ? 1 : -1, minGapSq = 6 * 6;
  const groupCounts = [Math.ceil(count / 2), Math.floor(count / 2)]; // 절반씩 두 그룹으로 분할
  const positions = [];
  groupCounts.forEach((groupCount, group) => {
    if (groupCount <= 0) return;
    const columns = Math.ceil(Math.sqrt(groupCount)), span = 6 + columns * 4;
    const baseX = 28 + Math.random() * 12; // 진영 깊이 약간 랜덤
    const centerZ = (group === 0 ? 1 : -1) * (span * 0.5 + 14) + (Math.random() - 0.5) * 16; // 두 구역을 z로 분리 + 흔들림
    for (let i = 0; i < groupCount; i++) {
      let x = 0, z = 0;
      for (let attempt = 0; attempt < 18; attempt++) {
        x = side * (baseX + Math.random() * span); z = centerZ + (Math.random() - 0.5) * span;
        if (positions.every(p => (p.x - x) ** 2 + (p.z - z) ** 2 >= minGapSq)) break;
      }
      positions.push({ x, z });
    }
  });
  return positions;
}
function placeFighter(root, team, position) {
  root.position.set(position.x, 0, position.z);
  root.rotation.y = (team ? -Math.PI / 2 : Math.PI / 2) + (Math.random() - 0.5) * 0.6;
}
async function addAction(actions, mixer, actionName, animationKey, shouldLoop, positionMode = "strip", fileKey = null) {
  const action = configureAction(mixer.clipAction(await loadCleanClip(animationKey, positionMode)), shouldLoop);
  action.fileKey = fileKey; actions[actionName] = actions[actionName] ? [].concat(actions[actionName], action) : action;
}

// ============================================================
// 9. 애니메이션 재생 제어
// 현재 동작에서 다음 동작으로 전환하거나 동작을 멈춥니다.
// ============================================================

function playAction(fighter, actionOrName, fadeSeconds = 0.14) {
  const nextAction = typeof actionOrName === "string" ? fighter.actions[actionOrName] : actionOrName;
  if (fighter.currentAction === nextAction) { if (nextAction.loop === THREE.LoopRepeat) return; nextAction.reset().setEffectiveWeight(1).play(); return; }
  const previousAction = fighter.currentAction;
  fighter.currentAction = nextAction; nextAction.reset().setEffectiveWeight(1).play();
  previousAction ? previousAction.crossFadeTo(nextAction, fadeSeconds, false) : nextAction.fadeIn(fadeSeconds);
}
function distanceBetween(firstFighter, secondFighter) { return Math.hypot(firstFighter.root.position.x - secondFighter.root.position.x, firstFighter.root.position.z - secondFighter.root.position.z); }
function shouldUseCloseKickDistance(firstFighter, secondFighter) {
  const firstName = firstFighter.config.name, secondName = secondFighter.config.name;
  return (firstName === "김동현" && secondName === "손흥민") || (firstName === "손흥민" && secondName === "김동현");
}
// 종류별로 한 번만 공격 이름 목록과 최대 사거리를 계산해 캐싱합니다(매 프레임 Object.keys/스프레드 제거).
function combatProfile(config) {
  if (!config.profile) {
    const names = Object.keys(config.attacks);
    config.profile = { names, maxRange: Math.max(...names.map(name => config.attacks[name].range)) };
  }
  return config.profile;
}

// ============================================================
// 10. 매 프레임 전투 상태 업데이트
// 위치, 체력바, 승리 동작, 공격 중 상태, 타깃 선택을 순서대로 처리합니다.
// ============================================================

// 보스 체력바를 머리 위에 띄우고 카메라를 향하게(스크린 정렬 빌보드) + 남은 체력 비율로 채움 갱신.
function updateHealthBar(fighter) {
  const bar = fighter.healthBar, ratio = Math.max(0, fighter.health / fighter.maxHealth);
  bar.position.copy(fighter.root.position).setY(fighter.healthBarHeight + 4);
  bar.quaternion.copy(camera.quaternion);
  bar.fill.scale.x = ratio; bar.fill.position.x = -(bar.fillWidth / 2) * (1 - ratio);
}
function refreshTeamCache() {
  for (const cache of teamCaches) { cache.living.length = 0; cache.center.set(0, 0, 0); }
  for (let index = 0; index < activeFighters.length; index++) {
    const fighter = activeFighters[index];
    if (!fighter.alive) continue;
    const cache = teamCaches[fighter.team];
    cache.living.push(fighter); cache.center.add(fighter.root.position);
  }
  for (const cache of teamCaches) if (cache.living.length) cache.center.multiplyScalar(1 / cache.living.length);
}
// 생존 유닛을 공간 해시에 1회만 담아둡니다. 이동 단계(회피 조향)와 분리 단계가 같은 그리드를 공유합니다.
function buildCollisionGrid() {
  collisionGrid.clear();
  for (const cache of teamCaches) for (const fighter of cache.living) {
    const key = ((fighter.root.position.x / collisionCellSize) | 0) + "," + ((fighter.root.position.z / collisionCellSize) | 0);
    const bucket = collisionGrid.get(key);
    if (bucket) bucket.push(fighter); else collisionGrid.set(key, [fighter]);
  }
}
// 겹친 쌍을 서로 밀어내 캐릭터가 포개지지 않게 합니다(매 프레임).
function resolveSeparation() {
  for (const cache of teamCaches) for (const fighter of cache.living) pushApart(fighter);
}
function pushApart(fighter) {
  const px = fighter.root.position.x, pz = fighter.root.position.z;
  const cellX = (px / collisionCellSize) | 0, cellZ = (pz / collisionCellSize) | 0;
  let offsetX = 0, offsetZ = 0;
  for (let gx = cellX - 1; gx <= cellX + 1; gx++) for (let gz = cellZ - 1; gz <= cellZ + 1; gz++) {
    const bucket = collisionGrid.get(gx + "," + gz);
    if (!bucket) continue;
    for (let i = 0; i < bucket.length; i++) {
      const other = bucket[i];
      if (other === fighter) continue;
      const dx = px - other.root.position.x, dz = pz - other.root.position.z, minDist = fighter.radius + other.radius;
      const distSq = dx * dx + dz * dz;
      if (distSq === 0) { offsetX += Math.random() - 0.5; offsetZ += Math.random() - 0.5; continue; } // 완전히 겹친 경우 무작위로 분리
      if (distSq >= minDist * minDist) continue;
      const overlap = (minDist - Math.sqrt(distSq)) / Math.sqrt(distSq);
      offsetX += dx * overlap; offsetZ += dz * overlap;
    }
  }
  // 넉백 면역 유닛(에렌)은 군중 분리에도 안 밀리도록 변위를 줄입니다(질량이 무거운 것처럼). 주변 적은 각자 비켜나므로 겹침은 그대로 해소됩니다.
  if (offsetX || offsetZ) { const m = 0.5 * (1 - fighter.knockbackResist); fighter.root.position.x += offsetX * m; fighter.root.position.z += offsetZ * m; }
}
function updateFighter(fighter, deltaSeconds) {
  if (!fighter.alive) {
    if (fighter.grounded) return; // 바닥에 안착한 시체는 더 이상 갱신하지 않습니다(스키닝/연산 제거).
    fighter.mixer.update(deltaSeconds);
    fighter.root.position.addScaledVector(fighter.velocity, deltaSeconds); fighter.velocity.multiplyScalar(1 - deltaSeconds * 4.2);
    fighter.root.rotation.y = fighter.deathRotation; groundDeadFighter(fighter);
    return;
  }
  fighter.mixer.update(deltaSeconds);
  if (fighter.healthBar) updateHealthBar(fighter); // 보스만 보유. 위치·체력 추적은 매 프레임.
  fighter.root.position.addScaledVector(fighter.velocity, deltaSeconds); fighter.velocity.multiplyScalar(1 - deltaSeconds * 4.2);
  if (!battleRunning) { if (fighter.team === winningTeam && fighter.currentAction !== fighter.actions.victory) playAction(fighter, "victory", 0.18); return; }
  if (fighter.reactionTimer > 0) { fighter.reactionTimer -= deltaSeconds; return; } // 교전 시작 시점을 유닛마다 분산
  fighter.cooldown -= deltaSeconds;
  if (fighter.state === "attack") return updateAttack(fighter, deltaSeconds);
  // 무거운 판단(타깃 선정·회피 조향·공격 결정)은 매 프레임이 아니라 주기적으로만. 사이 프레임은 캐시된 계획대로 이동·회전만 해 부드러움은 유지하면서 CPU를 아낍니다.
  fighter.decisionTimer -= deltaSeconds;
  if (fighter.decisionTimer <= 0) { fighter.decisionTimer = 0.1 + Math.random() * 0.12; planCombat(fighter); }
  if (!fighter.target) return;
  turnTowardTarget(fighter, deltaSeconds);
  if (fighter.moving) advanceAlongPlan(fighter, deltaSeconds);
}
function groundDeadFighter(fighter) {
  if (!fighter.grounded) {
    fighter.root.position.y = 0; fighter.root.updateMatrixWorld(true);
    let lowest = Infinity;
    fighter.root.traverse(object => { if (object.isBone) { object.getWorldPosition(groundProbe); if (groundProbe.y < lowest) lowest = groundProbe.y; } });
    fighter.groundOffset = Number.isFinite(lowest) ? -lowest : 0;
    const death = fighter.actions.death;
    if (death && death.time >= death.getClip().duration - 1e-3) fighter.grounded = true;
  }
  fighter.root.position.y = fighter.groundOffset;
}

// ============================================================
// 11. 공격 판단과 이동 판단
// 공격 애니메이션의 데미지 시점, 가장 가까운 적 선택, 접근/공격 결정을 처리합니다.
// ============================================================

function updateAttack(fighter, deltaSeconds) {
  fighter.attackTimer += deltaSeconds;
  const duration = fighter.currentAction.getClip().duration, leadSeconds = damageLeadSecondsByAnimation[fighter.activeAttackKey];
  const damageTime = leadSeconds > 0 ? duration - leadSeconds : duration * 0.98;
  const actionTime = fighter.currentAction.time;
  if (!fighter.attackApplied && actionTime >= damageTime && fighter.target.alive) fighter.attackApplied = applyAttackDamage(fighter, fighter.target);
  if (actionTime >= duration * 0.98) { fighter.state = "combat"; fighter.cooldown = 0; fighter.decisionTimer = 0; playAction(fighter, "move", 0.12); } // 공격이 끝나면 다음 프레임에 곧바로 재판단(연속 공격 반응성 유지)
}
// 점수 = 거리 × (0.5 + 0.5·체력비율). 가까울수록·체력 낮을수록 점수가 낮아 우선 선택됩니다(거리·잔여 체력 가중).
// 한 번의 O(적군 수) 순회로 최적 후보와 현재 타깃 점수를 함께 구하고(무할당), 깜빡임 방지를 위한 히스테리시스를 적용합니다.
function selectBestTarget(fighter) {
  const enemies = teamCaches[fighter.team ? 0 : 1].living;
  const current = fighter.target && fighter.target.alive ? fighter.target : null;
  const px = fighter.root.position.x, pz = fighter.root.position.z;
  let best = null, bestScore = Infinity, currentScore = Infinity;
  for (let index = 0; index < enemies.length; index++) {
    const enemy = enemies[index];
    const dx = px - enemy.root.position.x, dz = pz - enemy.root.position.z;
    const score = Math.sqrt(dx * dx + dz * dz) * (0.5 + 0.5 * (enemy.health / enemy.maxHealth));
    if (score < bestScore) { bestScore = score; best = enemy; }
    if (enemy === current) currentScore = score;
  }
  // 현재 타깃이 살아있으면, 새 후보가 20% 넘게 더 좋을 때만 갈아탑니다(타깃이 매 재평가마다 흔들리는 것 방지).
  fighter.target = (current && bestScore > currentScore * 0.8) ? current : best;
}
function turnTowardTarget(fighter, deltaSeconds) {
  const target = fighter.target.root.position;
  const desiredRotation = Math.atan2(target.x - fighter.root.position.x, target.z - fighter.root.position.z);
  fighter.root.rotation.y += Math.atan2(Math.sin(desiredRotation - fighter.root.rotation.y), Math.cos(desiredRotation - fighter.root.rotation.y)) * Math.min(1, deltaSeconds * 8);
}
// 진행 방향(dirX,dirZ) 앞을 막은 같은 팀 유닛을 좌/우로 나눠 압력을 재고, "정면이 막혔을 때만" 덜 막힌 쪽으로 비껴갑니다.
// 트인 길이면 그대로 직진(불필요한 흔들림 없음). 공유 공간 해시의 3x3 이웃만 검사·무할당. 결과는 steerX/steerZ에 씁니다.
let steerX = 0, steerZ = 0;
function steerAroundBlockers(fighter, dirX, dirZ) {
  const px = fighter.root.position.x, pz = fighter.root.position.z;
  const cellX = (px / collisionCellSize) | 0, cellZ = (pz / collisionCellSize) | 0;
  const sight = fighter.radius + 11, sightSq = sight * sight; // 전방 탐지 거리
  let leftBlock = 0, rightBlock = 0; // 진행 방향 기준 좌/우 아군 압력
  for (let gx = cellX - 1; gx <= cellX + 1; gx++) for (let gz = cellZ - 1; gz <= cellZ + 1; gz++) {
    const bucket = collisionGrid.get(gx + "," + gz);
    if (!bucket) continue;
    for (let i = 0; i < bucket.length; i++) {
      const other = bucket[i];
      if (other === fighter || other.team !== fighter.team) continue; // 아군만 회피(적은 교전 대상이라 비껴가지 않음)
      const ox = other.root.position.x - px, oz = other.root.position.z - pz, distSq = ox * ox + oz * oz;
      if (distSq >= sightSq || distSq === 0) continue;
      const dist = Math.sqrt(distSq), forward = (ox * dirX + oz * dirZ) / dist; // 진행 방향과의 정렬도(1=정면, 0=옆)
      if (forward <= 0.2) continue; // 정면 ~78° 안의 아군만 "길막음"으로 취급(옆·뒤는 분리에 맡김)
      const block = forward * (1 - dist / sight); // 정면일수록·가까울수록 강한 막힘
      if (ox * -dirZ + oz * dirX > 0) leftBlock += block; else rightBlock += block; // 좌(+perp)/우 압력 누적
    }
  }
  const blockage = leftBlock + rightBlock;
  if (blockage < 0.05) { steerX = dirX; steerZ = dirZ; return; } // 길이 트였으면 직진
  // 한쪽이 확실히(전체의 25%↑) 더 막혔을 때만 우회 방향을 바꾸고, 그 외엔 직전에 고른 쪽(sidePref)을 유지합니다 → 매 판단마다 좌우로 뒤집히며 왔다갔다하는 진동 방지.
  const diff = leftBlock - rightBlock;
  if (Math.abs(diff) > blockage * 0.25) fighter.sidePref = diff > 0 ? -1 : 1; // 왼쪽이 더 막혔으면 오른쪽(-1)으로
  const sign = fighter.sidePref;
  const strength = Math.min(0.9, blockage * 1.1); // 전진 성분을 항상 크게 유지(과한 측면 이동·옆걸음 방지)
  const nx = dirX + -dirZ * sign * strength, nz = dirZ + dirX * sign * strength, len = Math.hypot(nx, nz) || 1;
  steerX = nx / len; steerZ = nz / len;
}
// 진행과 무관하게, 반경 maxReach 안에서 가장 가까운 적을 공유 그리드로 찾습니다(없으면 null). 멜리 사거리라 보통 1~2셀만 검사. 그리드엔 생존자만 담기므로 결과도 살아있는 적입니다.
function findNearbyEnemy(fighter, maxReach) {
  const px = fighter.root.position.x, pz = fighter.root.position.z;
  const cellX = (px / collisionCellSize) | 0, cellZ = (pz / collisionCellSize) | 0;
  const span = 1 + ((maxReach / collisionCellSize) | 0);
  let best = null, bestSq = maxReach * maxReach;
  for (let gx = cellX - span; gx <= cellX + span; gx++) for (let gz = cellZ - span; gz <= cellZ + span; gz++) {
    const bucket = collisionGrid.get(gx + "," + gz);
    if (!bucket) continue;
    for (let i = 0; i < bucket.length; i++) {
      const other = bucket[i];
      if (other.team === fighter.team) continue; // 적만
      const dx = other.root.position.x - px, dz = other.root.position.z - pz, distSq = dx * dx + dz * dz;
      if (distSq < bestSq) { bestSq = distSq; best = other; }
    }
  }
  return best;
}
// 주기적 전투 판단: (전략) 타깃 선정 → 코앞 적과 교전 → 사거리면 공격, 아니면 (적 중심 혼합·흔들림·아군 회피를 반영한) 이동 방향을 계산해 캐시합니다.
function planCombat(fighter) {
  const now = performance.now();
  // 이동 목표(전략 타깃)는 거리·잔여 체력 가중으로 주기적으로만 재선정합니다.
  if (!fighter.target || !fighter.target.alive || now >= fighter.retargetAt) {
    selectBestTarget(fighter);
    fighter.retargetAt = now + 350 + Math.random() * 150;
  }
  if (!fighter.target) { fighter.moving = false; return; }
  const profile = combatProfile(fighter.config);
  // 코앞(대략 접근 사거리 이내)에 적이 있으면 전략 타깃과 무관하게 그 적과 교전합니다 — 코앞의 적을 두고 멀리 있는 타깃으로 걷기만 하는 문제 방지(특히 아군이 길을 막을 때).
  const near = findNearbyEnemy(fighter, profile.maxRange * 1.7); // 공격 가능 거리(±)에 적이 있으면 그 적과 교전
  if (near) fighter.target = near;
  const target = fighter.target, targetDistance = distanceBetween(fighter, target);
  const closeKickDistance = shouldUseCloseKickDistance(fighter, target);
  const rangeFactor = closeKickDistance ? 1.08 : 1.5;
  const engageRange = profile.maxRange * rangeFactor;                     // 이 안이면 공격 시도 가능
  const approachRange = engageRange * (0.72 + 0.16 * fighter.stopJitter); // 멈추는 거리는 항상 engageRange 이내(0.72~0.88배) → 멈추면 반드시 사거리 안이라 쿨다운만 차면 공격함. (이전엔 approachRange가 사거리보다 멀어 사거리 밖에서 멈춰 제자리걸음만 하던 버그)
  if (fighter.cooldown <= 0 && targetDistance <= engageRange) {
    let chosenAttack = null, usableCount = 0; // 배열 할당 없이 사거리 내 공격 중 균등 무작위 선택(저수지 샘플링)
    for (const name of profile.names) if (targetDistance <= fighter.config.attacks[name].range * rangeFactor) { usableCount++; if (Math.random() < 1 / usableCount) chosenAttack = name; }
    if (chosenAttack) { fighter.moving = false; return startAttack(fighter, chosenAttack); }
  }
  if (targetDistance <= approachRange) { fighter.moving = false; fighter.state = "combat"; playAction(fighter, "move", 0.12); return; } // 사거리 안: 대기(T 포즈 대신 idle 자세)
  const enemyCenter = teamCaches[fighter.team ? 0 : 1].center, position = fighter.root.position;
  const center = fighter.centerBias, lead = 1 - center; // 유닛마다 적 중심 쏠림 비율을 달리해 경로를 분산
  const goalX = target.root.position.x * lead + enemyCenter.x * center, goalZ = target.root.position.z * lead + enemyCenter.z * center;
  let dirX = goalX - position.x, dirZ = goalZ - position.z;
  const length = Math.hypot(dirX, dirZ) || 1; dirX /= length; dirZ /= length;
  const wander = Math.sin(now * 0.001 * fighter.wanderSpeed + fighter.wanderPhase) * 0.25; // 좌우로 살짝 흔들어 동일 직선 경로 방지
  const cos = Math.cos(wander), sin = Math.sin(wander);
  steerAroundBlockers(fighter, dirX * cos - dirZ * sin, dirX * sin + dirZ * cos);
  fighter.planDirX = steerX; fighter.planDirZ = steerZ; fighter.planApproach = approachRange; fighter.moving = true; fighter.state = "move";
  playAction(fighter, "move", 0.16);
}
function startAttack(fighter, attackName) {
  const attack = fighter.config.attacks[attackName], actionList = Array.isArray(fighter.actions[attackName]) ? fighter.actions[attackName] : [fighter.actions[attackName]];
  const pickedAction = actionList[Math.floor(Math.random() * actionList.length)];
  Object.assign(fighter, { state: "attack", activeAttackName: attackName, activeAttack: attack, activeAttackKey: pickedAction.fileKey, attackTimer: 0, attackApplied: false, cooldown: attack.cooldown / fighter.config.attackSpeed });
  playAction(fighter, pickedAction, 0.12); pickedAction.setEffectiveTimeScale(1.08 * fighter.config.attackSpeed);
}
// 캐시된 이동 계획대로 한 프레임 전진합니다(접근 사거리에서 멈추도록 남은 거리로 클램프).
function advanceAlongPlan(fighter, deltaSeconds) {
  const remaining = distanceBetween(fighter, fighter.target) - fighter.planApproach;
  if (remaining <= 0) return;
  const step = Math.min(remaining, fighter.config.moveSpeed * fighter.speedScale * deltaSeconds);
  fighter.root.position.x += fighter.planDirX * step; fighter.root.position.z += fighter.planDirZ * step;
}

// ============================================================
// 12. 데미지, 사망, 상태 표시
// 실제 체력 감소, 넉백, 사망 처리, 화면 상태 문구 갱신을 담당합니다.
// ============================================================

// 한 대상에게 데미지·넉백·이펙트를 적용합니다. 넉백 방향은 (originX,originZ)에서 대상 쪽으로 향합니다.
function dealDamage(attacker, target, attack, originX, originZ) {
  const defenseRatio = attacker.activeAttackName === "kick" ? 0.42 : 0.34;
  const damage = Math.max(1, attack.damage - Math.round(target.config.defense * defenseRatio));
  knockbackProbe.set(target.root.position.x - originX, 0, target.root.position.z - originZ).normalize();
  target.health = Math.max(0, target.health - damage);
  target.velocity.addScaledVector(knockbackProbe, attack.knockback * (target.state === "attack" ? 0.08 : 0.38) * (1 - target.knockbackResist));
  // 적중 순간 스파크, 떠오르는 데미지 숫자, 넉백이 강한 일격(마동석·에렌 등)에는 바닥 충격파까지 더해 한 방을 강조합니다.
  spawnImpact(target.root.position.x, target.healthBarHeight * 0.55, target.root.position.z, attacker.activeAttackName === "kick" ? 0xffae54 : 0xffd27a);
  spawnDamageNumber(target.root.position.x, target.healthBarHeight * 0.9, target.root.position.z, damage);
  if (attack.knockback >= 10) spawnShockwave(target.root.position.x, target.root.position.z, 0xfff1a8);
  if (target.health <= 0) killFighter(target);
}
function applyAttackDamage(attacker, target) {
  const attack = attacker.activeAttack;
  if (!attack || !target.alive) return false;
  dealDamage(attacker, target, attack, attacker.root.position.x, attacker.root.position.z);
  // 광역 공격(에렌 등): 적중 지점 반경 내 다른 적까지 휩쓸고, 범위를 나타내는 큰 충격파를 띄웁니다. 프레임 캐시 생존 목록만 순회해 O(적군 수).
  if (attack.aoe) {
    const cx = target.root.position.x, cz = target.root.position.z, radiusSq = attack.aoe.radius * attack.aoe.radius;
    const enemies = teamCaches[attacker.team ? 0 : 1].living;
    for (let i = 0; i < enemies.length; i++) {
      const victim = enemies[i];
      if (victim === target || !victim.alive) continue;
      const dx = victim.root.position.x - cx, dz = victim.root.position.z - cz;
      if (dx * dx + dz * dz <= radiusSq) dealDamage(attacker, victim, attack, cx, cz);
    }
    spawnShockwave(cx, cz, 0xff7a2c, attack.aoe.radius);
  }
  return true;
}
function killFighter(fighter) { fighter.alive = false; fighter.state = "dead"; if (fighter.healthBar) fighter.healthBar.visible = false; playAction(fighter, "death", 0.05); }
let lastStatusText = "";
function updateStatus() {
  const text = winnerName
    ? `${winnerName} 승리`
    : `${characterConfigs[interfaceElements.firstTeamType.value].name} ${teamCaches[0].living.length}명 | ${characterConfigs[interfaceElements.secondTeamType.value].name} ${teamCaches[1].living.length}명`;
  if (text !== lastStatusText) { interfaceElements.statusText.textContent = text; lastStatusText = text; } // 변할 때만 DOM 갱신
}

// ============================================================
// 13. 대결 시작과 메인 루프
// 버튼을 눌렀을 때 캐릭터를 배치하고, 매 프레임 전투를 진행합니다.
// ============================================================

async function startBattle() {
  battleRunning = false; winningTeam = null; winnerName = null; interfaceElements.startButton.disabled = true;
  unlockCamera(); battleGroup.clear(); activeFighters.length = 0;
  const firstType = interfaceElements.firstTeamType.value, secondType = interfaceElements.secondTeamType.value;
  const firstCount = Number(interfaceElements.firstTeamCount.value);
  const secondCount = Number(interfaceElements.secondTeamCount.value);
  const firstPositions = buildSpawnPositions(0, firstCount), secondPositions = buildSpawnPositions(1, secondCount);
  const spawnJobs = [];
  for (let index = 0; index < firstCount; index++) spawnJobs.push(createFighter(firstType, 0, firstPositions[index]));
  for (let index = 0; index < secondCount; index++) spawnJobs.push(createFighter(secondType, 1, secondPositions[index]));
  for (const fighter of await Promise.all(spawnJobs)) activeFighters.push(fighter);
  refreshTeamCache();
  battleRunning = true; interfaceElements.startButton.disabled = false; updateStatus();
}
async function boot() {
  await Promise.all(["walk", "zombieRun", "death", "victory"].map(loadAnimationClip));
  interfaceElements.statusText.textContent = "준비 완료. 대결을 시작하세요."; interfaceElements.startButton.disabled = false;
}
function render() {
  requestAnimationFrame(render);
  const deltaSeconds = clock.getDelta();
  refreshTeamCache();
  buildCollisionGrid(); // 이동(아군 회피 조향)과 분리가 공유할 공간 해시를 이동 전에 1회 구성
  for (let index = 0; index < activeFighters.length; index++) updateFighter(activeFighters[index], deltaSeconds);
  resolveSeparation();
  updateEffects(deltaSeconds);
  if (battleRunning) { checkBattleEnd(); updateStatus(); }
  if (lockedFighter && firstPerson) updateFirstPerson();
  else { followLockedFighter(); orbitControls.update(); }
  renderer.render(scene, camera);
}
function followLockedFighter() {
  if (!lockedFighter) return;
  if (!lockedFighter.root.parent) return unlockCamera(); // 새 전투로 제거된 유닛은 추적 해제
  followTarget.copy(lockedFighter.root.position).setY(lockedFighter.healthBarHeight * 0.45);
  followShift.subVectors(followTarget, orbitControls.target).multiplyScalar(0.2); // 부드럽게 따라가며 사용자가 돌려놓은 시점 유지
  orbitControls.target.add(followShift); camera.position.add(followShift);
}
// 1인칭: 잠근 캐릭터의 머리 위치에 카메라를 두고 캐릭터가 바라보는 방향을 향하게 합니다.
function updateFirstPerson() {
  if (!lockedFighter.root.parent) return unlockCamera();
  const fighter = lockedFighter, rotationY = fighter.root.rotation.y;
  const forwardX = Math.sin(rotationY), forwardZ = Math.cos(rotationY);
  if (fighter.headBone) fighter.headBone.getWorldPosition(eyeProbe);
  else eyeProbe.copy(fighter.root.position).setY(fighter.healthBarHeight - 2.5);
  // 머리에서 살짝 앞·위로 옮겨 자기 머리 메시 안이 보이지 않게 합니다.
  camera.position.set(eyeProbe.x + forwardX * 1.4, eyeProbe.y + 0.4, eyeProbe.z + forwardZ * 1.4);
  camera.lookAt(eyeProbe.x + forwardX * 20, eyeProbe.y - 1.5, eyeProbe.z + forwardZ * 20); // 시선은 정면에서 약간 아래
}
function checkBattleEnd() {
  const firstTeamAlive = teamCaches[0].living.length, secondTeamAlive = teamCaches[1].living.length;
  if (firstTeamAlive && secondTeamAlive) return;
  winningTeam = firstTeamAlive ? 0 : 1;
  winnerName = characterConfigs[winningTeam ? interfaceElements.secondTeamType.value : interfaceElements.firstTeamType.value].name;
  battleRunning = false; updateStatus();
}

boot();
render();
