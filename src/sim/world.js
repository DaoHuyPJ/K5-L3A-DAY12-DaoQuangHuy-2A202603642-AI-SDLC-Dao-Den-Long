// Pure, deterministic game logic for Đảo Đèn Lồng (Test Contract v1.1, Ticket-02).
// No DOM, no Date, no Math.random. Used by src/headless.js and the browser game (src/game/main.js).
// Tick order follows Ticket-02 exactly (see step()).

import { NIGHTS, RULES as R, TICK_RATE, TUNING } from './config.js';
import { FormatError } from './io.js';

/** mulberry32: tiny seeded PRNG, returns floats in [0, 1). */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const r3 = (v) => Math.round(v * 1000) / 1000 + 0; // +0 turns -0 into 0
const distXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const s2t = (s) => Math.round(s * TICK_RATE);
const norm2 = (x, z) => {
  const l = Math.hypot(x, z);
  return l > 1e-9 ? [x / l, z / l] : [1, 0];
};
const idNum = (id) => Number(String(id).replace(/\D/g, '')) || 0;

// ---------------------------------------------------------------- setup

/**
 * Build a game for one night. `scenario` must already be validated by parseScenario.
 * Scenario setup emits no events and awards no score.
 */
export function createGame({ seed = 0, night = 1, scenario = {}, tuning = TUNING } = {}) {
  const N = NIGHTS[night];
  if (!N) throw new Error(`unknown night ${night}`);
  const sp = scenario.player || {};
  const g = {
    tuning,
    night,
    N,
    rng: makeRng(seed),
    tick: 0,
    simTick: 0,
    state: 'playing',
    score: 0,
    ticksLeft: s2t(scenario.time_left_s ?? N.duration),
    player: {
      pos: [...(sp.pos ?? N.start)],
      vel: [0, 0, 0],
      vy: 0,
      grounded: true,
      facing: [0, 1], // +Z
      flames: sp.flames ?? tuning.flames,
      carried: sp.carried ?? 0,
      invuln: sp.invuln_ticks ?? 0,
      dashCd: sp.dash_cd_ticks ?? 0,
      pulseCd: sp.pulse_cd_ticks ?? 0,
      charm: sp.charm_ticks ?? 0,
      dashTicks: 0,
      dashDir: [0, 1],
      launch: null,
      waiting: false,
      respawn: 0,
    },
    prev: { jump: false, interact: false, pulse: false, dash: false, pause: false },
    lanterns: N.lanterns.map((p, i) => ({ id: `L${i + 1}`, pos: [...p], lit: false, deposited: 0 })),
    motes: [],
    shades: [],
    drifters: [],
    charms: N.charms.map((p, i) => ({ id: `C${i + 1}`, pos: [...p], available: true, respawn: 0 })),
    pads: N.pads.map((pd) => ({ ...pd, dir: pd.dir ?? norm2(pd.target[0] - pd.pos[0], pd.target[1] - pd.pos[2]) })),
    nextMote: 1,
    nextShade: 1,
    nextDrifter: 1,
    randomMotes: scenario.random_motes ?? true,
    randomShades: scenario.random_shades ?? true,
    randomDrifters: scenario.random_drifters ?? N.drifters,
    windEnabled: scenario.wind_enabled ?? N.wind,
    wind: { active: false, dir: 0, warning: false },
    result: null,
  };

  // player: never start inside terrain
  const p = g.player;
  const gr = ground(g, p.pos[0], p.pos[2]);
  if (gr !== null && p.pos[1] < gr) p.pos[1] = gr;
  p.grounded = gr !== null && Math.abs(p.pos[1] - gr) < 1e-6;

  for (const l of scenario.lanterns || []) {
    const t = g.lanterns.find((x) => x.id === l.id);
    if (!t) throw new FormatError(`scenario: unknown lantern id "${l.id}" (night ${night} has L1..L${g.lanterns.length})`);
    if (l.pos) t.pos = [...l.pos];
    if (l.deposited !== undefined) t.deposited = l.deposited;
    if (l.lit !== undefined) t.lit = l.lit;
    if (t.lit && l.deposited === undefined) t.deposited = tuning.lantern_cost;
    if (!t.lit && t.deposited >= tuning.lantern_cost) t.lit = true;
  }

  if (scenario.motes) {
    for (const m of scenario.motes) {
      const kind = m.kind ?? 'random';
      addMote(g, [...m.pos], { id: m.id, kind, ttl: kind === 'dropped' ? (m.ttl_ticks ?? R.dropped_ttl) : null });
    }
  } else if (g.randomMotes) {
    const idx = N.moteSpawns.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(g.rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    for (const i of idx.slice(0, R.mote_initial)) addMote(g, [...N.moteSpawns[i]], { kind: 'random', point: i });
  }

  for (const s of scenario.shades || []) {
    const pos = [s.pos[0], 0, s.pos[2]];
    const sg = ground(g, pos[0], pos[2]);
    pos[1] = (sg ?? s.pos[1] - R.shade_height) + R.shade_height;
    const sh = addShade(g, pos, s.id);
    if (s.state) {
      sh.state = s.state;
      const def = { spawning: R.shade_spawn_ticks, recoil: R.recoil_ticks, stunned: R.stun_ticks }[s.state] ?? 0;
      sh.stateTicks = s.state_ticks_left ?? def;
    } else {
      sh.state = distXZ(pos, p.pos) <= R.shade_detect ? 'chase' : 'wander';
    }
  }

  for (const d of scenario.drifters || []) {
    const dr = addDrifter(g, [...d.pos], d.id);
    dr.state = d.state ?? 'idle';
    dr.stolen = d.stolen ?? 0;
    if (dr.stolen > 0 || dr.state === 'flee') dr.stoleOnce = true;
    if (dr.state === 'flee') dr.stateTicks = d.state_ticks_left ?? R.drifter_flee_ticks;
  }

  if (scenario.charms) {
    g.charms = scenario.charms.map((c, i) => {
      const id = c.id ?? `C${i + 1}`;
      const def = N.charms[idNum(id) - 1];
      const pos = c.pos ?? def;
      if (!pos) throw new FormatError(`scenario: charms[${i}] needs pos (night ${night} has no default for ${id})`);
      const respawn = c.respawn_ticks ?? 0;
      return { id, pos: [...pos], available: c.available ?? respawn === 0, respawn: c.available === false ? (respawn || R.charm_respawn) : respawn };
    });
  }
  return g;
}

/** Ground height (top surface) at x,z for this night; null = sea of clouds. */
export function ground(g, x, z) {
  return g.N.ground(x, z);
}

function addMote(g, pos, { id, kind = 'random', ttl = null, point = -1 } = {}) {
  if (!id) {
    while (g.motes.some((m) => m.id === `M${g.nextMote}`)) g.nextMote++;
    id = `M${g.nextMote++}`;
  }
  const m = { id, pos, kind, ttl, point };
  g.motes.push(m);
  return m;
}

function addShade(g, pos, id) {
  if (!id) {
    while (g.shades.some((s) => s.id === `S${g.nextShade}`)) g.nextShade++;
    id = `S${g.nextShade++}`;
  }
  const s = { id, pos, state: 'spawning', stateTicks: R.shade_spawn_ticks, home: [pos[0], pos[2]], target: null, push: 0, pushDir: [1, 0], expel: 0, expelFrom: null };
  g.shades.push(s);
  return s;
}

function addDrifter(g, pos, id) {
  if (!id) {
    while (g.drifters.some((d) => d.id === `D${g.nextDrifter}`)) g.nextDrifter++;
    id = `D${g.nextDrifter++}`;
  }
  const d = { id, pos, state: 'idle', stolen: 0, stoleOnce: false, stateTicks: 0, home: [pos[0], pos[2]], target: null };
  g.drifters.push(d);
  return d;
}

// ---------------------------------------------------------------- terrain movement

/** Can a body standing/flying at height y move into (x,z)? Sea is enterable (you fall). */
function canEnter(g, x, z, y, grounded) {
  const gr = ground(g, x, z);
  if (gr === null) return true;
  return gr <= y + (grounded ? R.step_height : 1e-6);
}

/** Move pos by (dx,dz) with per-axis sliding against walls. Returns true if any movement happened. */
function slide(g, pos, dx, dz, y, grounded, enter = canEnter) {
  if (dx === 0 && dz === 0) return false;
  if (enter(g, pos[0] + dx, pos[2] + dz, y, grounded)) {
    pos[0] += dx;
    pos[2] += dz;
    return true;
  }
  if (dx !== 0 && enter(g, pos[0] + dx, pos[2], y, grounded)) {
    pos[0] += dx;
    return true;
  }
  if (dz !== 0 && enter(g, pos[0], pos[2] + dz, y, grounded)) {
    pos[2] += dz;
    return true;
  }
  return false;
}

/** Shades walk: never into the sea, never up a cliff; dropping down is fine. */
function shadeEnter(g, x, z, footY) {
  const gr = ground(g, x, z);
  return gr !== null && gr <= footY + R.step_height;
}

/** Move a shade by (dx,dz); returns false if fully blocked. Keeps it on its ground. */
function moveShade(g, s, dx, dz) {
  const foot = s.pos[1] - R.shade_height;
  const ok = slide(g, s.pos, dx, dz, foot, true, (gg, x, z, y) => shadeEnter(gg, x, z, y));
  const gr = ground(g, s.pos[0], s.pos[2]);
  if (gr !== null) s.pos[1] = gr + R.shade_height;
  return ok;
}

function moveToward(pos, target, maxStep) {
  const dx = target[0] - pos[0];
  const dz = target[1] - pos[2];
  const d = Math.hypot(dx, dz);
  if (d < 1e-9) return [0, 0, 0];
  const st = Math.min(maxStep, d);
  return [(dx / d) * st, (dz / d) * st, d];
}

function pickWanderTarget(g, home, radius) {
  const a = g.rng() * 2 * Math.PI;
  const r = Math.sqrt(g.rng()) * radius;
  const t = [home[0] + r * Math.cos(a), home[1] + r * Math.sin(a)];
  return ground(g, t[0], t[1]) === null ? [home[0], home[1]] : t;
}

/** Lit lanterns block shades at their safe-zone edge (unless being expelled). */
function blockAtSafeZones(g, s) {
  if (s.expel > 0) return;
  const Rz = g.tuning.safe_radius + 0.001;
  for (const l of g.lanterns) {
    if (!l.lit) continue;
    const d = distXZ(s.pos, l.pos);
    if (d < g.tuning.safe_radius) {
      const [ux, uz] = norm2(s.pos[0] - l.pos[0], s.pos[2] - l.pos[2]);
      s.pos[0] = l.pos[0] + ux * Rz;
      s.pos[2] = l.pos[2] + uz * Rz;
      const gr = ground(g, s.pos[0], s.pos[2]);
      if (gr !== null) s.pos[1] = gr + R.shade_height;
    }
  }
}

// ---------------------------------------------------------------- step

/**
 * Step k: consume input for tick k, produce state k+1. Returns the events of this step
 * ({type:'event', tick:k+1, name, data}). Does nothing once the game is won/lost.
 */
export function step(g, input) {
  if (g.state === 'won' || g.state === 'lost') return [];
  const events = [];
  g.tick += 1;
  const tick = g.tick;
  const emit = (name, data) => events.push({ type: 'event', tick, name, data });

  // 1. input (pause first)
  const edge = {};
  for (const b of ['jump', 'interact', 'pulse', 'dash', 'pause']) {
    edge[b] = !!input[b] && !g.prev[b];
    g.prev[b] = !!input[b];
  }
  if (edge.pause) {
    if (g.state !== 'paused') {
      g.state = 'paused';
      emit('paused', {});
      return events;
    }
    g.state = 'playing';
    emit('resumed', {});
  } else if (g.state === 'paused') {
    return events;
  }
  g.simTick += 1;
  const T = g.tuning;
  const p = g.player;

  // 2. counters
  countdown(g);

  // 3. player movement, then fall check
  movePlayer(g, input, edge, emit);

  if (!p.waiting) {
    // 4. pickups
    pickups(g, emit);
    // 5. lanterns
    if (edge.interact) interact(g, emit);
  }
  // 6. safe zones
  updateSafeZones(g);
  // 7. pulse
  if (!p.waiting && edge.pulse && p.pulseCd === 0 && p.carried >= T.pulse_cost) pulse(g, emit);
  // 8. shades + drifters
  moveShades(g);
  moveDrifters(g);
  // 9. contact: drifters steal first, then shades hit (id order)
  if (!p.waiting) contacts(g, emit);
  // 10. scheduled spawns
  spawns(g, emit);
  // 11. win / lose
  if (p.flames <= 0) endGame(g, 'lost', 'no_flames', emit);
  else if (g.lanterns.every((l) => l.lit)) endGame(g, 'won', 'all_lit', emit);
  else if (g.ticksLeft <= 0) endGame(g, 'lost', 'dawn', emit);
  return events;
}

function countdown(g) {
  const p = g.player;
  g.ticksLeft = Math.max(0, g.ticksLeft - 1);
  if (p.dashCd > 0) p.dashCd--;
  if (p.pulseCd > 0) p.pulseCd--;
  if (p.invuln > 0) p.invuln--;
  if (p.charm > 0) p.charm--;
  if (p.respawn > 0) p.respawn--;
  for (const s of g.shades) if (s.stateTicks > 0) s.stateTicks--;
  g.motes = g.motes.filter((m) => m.ttl === null || --m.ttl > 0);
  for (const d of g.drifters) {
    if (d.state === 'flee' && d.stateTicks > 0 && --d.stateTicks === 0) {
      d.state = 'removed'; // vanishes together with what it stole
    }
  }
  for (const c of g.charms) {
    if (!c.available && c.respawn > 0 && --c.respawn === 0) c.available = true;
  }
  // wind (night 3): gust k covers sim ticks [1800k, 1800k + 300); direction drawn at the 2 s warning
  if (g.windEnabled) {
    const ph = g.simTick % R.wind_every;
    if (ph === R.wind_every - R.wind_warn) g.wind.dir = Math.floor(g.rng() * 360);
    g.wind.warning = ph >= R.wind_every - R.wind_warn;
    g.wind.active = g.simTick >= R.wind_every && ph < R.wind_ticks;
  }
}

function movePlayer(g, input, edge, emit) {
  const T = g.tuning;
  const p = g.player;
  const before = [...p.pos];
  if (p.waiting) {
    if (p.respawn === 0) {
      p.waiting = false;
      p.pos = [...g.N.start];
      p.vy = 0;
      p.vel = [0, 0, 0];
      p.grounded = true;
      p.facing = [0, 1];
      p.invuln = R.invuln_ticks;
      p.launch = null;
      p.dashTicks = 0;
    }
    return;
  }

  let [mx, mz] = input.move || [0, 0];
  const len = Math.hypot(mx, mz);
  if (len > 1) {
    mx /= len;
    mz /= len;
  }
  const th = ((input.cam_yaw_deg || 0) * Math.PI) / 180;
  const wx = mx * Math.cos(th) + mz * Math.sin(th);
  const wz = -mx * Math.sin(th) + mz * Math.cos(th);
  const moving = wx !== 0 || wz !== 0;
  if (moving) p.facing = norm2(wx, wz);

  if (edge.jump && p.grounded && p.dashTicks === 0) {
    p.vy = R.jump_speed;
    p.grounded = false;
  }
  if (edge.dash && p.dashTicks === 0 && (p.dashCd === 0 || p.charm > 0)) {
    p.dashTicks = R.dash_ticks;
    p.dashDir = moving ? norm2(wx, wz) : [...p.facing];
    if (p.charm === 0) p.dashCd = R.dash_cd;
    if (!p.grounded) p.vy = 0; // air dash keeps altitude
    emit('dash', {});
  }

  let hx, hz;
  if (p.dashTicks > 0) {
    hx = p.dashDir[0] * T.dash_speed;
    hz = p.dashDir[1] * T.dash_speed;
  } else if (p.launch) {
    [hx, hz] = p.launch;
  } else {
    const sp = p.charm > 0 ? R.charm_speed : T.player_speed;
    hx = wx * sp;
    hz = wz * sp;
  }
  if (g.wind.active) {
    const a = (g.wind.dir * Math.PI) / 180;
    hx += Math.cos(a) * R.wind_speed;
    hz += Math.sin(a) * R.wind_speed;
  }
  slide(g, p.pos, hx / TICK_RATE, hz / TICK_RATE, p.pos[1], p.grounded);

  const gr = ground(g, p.pos[0], p.pos[2]);
  if (p.grounded) {
    if (gr !== null && gr >= p.pos[1] - R.step_height) p.pos[1] = gr;
    else {
      p.grounded = false; // walked off a ledge / the island
      p.vy = 0;
    }
  }
  if (!p.grounded && p.dashTicks === 0) {
    p.vy -= R.gravity / TICK_RATE;
    p.pos[1] += p.vy / TICK_RATE;
    const g2 = ground(g, p.pos[0], p.pos[2]);
    if (g2 !== null && p.pos[1] <= g2 && p.vy <= 0) {
      p.pos[1] = g2;
      p.vy = 0;
      p.grounded = true;
      p.launch = null;
    }
  }
  if (p.dashTicks > 0) p.dashTicks--;

  // jump pads: foot touches the pad while on the ground -> launch (velocity kept until landing)
  if (p.grounded) {
    for (const pd of g.pads) {
      if (distXZ(p.pos, pd.pos) <= pd.r && Math.abs(p.pos[1] - pd.pos[1]) < 0.05) {
        p.vy = pd.vy;
        p.launch = [pd.dir[0] * pd.vh, pd.dir[1] * pd.vh];
        p.grounded = false;
        break;
      }
    }
  }
  p.vel = [(p.pos[0] - before[0]) * TICK_RATE, p.grounded ? 0 : p.vy, (p.pos[2] - before[2]) * TICK_RATE];

  // fall off the island: exactly once, ignores invulnerability
  if (p.pos[1] < R.fall_y) {
    p.flames = Math.max(0, p.flames - 1);
    const lost = p.carried;
    p.carried = 0;
    p.waiting = true;
    p.respawn = R.respawn_wait;
    p.vel = [0, 0, 0];
    p.vy = 0;
    p.launch = null;
    p.dashTicks = 0;
    emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
  }
}

function pickups(g, emit) {
  const T = g.tuning;
  const p = g.player;
  for (let i = 0; i < g.motes.length && p.carried < T.carry_capacity; ) {
    const m = g.motes[i];
    if (distXZ(p.pos, m.pos) <= T.pickup_radius && Math.abs(p.pos[1] - m.pos[1]) <= R.pickup_dy) {
      g.motes.splice(i, 1);
      p.carried++;
      emit('mote_picked', { carried: p.carried });
    } else i++;
  }
  for (const c of g.charms) {
    if (c.available && distXZ(p.pos, c.pos) <= T.pickup_radius && Math.abs(p.pos[1] - c.pos[1]) <= R.pickup_dy) {
      c.available = false;
      c.respawn = R.charm_respawn;
      p.charm = R.charm_ticks;
      emit('charm_picked', { charm_id: c.id, charm_ticks: p.charm });
    }
  }
}

function interact(g, emit) {
  const T = g.tuning;
  const p = g.player;
  if (p.carried <= 0) return;
  let best = null;
  let bestD = Infinity;
  for (const l of g.lanterns) {
    if (l.lit) continue;
    const d = distXZ(p.pos, l.pos);
    // nearest; ties -> smaller id (lanterns are iterated in id order, strict < keeps the first)
    if (d <= T.interact_radius && d < bestD) {
      best = l;
      bestD = d;
    }
  }
  if (!best) return;
  const amount = Math.min(p.carried, T.lantern_cost - best.deposited);
  if (amount <= 0) return;
  p.carried -= amount;
  best.deposited += amount;
  g.score += T.score.per_mote * amount;
  emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
  if (best.deposited >= T.lantern_cost) {
    best.lit = true;
    g.score += T.score.per_lantern;
    emit('lantern_lit', { lantern_id: best.id });
  }
}

/** Shades inside a lit lantern's zone are pushed to its edge over (at most) 30 ticks, harmless meanwhile. */
function updateSafeZones(g) {
  const Rz = g.tuning.safe_radius;
  for (const s of g.shades) {
    if (s.expel === 0) {
      let inside = null;
      let best = Infinity;
      for (const l of g.lanterns) {
        if (!l.lit) continue;
        const d = distXZ(s.pos, l.pos);
        if (d < Rz && d < best) {
          inside = l;
          best = d;
        }
      }
      if (!inside) continue;
      s.expel = R.expel_ticks;
      s.expelFrom = inside;
    }
    const l = s.expelFrom;
    const d = distXZ(s.pos, l.pos);
    const [ux, uz] = norm2(s.pos[0] - l.pos[0], s.pos[2] - l.pos[2]);
    const nd = s.expel === 1 ? Rz + 0.001 : d + (Rz + 0.001 - d) / s.expel;
    s.pos[0] = l.pos[0] + ux * Math.max(d, nd);
    s.pos[2] = l.pos[2] + uz * Math.max(d, nd);
    const gr = ground(g, s.pos[0], s.pos[2]);
    if (gr !== null) s.pos[1] = gr + R.shade_height;
    s.expel--;
    if (s.expel === 0) s.expelFrom = null;
  }
}

function pulse(g, emit) {
  const T = g.tuning;
  const p = g.player;
  p.carried -= T.pulse_cost;
  p.pulseCd = R.pulse_cd;
  const c = [p.pos[0], p.pos[1] + R.pulse_height, p.pos[2]];
  const ids = [];
  for (const s of g.shades) {
    if (dist3(c, s.pos) <= T.pulse_radius) {
      s.state = 'stunned';
      s.stateTicks = R.stun_ticks;
      s.push = R.push_ticks;
      s.pushDir = norm2(s.pos[0] - c[0], s.pos[2] - c[2]);
      ids.push(s.id);
    }
  }
  g.score += T.score.per_stun * ids.length;
  emit('pulse', { stunned_ids: ids });
  for (const d of g.drifters) {
    if (dist3(c, d.pos) > T.pulse_radius) continue;
    if (d.state === 'chase') {
      d.state = 'flee';
      d.stateTicks = R.drifter_flee_ticks;
      d.stoleOnce = true; // scared off: it will not come back to steal
    } else if (d.state === 'flee' && d.stolen > 0) {
      const amount = d.stolen;
      const gr = ground(g, d.pos[0], d.pos[2]);
      for (let i = 0; i < amount; i++) addMote(g, [d.pos[0], gr ?? 0, d.pos[2]], { kind: 'dropped', ttl: R.dropped_ttl });
      d.stolen = 0;
      d.stateTicks = R.drifter_drop_ticks;
      emit('drifter_drop', { drifter_id: d.id, amount });
    }
  }
}

function moveShades(g) {
  const p = g.player;
  const speed = g.N.shadeSpeed / TICK_RATE;
  for (const s of g.shades) {
    if (s.expel > 0) continue;
    const dPlayer = p.waiting ? Infinity : distXZ(s.pos, p.pos);
    if ((s.state === 'spawning' || s.state === 'stunned' || s.state === 'recoil') && s.stateTicks === 0) {
      s.state = dPlayer <= R.shade_detect ? 'chase' : 'wander';
      s.push = 0;
    }
    if (s.state === 'spawning') continue;
    if (s.state === 'stunned') {
      if (s.push > 0) {
        const st = g.tuning.pulse_push_m / R.push_ticks;
        if (moveShade(g, s, s.pushDir[0] * st, s.pushDir[1] * st)) s.push--;
        else s.push = 0; // obstacle: stop the push
      }
    } else if (s.state === 'recoil') {
      if (!p.waiting) {
        const [ux, uz] = norm2(s.pos[0] - p.pos[0], s.pos[2] - p.pos[2]);
        const st = R.recoil_m / R.recoil_ticks;
        moveShade(g, s, ux * st, uz * st);
      }
    } else {
      if (dPlayer <= R.shade_detect) s.state = 'chase';
      else if (s.state === 'chase' && dPlayer > R.shade_lose) s.state = 'wander';
      if (s.state === 'chase') {
        const [dx, dz] = moveToward(s.pos, [p.pos[0], p.pos[2]], speed);
        moveShade(g, s, dx, dz);
      } else {
        if (!s.target) s.target = pickWanderTarget(g, s.home, R.shade_wander_radius);
        const [dx, dz, d] = moveToward(s.pos, s.target, R.shade_wander_speed / TICK_RATE);
        if (d < 0.2 || !moveShade(g, s, dx, dz)) s.target = null;
      }
    }
    blockAtSafeZones(g, s);
  }
}

function moveDrifters(g) {
  const p = g.player;
  for (const d of g.drifters) {
    if (d.state === 'removed') continue;
    const dp = p.waiting ? Infinity : distXZ(d.pos, p.pos);
    const wants = !d.stoleOnce && !p.waiting && p.carried >= R.drifter_min_carry && dp <= R.drifter_detect;
    if (d.state === 'idle' && wants) d.state = 'chase';
    else if (d.state === 'chase' && !wants) d.state = 'idle';
    let dx = 0, dz = 0;
    if (d.state === 'chase') {
      [dx, dz] = moveToward(d.pos, [p.pos[0], p.pos[2]], R.drifter_speed / TICK_RATE);
    } else if (d.state === 'flee') {
      const [ux, uz] = norm2(d.pos[0] - p.pos[0], d.pos[2] - p.pos[2]);
      dx = (ux * R.drifter_speed) / TICK_RATE;
      dz = (uz * R.drifter_speed) / TICK_RATE;
    } else {
      if (!d.target) d.target = pickWanderTarget(g, d.home, R.drifter_wander_radius);
      let dist;
      [dx, dz, dist] = moveToward(d.pos, d.target, R.drifter_idle_speed / TICK_RATE);
      if (dist < 0.2) d.target = null;
    }
    d.pos[0] += dx; // drifters fly: terrain does not block them
    d.pos[2] += dz;
    const gr = ground(g, d.pos[0], d.pos[2]);
    if (gr !== null) d.pos[1] = gr + R.drifter_height;
  }
}

function contacts(g, emit) {
  const T = g.tuning;
  const p = g.player;
  for (const d of g.drifters) {
    if (d.state !== 'chase' || distXZ(d.pos, p.pos) > R.drifter_touch) continue;
    const amount = Math.min(R.drifter_steal, p.carried);
    if (amount <= 0) continue;
    p.carried -= amount;
    d.stolen = amount;
    d.stoleOnce = true;
    d.state = 'flee';
    d.stateTicks = R.drifter_flee_ticks;
    emit('drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
  }
  const hitter = g.shades.find(
    (s) => (s.state === 'chase' || s.state === 'wander') && s.expel === 0 &&
      distXZ(s.pos, p.pos) <= T.shade_hit_radius && Math.abs(p.pos[1] - (s.pos[1] - R.shade_height)) <= R.hit_dy,
  );
  if (!hitter || p.invuln > 0) return; // touching while invulnerable does nothing
  p.flames = Math.max(0, p.flames - 1);
  const dropped = Math.floor(p.carried * T.hit_drop_ratio);
  p.carried -= dropped;
  for (let i = 0; i < dropped; i++) {
    for (let tries = 0; tries < 8; tries++) {
      const a = g.rng() * 2 * Math.PI;
      const r = R.drop_rmin + g.rng() * (R.drop_rmax - R.drop_rmin);
      const x = p.pos[0] + r * Math.cos(a);
      const z = p.pos[2] + r * Math.sin(a);
      const gr = ground(g, x, z);
      if (gr === null || gr > 13) continue; // not into the sea / onto the tower
      addMote(g, [x, gr, z], { kind: 'dropped', ttl: R.dropped_ttl });
      break;
    }
  }
  p.invuln = R.invuln_ticks;
  hitter.state = 'recoil';
  hitter.stateTicks = R.recoil_ticks;
  emit('player_hit', { by: 'shade', flames: p.flames, dropped });
}

function spawns(g, emit) {
  const N = g.N;
  const p = g.player;
  const t = g.simTick;
  if (g.randomMotes && t % R.mote_every === 0 && g.motes.length < R.mote_cap) {
    const used = new Set(g.motes.filter((m) => m.point >= 0).map((m) => m.point));
    const free = N.moteSpawns.map((_, i) => i).filter((i) => !used.has(i));
    if (free.length) {
      const i = free[Math.floor(g.rng() * free.length)];
      addMote(g, [...N.moteSpawns[i]], { kind: 'random', point: i });
    }
  }
  if (g.randomShades && t >= R.shade_first_spawn && (t - R.shade_first_spawn) % N.shadeInterval === 0) {
    const count = t === R.shade_first_spawn ? 2 : 1;
    for (let k = 0; k < count && g.shades.length < N.shadeMax; k++) {
      const valid = N.shadeSpawns.filter(
        (pt) => distXZ(pt, p.pos) >= R.shade_min_player_dist &&
          !g.lanterns.some((l) => l.lit && distXZ(l.pos, pt) <= g.tuning.safe_radius) &&
          !g.shades.some((s) => distXZ(s.pos, pt) < 0.5),
      );
      if (!valid.length) break;
      const pt = valid[Math.floor(g.rng() * valid.length)];
      const s = addShade(g, [pt[0], (ground(g, pt[0], pt[2]) ?? 0) + R.shade_height, pt[2]]);
      emit('shade_spawned', { id: s.id });
    }
  }
  if (g.randomDrifters && t % R.drifter_every === 0) {
    const active = g.drifters.filter((d) => d.state !== 'removed').length;
    if (active < R.drifter_max) {
      const pt = N.shadeSpawns[Math.floor(g.rng() * N.shadeSpawns.length)];
      addDrifter(g, [pt[0], (ground(g, pt[0], pt[2]) ?? 0) + R.drifter_height, pt[2]]);
    }
  }
}

function endGame(g, result, reason, emit) {
  const S = g.tuning.score;
  if (result === 'won') {
    g.score += S.per_second_left * Math.floor(g.ticksLeft / TICK_RATE) + S.per_flame_left * g.player.flames;
  }
  g.state = result;
  g.result = { result, reason };
  emit('game_over', { result, reason });
}

// ---------------------------------------------------------------- output

export function snapshot(g) {
  const v3 = (q) => [r3(q[0]), r3(q[1]), r3(q[2])];
  const p = g.player;
  const t = (n) => r3(n / TICK_RATE);
  return {
    type: 'snapshot',
    tick: g.tick,
    sim_tick: g.simTick,
    night: g.night,
    state: g.state,
    time_left_s: t(g.ticksLeft),
    score: g.score,
    wind: { active: g.wind.active, dir_deg: g.wind.dir },
    player: {
      pos: v3(p.pos),
      vel: v3(p.vel),
      grounded: p.grounded,
      flames: p.flames,
      carried: p.carried,
      invuln: p.invuln > 0,
      invuln_s: t(p.invuln),
      dash_cd_s: t(p.dashCd),
      pulse_cd_s: t(p.pulseCd),
      charm_s: t(p.charm),
    },
    lanterns: g.lanterns.map((l) => ({ id: l.id, pos: v3(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: g.shades.map((s) => ({ id: s.id, pos: v3(s.pos), state: s.state })),
    motes_active: g.motes.length,
    motes: g.motes.map((m) => ({ id: m.id, pos: v3(m.pos), kind: m.kind, ttl_s: m.ttl === null ? null : t(m.ttl) })),
    drifters: g.drifters.map((d) => ({ id: d.id, pos: v3(d.pos), state: d.state, stolen: d.stolen })),
    charms: g.charms.map((c) => ({ id: c.id, pos: v3(c.pos), available: c.available, respawn_s: t(c.respawn) })),
  };
}
