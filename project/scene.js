import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const canvas = document.querySelector("#scene");
const battleState = document.querySelector("#battle-state");
const TEAM_SIZE = 18;
const ATTACK_RANGE = 1.8;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#bd895c");
scene.fog = new THREE.FogExp2("#ba8a62", 0.0082);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 420);
camera.position.set(0, 31, 40);

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

function rand(seed) {
  const value = Math.sin(seed * 173.19) * 49318.11;
  return value - Math.floor(value);
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function easeInOut(value) {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

function desertHeight(x, z) {
  const dunes =
    Math.sin(x * 0.052 + z * 0.018) * 1.35 +
    Math.sin(z * 0.083 - x * 0.026) * 0.9 +
    Math.cos((x + z) * 0.036) * 0.5;
  const farRidge = Math.max(0, 1 - Math.abs(z + 72) / 25) * 6.5;
  return dunes + farRidge;
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
    new THREE.MeshStandardMaterial({
      color: "#9d5f37",
      map: buildSandTexture(),
      roughness: 1,
    }),
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
const hairMaterial = new THREE.MeshStandardMaterial({ color: "#1e1612", roughness: 1 });
const redMaterial = new THREE.MeshStandardMaterial({ color: "#8a2920", roughness: 1 });
const blueMaterial = new THREE.MeshStandardMaterial({ color: "#245b6a", roughness: 1 });
const bootMaterial = new THREE.MeshStandardMaterial({ color: "#16100d", roughness: 1 });
const healthBackMaterial = new THREE.MeshBasicMaterial({
  color: "#291714",
  depthTest: false,
  transparent: true,
  opacity: 0.9,
});
const healthFillMaterials = [
  new THREE.MeshBasicMaterial({ color: "#f24d3d", depthTest: false }),
  new THREE.MeshBasicMaterial({ color: "#3bd4d2", depthTest: false }),
];
const hitMaterial = new THREE.MeshBasicMaterial({
  color: "#ffe0a1",
  depthWrite: false,
  opacity: 0.9,
  transparent: true,
});

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
  scene.add(group);
  return { group, fill };
}

function createFighter(team, seed) {
  const root = new THREE.Group();
  const shirt = team === 0 ? redMaterial : blueMaterial;

  const pelvis = mesh(new THREE.SphereGeometry(0.34, 9, 7), trouserMaterial);
  pelvis.scale.set(1.05, 0.78, 0.88);
  pelvis.position.y = 1.05;
  root.add(pelvis);

  const torso = mesh(new THREE.CapsuleGeometry(0.36, 0.82, 4, 8), shirt);
  torso.position.y = 1.82;
  root.add(torso);

  const neck = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 7), skinMaterial);
  neck.position.y = 2.42;
  root.add(neck);

  const head = mesh(new THREE.SphereGeometry(0.31, 12, 9), skinMaterial);
  head.position.y = 2.76;
  root.add(head);

  const hair = mesh(new THREE.SphereGeometry(0.32, 12, 6, 0, Math.PI * 2, 0, 1.7), hairMaterial);
  hair.position.y = 2.82;
  hair.scale.y = 0.72;
  root.add(hair);

  const leftArm = createLimb(0.78, 0.12, skinMaterial);
  leftArm.position.set(0.04, 2.22, -0.43);
  root.add(leftArm);

  const rightArm = createLimb(0.78, 0.12, skinMaterial);
  rightArm.position.set(0.04, 2.22, 0.43);
  root.add(rightArm);

  const leftLeg = createLimb(0.9, 0.15, trouserMaterial);
  leftLeg.position.set(0, 1.04, -0.21);
  root.add(leftLeg);

  const rightLeg = createLimb(0.9, 0.15, trouserMaterial);
  rightLeg.position.set(0, 1.04, 0.21);
  root.add(rightLeg);

  for (const leg of [leftLeg, rightLeg]) {
    const boot = mesh(new THREE.BoxGeometry(0.43, 0.16, 0.23), bootMaterial);
    boot.position.set(0.13, -1.13, 0);
    leg.add(boot);
  }

  const healthBar = createHealthBar(team);
  root.scale.setScalar(0.94 + rand(seed + 14) * 0.12);

  return {
    root,
    torso,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    healthBar,
    team,
    seed,
    health: 100,
    alive: true,
    cooldown: rand(seed + 31) * 0.45,
    attack: null,
    attackCount: 0,
    target: null,
    velocity: new THREE.Vector2(),
    hitPulse: 0,
    deathTime: 0,
    phase: rand(seed + 71) * Math.PI * 2,
  };
}

function createTeams() {
  const army = [];

  for (let team = 0; team < 2; team += 1) {
    const side = team === 0 ? -1 : 1;

    for (let i = 0; i < TEAM_SIZE; i += 1) {
      const fighter = createFighter(team, i + team * 200);
      const row = Math.floor(i / 6);
      const lane = (i % 6) - 2.5;
      const x = side * (5.4 + row * 1.8 + rand(fighter.seed + 95) * 0.55);
      const z = lane * 3.15 + (rand(fighter.seed + 119) - 0.5) * 0.9;
      fighter.root.position.set(x, desertHeight(x, z), z);
      fighter.root.rotation.y = side < 0 ? 0 : Math.PI;
      scene.add(fighter.root);
      army.push(fighter);
    }
  }

  return army;
}

function createHitPool() {
  const hits = [];

  for (let i = 0; i < 24; i += 1) {
    const part = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), hitMaterial.clone());
    part.scale.setScalar(0.001);
    scene.add(part);
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
    new THREE.PointsMaterial({
      color: "#e7b783",
      map: new THREE.CanvasTexture(dustCanvas),
      opacity: 0.08,
      size: 3.4,
      transparent: true,
      depthWrite: false,
    }),
  );
  scene.add(dust);
  return dust;
}

function livingCounts() {
  const counts = [0, 0];
  for (const fighter of fighters) {
    if (fighter.alive) {
      counts[fighter.team] += 1;
    }
  }
  return counts;
}

function findTarget(fighter) {
  let nearest = null;
  let bestDistance = Infinity;

  for (const enemy of fighters) {
    if (!enemy.alive || enemy.team === fighter.team) {
      continue;
    }

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
  if (!effect) {
    return;
  }

  effect.life = attack.kind === "kick" ? 0.24 : 0.16;
  effect.part.position.set(
    target.root.position.x,
    target.root.position.y + (attack.kind === "kick" ? 1.18 : 2),
    target.root.position.z,
  );
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
  if (!target?.alive) {
    return;
  }

  const dx = target.root.position.x - attacker.root.position.x;
  const dz = target.root.position.z - attacker.root.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance > ATTACK_RANGE + 0.55) {
    return;
  }

  const damageBase = attack.kind === "kick" ? 18 : 12;
  const damage = damageBase + Math.floor(rand(attacker.seed + attacker.attackCount * 17.2) * 8);
  target.health = Math.max(0, target.health - damage);
  target.hitPulse = 0.22;
  target.velocity.x += (dx / (distance || 1)) * (attack.kind === "kick" ? 2.4 : 1.2);
  target.velocity.y += (dz / (distance || 1)) * (attack.kind === "kick" ? 2.4 : 1.2);
  emitHit(target, attack);

  if (target.health === 0) {
    defeat(target, attacker);
  }
}

function startAttack(fighter, target) {
  const kick =
    (fighter.attackCount + fighter.team + Math.floor(rand(fighter.seed + fighter.attackCount) * 3)) %
      3 ===
    0;
  fighter.attack = {
    target,
    kind: kick ? "kick" : "punch",
    elapsed: 0,
    duration: kick ? 0.62 : 0.42,
    landed: false,
  };
  fighter.attackCount += 1;
  fighter.cooldown = kick ? 0.9 : 0.48 + rand(fighter.seed + fighter.attackCount * 9) * 0.24;
}

function faceTarget(fighter, dx, dz, delta) {
  const desired = -Math.atan2(dz, dx);
  const turn = Math.atan2(
    Math.sin(desired - fighter.root.rotation.y),
    Math.cos(desired - fighter.root.rotation.y),
  );
  fighter.root.rotation.y += turn * Math.min(1, delta * 9);
}

function updatePose(fighter, time, moving) {
  const walk = Math.sin(time * 8.4 + fighter.phase) * moving;
  const punch =
    fighter.attack?.kind === "punch"
      ? Math.sin(easeInOut(fighter.attack.elapsed / fighter.attack.duration) * Math.PI)
      : 0;
  const kick =
    fighter.attack?.kind === "kick"
      ? Math.sin(easeInOut(fighter.attack.elapsed / fighter.attack.duration) * Math.PI)
      : 0;
  const recoil = fighter.hitPulse > 0 ? fighter.hitPulse * 2.2 : 0;

  fighter.leftArm.rotation.z = -0.2 + Math.max(0, -walk) * 0.46;
  fighter.rightArm.rotation.z = -0.2 + Math.max(0, walk) * 0.46 + punch * 1.92;
  fighter.leftLeg.rotation.z = walk * 0.52;
  fighter.rightLeg.rotation.z = -walk * 0.52 + kick * 1.42;
  fighter.torso.rotation.z = punch * 0.18 - kick * 0.12 - recoil;
}

function updateFighter(fighter, delta, time) {
  if (!fighter.alive) {
    fighter.deathTime += delta;
    fighter.root.position.x += fighter.velocity.x * delta;
    fighter.root.position.z += fighter.velocity.y * delta;
    fighter.velocity.multiplyScalar(Math.max(0, 1 - delta * 3.4));
    fighter.root.position.y = desertHeight(fighter.root.position.x, fighter.root.position.z);
    fighter.root.rotation.z = -Math.min(Math.PI * 0.48, fighter.deathTime * 4.2);
    fighter.root.position.y -= Math.min(0.22, fighter.deathTime * 0.18);
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
      if (progress >= 1) {
        fighter.attack = null;
      }
    } else if (distance <= ATTACK_RANGE && fighter.cooldown <= 0) {
      startAttack(fighter, fighter.target);
    } else if (distance > ATTACK_RANGE * 0.82) {
      moving = 1;
      const speed = 3.65 + rand(fighter.seed + 151) * 0.55;
      const step = Math.min(distance - ATTACK_RANGE * 0.75, speed * delta);
      fighter.root.position.x += (dx / distance) * step;
      fighter.root.position.z += (dz / distance) * step;
    }
  }

  fighter.velocity.multiplyScalar(Math.max(0, 1 - delta * 7.4));
  fighter.root.position.x += fighter.velocity.x * delta;
  fighter.root.position.z += fighter.velocity.y * delta;
  fighter.root.position.x = THREE.MathUtils.clamp(fighter.root.position.x, -32, 32);
  fighter.root.position.z = THREE.MathUtils.clamp(fighter.root.position.z, -23, 23);
  fighter.root.position.y = desertHeight(fighter.root.position.x, fighter.root.position.z);
  fighter.root.position.y += moving * Math.abs(Math.sin(time * 8.4 + fighter.phase)) * 0.045;
  fighter.root.rotation.z = 0;
  updatePose(fighter, time, moving);
}

function separateFighters() {
  for (let i = 0; i < fighters.length; i += 1) {
    const a = fighters[i];
    if (!a.alive) {
      continue;
    }

    for (let j = i + 1; j < fighters.length; j += 1) {
      const b = fighters[j];
      if (!b.alive) {
        continue;
      }

      const dx = b.root.position.x - a.root.position.x;
      const dz = b.root.position.z - a.root.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance === 0 || distance > 0.92) {
        continue;
      }

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
    if (!fighter.alive) {
      continue;
    }

    const amount = Math.max(0.001, fighter.health / 100);
    fighter.healthBar.group.position.set(
      fighter.root.position.x,
      fighter.root.position.y + 3.55 * fighter.root.scale.y,
      fighter.root.position.z,
    );
    fighter.healthBar.group.quaternion.copy(camera.quaternion);
    fighter.healthBar.fill.scale.x = amount;
    fighter.healthBar.fill.position.x = -(1 - amount) * 0.5;
  }
}

function updateHitPool(delta) {
  for (const hit of hitPool) {
    if (hit.life <= 0) {
      continue;
    }

    hit.life -= delta;
    const amount = clamp01(hit.life / 0.24);
    hit.part.scale.multiplyScalar(1 + delta * 6);
    hit.part.material.opacity = amount * 0.75;
    if (hit.life <= 0) {
      hit.part.scale.setScalar(0.001);
    }
  }
}

function updateStateText() {
  const [red, blue] = livingCounts();
  if (!winner && (red === 0 || blue === 0)) {
    winner = red > 0 ? "Red team wins" : "Blue team wins";
  }
  battleState.textContent = winner || `Red ${red} alive | Blue ${blue} alive`;
}

addWorld();
const fighters = createTeams();
const hitPool = createHitPool();
const dust = createDustPuffs();
const clock = new THREE.Clock();
const lookTarget = new THREE.Vector3();
let winner = "";
updateStateText();

function resize() {
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.045);
  const time = clock.elapsedTime;

  for (const fighter of fighters) {
    updateFighter(fighter, delta, time);
  }

  separateFighters();
  updateHealthBars();
  updateHitPool(delta);
  updateStateText();

  dust.material.opacity = 0.07 + Math.sin(time * 0.8) * 0.012;
  dust.rotation.y = Math.sin(time * 0.14) * 0.045;
  camera.position.x = Math.sin(time * 0.16) * 3.1;
  camera.position.y = 31 + Math.sin(time * 0.2) * 0.85;
  camera.position.z = 40 + Math.cos(time * 0.12) * 1.3;
  lookTarget.set(0, 1.6, Math.sin(time * 0.11) * 0.9);
  camera.lookAt(lookTarget);
  renderer.render(scene, camera);
}

window.addEventListener("resize", resize);
resize();
renderer.setAnimationLoop(animate);
