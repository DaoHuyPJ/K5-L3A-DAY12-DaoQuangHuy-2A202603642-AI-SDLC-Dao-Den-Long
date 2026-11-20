// Browser front-end. All gameplay lives in ../sim/world.js (same code as headless);
// this file reads input, steps the sim at a fixed 60 Hz, and draws state, menus, HUD and sound.
import * as THREE from 'three';
import { NIGHTS, RULES, TICK_RATE, TUNING } from '../sim/config.js';
import { capacity, createGame, lightCost, makeRng, step } from '../sim/world.js';
import { Sfx } from './sfx.js';
import { blinkOn, lanternLook } from './lanternLook.js';
import { C } from './palette.js';
import { BENCH, benchCamera, benchStats, createBenchGame } from '../sim/bench.js';

const $ = (id) => document.getElementById(id);
const DT = 1 / TICK_RATE;
const params = new URLSearchParams(location.search);


// ---------- settings (saved between sessions) ----------
const settings = { volume: 0.7, sens: 0.25, colorBlind: false };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem('ddl-settings') || '{}'));
} catch {
  /* storage unavailable: defaults */
}
const saveSettings = () => {
  try {
    localStorage.setItem('ddl-settings', JSON.stringify(settings));
  } catch {
    /* ignore */
  }
};

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.sky);
scene.fog = new THREE.Fog(C.fog, 30, 120);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);
const ambient = new THREE.HemisphereLight(0x9aa8e0, 0x2a3040, 0.15); // intensity = 0.15 + 0.55 * lit/total
scene.add(ambient);
const moon = new THREE.DirectionalLight(0x9fb0ff, 0.35);
moon.position.set(-30, 60, -20);
scene.add(moon);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

const sea = new THREE.Mesh(new THREE.CircleGeometry(300, 48), mat(C.sea, { emissive: 0x061a24 }));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -9;
scene.add(sea);

// ---------- per-night world ----------
const world = new THREE.Group();
scene.add(world);
const lanternViews = new Map();

function disc(r, h, topY, x = 0, z = 0, color = C.grass) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64), mat(color));
  m.position.set(x, topY - h / 2, z);
  world.add(m);
  const rim = new THREE.Mesh(new THREE.RingGeometry(r - 1.2, r, 64), mat(C.sand, { side: THREE.DoubleSide }));
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(x, topY + 0.02, z);
  world.add(rim);
}
function pad(pd) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(pd.r, pd.r, 0.12, 24), mat(C.gold, { emissive: C.gold, emissiveIntensity: 0.6 }));
  m.position.set(pd.pos[0], pd.pos[1] + 0.06, pd.pos[2]);
  world.add(m);
}
function decorate(night, count) {
  const rng = makeRng(100 + night);
  const N = NIGHTS[night];
  const trunk = mat(C.wood), leaf = mat(0x1f4a3e);
  for (let i = 0; i < count; i++) {
    const x = (rng() - 0.5) * 120, z = (rng() - 0.5) * 120;
    const y = N.ground(x, z);
    if (y === null || y > 7 || N.lanterns.some((l) => Math.hypot(l[0] - x, l[2] - z) < 5)) continue;
    if (N.moteSpawns.some((p) => Math.hypot(p[0] - x, p[2] - z) < 2.5) || Math.hypot(x - N.start[0], z - N.start[2]) < 4) continue;
    if (N.ground(x + 1.5, z) !== y || N.ground(x - 1.5, z) !== y || N.ground(x, z + 1.5) !== y || N.ground(x, z - 1.5) !== y) continue;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2), trunk);
    t.position.set(x, y + 0.6, z);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.9 + rng() * 0.5, 2.2 + rng(), 7), leaf);
    c.position.set(x, y + 2.2, z);
    world.add(t, c);
  }
}

function buildWorld(night) {
  world.clear();
  lanternViews.clear();
  const N = NIGHTS[night];
  if (night === 1) {
    disc(40, 4, 0);
  } else if (night === 2) {
    disc(28, 4, 0);
    disc(28, 4, 0, 70, 0);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 4), mat(C.wood));
    bridge.position.set(35, -0.15, 0);
    world.add(bridge);
    for (let x = 27; x <= 43; x += 2) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 4.1), mat(C.wood));
      plank.position.set(x, 0.01, 0);
      world.add(plank);
    }
  } else {
    disc(45, 4, 0);
    // tier 1: half annulus 12–24 m, z > 0, top at Y = 3
    const sh = new THREE.Shape();
    sh.moveTo(24, 0);
    sh.absarc(0, 0, 24, 0, Math.PI, false);
    sh.lineTo(-12, 0);
    sh.absarc(0, 0, 12, Math.PI, 0, true);
    const t1 = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: false, curveSegments: 48 }), mat(C.grass));
    t1.rotation.x = Math.PI / 2;
    t1.position.y = 3;
    world.add(t1);
    const t2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 48), mat(C.grass));
    t2.position.y = 3;
    world.add(t2);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 24), mat(C.wood));
    tower.position.y = 10;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3, 2.5, 24), mat(0x3a2a20));
    roof.position.y = 15.2;
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.gold, { metalness: 0.6 }));
    bell.position.y = 13.4;
    bell.rotation.x = Math.PI;
    world.add(tower, roof, bell);
    for (const d of [30, 150]) {
      const wedge = new THREE.Shape([new THREE.Vector2(24, 0), new THREE.Vector2(30, 0), new THREE.Vector2(24, 3)]);
      const ramp = new THREE.Mesh(new THREE.ExtrudeGeometry(wedge, { depth: 3, bevelEnabled: false }), mat(C.sand));
      ramp.geometry.translate(0, 0, -1.5);
      ramp.rotation.y = -(d * Math.PI) / 180;
      world.add(ramp);
    }
  }
  N.pads.forEach(pad);
  decorate(night, night === 2 ? 40 : 70);
  N.lanterns.forEach((pos, i) => {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 3), mat(C.wood));
    pole.position.y = 1.5;
    const paperMat = mat(C.off, { emissive: C.lit, emissiveIntensity: 0 });
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 16), paperMat);
    paper.position.y = 3.3;
    const coreMat = new THREE.MeshBasicMaterial({ color: C.core, transparent: true, opacity: 0 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), coreMat);
    core.position.y = 3.3;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.35, 16), mat(0x2a1a10));
    cap.position.y = 3.95;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(TUNING.safe_radius - 0.12, TUNING.safe_radius, 64),
      new THREE.MeshBasicMaterial({ color: C.lit, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    const light = new THREE.PointLight(C.lit, 0, 24, 1.4);
    light.position.y = 3.3;
    // progress label above unlit lanterns ("L1 · 6/10")
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    labelTex.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, depthTest: false, transparent: true, sizeAttenuation: false }));
    label.scale.set(0.16, 0.04, 1); // constant on-screen size
    label.position.y = 4.8;
    // torn paper (colour-blind mode): two dark crossing rips on the front and back of the paper
    const tear = new THREE.Group();
    const ripMat = new THREE.MeshBasicMaterial({ color: 0x05060c });
    for (const [rz, z] of [[0.7, 0.57], [-0.7, 0.57], [0.7, -0.57], [-0.7, -0.57]]) {
      const rip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.04), ripMat);
      rip.position.set(0, 3.3, z);
      rip.rotation.z = rz;
      tear.add(rip);
    }
    tear.visible = false;
    group.add(pole, paper, core, cap, ring, light, label, tear);
    group.position.set(pos[0], pos[1], pos[2]);
    world.add(group);
    lanternViews.set(`L${i + 1}`, { group, paper, paperMat, coreMat, ring, light, glow: 0, label, labelCanvas, labelTex, labelText: '', tear });
  });
}

// ---------- Mây ----------
const player = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.0, 12), mat(C.shirt));
  body.position.y = 0.5;
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.07, 8, 16), mat(C.scarf));
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.02;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), mat(0xf2c9a0));
  head.position.y = 1.27;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.4, 24), mat(C.sand)); // nón lá
  hat.position.y = 1.64;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshBasicMaterial({ color: C.lit }));
  lamp.position.set(0.62, 1.1, 0);
  player.add(body, scarf, head, hat, lamp);
}
const playerLight = new THREE.PointLight(C.lit, 2, 11, 1.6);
playerLight.position.set(0.6, 1.2, 0);
player.add(playerLight);
scene.add(player);
const orbitGeo = new THREE.SphereGeometry(0.06, 8, 6);
const moteCoreMat = new THREE.MeshBasicMaterial({ color: C.moteCore });
const moteHaloMat = new THREE.MeshBasicMaterial({ color: C.moteHalo, transparent: true, opacity: 0.35, depthWrite: false });
const orbiters = Array.from({ length: TUNING.carry_capacity }, () => {
  const m = new THREE.Mesh(orbitGeo, moteCoreMat);
  player.add(m);
  return m;
});

// ---------- dynamic entities ----------
const views = { drifters: new Map(), charms: new Map() }; // shades + motes are instanced (see INST below)
const moteGeo = new THREE.SphereGeometry(0.1, 8, 6);
const haloGeo = new THREE.SphereGeometry(0.3, 10, 8);
const shadeGeo = new THREE.SphereGeometry(0.75, 18, 14);
const eyeGeo = new THREE.SphereGeometry(0.09, 8, 6);
// ---------- Phase 4 perf: shades and motes drawn as InstancedMesh (≈6 draw calls instead of ≈1000 in the benchmark) ----------
const INST_CAP = 512;
function instanced(geo, material, cap) {
  const m = new THREE.InstancedMesh(geo, material, cap);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.count = 0;
  m.frustumCulled = false; // instances span the whole island
  scene.add(m);
  return m;
}
const tint = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const INST = {};
function initInstances() {
  INST.body = instanced(shadeGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), INST_CAP);
  INST.rim = instanced(shadeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide, transparent: true, opacity: 0.9 }), INST_CAP);
  INST.eyes = instanced(eyeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), INST_CAP * 2);
  INST.moteCore = instanced(moteGeo, moteCoreMat, INST_CAP);
  INST.moteHalo = instanced(haloGeo, moteHaloMat, INST_CAP);
  const white = new THREE.Color(0xffffff);
  for (let i = 0; i < INST_CAP; i++) {
    INST.body.setColorAt(i, white);
    INST.rim.setColorAt(i, white);
    INST.eyes.setColorAt(2 * i, white);
    INST.eyes.setColorAt(2 * i + 1, white);
  }
}
const dummy = new THREE.Object3D();
const m4 = new THREE.Matrix4();
const EYE_L = new THREE.Matrix4().makeTranslation(-0.22, 0.2, 0.64);
const EYE_R = new THREE.Matrix4().makeTranslation(0.22, 0.2, 0.64);
function drawShades(t, p) {
  const n = Math.min(game.shades.length, INST_CAP);
  const rimHex = settings.colorBlind ? C.cbShadeRim : C.shadeRim;
  const cBody = tint(C.shade), cBodyStun = tint(C.shadeStun), cRim = tint(rimHex), cRimStun = tint(rimHex, 0.35);
  const cEye = tint(settings.colorBlind ? C.cbShadeRim : 0xd9b8ff);
  for (let i = 0; i < n; i++) {
    const s = game.shades[i];
    const stunned = s.state === 'stunned';
    const k = s.state === 'spawning' ? 0.4 + 0.6 * (1 - s.stateTicks / RULES.shade_spawn_ticks) : stunned ? 0.85 + Math.sin(t * 20) * 0.05 : 1;
    dummy.position.set(s.pos[0], s.pos[1] + Math.sin(t * 3 + s.pos[2]) * 0.1, s.pos[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.lookAt(p.pos[0], s.pos[1], p.pos[2]);
    dummy.scale.set(k, k * 1.15, k);
    dummy.updateMatrix();
    INST.body.setMatrixAt(i, dummy.matrix);
    dummy.scale.set(k * 1.09, k * 1.25, k * 1.09);
    dummy.updateMatrix();
    INST.rim.setMatrixAt(i, dummy.matrix);
    dummy.scale.setScalar(k);
    dummy.updateMatrix();
    INST.eyes.setMatrixAt(2 * i, m4.multiplyMatrices(dummy.matrix, EYE_L));
    INST.eyes.setMatrixAt(2 * i + 1, m4.multiplyMatrices(dummy.matrix, EYE_R));
    INST.body.setColorAt(i, stunned ? cBodyStun : cBody);
    INST.rim.setColorAt(i, stunned ? cRimStun : cRim);
    INST.eyes.setColorAt(2 * i, cEye);
    INST.eyes.setColorAt(2 * i + 1, cEye);
  }
  INST.body.count = INST.rim.count = n;
  INST.eyes.count = 2 * n;
  for (const m of [INST.body, INST.rim, INST.eyes]) {
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor.needsUpdate = true;
  }
}
function drawMotes(t) {
  const n = Math.min(game.motes.length, INST_CAP);
  for (let i = 0; i < n; i++) {
    const m = game.motes[i];
    const visible = m.ttl === null || m.ttl > 90 || Math.floor(t * 8) % 2 === 0; // dropped motes blink before vanishing
    dummy.position.set(m.pos[0], m.pos[1] + 0.8 + Math.sin(t * 2.5 + m.pos[0]) * 0.25, m.pos[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(visible ? 1 : 0);
    dummy.updateMatrix();
    INST.moteCore.setMatrixAt(i, dummy.matrix);
    INST.moteHalo.setMatrixAt(i, dummy.matrix);
  }
  INST.moteCore.count = INST.moteHalo.count = n;
  INST.moteCore.instanceMatrix.needsUpdate = INST.moteHalo.instanceMatrix.needsUpdate = true;
}

const SHADE_MAT = {
  body: mat(C.shade, { roughness: 1 }),
  bodyStun: mat(C.shadeStun, { roughness: 1 }),
  rim: new THREE.MeshBasicMaterial({ color: C.shadeRim, side: THREE.BackSide, transparent: true, opacity: 0.9 }),
  rimStun: new THREE.MeshBasicMaterial({ color: C.shadeRim, side: THREE.BackSide, transparent: true, opacity: 0.3 }),
  eye: new THREE.MeshBasicMaterial({ color: 0xd9b8ff }),
};
const makers = {
  drifters() {
    const geo = new THREE.PlaneGeometry(2.4, 0.35, 16, 1);
    const m = new THREE.Mesh(geo, mat(C.drifter, { side: THREE.DoubleSide, emissive: C.drifter, emissiveIntensity: 0.25, transparent: true, opacity: 0.9 }));
    const g = new THREE.Group();
    g.add(m);
    g.userData = { geo, base: geo.attributes.position.array.slice() };
    return g;
  },
  charms() {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.76, 0.04), mat(C.gold, { emissive: C.gold, emissiveIntensity: 0.4 }));
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.66, 0.06), mat(C.scarf, { emissive: C.scarf, emissiveIntensity: 0.3 }));
    g.add(frame, paper);
    return g;
  },
};
function sync(kind, items) {
  const map = views[kind];
  const alive = new Set();
  for (const it of items) {
    alive.add(it.id);
    if (!map.has(it.id)) {
      const v = makers[kind]();
      scene.add(v);
      map.set(it.id, v);
    }
  }
  for (const [id, v] of map) if (!alive.has(id)) {
    scene.remove(v);
    map.delete(id);
  }
}
function clearEntities() {
  for (const k of Object.keys(views)) {
    for (const v of views[k].values()) scene.remove(v);
    views[k].clear();
  }
}

initInstances();

// effects: pulse ring + wind leaves
const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), new THREE.MeshBasicMaterial({ color: C.lit, transparent: true, opacity: 0, side: THREE.DoubleSide }));
pulseRing.rotation.x = -Math.PI / 2;
scene.add(pulseRing);
let pulseT = 1, flash = 0;
const LEAVES = 140;
const leafGeo = new THREE.BufferGeometry();
leafGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LEAVES * 3), 3));
const leaves = new THREE.Points(leafGeo, new THREE.PointsMaterial({ color: 0x9cc77a, size: 0.25 }));
leaves.visible = false;
scene.add(leaves);
const leafRng = makeRng(77);
for (let i = 0; i < LEAVES * 3; i++) leafGeo.attributes.position.array[i] = (leafRng() - 0.5) * 40;

// ---------- input ----------
const keys = new Set();
const latch = { jump: false, interact: false, pulse: false, dash: false };
const KEYMAP = { Space: 'jump', KeyE: 'interact', KeyF: 'pulse', ShiftLeft: 'dash', ShiftRight: 'dash' };
let camYaw = 0, camPitch = 30, camDist = 11, dragging = false;
const locked = () => document.pointerLockElement === canvas;
function lockPointer() {
  try {
    const r = canvas.requestPointerLock?.();
    if (r && r.catch) r.catch(() => {});
  } catch {
    /* drag still works */
  }
}
let lastPauseAt = 0;
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (KEYMAP[e.code]) latch[KEYMAP[e.code]] = true;
  if ((e.code === 'Escape' || e.code === 'KeyP') && performance.now() - lastPauseAt > 300) {
    if (mode === 'playing') pauseGame();
    else if (mode === 'paused') resumeGame();
  }
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.code));
canvas.addEventListener('mousedown', () => {
  dragging = true;
  if (mode === 'playing' && !locked()) lockPointer();
});
addEventListener('mouseup', () => (dragging = false));
addEventListener('mousemove', (e) => {
  if (mode !== 'playing' || (!locked() && !dragging)) return;
  camYaw -= e.movementX * settings.sens;
  camPitch = Math.min(70, Math.max(8, camPitch + e.movementY * settings.sens * 0.8));
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  camDist = Math.min(18, Math.max(5, camDist + Math.sign(e.deltaY) * 0.8));
}, { passive: false });
document.addEventListener('pointerlockchange', () => {
  if (!locked() && mode === 'playing') pauseGame();
});
function readInput() {
  const k = (c) => (keys.has(c) ? 1 : 0);
  // contract: at yaw 0, move x = world +X, z = world +Z. Camera looks along +Z, so screen-right is -X.
  const held = (name, ...codes) => codes.some((c) => keys.has(c)) || latch[name];
  return {
    move: [k('KeyA') - k('KeyD'), k('KeyW') - k('KeyS')],
    cam_yaw_deg: camYaw,
    jump: held('jump', 'Space'),
    interact: held('interact', 'KeyE'),
    pulse: held('pulse', 'KeyF'),
    dash: held('dash', 'ShiftLeft', 'ShiftRight'),
  };
}

// ---------- flow: menu -> intro -> play -> result -> next night -> dawn ----------
const sfx = new Sfx();
sfx.setVolume(settings.volume);
let game = null;
let mode = 'menu'; // menu | intro | playing | paused | result
let night = 1;
let totalScore = 0;
let settingsReturn = 'scr-menu';
const needLit = () => Math.ceil(Math.round(TUNING.win_ratio * game.lanterns.length * 1e6) / 1e6);
const QUOTES = {
  1: 'Ông Đăng: “Đêm nay sương dày lắm, cháu ạ. Năm chiếc đèn ở Đảo Bến đang chờ cháu. Bóng Mực sợ đèn sáng — cứ thắp được cái nào là có chỗ nghỉ chân cái đó.”',
  2: 'Ông Đăng: “Đảo Cau có hai nửa nối bằng cây cầu tre, không lan can đâu. Bục vàng sẽ hất cháu sang đảo kia. Coi chừng Gió Lạc — tụi nó mê đom đóm lắm.”',
  3: 'Ông Đăng: “Đảo Chuông cao và lộng gió. Lên tầng bằng hai con dốc, lên đỉnh bằng bục nhảy. Khi lá bay rì rào là gió sắp tới — giữ chặt nón lá nhé!”',
};
const show = (id) => {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
};

function prepareNight(n) {
  night = n;
  game = createGame({ seed: (Math.random() * 2 ** 32) >>> 0, night: n });
  buildWorld(n);
  clearEntities();
  camYaw = 0;
  snapCam = true;
  $('i-night').textContent = `Đêm ${n}`;
  $('i-name').textContent = NIGHTS[n].name;
  $('i-quote').textContent = QUOTES[n];
  $('i-goal').textContent = `Giữ ít nhất ${needLit()}/${game.lanterns.length} Đèn Lồng Lớn còn sáng tới bình minh (${NIGHTS[n].duration / 60} phút). Đèn cạn dầu sẽ tắt — châm thêm đom đóm!`;
  mode = 'intro';
  show('scr-intro');
}
function play() {
  sfx.unlock();
  sfx.startMusic();
  mode = 'playing';
  show(null);
  lockPointer();
  toast(`Đêm ${night} – ${NIGHTS[night].name}`);
}
function pauseGame() {
  mode = 'paused';
  lastPauseAt = performance.now();
  if (locked()) document.exitPointerLock?.();
  show('scr-pause');
}
function resumeGame() {
  mode = 'playing';
  lastPauseAt = performance.now();
  show(null);
  lockPointer();
}
function toMenu() {
  mode = 'menu';
  sfx.stopMusic();
  if (locked()) document.exitPointerLock?.();
  show('scr-menu');
}
function openSettings(from) {
  settingsReturn = from;
  $('s-volume').value = settings.volume;
  $('s-sens').value = settings.sens;
  $('s-cb').checked = settings.colorBlind;
  show('scr-settings');
}
$('b-start').onclick = () => {
  sfx.unlock();
  totalScore = 0;
  prepareNight(1);
};
$('b-go').onclick = play;
$('b-resume').onclick = resumeGame;
$('b-restart').onclick = () => prepareNight(night);
$('b-menu').onclick = toMenu;
$('b-result-menu').onclick = toMenu;
$('b-settings-menu').onclick = () => openSettings('scr-menu');
$('b-settings-pause').onclick = () => openSettings('scr-pause');
$('b-settings-back').onclick = () => show(settingsReturn);
$('s-volume').oninput = (e) => {
  settings.volume = Number(e.target.value);
  sfx.setVolume(settings.volume);
  saveSettings();
};
function setColorBlind(on) {
  settings.colorBlind = on;
  document.body.classList.toggle('cb', on);
  $('s-cb').checked = on;
  for (const b of document.querySelectorAll('.b-cb')) b.textContent = `Bảng màu dễ phân biệt: ${on ? 'BẬT' : 'TẮT'}`;
  $('h-cb').hidden = !on;
  saveSettings();
}
$('s-cb').onchange = (e) => setColorBlind(e.target.checked);
for (const b of document.querySelectorAll('.b-cb')) b.onclick = () => setColorBlind(!settings.colorBlind);
setColorBlind(settings.colorBlind);
$('s-sens').oninput = (e) => {
  settings.sens = Number(e.target.value);
  saveSettings();
};

function showResult({ result, reason }) {
  mode = 'result';
  if (locked()) document.exitPointerLock?.();
  const why = { dawn_survived: 'Đảo còn sáng tới bình minh!', dawn: `Bình minh đến nhưng chưa đủ ${needLit()} đèn sáng.`, no_flames: 'Ngọn lửa của Mây đã tắt.' };
  if (result === 'won') {
    sfx.win();
    totalScore += game.score;
    if (night < 3) {
      $('r-title').textContent = `Đêm ${night} hoàn thành!`;
      $('r-text').innerHTML = `${why[reason]}<br/>Điểm đêm: <b>${game.score}</b> · Tổng: <b>${totalScore}</b>`;
      $('b-next').textContent = `Đêm ${night + 1}`;
      $('b-next').onclick = () => prepareNight(night + 1);
    } else {
      sfx.stopMusic();
      $('r-title').textContent = 'Bình Minh';
      $('r-text').innerHTML = `Ba hòn đảo đã sáng trở lại. Mặt trời lên trên biển mây.<br/>Tổng điểm: <b>${totalScore}</b>`;
      $('b-next').textContent = 'Chơi lại từ đầu';
      $('b-next').onclick = () => {
        totalScore = 0;
        prepareNight(1);
      };
    }
  } else {
    sfx.lose();
    $('r-title').textContent = 'Thua rồi...';
    $('r-text').innerHTML = `${why[reason]}<br/>Điểm đêm này không được tính. Tổng hiện có: <b>${totalScore}</b>`;
    $('b-next').textContent = `Chơi lại Đêm ${night}`;
    $('b-next').onclick = () => prepareNight(night);
  }
  setTimeout(() => show('scr-result'), 700);
}

let toastTimer = 0;
function toast(msg) {
  $('toast').textContent = msg;
  $('toast').style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').style.opacity = 0), 1800);
}
function onEvent(e) {
  switch (e.name) {
    case 'mote_picked': sfx.pick(e.data.carried); break;
    case 'deposit': {
      sfx.deposit();
      const l = game.lanterns.find((x) => x.id === e.data.lantern_id);
      const cost = l ? lightCost(game, l) : TUNING.lantern_cost;
      const need = cost - e.data.deposited;
      toast(need > 0 ? `Nạp ${e.data.amount} vào ${e.data.lantern_id}: ${e.data.deposited}/${cost} — còn thiếu ${need} đom đóm để thắp` : `Nạp ${e.data.amount} vào ${e.data.lantern_id}: đủ ${cost}/${cost}`);
      break;
    }
    case 'lantern_lit': sfx.lit(); toast(e.data.relight ? `Thắp lại ${e.data.lantern_id}! Sức chứa ${capacity(game)}` : `Đèn ${e.data.lantern_id} đã sáng! Sức chứa ${capacity(game)}`); break;
    case 'refuel': sfx.deposit(); toast(`Châm dầu ${e.data.lantern_id}: ${Math.round(e.data.fuel)}/${TUNING.fuel_max}`); break;
    case 'lantern_out': sfx.lose(); toast(`Đèn ${e.data.lantern_id} đã cạn dầu và tắt!`); break;
    case 'pulse': sfx.pulse(); pulseT = 0; break;
    case 'dash': sfx.dash(); break;
    case 'player_hit': sfx.hit(); flash = 1; toast(e.data.by === 'fall' ? 'Mây rơi xuống biển mây!' : e.data.dropped ? `Bị Bóng Mực chạm! Rơi ${e.data.dropped} đom đóm` : 'Bị Bóng Mực chạm!'); break;
    case 'shade_spawned': sfx.shade(); break;
    case 'charm_picked': sfx.charm(); toast('Bùa Gió! Chạy nhanh hơn, lướt không cần chờ'); break;
    case 'drifter_steal': sfx.steal(); toast(`Gió Lạc cướp ${e.data.amount} đom đóm!`); break;
    case 'drifter_drop': toast('Gió Lạc đánh rơi đom đóm!'); break;
    case 'game_over': showResult(e.data); break;
  }
}

// ---------- main loop ----------
const perf = { step: 0, draw: 0, render: 0 };
let acc = 0, last = performance.now(), fpsFrames = 0, fpsT = 0, fpsSamples = [];
let prevGrounded = true, lastSecond = -1, windWarned = false;
function frame(now) {
  if (bench) benchFrame(now);
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  camYaw += ((keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0)) * 120 * dt;
  const tA = performance.now();
  if (mode === 'playing') {
    acc += dt;
    while (acc >= DT && mode === 'playing') {
      const events = step(game, readInput());
      latch.jump = latch.interact = latch.pulse = latch.dash = false;
      events.forEach(onEvent);
      acc -= DT;
    }
  } else acc = 0;
  const tB = performance.now();
  if (game) draw(now / 1000, dt);
  const tC = performance.now();
  renderer.render(scene, camera);
  perf.step = tB - tA;
  perf.draw = tC - tB;
  perf.render = performance.now() - tC;
  fpsFrames++;
  fpsT += dt;
  if (fpsT >= 1) {
    fpsSamples.push(fpsFrames / fpsT);
    $('fps').textContent = `${Math.round(fpsFrames / fpsT)} FPS · trung bình ${Math.round(fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length)} (${fpsSamples.length}s) · ${innerWidth}×${innerHeight}`;
    fpsFrames = 0;
    fpsT = 0;
  }
  requestAnimationFrame(frame);
}

const tmpV = new THREE.Vector3();
let snapCam = true;
function draw(t, dt) {
  const p = game.player;
  player.position.set(p.pos[0], p.pos[1], p.pos[2]);
  player.rotation.y = Math.atan2(p.facing[0], p.facing[1]);
  player.visible = p.invuln === 0 || Math.floor(t * 12) % 2 === 0;
  playerLight.intensity = 1.2 + p.carried * 0.25;
  orbiters.forEach((m, i) => {
    m.visible = i < p.carried;
    const a = t * 2 + (i / Math.max(1, p.carried)) * Math.PI * 2;
    m.position.set(Math.cos(a) * 0.9, 1.75 + Math.sin(t * 3 + i) * 0.12, Math.sin(a) * 0.9);
  });
  if (mode === 'playing') {
    if (prevGrounded && !p.grounded && p.vy > 6) sfx.jump();
    prevGrounded = p.grounded;
  }

  const th = (camYaw * Math.PI) / 180, ph = (camPitch * Math.PI) / 180;
  const back = Math.cos(ph) * camDist, up = Math.sin(ph) * camDist + 1.2;
  tmpV.set(p.pos[0] - Math.sin(th) * back, p.pos[1] + up, p.pos[2] - Math.cos(th) * back);
  // snap (no sweep across the map) on a new night, on respawn, or on the first frame
  if (snapCam || camera.position.distanceTo(tmpV) > 25) camera.position.copy(tmpV);
  else camera.position.lerp(tmpV, 1 - Math.pow(1e-5, dt));
  snapCam = false;
  if (bench && bench.start !== null) {
    const c = benchCamera((performance.now() - bench.start) / 1000);
    camera.position.set(c[0], c[1], c[2]);
    camera.lookAt(0, 0, 0);
  }
  camera.lookAt(p.pos[0] + Math.sin(th) * 2, p.pos[1] + 1.2, p.pos[2] + Math.cos(th) * 2);

  let lit = 0;
  for (const l of game.lanterns) {
    const v = lanternViews.get(l.id);
    if (l.lit) lit++;
    const look = lanternLook({ ...l, fuel: l.fuelT / TICK_RATE }, { cost: lightCost(game, l), fuelMax: TUNING.fuel_max, lowThreshold: TUNING.low_fuel_threshold, t, colorBlind: settings.colorBlind });
    v.glow += (look.glow - v.glow) * Math.min(1, dt * 6);
    if (!l.lit) v.glow = 0; // never glow before it is really lit
    v.paperMat.color.setHex(l.lit ? C.lit : C.off);
    v.paperMat.emissiveIntensity = v.glow * 2;
    v.coreMat.opacity = v.glow * 0.9;
    v.light.intensity = look.light ? v.glow * 40 : 0;
    v.ring.material.opacity = look.ring ? 0.35 + Math.sin(t * 2) * 0.1 : 0;
    v.paper.scale.y = look.squash;
    v.tear.visible = look.torn;
    // label: progress "L1 · 6/10" when unlit; fuel bar + "L1 · 72" when lit (blinks with the lantern when fuel < 30)
    v.label.visible = !look.blink || blinkOn(t);
    const key = `${look.label}|${look.fuelBar === null ? '' : Math.round(look.fuelBar * 50)}`;
    if (key !== v.labelText) {
      v.labelText = key;
      const c = v.labelCanvas.getContext('2d');
      c.clearRect(0, 0, 256, 64);
      c.fillStyle = 'rgba(14, 20, 48, 0.75)';
      c.fillRect(0, 4, 256, 56);
      c.font = 'bold 26px system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if (look.fuelBar === null) {
        c.fillStyle = l.deposited > 0 ? '#FFB347' : '#F5F1E6';
        c.fillText(look.label, 128, 33);
      } else {
        c.fillStyle = '#F5F1E6';
        c.fillText(look.label, 128, 20);
        c.fillStyle = 'rgba(255,255,255,0.15)';
        c.fillRect(16, 40, 224, 12);
        c.fillStyle = look.blink ? (settings.colorBlind ? '#FFFFFF' : '#FF5A5F') : '#FFB347';
        c.fillRect(16, 40, 224 * look.fuelBar, 12);
      }
      v.labelTex.needsUpdate = true;
    }
  }
  ambient.intensity = 0.15 + 0.55 * (lit / game.lanterns.length);

  drawMotes(t);
  drawShades(t, p);
  sync('drifters', game.drifters.filter((d) => d.state !== 'removed'));
  for (const d of game.drifters) {
    const v = views.drifters.get(d.id);
    if (!v) continue;
    v.position.set(d.pos[0], d.pos[1], d.pos[2]);
    v.rotation.y = t * (d.state === 'chase' ? 4 : 1.5);
    const { geo, base } = v.userData;
    const arr = geo.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) arr[i + 1] = base[i + 1] + Math.sin(base[i] * 2.5 + t * 6) * 0.25;
    geo.attributes.position.needsUpdate = true;
  }
  sync('charms', game.charms);
  for (const c of game.charms) {
    const v = views.charms.get(c.id);
    v.visible = c.available;
    v.position.set(c.pos[0], c.pos[1] + 1 + Math.sin(t * 2) * 0.15, c.pos[2]);
    v.rotation.y = t * 1.5;
  }

  if (pulseT < 1) {
    pulseT = Math.min(1, pulseT + dt * 2.5);
    const r = TUNING.pulse_radius * pulseT;
    pulseRing.scale.set(r, r, r);
    pulseRing.position.set(p.pos[0], p.pos[1] + 0.1, p.pos[2]);
    pulseRing.material.opacity = 0.8 * (1 - pulseT);
  }
  flash = Math.max(0, flash - dt * 2);
  canvas.style.filter = flash > 0 ? `saturate(${1 - flash * 0.6})` : '';

  // wind: 2 s warning with flying leaves + sound, then the gust
  const w = game.wind;
  leaves.visible = w.warning || w.active;
  if (leaves.visible) {
    const a = (w.dir * Math.PI) / 180, sp = w.active ? 14 : 6;
    const arr = leafGeo.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += Math.cos(a) * sp * dt;
      arr[i + 2] += Math.sin(a) * sp * dt;
      arr[i + 1] = ((arr[i + 1] + dt * 0.5 + 20) % 8) - 2;
      if (Math.abs(arr[i]) > 20) arr[i] -= Math.sign(arr[i]) * 40;
      if (Math.abs(arr[i + 2]) > 20) arr[i + 2] -= Math.sign(arr[i + 2]) * 40;
    }
    leafGeo.attributes.position.needsUpdate = true;
    leaves.position.set(p.pos[0], p.pos[1], p.pos[2]);
  }
  if (w.warning && !w.active && !windWarned && mode === 'playing') sfx.windWarn();
  windWarned = w.warning && !w.active;
  $('h-wind').hidden = !(w.warning && !w.active);

  drawHud(lit);
}

const bar = $('h-bar');
const barCount = document.createElement('b');
// write DOM text only when it changes (per-frame writes force layout work and caused frame-time spikes)
const setText = (el, txt) => {
  if (el._t !== txt) {
    el._t = txt;
    el.textContent = txt;
  }
};
function drawHud(lit) {
  const p = game.player;
  const secs = Math.ceil(game.ticksLeft / TICK_RATE);
  setText($('h-flames'), '🔥'.repeat(p.flames) + '🕯️'.repeat(Math.max(0, TUNING.flames - p.flames)));
  const clock = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  setText($('h-time'), secs <= 30 && settings.colorBlind ? `⚠ ${clock}` : clock);
  $('h-time').classList.toggle('danger', secs <= 30);
  if (mode === 'playing' && secs <= 10 && secs !== lastSecond && secs > 0) sfx.countdown();
  lastSecond = secs;
  setText($('h-lanterns'), `Đèn ${lit}/${game.lanterns.length} (cần ${needLit()} lúc bình minh)`);
  setText($('h-score'), `Điểm ${totalScore + game.score}`);
  setText($('h-night'), `Đêm ${night} · ${NIGHTS[night].name}`);
  const cap = capacity(game);
  if (bar.querySelectorAll('i').length !== cap) {
    bar.replaceChildren(...Array.from({ length: cap }, () => document.createElement('i')), barCount);
  }
  bar.querySelectorAll('i').forEach((c, i) => c.classList.toggle('on', i < p.carried));
  setText(barCount, `${p.carried}/${cap}`);
  const cd = (id, left, total, usable) => {
    $(id).querySelector('.fill').style.height = `${(left / total) * 100}%`;
    $(id).classList.toggle('off', !usable);
  };
  cd('cd-dash', p.charm > 0 ? 0 : p.dashCd, RULES.dash_cd, p.dashCd === 0 || p.charm > 0);
  cd('cd-pulse', p.pulseCd, RULES.pulse_cd, p.pulseCd === 0 && p.carried >= TUNING.pulse_cost);
  $('h-charm').hidden = p.charm === 0;
  if (p.charm > 0) setText($('h-charm'), `Bùa Gió ${(p.charm / TICK_RATE).toFixed(1)}s`);

  // prompt for the lantern E would use (unlit, or lit and not full); arrow to the nearest unlit lantern
  const FULL = TUNING.fuel_max * TICK_RATE;
  let near = null, nearD = Infinity, best = null, bestD = Infinity;
  for (const l of game.lanterns) {
    const d = Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]);
    if ((!l.lit || l.fuelT < FULL) && d < nearD) {
      near = l;
      nearD = d;
    }
    if (!l.lit && d < bestD) {
      best = l;
      bestD = d;
    }
  }
  const prompt = $('h-prompt');
  prompt.hidden = !(near && nearD <= TUNING.interact_radius);
  if (!prompt.hidden) {
    setText(prompt, near.lit
      ? `E — Châm dầu (${Math.floor(near.fuelT / TICK_RATE)}/${TUNING.fuel_max})`
      : `E — Nạp ánh sáng (${near.deposited}/${lightCost(game, near)})`);
  }
  const arrow = $('h-arrow');
  arrow.hidden = true;
  if (best && mode === 'playing') {
    tmpV.set(best.pos[0], best.pos[1] + 3.3, best.pos[2]).project(camera);
    const behind = tmpV.z > 1;
    let x = tmpV.x, y = tmpV.y;
    if (behind || Math.abs(x) > 0.95 || Math.abs(y) > 0.95) {
      if (behind) {
        x = -x;
        y = -y;
      }
      const a = Math.atan2(x, y);
      const r = Math.min(innerWidth, innerHeight) / 2 - 60;
      arrow.hidden = false;
      arrow.style.left = `${innerWidth / 2 + Math.sin(a) * r - 14}px`;
      arrow.style.top = `${innerHeight / 2 - Math.cos(a) * r - 15}px`;
      arrow.style.transform = `rotate(${a}rad)`;
    }
  }
}

// ---------- Ticket-04 §1 benchmark mode (/?benchmark&seed=42&duration=30), driven by scripts/bench.mjs ----------
let bench = null;
function startBenchmark(seed, duration) {
  game = createBenchGame(seed);
  night = 1;
  buildWorld(1);
  clearEntities();
  mode = 'playing';
  show(null);
  bench = { seed, duration, start: null, last: 0, dts: [], firstFrameEpoch: null, done: false };
  window.__benchResult = null;
}
function benchFrame(now) {
  if (bench.start === null) {
    bench.start = now;
    bench.last = now;
    bench.firstFrameEpoch = performance.timeOrigin + now; // first frame of the bench scene
    return;
  }
  const dt = now - bench.last;
  bench.last = now;
  const t = now - bench.start;
  if (t < BENCH.warmupMs || bench.done) return; // 3 s warm-up is not measured
  if (t < BENCH.warmupMs + bench.duration * 1000) {
    bench.dts.push(dt);
    return;
  }
  bench.done = true;
  window.__benchResult = { ...benchStats(bench.dts), first_frame_epoch_ms: bench.firstFrameEpoch, seed: bench.seed, duration_s: bench.duration, viewport: `${innerWidth}x${innerHeight}` };
}

// idle preview behind the menu
game = createGame({ seed: 7, night: 1 });
buildWorld(1);
show('scr-menu');
$('fps').hidden = !params.has('fps') && !params.has('bench');
requestAnimationFrame(frame);

if (params.has('benchmark')) startBenchmark(Number(params.get('seed') || 42), Number(params.get('duration') || 30));
// ?autostart[&night=N&lit=K&carried=C&yaw=D] skips menus (used by scripts for screenshots / FPS proof)
if (params.has('autostart') || params.has('bench')) {
  prepareNight(Number(params.get('night') || 1));
  play();
  const n = Number(params.get('lit') || 0);
  game.lanterns.slice(0, n).forEach((l) => {
    l.lit = true;
    l.everLit = true;
    l.deposited = TUNING.lantern_cost;
    l.fuelT = TUNING.fuel_max * TICK_RATE; // Ticket-03: a lit lantern needs fuel, otherwise it goes out on tick 1
  });
  game.player.carried = Number(params.get('carried') || 0);
  if (params.has('fuel')) game.lanterns.filter((l) => l.lit).forEach((l) => (l.fuelT = Number(params.get('fuel')) * TICK_RATE));
  if (params.has('cb')) setColorBlind(true);
  if (params.has('near')) {
    // stand 5 m in front of lantern N, facing it (screenshots of lantern looks)
    const l = game.lanterns[Number(params.get('near')) - 1];
    game.player.pos = [l.pos[0], l.pos[1], l.pos[2] - 5];
    camYaw = 0;
  }
  game.lanterns.filter((l) => !l.lit).forEach((l) => (l.deposited = Number(params.get('dep') || 0)));
  if (params.has('yaw')) camYaw = Number(params.get('yaw'));
  if (params.has('bench')) {
    // read-only probe for scripts/measure-fps.mjs (bench mode only)
    window.__ddl = () => {
      let objects = 0;
      scene.traverse(() => objects++);
      const i = renderer.info;
      return { mode, tick: game.tick, state: game.state, visible: document.visibilityState, flames: game.player.flames,
        calls: i.render.calls, tris: i.render.triangles, programs: i.programs?.length, geos: i.memory.geometries, tex: i.memory.textures,
        objects, ms: { step: +perf.step.toFixed(1), draw: +perf.draw.toFixed(1), render: +perf.render.toFixed(1) }, shades: game.shades.length, motes: game.motes.length, pos: game.player.pos.map((v) => Math.round(v)), filter: canvas.style.filter };
    };
    // scripted circle run for the FPS measurement (keys only, sim rules unchanged)
    keys.add('KeyW');
    setInterval(() => (camYaw += 3), 50);
  }
}
