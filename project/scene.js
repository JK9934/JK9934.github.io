import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const canvas = document.querySelector("#scene");
const battleState = document.querySelector("#battle-state");
const startButton = document.querySelector("#start-battle");
const redCharacter = document.querySelector("#red-character");
const blueCharacter = document.querySelector("#blue-character");
const redCount = document.querySelector("#red-count");
const blueCount = document.querySelector("#blue-count");
const redPreview = document.querySelector("#red-preview");
const bluePreview = document.querySelector("#blue-preview");

const ATTACK_RANGE = 1.75;
const MAX_PER_TEAM = 40;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#bd895c");
scene.fog = new THREE.FogExp2("#ba8a62", 0.0082);

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 420);
camera.position.set(0, 20, 22);

scene.add(new THREE.HemisphereLight("#ffe0bb", "#5d321f", 2.8));

const sun = new THREE.DirectionalLight("#ffe1a8", 4.1);
sun.position.set(-34, 68, 34);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 170;
sun.shadow.camera.left = -62;
sun.shadow.camera.right = 62;
sun.shadow.camera.top = 62;
sun.shadow.camera.bottom = -62;
scene.add(sun);

const profiles = [
  { id: "yjs", name: "유재석", initials: "유", height: 178, weight: 65, hair: "#0d0b0a", suit: "#1b2430", tie: "#233f7a", body: "slim", traits: { attack: 1, defense: 0, health: -2, speed: 0.25 }, face: "glasses" },
  { id: "haha", name: "하하", initials: "하", height: 171, weight: 68, hair: "#0f0d0c", suit: "#26303a", tie: "#7b2525", body: "compact", traits: { attack: 2, defense: 1, health: 1, speed: 0.16 }, face: "spiky" },
  { id: "jjh", name: "정준하", initials: "준", height: 185, weight: 100, hair: "#1d1512", suit: "#25211f", tie: "#5d2730", body: "heavy", traits: { attack: 4, defense: 6, health: 12, speed: -0.28 }, face: "large" },
  { id: "jhd", name: "정형돈", initials: "돈", height: 173, weight: 85, hair: "#18120f", suit: "#2f3138", tie: "#4d5b7c", body: "round", traits: { attack: 3, defense: 4, health: 7, speed: -0.08 }, face: "round" },
  { id: "nhc", name: "노홍철", initials: "노", height: 180, weight: 75, hair: "#f0b936", suit: "#30283b", tie: "#b9912a", body: "flashy", traits: { attack: 2, defense: 1, health: 2, speed: 0.22 }, face: "moustache" },
  { id: "pms", name: "박명수", initials: "박", height: 172, weight: 72, hair: "#15110f", suit: "#202022", tie: "#7a2521", body: "stiff", traits: { attack: 4, defense: 2, health: 0, speed: -0.02 }, face: "angry" },
  { id: "gil", name: "길", initials: "길", height: 178, weight: 88, hair: "#16110e", suit: "#222b24", tie: "#303030", body: "stocky", traits: { attack: 4, defense: 5, health: 8, speed: -0.18 }, face: "bald" },
];

const faceTextures = new Map();
const fightGroup = new THREE.Group();
const effectGroup = new THREE.Group();
scene.add(fightGroup, effectGroup);

let fighters = [];
let hitPool = [];
let winner = "";
let winningTeam = -1;
let matchId = 1;
let battleActive = false;
let currentMatchNames = ["1팀", "2팀"];

function rand(seed) {
  const value = Math.sin(seed * 173.19) * 49318.11;
  return value - Math.floor(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function easeInOut(value) {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

function deriveStats(profile) {
  const heightBonus = profile.height - 175;
  const weightBonus = profile.weight - 72;
  const attack = Math.round(12 + heightBonus * 0.14 + weightBonus * 0.16 + profile.traits.attack);
  const defense = Math.round(10 + weightBonus * 0.22 + profile.traits.defense);
  const health = Math.round(118 + weightBonus * 1.35 + profile.traits.health);
  const speed = clamp(2.55 + (176 - profile.height) * 0.018 + (72 - profile.weight) * 0.012 + profile.traits.speed, 1.65, 3.25);
  const power = Math.round(attack * 2.2 + defense * 1.4 + health * 0.18 + speed * 7);
  return { attack: Math.max(8, attack), defense: Math.max(6, defense), health: Math.max(92, health), speed, power };
}

for (const profile of profiles) {
  profile.stats = deriveStats(profile);
}

const faceSheetCrops = {
  yjs: { x: 43, y: 28, w: 75, h: 93 },
  pms: { x: 121, y: 28, w: 69, h: 94 },
  jhd: { x: 195, y: 33, w: 72, h: 88 },
  nhc: { x: 269, y: 20, w: 75, h: 100 },
  jjh: { x: 345, y: 20, w: 74, h: 101 },
  haha: { x: 423, y: 25, w: 69, h: 91 },
  gil: { x: 493, y: 26, w: 81, h: 94 },
};
const faceTextureRecords = new Map();
const originalFaceImage = new Image();
let originalFaceReady = false;
originalFaceImage.onload = () => {
  originalFaceReady = true;
  for (const record of faceTextureRecords.values()) {
    drawOriginalFaceTexture(record);
  }
};
originalFaceImage.onerror = () => {
  originalFaceReady = false;
};
originalFaceImage.src = "./캐리커처.jpeg";

function desertHeight(x, z) {
  return (
    Math.sin(x * 0.052 + z * 0.018) * 1.35 +
    Math.sin(z * 0.083 - x * 0.026) * 0.9 +
    Math.cos((x + z) * 0.036) * 0.5 +
    Math.max(0, 1 - Math.abs(z + 72) / 25) * 6.5
  );
}

function buildSandTexture() {
  const size = 256;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = size;
  textureCanvas.height = size;
  const context = textureCanvas.getContext("2d");
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (x + y * size) * 4;
      const ripple = Math.sin(x * 0.3 + Math.sin(y * 0.13) * 3.2) * 7;
      const grain = rand(x * 8.9 + y * 27.7) * 22;
      image.data[index] = 142 + grain + ripple;
      image.data[index + 1] = 88 + grain * 0.5 + ripple * 0.22;
      image.data[index + 2] = 53 + grain * 0.2;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(15, 15);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function mesh(geometry, material) {
  const part = new THREE.Mesh(geometry, material);
  part.castShadow = true;
  part.receiveShadow = true;
  return part;
}

function addWorld() {
  const groundGeometry = new THREE.PlaneGeometry(210, 270, 150, 180);
  groundGeometry.rotateX(-Math.PI / 2);
  const position = groundGeometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    position.setY(i, desertHeight(position.getX(i), position.getZ(i)));
  }
  groundGeometry.computeVertexNormals();
  const ground = new THREE.Mesh(
    groundGeometry,
    new THREE.MeshStandardMaterial({ color: "#9d5f37", map: buildSandTexture(), roughness: 1 }),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  const mesa = new THREE.Mesh(
    new THREE.ConeGeometry(86, 42, 5, 1, false, Math.PI * 0.17),
    new THREE.MeshStandardMaterial({ color: "#815144", roughness: 1 }),
  );
  mesa.scale.set(1.16, 1, 0.62);
  mesa.rotation.y = 0.22;
  mesa.position.set(-5, 17, -132);
  scene.add(mesa);
}

const skinMaterial = new THREE.MeshStandardMaterial({ color: "#966b4d", roughness: 1 });
const trouserMaterial = new THREE.MeshStandardMaterial({ color: "#241914", roughness: 1 });
const bootMaterial = new THREE.MeshStandardMaterial({ color: "#16100d", roughness: 1 });
const accessoryMaterial = new THREE.MeshStandardMaterial({ color: "#f4e1b8", roughness: 0.7 });
const darkClothMaterial = new THREE.MeshStandardMaterial({ color: "#191412", roughness: 0.9 });
const lightClothMaterial = new THREE.MeshStandardMaterial({ color: "#e8d5b4", roughness: 0.9 });
const denimMaterial = new THREE.MeshStandardMaterial({ color: "#202937", roughness: 0.95 });
const redTint = new THREE.Color("#9a2f27");
const blueTint = new THREE.Color("#245b6a");
const healthBackMaterial = new THREE.MeshBasicMaterial({ color: "#291714", depthTest: false, transparent: true, opacity: 0.9 });
const healthFillMaterials = [
  new THREE.MeshBasicMaterial({ color: "#f24d3d", depthTest: false }),
  new THREE.MeshBasicMaterial({ color: "#3bd4d2", depthTest: false }),
];
const hitMaterial = new THREE.MeshBasicMaterial({ color: "#ffe0a1", depthWrite: false, opacity: 0.9, transparent: true });

function drawEyes(ctx, profile) {
  ctx.strokeStyle = "#21140f";
  ctx.lineWidth = profile.face === "angry" ? 10 : 6;
  ctx.beginPath();
  if (profile.face === "angry") {
    ctx.moveTo(70, 115);
    ctx.lineTo(117, 133);
    ctx.moveTo(186, 115);
    ctx.lineTo(139, 133);
  } else if (profile.face === "glasses") {
    ctx.moveTo(70, 132);
    ctx.quadraticCurveTo(96, 120, 122, 132);
    ctx.moveTo(134, 132);
    ctx.quadraticCurveTo(160, 120, 186, 132);
  } else if (profile.face === "spiky") {
    ctx.moveTo(76, 130);
    ctx.lineTo(116, 122);
    ctx.moveTo(140, 122);
    ctx.lineTo(180, 130);
  } else {
    ctx.moveTo(73, 126);
    ctx.quadraticCurveTo(96, profile.face === "large" ? 114 : 116, 119, 126);
    ctx.moveTo(137, 126);
    ctx.quadraticCurveTo(160, profile.face === "large" ? 114 : 116, 183, 126);
  }
  ctx.stroke();
  ctx.fillStyle = "#120d0b";
  ctx.beginPath();
  ctx.arc(97, 134, 6, 0, Math.PI * 2);
  ctx.arc(159, 134, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawOriginalFaceTexture(record) {
  const crop = faceSheetCrops[record.profile.id];
  if (!crop || !originalFaceReady) return;

  const ctx = record.canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, record.canvas.width, record.canvas.height);

  const sourceScaleX = originalFaceImage.naturalWidth / 595;
  const sourceScaleY = originalFaceImage.naturalHeight / 233;
  const sx = crop.x * sourceScaleX;
  const sy = crop.y * sourceScaleY;
  const sw = crop.w * sourceScaleX;
  const sh = crop.h * sourceScaleY;
  const aspect = sw / sh;
  const drawHeight = 512;
  const drawWidth = drawHeight * aspect;
  const dx = (512 - drawWidth) / 2;

  ctx.drawImage(originalFaceImage, sx, sy, sw, sh, dx, 0, drawWidth, drawHeight);
  const pixels = ctx.getImageData(0, 0, 512, 512);
  const data = pixels.data;
  const width = 512;
  const height = 512;
  const seen = new Uint8Array(width * height);
  const queue = [];
  const isOuterWhite = (index) => {
    const pixel = index * 4;
    const r = data[pixel];
    const g = data[pixel + 1];
    const b = data[pixel + 2];
    return data[pixel + 3] > 0 && r > 226 && g > 226 && b > 226 && Math.max(r, g, b) - Math.min(r, g, b) < 42;
  };
  const pushIfWhite = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = x + y * width;
    if (!seen[index] && isOuterWhite(index)) {
      seen[index] = 1;
      queue.push(index);
    }
  };

  for (let x = 0; x < width; x += 1) {
    pushIfWhite(x, 0);
    pushIfWhite(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    pushIfWhite(0, y);
    pushIfWhite(width - 1, y);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head];
    const x = index % width;
    const y = Math.floor(index / width);
    data[index * 4 + 3] = 0;
    pushIfWhite(x + 1, y);
    pushIfWhite(x - 1, y);
    pushIfWhite(x, y + 1);
    pushIfWhite(x, y - 1);
  }

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 242 && g > 242 && b > 242) data[i + 3] = Math.min(data[i + 3], 80);
  }
  ctx.putImageData(pixels, 0, 0);
  record.texture.needsUpdate = true;
}

function makeFaceTexture(profile) {
  if (faceTextures.has(profile.id)) return faceTextures.get(profile.id);
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.scale(2, 2);

  const faceWidth = profile.face === "large" ? 98 : profile.face === "glasses" ? 70 : profile.face === "round" ? 84 : profile.face === "spiky" ? 72 : 78;
  const faceHeight = profile.face === "large" ? 90 : profile.face === "glasses" ? 86 : profile.face === "round" ? 84 : profile.face === "spiky" ? 72 : 78;

  ctx.fillStyle = "#7e4d36";
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#f1bd86";
  ctx.beginPath();
  ctx.ellipse(128, 135, faceWidth, faceHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = profile.hair;
  if (profile.face === "spiky") {
    ctx.beginPath();
    ctx.moveTo(50, 90);
    for (let i = 0; i < 9; i += 1) {
      ctx.lineTo(58 + i * 18, i % 2 ? 26 : 62);
    }
    ctx.lineTo(206, 90);
    ctx.quadraticCurveTo(128, 68, 50, 90);
    ctx.fill();
  } else if (profile.face === "cap") {
    ctx.fillStyle = "#e03b2e";
    ctx.fillRect(46, 42, 164, 48);
    ctx.beginPath();
    ctx.ellipse(174, 91, 82, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (profile.face === "bald") {
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.ellipse(119, 77, 42, 18, -0.25, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(128, 73, profile.face === "large" ? 96 : 82, profile.face === "angry" ? 30 : 42, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  drawEyes(ctx, profile);

  if (profile.face === "glasses") {
    ctx.strokeStyle = "#17100d";
    ctx.lineWidth = 10;
    ctx.strokeRect(66, 107, 52, 42);
    ctx.strokeRect(138, 107, 52, 42);
    ctx.beginPath();
    ctx.moveTo(118, 129);
    ctx.lineTo(138, 129);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.24)";
    ctx.fillRect(75, 113, 18, 10);
    ctx.fillRect(148, 113, 18, 10);
  }

  if (profile.face === "spiky") {
    ctx.fillStyle = "rgba(120,58,42,0.15)";
    ctx.beginPath();
    ctx.ellipse(128, 151, 62, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5b2b23";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(88, 166);
    ctx.quadraticCurveTo(128, 178, 168, 166);
    ctx.stroke();
  }

  if (profile.face === "large") {
    ctx.fillStyle = "rgba(150,80,55,0.2)";
    ctx.beginPath();
    ctx.ellipse(128, 170, 70, 28, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (profile.face === "round") {
    ctx.fillStyle = "rgba(160,83,57,0.18)";
    ctx.beginPath();
    ctx.arc(88, 155, 16, 0, Math.PI * 2);
    ctx.arc(168, 155, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = profile.face === "angry" ? "#4c241c" : "#7f4b35";
  ctx.lineWidth = profile.face === "large" ? 10 : profile.face === "glasses" ? 11 : 7;
  ctx.beginPath();
  if (profile.face === "angry") {
    ctx.arc(128, 180, 25, Math.PI + 0.2, Math.PI * 2 - 0.2);
  } else if (profile.face === "glasses") {
    ctx.arc(128, 164, 35, 0.04, Math.PI - 0.04);
  } else if (profile.face === "large") {
    ctx.arc(128, 166, 34, 0.08, Math.PI - 0.08);
  } else if (profile.face === "spiky") {
    ctx.arc(128, 166, 30, 0.08, Math.PI - 0.08);
  } else {
    ctx.arc(128, 165, 28, 0.12, Math.PI - 0.12);
  }
  ctx.stroke();

  if (profile.face === "moustache" || profile.face === "bald" || profile.face === "large") {
    ctx.fillStyle = profile.face === "moustache" ? "#6c4a1f" : "#1a120f";
    ctx.beginPath();
    ctx.ellipse(110, 156, profile.face === "large" ? 14 : 24, profile.face === "large" ? 5 : 10, -0.15, 0, Math.PI * 2);
    ctx.ellipse(146, 156, profile.face === "large" ? 14 : 24, profile.face === "large" ? 5 : 10, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  if (profile.face === "moustache") {
    ctx.strokeStyle = "#6c4a1f";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(128, 176, 42, 0.05, Math.PI - 0.05);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 135, faceWidth + 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "900 48px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(profile.initials, 128, 214);
  ctx.fillStyle = "rgba(24,14,10,0.78)";
  ctx.fillRect(48, 224, 160, 26);
  ctx.fillStyle = "#fff2df";
  ctx.font = "900 19px system-ui, sans-serif";
  ctx.fillText(profile.name, 128, 237);

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  faceTextures.set(profile.id, texture);
  const record = { profile, canvas: c, texture };
  faceTextureRecords.set(profile.id, record);
  drawOriginalFaceTexture(record);
  return texture;
}

function createLimb(length, radius, material) {
  const pivot = new THREE.Group();
  const limb = mesh(new THREE.CapsuleGeometry(radius, length, 3, 7), material);
  limb.position.y = -length * 0.5 - radius;
  pivot.add(limb);
  return pivot;
}

function createHealthBar(team) {
  const group = new THREE.Group();
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.14), healthBackMaterial);
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.09), healthFillMaterials[team]);
  fill.position.z = 0.01;
  group.add(back, fill);
  group.renderOrder = 20;
  fightGroup.add(group);
  return { group, fill };
}

function createFighter(team, profile, seed) {
  const root = new THREE.Group();
  const shirtColor = new THREE.Color(profile.suit).lerp(team === 0 ? redTint : blueTint, 0.08);
  const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 1 });
  const tieMaterial = new THREE.MeshStandardMaterial({ color: profile.tie, roughness: 0.85 });
  const faceTexture = makeFaceTexture(profile);
  const faceMaterial = new THREE.MeshStandardMaterial({ color: "#fff3dc", map: faceTexture, roughness: 1, transparent: true });
  const hairMaterial = new THREE.MeshStandardMaterial({ color: profile.hair, roughness: 1 });

  const bodyShape = {
    slim: { width: 0.82, depth: 0.82, torso: 0.9, belly: 0.82, leg: 0.92, arm: 0.92 },
    compact: { width: 0.96, depth: 0.92, torso: 0.86, belly: 0.9, leg: 0.9, arm: 0.95 },
    heavy: { width: 1.34, depth: 1.18, torso: 1.2, belly: 1.38, leg: 1.12, arm: 1.16 },
    round: { width: 1.2, depth: 1.08, torso: 1.03, belly: 1.24, leg: 1.02, arm: 1.08 },
    flashy: { width: 1.0, depth: 0.94, torso: 1.0, belly: 0.96, leg: 0.98, arm: 1.04 },
    stiff: { width: 0.98, depth: 0.9, torso: 0.96, belly: 0.95, leg: 0.96, arm: 0.9 },
    stocky: { width: 1.24, depth: 1.12, torso: 1.04, belly: 1.26, leg: 1.04, arm: 1.15 },
  }[profile.body] ?? { width: 1, depth: 1, torso: 1, belly: 1, leg: 1, arm: 1 };
  const weightFactor = clamp((profile.weight - 68) / 34, -0.25, 1.2);
  const heightFactor = clamp((profile.height - 174) / 14, -0.35, 0.8);
  bodyShape.width *= clamp(0.9 + weightFactor * 0.24, 0.82, 1.34);
  bodyShape.depth *= clamp(0.92 + weightFactor * 0.22, 0.82, 1.28);
  bodyShape.belly *= clamp(0.88 + weightFactor * 0.34, 0.78, 1.5);
  bodyShape.leg *= clamp(0.94 + heightFactor * 0.12, 0.88, 1.14);
  bodyShape.arm *= clamp(0.94 + weightFactor * 0.1, 0.88, 1.18);

  const pelvis = mesh(new THREE.SphereGeometry(0.34, 9, 7), trouserMaterial);
  pelvis.scale.set(1.05 * bodyShape.belly, 0.78, 0.88 * bodyShape.depth);
  pelvis.position.y = 1.05;
  root.add(pelvis);
  const torso = mesh(new THREE.CapsuleGeometry(0.36, 0.82, 4, 8), shirt);
  torso.scale.set(bodyShape.width, bodyShape.torso, bodyShape.depth);
  torso.position.y = 1.78;
  root.add(torso);
  const shirtPanel = mesh(new THREE.BoxGeometry(0.052, 0.72, 0.44 * bodyShape.width), lightClothMaterial);
  shirtPanel.position.set(0.37 * bodyShape.width, 1.82, 0);
  root.add(shirtPanel);
  const tie = mesh(new THREE.BoxGeometry(0.065, 0.52, 0.085), tieMaterial);
  tie.position.set(0.405 * bodyShape.width, 1.78, 0);
  root.add(tie);
  const lapelLeft = mesh(new THREE.BoxGeometry(0.055, 0.62, 0.08), darkClothMaterial);
  lapelLeft.rotation.x = 0.38;
  lapelLeft.position.set(0.395 * bodyShape.width, 1.88, -0.18 * bodyShape.width);
  root.add(lapelLeft);
  const lapelRight = mesh(new THREE.BoxGeometry(0.055, 0.62, 0.08), darkClothMaterial);
  lapelRight.rotation.x = -0.38;
  lapelRight.position.set(0.395 * bodyShape.width, 1.88, 0.18 * bodyShape.width);
  root.add(lapelRight);
  if (profile.body === "slim") {
    tie.scale.y = 1.14;
  } else if (profile.body === "heavy") {
    const vest = mesh(new THREE.BoxGeometry(0.07, 0.78, 0.74 * bodyShape.width), darkClothMaterial);
    vest.position.set(0.39 * bodyShape.width, 1.74, 0);
    root.add(vest);
  } else if (profile.body === "round") {
    const pocket = mesh(new THREE.BoxGeometry(0.06, 0.2, 0.48), accessoryMaterial);
    pocket.position.set(0.39 * bodyShape.width, 1.6, 0);
    root.add(pocket);
  } else if (profile.body === "flashy") {
    const stripe = mesh(new THREE.BoxGeometry(0.06, 0.72, 0.1), tieMaterial);
    stripe.position.set(0.39 * bodyShape.width, 1.82, 0);
    root.add(stripe);
  } else if (profile.body === "stiff") {
    const jacketLine = mesh(new THREE.BoxGeometry(0.06, 0.68, 0.62), darkClothMaterial);
    jacketLine.position.set(0.39 * bodyShape.width, 1.82, 0);
    root.add(jacketLine);
  } else if (profile.body === "stocky") {
    const zip = mesh(new THREE.BoxGeometry(0.06, 0.68, 0.08), accessoryMaterial);
    zip.position.set(0.4 * bodyShape.width, 1.82, 0);
    root.add(zip);
  }
  const head = mesh(new THREE.SphereGeometry(0.32, 18, 12), faceMaterial);
  head.rotation.y = -Math.PI / 2;
  head.position.y = 2.7;
  root.add(head);
  const faceBadge = new THREE.Sprite(new THREE.SpriteMaterial({ map: faceTexture, depthTest: true, transparent: true }));
  faceBadge.position.set(0, 3.33, 0);
  faceBadge.scale.set(1.28, 1.28, 1);
  root.add(faceBadge);
  const hair = mesh(new THREE.SphereGeometry(0.33, 12, 6, 0, Math.PI * 2, 0, 1.62), hairMaterial);
  hair.position.y = 2.82;
  hair.scale.y = profile.face === "bald" ? 0.08 : 0.74;
  root.add(hair);

  const leftArm = createLimb(0.78, 0.12, skinMaterial);
  leftArm.scale.setScalar(bodyShape.arm);
  leftArm.position.set(0.04, 2.22, -0.43 * bodyShape.width);
  root.add(leftArm);
  const rightArm = createLimb(0.78, 0.12, skinMaterial);
  rightArm.scale.setScalar(bodyShape.arm);
  rightArm.position.set(0.04, 2.22, 0.43 * bodyShape.width);
  root.add(rightArm);
  const pantsMaterial = profile.body === "flashy" ? denimMaterial : trouserMaterial;
  const leftLeg = createLimb(0.9, 0.15, pantsMaterial);
  leftLeg.scale.setScalar(bodyShape.leg);
  leftLeg.position.set(0, 1.04, -0.21 * bodyShape.width);
  leftLeg.userData.home = leftLeg.position.clone();
  root.add(leftLeg);
  const rightLeg = createLimb(0.9, 0.15, pantsMaterial);
  rightLeg.scale.setScalar(bodyShape.leg);
  rightLeg.position.set(0, 1.04, 0.21 * bodyShape.width);
  rightLeg.userData.home = rightLeg.position.clone();
  root.add(rightLeg);
  for (const leg of [leftLeg, rightLeg]) {
    const boot = mesh(new THREE.BoxGeometry(0.43, 0.16, 0.23), bootMaterial);
    boot.position.set(0.13, -1.13, 0);
    leg.add(boot);
  }
  const sleeveMaterial = shirt;
  const leftSleeve = mesh(new THREE.CapsuleGeometry(0.14, 0.22, 3, 7), sleeveMaterial);
  leftSleeve.rotation.x = Math.PI / 2;
  leftSleeve.position.set(0.03, 2.1, -0.5 * bodyShape.width);
  root.add(leftSleeve);
  const rightSleeve = mesh(new THREE.CapsuleGeometry(0.14, 0.22, 3, 7), sleeveMaterial);
  rightSleeve.rotation.x = Math.PI / 2;
  rightSleeve.position.set(0.03, 2.1, 0.5 * bodyShape.width);
  root.add(rightSleeve);
  const shoes = mesh(new THREE.BoxGeometry(0.54, 0.08, 0.68 * bodyShape.width), bootMaterial);
  shoes.position.set(0.16, 0.05, 0);
  root.add(shoes);

  const scale = clamp(profile.height / 176, 0.93, 1.08);
  root.scale.set(scale, scale, scale);
  if (profile.body === "flashy") {
    const scarf = mesh(new THREE.TorusGeometry(0.38, 0.035, 6, 18), accessoryMaterial);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 2.28;
    root.add(scarf);
  }
  if (profile.body === "heavy" || profile.body === "stocky") {
    const belt = mesh(new THREE.BoxGeometry(0.84 * bodyShape.width, 0.09, 0.12 * bodyShape.depth), bootMaterial);
    belt.position.y = 1.35;
    root.add(belt);
  }
  if (profile.body === "stiff") {
    const collar = mesh(new THREE.BoxGeometry(0.58, 0.08, 0.86), accessoryMaterial);
    collar.position.y = 2.31;
    root.add(collar);
  }
  const healthBar = createHealthBar(team);
  return {
    root, torso, head, leftArm, rightArm, leftLeg, rightLeg, healthBar,
    team, profile, seed, stats: profile.stats,
    health: profile.stats.health, maxHealth: profile.stats.health,
    alive: true, cooldown: rand(seed + 31) * 0.45, attack: null, attackCount: 0, target: null,
    velocity: new THREE.Vector2(), hitPulse: 0, deathTime: 0, phase: rand(seed + 71) * Math.PI * 2,
  };
}

function statText(profile) {
  if (!profile) return "<strong>선택 필요</strong>캐릭터를 고르고 숫자를 입력하세요.";
  const s = profile.stats;
  return `<strong>${profile.name}</strong>${profile.height}cm / ${profile.weight}kg<br />공격 ${s.attack} · 방어 ${s.defense} · 체력 ${s.health}<br />속도 ${s.speed.toFixed(2)} · 전투력 ${s.power}`;
}

function populateTeamControl(select, preview, selectedId) {
  select.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "선택";
  select.append(empty);
  for (const profile of profiles) {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name;
    select.append(option);
  }
  select.value = selectedId || "";
  preview.innerHTML = statText(profiles.find((profile) => profile.id === select.value));
}

function selectedTeam(select, countInput) {
  const profile = profiles.find((item) => item.id === select.value);
  const count = clamp(Number.parseInt(countInput.value || "0", 10), 0, MAX_PER_TEAM);
  countInput.value = String(count);
  if (!profile || count < 1) return [];
  return Array.from({ length: count }, () => profile);
}

function clearFight() {
  while (fightGroup.children.length) fightGroup.remove(fightGroup.children[0]);
  while (effectGroup.children.length) effectGroup.remove(effectGroup.children[0]);
  fighters = [];
  hitPool = [];
}

function createTeams(redTeam, blueTeam) {
  const all = [];
  const teams = [redTeam, blueTeam];
  for (let team = 0; team < teams.length; team += 1) {
    const side = team === 0 ? -1 : 1;
    const roster = teams[team];
    const columns = Math.max(2, Math.ceil(Math.sqrt(roster.length)));
    for (let i = 0; i < roster.length; i += 1) {
      const profile = roster[i];
      const fighter = createFighter(team, profile, matchId * 1000 + i + team * 300);
      const row = Math.floor(i / columns);
      const lane = (i % columns) - (columns - 1) / 2;
      const x = side * (4.9 + row * 1.8 + rand(fighter.seed + 95) * 0.5);
      const z = lane * 2.45 + (rand(fighter.seed + 119) - 0.5) * 0.7;
      fighter.root.position.set(x, desertHeight(x, z), z);
      fighter.root.rotation.y = side < 0 ? 0 : Math.PI;
      fightGroup.add(fighter.root);
      all.push(fighter);
    }
  }
  fighters = all;
}

function createHitPool() {
  const hits = [];
  for (let i = 0; i < 32; i += 1) {
    const part = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), hitMaterial.clone());
    part.scale.setScalar(0.001);
    effectGroup.add(part);
    hits.push({ part, life: 0 });
  }
  return hits;
}

function createDustPuffs() {
  const dustCanvas = document.createElement("canvas");
  dustCanvas.width = 64;
  dustCanvas.height = 64;
  const dustContext = dustCanvas.getContext("2d");
  const glow = dustContext.createRadialGradient(32, 32, 2, 32, 32, 31);
  glow.addColorStop(0, "rgba(255, 223, 180, 0.4)");
  glow.addColorStop(1, "rgba(255, 195, 124, 0)");
  dustContext.fillStyle = glow;
  dustContext.fillRect(0, 0, 64, 64);
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(95 * 3);
  for (let i = 0; i < 95; i += 1) {
    const x = (rand(i + 720) - 0.5) * 42;
    const z = (rand(i + 980) - 0.5) * 28;
    positions[i * 3] = x;
    positions[i * 3 + 1] = desertHeight(x, z) + 0.6 + rand(i + 1120) * 1.7;
    positions[i * 3 + 2] = z;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: "#e7b783", map: new THREE.CanvasTexture(dustCanvas), opacity: 0.08, size: 3.4, transparent: true, depthWrite: false }),
  );
  scene.add(dust);
  return dust;
}

function livingCounts() {
  const counts = [0, 0];
  for (const fighter of fighters) if (fighter.alive) counts[fighter.team] += 1;
  return counts;
}

function findTarget(fighter) {
  let nearest = null;
  let bestDistance = Infinity;
  for (const enemy of fighters) {
    if (!enemy.alive || enemy.team === fighter.team) continue;
    const dx = enemy.root.position.x - fighter.root.position.x;
    const dz = enemy.root.position.z - fighter.root.position.z;
    const distance = dx * dx + dz * dz;
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = enemy;
    }
  }
  return nearest;
}

function emitHit(target, attack) {
  const effect = hitPool.find((hit) => hit.life <= 0);
  if (!effect) return;
  effect.life = attack.kind === "kick" ? 0.24 : 0.16;
  effect.part.position.set(target.root.position.x, target.root.position.y + (attack.kind === "kick" ? 1.18 : 2), target.root.position.z);
  effect.part.scale.setScalar(attack.kind === "kick" ? 1.8 : 1.35);
  effect.part.material.opacity = 0.9;
}

function defeat(fighter, attacker) {
  fighter.alive = false;
  fighter.attack = null;
  fighter.target = null;
  fighter.healthBar.group.visible = false;
  const dx = fighter.root.position.x - attacker.root.position.x;
  const dz = fighter.root.position.z - attacker.root.position.z;
  const length = Math.hypot(dx, dz) || 1;
  fighter.velocity.set((dx / length) * 1.7, (dz / length) * 1.7);
}

function landAttack(attacker, target, attack) {
  if (!target?.alive) return;
  const dx = target.root.position.x - attacker.root.position.x;
  const dz = target.root.position.z - attacker.root.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance > ATTACK_RANGE + 0.55) return;
  const rawDamage = attack.kind === "kick" ? attacker.stats.attack * 1.14 + 6 : attacker.stats.attack + 4;
  const guard = target.stats.defense * (attack.kind === "kick" ? 0.42 : 0.35);
  const swing = rand(attacker.seed + attacker.attackCount * 17.2) * 5;
  const damage = Math.max(4, Math.round(rawDamage - guard + swing));
  target.health = Math.max(0, target.health - damage);
  target.hitPulse = 0.22;
  target.velocity.x += (dx / (distance || 1)) * (attack.kind === "kick" ? 2.4 : 1.2);
  target.velocity.y += (dz / (distance || 1)) * (attack.kind === "kick" ? 2.4 : 1.2);
  emitHit(target, attack);
  if (target.health === 0) defeat(target, attacker);
}

function startAttack(fighter, target) {
  const kick = (fighter.attackCount + fighter.team + Math.floor(rand(fighter.seed + fighter.attackCount) * 3)) % 3 === 0;
  fighter.attack = { target, kind: kick ? "kick" : "punch", elapsed: 0, duration: kick ? 0.62 : 0.42, landed: false };
  fighter.attackCount += 1;
  fighter.cooldown = kick ? 0.92 : 0.5 + rand(fighter.seed + fighter.attackCount * 9) * 0.25;
}

function faceTarget(fighter, dx, dz, delta) {
  const desired = -Math.atan2(dz, dx);
  const turn = Math.atan2(Math.sin(desired - fighter.root.rotation.y), Math.cos(desired - fighter.root.rotation.y));
  fighter.root.rotation.y += turn * Math.min(1, delta * 9);
}

function updatePose(fighter, time, moving) {
  if (winner && fighter.alive && fighter.team === winningTeam) {
    const bounce = Math.abs(Math.sin(time * 7.5 + fighter.phase));
    fighter.leftArm.rotation.set(-0.85, 0, -2.75 + bounce * 0.16);
    fighter.rightArm.rotation.set(-0.85, 0, 2.75 - bounce * 0.16);
    fighter.leftLeg.position.copy(fighter.leftLeg.userData.home);
    fighter.rightLeg.position.copy(fighter.rightLeg.userData.home);
    fighter.leftLeg.rotation.set(0, 0, -0.18 + bounce * 0.26);
    fighter.rightLeg.rotation.set(0, 0, 0.18 - bounce * 0.26);
    fighter.torso.rotation.y = Math.sin(time * 5 + fighter.phase) * 0.18;
    fighter.torso.rotation.z = Math.sin(time * 7 + fighter.phase) * 0.08;
    fighter.head.rotation.z = Math.sin(time * 6 + fighter.phase) * 0.12;
    return;
  }

  const walk = Math.sin(time * 8.4 + fighter.phase) * moving;
  const punch = fighter.attack?.kind === "punch" ? Math.sin(easeInOut(fighter.attack.elapsed / fighter.attack.duration) * Math.PI) : 0;
  const kick = fighter.attack?.kind === "kick" ? Math.sin(easeInOut(fighter.attack.elapsed / fighter.attack.duration) * Math.PI) : 0;
  const recoil = fighter.hitPulse > 0 ? fighter.hitPulse * 2.2 : 0;
  fighter.leftArm.rotation.set(0, 0, -0.22 + Math.max(0, -walk) * 0.46 - punch * 0.42);
  fighter.rightArm.rotation.set(-punch * 1.25, 0, -0.18 + Math.max(0, walk) * 0.46 + punch * 2.75);
  fighter.leftLeg.rotation.set(0, 0, walk * 0.52 - kick * 0.35);
  fighter.rightLeg.rotation.set(0, 0, -walk * 0.52 + kick * 1.62);
  fighter.rightLeg.rotation.x = -kick * 1.55;
  fighter.leftLeg.position.copy(fighter.leftLeg.userData.home);
  fighter.rightLeg.position.copy(fighter.rightLeg.userData.home);
  fighter.rightLeg.position.x += kick * 0.42;
  fighter.rightLeg.position.y += kick * 0.42;
  fighter.torso.rotation.y = punch * 0.72;
  fighter.torso.rotation.z = punch * 0.48 - kick * 0.18 - recoil;
  fighter.head.rotation.z = recoil * 0.18 + punch * 0.08;
}

function updateFighter(fighter, delta, time) {
  if (!fighter.alive) {
    fighter.deathTime += delta;
    fighter.root.position.x += fighter.velocity.x * delta;
    fighter.root.position.z += fighter.velocity.y * delta;
    fighter.velocity.multiplyScalar(Math.max(0, 1 - delta * 3.4));
    fighter.root.position.y = desertHeight(fighter.root.position.x, fighter.root.position.z) - Math.min(0.22, fighter.deathTime * 0.18);
    fighter.root.rotation.z = -Math.min(Math.PI * 0.48, fighter.deathTime * 4.2);
    return;
  }
  if (winner && fighter.team === winningTeam) {
    fighter.velocity.multiplyScalar(Math.max(0, 1 - delta * 9));
    fighter.root.position.y = desertHeight(fighter.root.position.x, fighter.root.position.z);
    fighter.root.position.y += Math.abs(Math.sin(time * 7.5 + fighter.phase)) * 0.42;
    fighter.root.rotation.z = Math.sin(time * 6 + fighter.phase) * 0.06;
    updatePose(fighter, time, 0);
    return;
  }
  if (winner) {
    updatePose(fighter, time, 0);
    return;
  }

  fighter.cooldown -= delta;
  fighter.hitPulse = Math.max(0, fighter.hitPulse - delta);
  fighter.target = fighter.target?.alive ? fighter.target : findTarget(fighter);
  let moving = 0;
  if (fighter.target && !winner) {
    const dx = fighter.target.root.position.x - fighter.root.position.x;
    const dz = fighter.target.root.position.z - fighter.root.position.z;
    const distance = Math.hypot(dx, dz) || 1;
    faceTarget(fighter, dx, dz, delta);
    if (fighter.attack) {
      fighter.attack.elapsed += delta;
      const progress = fighter.attack.elapsed / fighter.attack.duration;
      if (!fighter.attack.landed && progress > 0.45) {
        fighter.attack.landed = true;
        landAttack(fighter, fighter.attack.target, fighter.attack);
      }
      if (progress >= 1) fighter.attack = null;
    } else if (distance <= ATTACK_RANGE && fighter.cooldown <= 0) {
      startAttack(fighter, fighter.target);
    } else if (distance > ATTACK_RANGE * 0.82) {
      moving = 1;
      const step = Math.min(distance - ATTACK_RANGE * 0.75, fighter.stats.speed * delta);
      fighter.root.position.x += (dx / distance) * step;
      fighter.root.position.z += (dz / distance) * step;
    }
  }
  fighter.velocity.multiplyScalar(Math.max(0, 1 - delta * 7.4));
  fighter.root.position.x = THREE.MathUtils.clamp(fighter.root.position.x + fighter.velocity.x * delta, -32, 32);
  fighter.root.position.z = THREE.MathUtils.clamp(fighter.root.position.z + fighter.velocity.y * delta, -23, 23);
  fighter.root.position.y = desertHeight(fighter.root.position.x, fighter.root.position.z) + moving * Math.abs(Math.sin(time * 8.4 + fighter.phase)) * 0.045;
  fighter.root.rotation.z = 0;
  updatePose(fighter, time, moving);
}

function separateFighters() {
  for (let i = 0; i < fighters.length; i += 1) {
    const a = fighters[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < fighters.length; j += 1) {
      const b = fighters[j];
      if (!b.alive) continue;
      const dx = b.root.position.x - a.root.position.x;
      const dz = b.root.position.z - a.root.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance === 0 || distance > 0.92) continue;
      const push = (0.92 - distance) * 0.028;
      a.velocity.x -= (dx / distance) * push;
      a.velocity.y -= (dz / distance) * push;
      b.velocity.x += (dx / distance) * push;
      b.velocity.y += (dz / distance) * push;
    }
  }
}

function updateHealthBars() {
  for (const fighter of fighters) {
    if (!fighter.alive) continue;
    const amount = Math.max(0.001, fighter.health / fighter.maxHealth);
    fighter.healthBar.group.position.set(fighter.root.position.x, fighter.root.position.y + 4.2 * fighter.root.scale.y, fighter.root.position.z);
    fighter.healthBar.group.quaternion.copy(camera.quaternion);
    fighter.healthBar.fill.scale.x = amount;
    fighter.healthBar.fill.position.x = -(1 - amount) * 0.5;
  }
}

function updateHitPool(delta) {
  for (const hit of hitPool) {
    if (hit.life <= 0) continue;
    hit.life -= delta;
    const amount = clamp01(hit.life / 0.24);
    hit.part.scale.multiplyScalar(1 + delta * 6);
    hit.part.material.opacity = amount * 0.75;
    if (hit.life <= 0) hit.part.scale.setScalar(0.001);
  }
}

function updateStateText() {
  if (!battleActive) {
    battleState.textContent = "캐릭터와 인원을 입력한 뒤 시작하세요";
    return;
  }
  const [red, blue] = livingCounts();
  if (!winner && (red === 0 || blue === 0)) {
    winningTeam = red > 0 ? 0 : 1;
    winner = red > 0 ? `${currentMatchNames[0]} 승리` : `${currentMatchNames[1]} 승리`;
  }
  battleState.textContent = winner || `${currentMatchNames[0]} ${red}명 생존 | ${currentMatchNames[1]} ${blue}명 생존`;
}

function startBattle() {
  const redTeam = selectedTeam(redCharacter, redCount);
  const blueTeam = selectedTeam(blueCharacter, blueCount);
  if (!redTeam.length || !blueTeam.length) {
    clearFight();
    winner = "";
    battleActive = false;
    battleState.textContent = "캐릭터와 인원을 입력한 뒤 시작하세요";
    return;
  }
  matchId += 1;
  winner = "";
  winningTeam = -1;
  battleActive = true;
  currentMatchNames = [redTeam[0].name, blueTeam[0].name];
  clearFight();
  createTeams(redTeam, blueTeam);
  hitPool = createHitPool();
  updateStateText();
}

addWorld();
populateTeamControl(redCharacter, redPreview, "");
populateTeamControl(blueCharacter, bluePreview, "");
redCharacter.addEventListener("change", () => {
  redPreview.innerHTML = statText(profiles.find((profile) => profile.id === redCharacter.value));
});
blueCharacter.addEventListener("change", () => {
  bluePreview.innerHTML = statText(profiles.find((profile) => profile.id === blueCharacter.value));
});
startButton.addEventListener("click", startBattle);

const dust = createDustPuffs();
const clock = new THREE.Clock();
const lookTarget = new THREE.Vector3();
battleState.textContent = "캐릭터와 인원을 입력한 뒤 시작하세요";

function resize() {
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.045);
  const time = clock.elapsedTime;
  for (const fighter of fighters) updateFighter(fighter, delta, time);
  separateFighters();
  updateHealthBars();
  updateHitPool(delta);
  updateStateText();
  dust.material.opacity = 0.07 + Math.sin(time * 0.8) * 0.012;
  dust.rotation.y = Math.sin(time * 0.14) * 0.045;
  camera.position.x = Math.sin(time * 0.16) * 1.9;
  camera.position.y = 20 + Math.sin(time * 0.2) * 0.5;
  camera.position.z = 22 + Math.cos(time * 0.12) * 0.65;
  lookTarget.set(0, 1.6, Math.sin(time * 0.11) * 0.9);
  camera.lookAt(lookTarget);
  renderer.render(scene, camera);
}

window.addEventListener("resize", resize);
resize();
renderer.setAnimationLoop(animate);
