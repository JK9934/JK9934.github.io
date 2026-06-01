import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { initCamera, initRenderer, initOrbitControls, initDefaultDirectionalLighting } from "./util.js";

// =========================================================================
// 1. 데이터 설정 (캐릭터 스펙 및 파일 경로 관리)
// =========================================================================

const characterFolder = "character/";
const characterFiles = { 
  yoo: `${characterFolder}유재석.fbx`, ma: `${characterFolder}마동석.fbx`, kim: `${characterFolder}김동현.fbx`, 
  son: `${characterFolder}손흥민.fbx`, eren: `${characterFolder}에렌.fbx`, zombie: `${characterFolder}좀비.fbx` 
};

const animationFolder = "animation/";
const animationFiles = {
  walk: { file: `${animationFolder}walking.fbx` }, death: { file: `${animationFolder}death.fbx` }, victory: { file: `${animationFolder}victory.fbx` },
  yooPunch: { file: `${animationFolder}yoo_punch.fbx` }, maPunch1: { file: `${animationFolder}ma_punch_1.fbx` }, maPunch2: { file: `${animationFolder}ma_punch_2.fbx` },
  kimPunch: { file: `${animationFolder}kim_punch.fbx` }, kimKick1: { file: `${animationFolder}kim_kick_1.fbx` }, kimKick2: { file: `${animationFolder}kim_kick_2.fbx` },
  sonKick1: { file: `${animationFolder}son_kick_1.fbx` }, sonKick2: { file: `${animationFolder}son_kick_2.fbx` }, erenPunch: { file: `${animationFolder}eren_attack.fbx` },
  zombieRun: { file: `${animationFolder}jombie_running.fbx` }, zombieBite: { file: `${animationFolder}jombie_bite.fbx` },
};

const DAMAGE_LEAD_BY_FILE = {
  yooPunch: 0,
  maPunch1: 1.5,
  maPunch2: 1,
  kimPunch: 0.5,
  kimKick1: 0.5,
  kimKick2: 0.5,
  sonKick1: 0.5,
  sonKick2: 0.5,
  erenPunch: 3,
  zombieBite: 0,
};

const CHAR = {
  yoo: { name: "유재석", model: characterFiles.yoo, maxCount: 50, scale: 0.077, hp: 30, defense: 5, attackSpeed: 1, speed: 10, moveAnim: "walk", moves: { punch: { files: ["yooPunch"], damage: 1, range: 5, cooldown: 0.5, knockback: 0 } } },
  ma: { name: "마동석", model: characterFiles.ma, maxCount: 5, scale: 0.091, hp: 300, defense: 30, attackSpeed: 0.8, speed: 10, moveAnim: "walk", moves: { punch: { files: ["maPunch1", "maPunch2"], damage: 75, range: 6, cooldown: 0.4, knockback: 12 } } },
  kim: { name: "김동현", model: characterFiles.kim, maxCount: 5, scale: 0.085, hp: 180, defense: 15, attackSpeed: 2, speed: 15, moveAnim: "walk", moves: { punch: { files: ["kimPunch"], damage: 25, range: 6, cooldown: 0.4, knockback: 5 }, kick: { files: ["kimKick1", "kimKick2"], damage: 40, range: 9, cooldown: 0.5, knockback: 7 } } },
  son: { name: "손흥민", model: characterFiles.son, maxCount: 10, scale: 0.081, hp: 130, defense: 10, attackSpeed: 2.2, speed: 18, moveAnim: "walk", moves: { kick: { files: ["sonKick1", "sonKick2"], damage: 30, range: 9, cooldown: 0.3, knockback: 6 } } },
  eren: { name: "에렌", model: characterFiles.eren, maxCount: 1, scale: 0.2, hp: 1000, defense: 100, attackSpeed: 0.5, speed: 8, moveAnim: "walk", moves: { punch: { files: ["erenPunch"], damage: 150, range: 10, cooldown: 1, knockback: 15 } } },
  zombie: { name: "좀비", model: characterFiles.zombie, maxCount: 50, scale: 0.083, hp: 150, defense: 8, attackSpeed: 1.5, speed: 20, moveAnim: "zombieRun", moves: { punch: { files: ["zombieBite"], damage: 20, range: 4, cooldown: 0.5, knockback: 0 } } }
};

// =========================================================================
// 2. Three.js 기본 환경 설정
// =========================================================================

const scene = new THREE.Scene();
const camera = initCamera();  camera.position.set(0, 50, 120);
const renderer = initRenderer();
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
const orbitControls = initOrbitControls(camera, renderer); orbitControls.enableDamping = true;
const clock = new THREE.Clock();
const fighters = [];
let running = false, winner = null, winningTeam = null;

initDefaultDirectionalLighting(scene, new THREE.Vector3(-65, 95, 55));
scene.add(new THREE.HemisphereLight(0xffffff, 0x56616f, 1.1));

const fightGroup = new THREE.Group();
scene.add(fightGroup);

new THREE.TextureLoader().load("background.png", texture => (texture.colorSpace = THREE.SRGBColorSpace, scene.background = texture));
const ground = new THREE.Mesh(new THREE.CircleGeometry(150, 150), new THREE.MeshStandardMaterial({ color: 0x172554 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// =========================================================================
// [그룹 3] UI 원소 제어 (인터페이스 연동 및 자동화)
// =========================================================================

const ui = { 
  aType: document.getElementById("a-type"),   bType: document.getElementById("b-type"), 
  aCount: document.getElementById("a-count"), bCount: document.getElementById("b-count"), 
  start: document.getElementById("start"),   status: document.getElementById("status") 
};

Object.entries(CHAR).forEach(([id, character]) => (ui.aType.add(new Option(character.name, id)), ui.bType.add(new Option(character.name, id))));
Object.assign(ui.aType, { value: "ma", onchange: clampCounts }), Object.assign(ui.bType, { value: "kim", onchange: clampCounts });
ui.start.onclick = startBattle;

function clampCounts() {
  [ [ui.aCount, ui.aType.value], [ui.bCount, ui.bType.value] ].forEach(([input, type]) => {
    if (!input) return;
    input.max = CHAR[type].maxCount;
    input.value = THREE.MathUtils.clamp(Number(input.value) || 1, 1, CHAR[type].maxCount);
  });
}
clampCounts();

// =========================================================================
// [그룹 4] 에셋 로더 및 전처리 파이프라인 (다운로드 및 애니메이션 정제)
// =========================================================================

const fbxLoader = new FBXLoader();
const cache = new Map();

function loadAsset(path) {
  if (!cache.has(path)) cache.set(path, new Promise((res, rej) => fbxLoader.load(encodeURI(path), res, undefined, rej)));
  return cache.get(path);
}

const clip = async (specification) => {
  const asset = await loadAsset(specification.file);
  const found = asset.animations?.[0];
  if (!found) throw new Error(`${specification.file} 안에 애니메이션이 없습니다.`);
  return found;
};

function cleanClip(source, positionMode = "strip") {
  if (positionMode === "strip") {
    return new THREE.AnimationClip(
      source.name,
      source.duration,
      source.tracks.filter(track => !track.name.endsWith(".position"))
    );
  }

  const tracks = source.tracks.map((track) => {
    if (positionMode !== "relative" || !track.name.endsWith(".position")) return track.clone();
    const cloned = track.clone();
    const values = cloned.values;
    const baseY = values[1] || 0;
    for (let i = 0; i < values.length; i += 3) {
      values[i] = 0;
      values[i + 1] -= baseY;
      values[i + 2] = 0;
    }
    return cloned;
  });
  return new THREE.AnimationClip(source.name, source.duration, tracks);
}

function configure(action, loop) {
  Object.assign(action, { enabled: true, loop: loop ? THREE.LoopRepeat : THREE.LoopOnce, clampWhenFinished: !loop });
  return action.setEffectiveWeight(1);
}

// =========================================================================
// [그룹 5] 비주얼 및 그래픽 보정 (스케일 자동화, 체력바 세팅)
// =========================================================================

function fit(model, height) {
  model.position.set(0, 0, 0);
  model.scale.setScalar(1);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  model.scale.setScalar(height / Math.max(0.001, box.max.y - box.min.y));
  model.updateMatrixWorld(true);
  model.position.y -= new THREE.Box3().setFromObject(model).min.y;
}

function prep(model) {
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => material?.map && (material.map.colorSpace = THREE.SRGBColorSpace));
  });
}

function healthBar(team) {
  const group = new THREE.Group();
  const back = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 0.62), new THREE.MeshBasicMaterial({ color: 0x151515, depthTest: false }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.36), new THREE.MeshBasicMaterial({ color: team ? 0x3b82f6 : 0xec4444, depthTest: false }));
  fill.position.z = 0.02;
  group.add(back, fill);
  group.fill = fill;
  return group;
}

// =========================================================================
// [그룹 6] 핵심 시뮬레이션 제어 루프 및 인공지능 로직
// =========================================================================

async function makeFighter(type, team, index, total) {
  const cfg = CHAR[type];
  const asset = await loadAsset(cfg.model);
  const root = new THREE.Group();
  const model = cloneSkeleton(asset); 
  
  prep(model); fit(model, 180 * cfg.scale);
  root.add(model);

  const side = team ? 1 : -1, cols = Math.ceil(Math.sqrt(total));
  root.position.set(side * (28 + Math.floor(index / cols) * 6), 0, (index % cols - (Math.min(total, cols) - 1) / 2) * 8);
  root.rotation.y = team ? -Math.PI / 2 : Math.PI / 2;
  fightGroup.add(root);

  const mixer = new THREE.AnimationMixer(model), actions = {};
  const add = async (name, specification, loop = false, positionMode = "strip") => {
    const action = mixer.clipAction(cleanClip(await clip(specification), positionMode));
    action.fileKey = specification.fileKey;
    actions[name] = actions[name] ? [].concat(actions[name], configure(action, loop)) : configure(action, loop);
  };

  if (cfg.moveAnim) await add("move", animationFiles[cfg.moveAnim], true);
  await Promise.all([add("death", animationFiles.death, false, "relative"), add("victory", animationFiles.victory, true)]);
  for (const [moveName, move] of Object.entries(cfg.moves)) {
    for (const fileKey of move.files) await add(moveName, { ...animationFiles[fileKey], fileKey });
  }

  const bar = healthBar(team);
  fightGroup.add(bar);

  return {
    cfg, team, root, model, mixer, actions, bar, hp: cfg.hp, maxHp: cfg.hp, alive: true, state: "idle",
    target: null, velocity: new THREE.Vector3(), current: null, attackTimer: 0, attackApplied: false,
    activeMoveName: null, activeMoveFileKey: null, activeMove: null, cooldown: Math.random(), deathTimer: 0,
    deadYaw: root.rotation.y, fallSide: team ? 1 : -1, barHeight: 180 * cfg.scale + 2.5,
    targetTimer: Math.random() * 0.25 
  };
}

function play(fighterInstance, actionOrName, fade = 0.14) {
  const next = typeof actionOrName === "string" ? fighterInstance.actions[actionOrName] : actionOrName;
  if (!next) return;
  if (fighterInstance.current === next) {
    if (next.loop === THREE.LoopRepeat) return;
    next.reset().setEffectiveWeight(1).play();
    return;
  }
  const prev = fighterInstance.current; fighterInstance.current = next;
  next.reset().setEffectiveWeight(1).play();
  prev ? prev.crossFadeTo(next, fade, false) : next.fadeIn(fade);
}

const stopMotion = (fighterInstance, fade = 0.12) => { fighterInstance.current?.fadeOut(fade); fighterInstance.current = null; };
const dist = (fighterA, fighterB) => Math.hypot(fighterA.root.position.x - fighterB.root.position.x, fighterA.root.position.z - fighterB.root.position.z);

function isKimSonPair(a, b) {
  const names = [a.cfg.name, b.cfg.name].sort().join("|");
  return names === "김동현|손흥민";
}

function damageLeadTime(fighterInstance) {
  return DAMAGE_LEAD_BY_FILE[fighterInstance.activeMoveFileKey] || 0;
}

function hit(attacker, target) {
  const move = attacker.activeMove;
  if (!move || !target.alive) return false;
  
  target.hp = Math.max(0, target.hp - Math.max(1, move.damage - Math.round(target.cfg.defense * (attacker.activeMoveName === "kick" ? 0.42 : 0.34))));
  const direction = new THREE.Vector3().subVectors(target.root.position, attacker.root.position).setY(0).normalize();
  const knockbackScale = target.state === "attack" ? 0.08 : 0.38;
  target.velocity.addScaledVector(direction, move.knockback * knockbackScale);

  if (target.hp <= 0) {
    Object.assign(target, { alive: false, state: "dead" });
    target.bar.visible = false;
    play(target, "death", 0.05);
  }
  status();
  return true;
}

function updateFighter(fighterInstance, delta, canFight) {
  fighterInstance.mixer.update(delta);
  fighterInstance.bar.position.copy(fighterInstance.root.position).setY(fighterInstance.barHeight);
  fighterInstance.bar.lookAt(camera.position);
  fighterInstance.bar.fill.scale.x = Math.max(0.001, fighterInstance.hp / fighterInstance.maxHp);
  fighterInstance.bar.fill.position.x = -4 * (1 - fighterInstance.hp / fighterInstance.maxHp);
  fighterInstance.root.position.addScaledVector(fighterInstance.velocity, delta);
  fighterInstance.velocity.multiplyScalar(Math.max(0, 1 - delta * 4.2));

  if (!fighterInstance.alive) {
    fighterInstance.deathTimer += delta;
    fighterInstance.root.rotation.y = fighterInstance.deadYaw;
    fighterInstance.root.position.y = 0;
    return;
  }
  if (!canFight) {
    if (fighterInstance.team === winningTeam && fighterInstance.current !== fighterInstance.actions.victory) play(fighterInstance, "victory", 0.18);
    return;
  }

  fighterInstance.cooldown = Math.max(0, fighterInstance.cooldown - delta);
  if (fighterInstance.state === "attack") {
    fighterInstance.attackTimer += delta;
    const action = fighterInstance.current;
    const clipDuration = action?.getClip().duration || 1;
    const leadTime = damageLeadTime(fighterInstance);
    const damageTime = leadTime > 0 ? Math.max(0, clipDuration - leadTime) : clipDuration * 0.98;
    const shouldApplyDamage = action ? action.time >= damageTime : fighterInstance.attackTimer >= damageTime;
    if (shouldApplyDamage) {
      if (!fighterInstance.attackApplied && fighterInstance.target?.alive) {
        fighterInstance.attackApplied = hit(fighterInstance, fighterInstance.target);
      }
    }
    const animationEnded = action ? action.time >= clipDuration * 0.98 : fighterInstance.attackTimer >= clipDuration;
    if (animationEnded) {
      fighterInstance.state = "combat"; fighterInstance.cooldown = Math.min(fighterInstance.cooldown, 0.08);
    }
    return;
  }

  fighterInstance.targetTimer = (fighterInstance.targetTimer || 0) - delta;
  if (fighterInstance.targetTimer <= 0 || !fighterInstance.target || !fighterInstance.target.alive) {
    const enemies = fighters.filter(x => x.alive && x.team !== fighterInstance.team);
    fighterInstance.target = enemies.sort((a, b) => dist(fighterInstance, a) - dist(fighterInstance, b))[0];
    fighterInstance.targetTimer = 0.25;
  }
  
  if (!fighterInstance.target) return;

  const desired = Math.atan2(fighterInstance.target.root.position.x - fighterInstance.root.position.x, fighterInstance.target.root.position.z - fighterInstance.root.position.z);
  fighterInstance.root.rotation.y += Math.atan2(Math.sin(desired - fighterInstance.root.rotation.y), Math.cos(desired - fighterInstance.root.rotation.y)) * Math.min(1, delta * 8);

  const distance = dist(fighterInstance, fighterInstance.target);
  const moves = Object.keys(fighterInstance.cfg.moves);
  const rangeScale = isKimSonPair(fighterInstance, fighterInstance.target) ? 1.02 : 1.45;
  const attackScale = isKimSonPair(fighterInstance, fighterInstance.target) ? 1.08 : 1.5;
  const maxRange = Math.max(...moves.map(name => fighterInstance.cfg.moves[name].range)) * rangeScale;

  if (fighterInstance.cooldown <= 0 && fighterInstance.state !== "attack") {
    const candidates = moves.filter(name => distance <= fighterInstance.cfg.moves[name].range * attackScale);
    if (candidates.length) {
      const name = candidates[Math.floor(Math.random() * candidates.length)];
      const move = fighterInstance.cfg.moves[name];
      Object.assign(fighterInstance, { state: "attack", activeMoveName: name, activeMove: move, attackTimer: 0, attackApplied: false, cooldown: move.cooldown / Math.max(0.01, fighterInstance.cfg.attackSpeed) });
      const actionArray = Array.isArray(fighterInstance.actions[name]) ? fighterInstance.actions[name] : [fighterInstance.actions[name]];
      const pickedAction = actionArray[Math.floor(Math.random() * actionArray.length)];
      fighterInstance.activeMoveFileKey = pickedAction.fileKey || null;
      play(fighterInstance, pickedAction, 0.12);
      pickedAction.setEffectiveTimeScale(1.08 * fighterInstance.cfg.attackSpeed);
      return;
    }
  }

  if (distance > maxRange) {
    const enemies = fighters.filter(x => x.alive && x.team !== fighterInstance.team);
    const center = enemies.reduce((vector, object) => vector.add(object.root.position), new THREE.Vector3()).multiplyScalar(1 / enemies.length);
    const targetPosition = new THREE.Vector3(fighterInstance.target.root.position.x * 0.72 + center.x * 0.28, 0, fighterInstance.target.root.position.z * 0.72 + center.z * 0.28);
    const direction = new THREE.Vector3().subVectors(targetPosition, fighterInstance.root.position).setY(0).normalize();
    fighterInstance.root.position.addScaledVector(direction, Math.min(distance - maxRange, fighterInstance.cfg.speed * delta));
    if (fighterInstance.actions.move) play(fighterInstance, "move", 0.16);
  } else {
    fighterInstance.state = "combat"; 
    stopMotion(fighterInstance, 0.06);
  }
}

const living = (team) => fighters.filter(fighter => fighter.team === team && fighter.alive).length;
const status = () => {
  window.debugBattle = { fighters, running, winner };
  ui.status.textContent = winner ? `${winner} 승리` : `${CHAR[ui.aType.value].name} ${living(0)}명 | ${CHAR[ui.bType.value].name} ${living(1)}명`;
};

async function startBattle() {
  try {
    running = false; winner = null; winningTeam = null;
    ui.start.disabled = true; fightGroup.clear(); fighters.length = 0;
    const aType = ui.aType.value, bType = ui.bType.value;
    const aCount = THREE.MathUtils.clamp(Number(ui.aCount?.value) || 1, 1, CHAR[aType].maxCount);
    const bCount = THREE.MathUtils.clamp(Number(ui.bCount?.value) || 1, 1, CHAR[bType].maxCount);

    for (let i = 0; i < aCount; i++) fighters.push(await makeFighter(aType, 0, i, aCount));
    for (let i = 0; i < bCount; i++) fighters.push(await makeFighter(bType, 1, i, bCount));
    
    running = true; ui.start.disabled = false; status();
  } catch (error) {
    console.error(error); ui.start.disabled = false;
    ui.status.textContent = `배치 실패: ${error?.message || error}`;
  }
}

async function boot() {
  try {
    await Promise.all([clip(animationFiles.walk), clip(animationFiles.zombieRun), clip(animationFiles.death), clip(animationFiles.victory)]);
    ui.status.textContent = "준비 완료. 대결을 시작하세요.";
    ui.start.disabled = false;
  } catch (error) { ui.status.textContent = "로딩 실패"; }
}

function render() {
  requestAnimationFrame(render);
  const delta = Math.min(clock.getDelta(), 0.04);
  fighters.forEach(fighter => updateFighter(fighter, delta, running));
  
  if (running) {
    const a = living(0), b = living(1);
    if (!a || !b) {
      winningTeam = a ? 0 : 1;
      winner = CHAR[winningTeam ? ui.bType.value : ui.aType.value].name;
      running = false; status();
    }
  }
  orbitControls.update(); renderer.render(scene, camera);
}



boot(); render();
