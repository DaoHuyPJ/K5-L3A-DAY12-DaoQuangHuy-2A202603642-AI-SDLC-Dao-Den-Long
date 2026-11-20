// Browser front-end. All gameplay lives in ../sim/world.js (same code as headless);
// this file only reads input, calls step() at a fixed 60 Hz, and draws the state.
import * as THREE from 'three';
import { TICK_RATE, TUNING, WORLD } from '../sim/config.js';
import { createGame, makeRng, step } from '../sim/world.js';
import { Sfx } from './sfx.js';

const $ = (id) => document.getElementById(id);
const DT = 1 / TICK_RATE;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const NIGHT = new THREE.Color(0x0b0614);
const DAWN = new THREE.Color(0x5a2f4f);
scene.background = NIGHT.clone();
scene.fog = new THREE.FogExp2(0x140a24, 0.028);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);
const hemi = new THREE.HemisphereLight(0x8a7ac0, 0x2a1a32, 0.7);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0x8f8fd8, 0.25);
moon.position.set(-30, 50, -20);
scene.add(moon);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

// ---------- static island ----------
const island = new THREE.Mesh(new THREE.CylinderGeometry(WORLD.island_radius, WORLD.island_radius - 3, 4, 72), mat(0x2c4a3a));
island.position.y = -2;
scene.add(island);
const sea = new THREE.Mesh(new THREE.CircleGeometry(220, 48), mat(0x2a1840, { emissive: 0x120822 }));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -7;
scene.add(sea);
{
  // decorative trees/rocks: fixed seed, render-only
  const rng = makeRng(2024);
  const trunk = mat(0x3a2618), leaf = mat(0x1e3a2a), rock = mat(0x4a4458);
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2, r = 6 + rng() * 32;
    const x = r * Math.sin(a), z = r * Math.cos(a);
    if (Math.abs(r - WORLD.lantern_ring_radius) < 4) continue;
    if (rng() < 0.65) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2), trunk);
      t.position.set(x, 0.6, z);
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.9 + rng() * 0.5, 2.2 + rng(), 7), leaf);
      c.position.set(x, 2.2, z);
      scene.add(t, c);
    } else {
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + rng() * 0.6), rock);
      s.position.set(x, 0.2, z);
      scene.add(s);
    }
  }
}

// ---------- Mây ----------
const player = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.0, 12), mat(0x3d6fa8));
  body.position.y = 0.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), mat(0xf2c9a0));
  head.position.y = 1.25;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.4, 24), mat(0xe8d39a)); // nón lá
  hat.position.y = 1.62;
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35), mat(0x222222));
  string.position.set(0.62, 1.32, 0);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat(0xffb347, { emissive: 0xff9a2e, emissiveIntensity: 2 }));
  lamp.position.set(0.62, 1.1, 0);
  player.add(body, head, hat, string, lamp);
}
const playerLight = new THREE.PointLight(0xffa64d, 2, 10, 1.6);
playerLight.position.set(0.6, 1.2, 0);
player.add(playerLight);
scene.add(player);

// carried fireflies orbit the hat (creative, render-only)
const orbitGeo = new THREE.SphereGeometry(0.06, 8, 6);
const moteMat = mat(0xfff1a0, { emissive: 0xffd64d, emissiveIntensity: 3 });
const orbiters = [];
for (let i = 0; i < TUNING.carry_capacity; i++) {
  const m = new THREE.Mesh(orbitGeo, moteMat);
  m.visible = false;
  player.add(m);
  orbiters.push(m);
}

// ---------- lanterns ----------
const lanternViews = new Map();
function buildLanterns(game) {
  for (const v of lanternViews.values()) scene.remove(v.group);
  lanternViews.clear();
  for (const l of game.lanterns) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 3), mat(0x4a2e1a));
    pole.position.y = 1.5;
    const paperMat = mat(0x8a2a22, { emissive: 0xff7a1a, emissiveIntensity: 0 });
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 16), paperMat);
    paper.position.y = 3.3;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.35, 16), mat(0x2a1a10));
    cap.position.y = 3.95;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(TUNING.safe_radius - 0.12, TUNING.safe_radius, 64),
      new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    const light = new THREE.PointLight(0xffa040, 0, 22, 1.4);
    light.position.y = 3.3;
    group.add(pole, paper, cap, ring, light);
    group.position.set(l.pos[0], 0, l.pos[2]);
    scene.add(group);
    lanternViews.set(l.id, { group, paperMat, ring, light, glow: 0 });
  }
}

// ---------- dynamic entities (motes, shades) ----------
const moteViews = new Map();
const moteGeo = new THREE.SphereGeometry(0.12, 10, 8);
const shadeViews = new Map();
const shadeBodyGeo = new THREE.SphereGeometry(0.75, 18, 14);
const eyeGeo = new THREE.SphereGeometry(0.09, 8, 6);
function makeShade() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a0626, emissive: 0x3a0f5a, emissiveIntensity: 0.6, roughness: 1, transparent: true, opacity: 0.92 });
  const body = new THREE.Mesh(shadeBodyGeo, bodyMat);
  body.scale.set(1, 1.15, 1);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd9b8ff });
  const e1 = new THREE.Mesh(eyeGeo, eyeMat), e2 = new THREE.Mesh(eyeGeo, eyeMat);
  e1.position.set(-0.22, 0.2, 0.62);
  e2.position.set(0.22, 0.2, 0.62);
  g.add(body, e1, e2);
  scene.add(g);
  return { g, bodyMat };
}
function syncMap(map, items, create) {
  const alive = new Set();
  for (const it of items) {
    alive.add(it.id);
    if (!map.has(it.id)) map.set(it.id, create(it));
  }
  for (const [id, v] of map) {
    if (!alive.has(id)) {
      scene.remove(v.g ?? v);
      map.delete(id);
    }
  }
}

// ---------- effects ----------
const pulseRing = new THREE.Mesh(
  new THREE.RingGeometry(0.85, 1, 64),
  new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0, side: THREE.DoubleSide }),
);
pulseRing.rotation.x = -Math.PI / 2;
scene.add(pulseRing);
let pulseT = 1;
let flash = 0;

// ---------- input ----------
const keys = new Set();
const latch = { jump: false, interact: false, pulse: false };
const KEYMAP = { Space: 'jump', KeyE: 'interact', KeyF: 'pulse' };
let camYaw = 0; // degrees, same meaning as contract cam_yaw_deg
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (KEYMAP[e.code]) latch[KEYMAP[e.code]] = true;
  if (e.code === 'KeyR') startGame();
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.code));
let dragging = false;
renderer.domElement.addEventListener('mousedown', () => (dragging = true));
addEventListener('mouseup', () => (dragging = false));
addEventListener('mousemove', (e) => {
  if (dragging) camYaw -= e.movementX * 0.3;
});

function readInput() {
  const k = (c) => (keys.has(c) ? 1 : 0);
  // contract: at yaw 0, move x = world +X, z = world +Z. Camera looks along +Z, so screen-right is -X.
  const x = k('KeyA') - k('KeyD');
  const z = k('KeyW') - k('KeyS');
  const held = (name, code) => keys.has(code) || latch[name];
  return {
    move: [x, z],
    cam_yaw_deg: camYaw,
    jump: held('jump', 'Space'),
    interact: held('interact', 'KeyE'),
    pulse: held('pulse', 'KeyF'),
  };
}

// ---------- game lifecycle ----------
let game = null;
let mode = 'menu'; // menu | playing | over
const sfx = new Sfx();

function startGame() {
  sfx.unlock();
  game = createGame({ seed: (Math.random() * 2 ** 32) >>> 0 });
  buildLanterns(game);
  for (const m of [moteViews, shadeViews]) {
    for (const v of m.values()) scene.remove(v.g ?? v);
    m.clear();
  }
  camYaw = 0;
  mode = 'playing';
  $('overlay').classList.add('hidden');
  toast('Đêm 1 – Đảo Bến');
}
$('o-btn').addEventListener('click', startGame);

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
    case 'deposit': sfx.deposit(); toast(`Nạp ${e.data.amount} đom đóm vào ${e.data.lantern_id} (${e.data.deposited}/${TUNING.lantern_cost})`); break;
    case 'lantern_lit': sfx.lit(); toast(`Đèn ${e.data.lantern_id} đã sáng!`); break;
    case 'pulse': sfx.pulse(); pulseT = 0; break;
    case 'player_hit': sfx.hit(); flash = 1; toast(e.data.dropped ? `Bị Bóng Mực chạm! Rơi ${e.data.dropped} đom đóm` : 'Bị Bóng Mực chạm!'); break;
    case 'shade_spawned': toast('Một Bóng Mực mới trồi lên từ sương...'); break;
    case 'game_over': showEnd(e.data); break;
  }
}

function showEnd({ result, reason }) {
  mode = 'over';
  const why = { all_lit: 'Cả 5 Đèn Lồng Lớn đã sáng. Đảo Bến được cứu!', dawn: 'Bình minh đến khi đảo còn chìm trong sương.', no_flames: 'Ngọn lửa của Mây đã tắt.' };
  result === 'won' ? sfx.win() : sfx.lose();
  $('o-title').textContent = result === 'won' ? 'Chiến thắng!' : 'Thua rồi...';
  $('o-text').innerHTML = `${why[reason]}<br/>Điểm: <b>${game.score}</b>`;
  $('o-btn').textContent = 'Chơi lại (R)';
  setTimeout(() => $('overlay').classList.remove('hidden'), 700);
}

// ---------- main loop ----------
let acc = 0;
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  const turn = (keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0);
  camYaw += turn * 120 * dt;
  if (mode === 'playing') {
    acc += dt;
    while (acc >= DT && mode === 'playing') {
      const events = step(game, readInput());
      latch.jump = latch.interact = latch.pulse = false;
      events.forEach(onEvent);
      acc -= DT;
    }
  }
  if (game) draw(now / 1000, dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function draw(t, dt) {
  const p = game.player;
  player.position.set(p.pos[0], p.pos[1], p.pos[2]);
  player.rotation.y = p.facing;
  player.visible = p.invuln === 0 || Math.floor(t * 12) % 2 === 0;
  playerLight.intensity = 1.2 + p.carried * 0.25;
  orbiters.forEach((m, i) => {
    m.visible = i < p.carried;
    const a = t * 2 + (i / Math.max(1, p.carried)) * Math.PI * 2;
    m.position.set(Math.cos(a) * 0.9, 1.7 + Math.sin(t * 3 + i) * 0.12, Math.sin(a) * 0.9);
  });

  // camera: behind the player, looking along the contract's yaw-forward (sinθ, cosθ)
  const th = (camYaw * Math.PI) / 180;
  const fx = Math.sin(th), fz = Math.cos(th);
  camera.position.lerp(new THREE.Vector3(p.pos[0] - fx * 9, p.pos[1] + 6, p.pos[2] - fz * 9), 1 - Math.pow(0.001, dt));
  camera.lookAt(p.pos[0] + fx * 2, p.pos[1] + 1.2, p.pos[2] + fz * 2);

  let lit = 0;
  for (const l of game.lanterns) {
    const v = lanternViews.get(l.id);
    if (l.lit) lit++;
    const target = l.lit ? 1 : (l.deposited / TUNING.lantern_cost) * 0.3;
    v.glow += (target - v.glow) * Math.min(1, dt * 3);
    v.paperMat.emissiveIntensity = v.glow * 2.2;
    v.light.intensity = v.glow * 40;
    v.ring.material.opacity = l.lit ? 0.35 + Math.sin(t * 2) * 0.1 : 0;
  }
  // island brightens as lanterns are lit; sky warms toward dawn (render-only)
  const night = 1 - game.ticksLeft / (TUNING.night1_duration_s * TICK_RATE);
  hemi.intensity = 0.7 + lit * 0.15;
  scene.fog.density = 0.028 - lit * 0.004;
  scene.background.copy(NIGHT).lerp(DAWN, Math.max(0, night - 0.6) / 0.4);

  syncMap(moteViews, game.motes, (m) => {
    const mesh = new THREE.Mesh(moteGeo, moteMat);
    mesh.position.set(m.pos[0], 0.8, m.pos[2]);
    scene.add(mesh);
    return mesh;
  });
  for (const m of game.motes) {
    const mesh = moteViews.get(m.id);
    mesh.position.y = 0.8 + Math.sin(t * 2.5 + m.pos[0]) * 0.25;
  }
  syncMap(shadeViews, game.shades, makeShade);
  for (const s of game.shades) {
    const v = shadeViews.get(s.id);
    v.g.position.set(s.pos[0], s.pos[1] + Math.sin(t * 3 + s.pos[2]) * 0.1, s.pos[2]);
    v.g.lookAt(p.pos[0], s.pos[1], p.pos[2]);
    const stunned = s.stun > 0;
    v.bodyMat.opacity = stunned ? 0.45 : 0.92;
    v.bodyMat.emissive.setHex(stunned ? 0x6a6a9a : 0x3a0f5a);
    v.g.scale.setScalar(stunned ? 0.85 + Math.sin(t * 20) * 0.05 : 1);
  }

  if (pulseT < 1) {
    pulseT = Math.min(1, pulseT + dt * 2.5);
    const r = TUNING.pulse_radius * pulseT;
    pulseRing.scale.set(r, r, r);
    pulseRing.position.set(p.pos[0], 0.1, p.pos[2]);
    pulseRing.material.opacity = 0.8 * (1 - pulseT);
  }
  flash = Math.max(0, flash - dt * 2);
  renderer.domElement.style.filter = flash > 0 ? `saturate(${1 - flash * 0.6}) hue-rotate(${flash * 40}deg)` : '';

  // HUD
  const secs = Math.ceil(game.ticksLeft / TICK_RATE);
  $('h-flames').textContent = `Lửa: ${'🔥'.repeat(p.flames)}${'·'.repeat(Math.max(0, TUNING.flames - p.flames))}`;
  $('h-carried').textContent = `Đom đóm: ${p.carried}/${TUNING.carry_capacity}`;
  $('h-lanterns').textContent = `Đèn: ${lit}/${game.lanterns.length}`;
  $('h-time').textContent = `Bình minh: ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  $('h-score').textContent = `Điểm: ${game.score}`;
  $('h-pulse').textContent = p.cooldown > 0 ? 'Tỏa sáng: chờ...' : p.carried >= TUNING.pulse_cost ? 'Tỏa sáng: sẵn sàng (F)' : 'Tỏa sáng: thiếu ánh sáng';
}

// idle preview behind the menu
game = createGame({ seed: 7 });
buildLanterns(game);
requestAnimationFrame(frame);
// ?autostart[&lit=N] starts immediately (used by scripts/screenshot for visual proof)
const params = new URLSearchParams(location.search);
if (params.has('autostart')) {
  startGame();
  const n = Number(params.get('lit') || 0);
  game.lanterns.slice(0, n).forEach((l) => { l.lit = true; l.deposited = TUNING.lantern_cost; });
  game.player.carried = Number(params.get('carried') || 0);
  if (params.has('yaw')) camYaw = Number(params.get('yaw'));
}
