// Pure, deterministic game logic for Đảo Đèn Lồng. No DOM, no Date, no Math.random.
// Used by both the headless runner (src/headless.js) and the browser game (src/game/main.js).

import { TICK_RATE, TUNING, WORLD } from './config.js';
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

const distXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const secToTicks = (s) => Math.round(s * TICK_RATE);
export const r3 = (v) => Math.round(v * 1000) / 1000 + 0; // +0 turns -0 into 0

function defaultLanterns(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = (2 * Math.PI * i) / count; // L1 at (0, 0, 25)
    out.push({
      id: `L${i + 1}`,
      pos: [r3(WORLD.lantern_ring_radius * Math.sin(a)), 0, r3(WORLD.lantern_ring_radius * Math.cos(a))],
      lit: false,
      deposited: 0,
    });
  }
  return out;
}

/**
 * Build a game. `scenario` must already be validated by parseScenario.
 * Scenario setup emits no events and awards no score.
 */
export function createGame({ seed = 0, scenario = {}, tuning = TUNING } = {}) {
  const T = tuning;
  const g = {
    tuning: T,
    rng: makeRng(seed),
    tick: 0,
    state: 'playing',
    score: 0,
    ticksLeft: secToTicks(scenario.time_left_s ?? T.night1_duration_s),
    player: { pos: [0, 0, 0], vy: 0, grounded: true, flames: T.flames, carried: 0, invuln: 0, cooldown: 0, facing: 0 },
    prevButtons: { jump: false, interact: false, pulse: false },
    lanterns: defaultLanterns(T.lantern_count_night1),
    motes: [],
    shades: [],
    nextMoteId: 1,
    nextShadeId: 1,
    randomMotes: scenario.random_motes ?? true,
    randomShades: scenario.random_shades ?? true,
    moteTimer: 0,
    shadeTimer: 0,
    result: null,
  };

  const sp = scenario.player || {};
  if (sp.pos) g.player.pos = [...sp.pos];
  g.player.grounded = g.player.pos[1] <= 0;
  if (g.player.pos[1] < 0) g.player.pos[1] = 0;
  if (sp.carried !== undefined) g.player.carried = sp.carried;
  if (sp.flames !== undefined) g.player.flames = sp.flames;

  for (const l of scenario.lanterns || []) {
    const target = g.lanterns.find((x) => x.id === l.id);
    if (!target) throw new FormatError(`scenario: unknown lantern id "${l.id}" (night 1 has L1..L${g.lanterns.length})`);
    if (l.pos) target.pos = [...l.pos];
    if (l.deposited !== undefined) target.deposited = l.deposited;
    if (l.lit !== undefined) target.lit = l.lit;
    if (target.lit && l.deposited === undefined) target.deposited = T.lantern_cost;
    if (!target.lit && target.deposited >= T.lantern_cost) target.lit = true;
  }

  if (scenario.motes) {
    for (const m of scenario.motes) addMote(g, [m.pos[0], 0, m.pos[2]], m.id);
  } else if (g.randomMotes) {
    for (let i = 0; i < WORLD.initial_motes; i++) spawnRandomMote(g);
  }

  if (scenario.shades) {
    for (const s of scenario.shades) addShade(g, [s.pos[0], WORLD.shade_height, s.pos[2]], s.id);
  } else if (g.randomShades) {
    for (let i = 0; i < WORLD.initial_shades; i++) spawnRandomShade(g);
  }
  return g;
}

function addMote(g, pos, id) {
  if (!id) {
    while (g.motes.some((m) => m.id === `M${g.nextMoteId}`)) g.nextMoteId++;
    id = `M${g.nextMoteId++}`;
  }
  g.motes.push({ id, pos });
}

function addShade(g, pos, id) {
  if (!id) {
    while (g.shades.some((s) => s.id === `S${g.nextShadeId}`)) g.nextShadeId++;
    id = `S${g.nextShadeId++}`;
  }
  const shade = { id, pos, stun: 0 };
  g.shades.push(shade);
  return shade;
}

function spawnRandomMote(g) {
  for (let tries = 0; tries < 20; tries++) {
    const a = g.rng() * 2 * Math.PI;
    const r = WORLD.mote_min_r + Math.sqrt(g.rng()) * (WORLD.mote_max_r - WORLD.mote_min_r);
    const pos = [r3(r * Math.sin(a)), 0, r3(r * Math.cos(a))];
    if (g.lanterns.some((l) => distXZ(l.pos, pos) < WORLD.mote_lantern_clearance)) continue;
    if (distXZ(g.player.pos, pos) <= g.tuning.pickup_radius + 1) continue;
    addMote(g, pos);
    return true;
  }
  return false;
}

function spawnRandomShade(g) {
  for (let tries = 0; tries < 20; tries++) {
    const a = g.rng() * 2 * Math.PI;
    const R = WORLD.shade_spawn_ring;
    const pos = [r3(R * Math.sin(a)), WORLD.shade_height, r3(R * Math.cos(a))];
    if (distXZ(g.player.pos, pos) < WORLD.shade_spawn_min_player_dist) continue;
    if (g.lanterns.some((l) => l.lit && distXZ(l.pos, pos) <= g.tuning.safe_radius)) continue;
    return addShade(g, pos);
  }
  return null;
}

function clampToIsland(pos) {
  const d = Math.hypot(pos[0], pos[2]);
  if (d > WORLD.island_radius) {
    pos[0] *= WORLD.island_radius / d;
    pos[2] *= WORLD.island_radius / d;
  }
}

/** Shades may not be within safe_radius of a lit lantern: push them to just outside. */
function keepOutOfSafeZones(g, shade) {
  const R = g.tuning.safe_radius + 0.01;
  for (let pass = 0; pass < 2; pass++) {
    for (const l of g.lanterns) {
      if (!l.lit) continue;
      const dx = shade.pos[0] - l.pos[0];
      const dz = shade.pos[2] - l.pos[2];
      const d = Math.hypot(dx, dz);
      if (d < R) {
        const [ux, uz] = d > 1e-9 ? [dx / d, dz / d] : [1, 0];
        shade.pos[0] = l.pos[0] + ux * R;
        shade.pos[2] = l.pos[2] + uz * R;
      }
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

/**
 * Step k: consume input for tick k, produce state k+1. Returns the events of this step
 * ({type:'event', tick:k+1, name, data}). Does nothing once the game is over.
 * Order inside a step: timers -> move/jump -> pickup -> interact -> pulse -> shades -> hits -> spawns -> dawn.
 */
export function step(g, input) {
  if (g.state !== 'playing') return [];
  const T = g.tuning;
  const S = T.score;
  const p = g.player;
  const events = [];
  const tick = g.tick + 1;
  const emit = (name, data) => events.push({ type: 'event', tick, name, data });

  const edge = (k) => !!input[k] && !g.prevButtons[k];
  const jumpE = edge('jump');
  const interactE = edge('interact');
  const pulseE = edge('pulse');
  g.prevButtons = { jump: !!input.jump, interact: !!input.interact, pulse: !!input.pulse };

  // 1. clocks
  g.tick = tick;
  g.ticksLeft -= 1;
  if (p.invuln > 0) p.invuln--;
  if (p.cooldown > 0) p.cooldown--;
  for (const s of g.shades) if (s.stun > 0) s.stun--;

  // 2. movement (camera-relative, normalized if longer than 1)
  let [mx, mz] = input.move || [0, 0];
  const len = Math.hypot(mx, mz);
  if (len > 1) {
    mx /= len;
    mz /= len;
  }
  const th = ((input.cam_yaw_deg || 0) * Math.PI) / 180;
  const wx = mx * Math.cos(th) + mz * Math.sin(th);
  const wz = -mx * Math.sin(th) + mz * Math.cos(th);
  const v = T.player_speed / TICK_RATE;
  p.pos[0] += wx * v;
  p.pos[2] += wz * v;
  if (wx !== 0 || wz !== 0) p.facing = Math.atan2(wx, wz);
  clampToIsland(p.pos);
  if (jumpE && p.grounded) {
    p.vy = WORLD.jump_speed;
    p.grounded = false;
  }
  if (!p.grounded) {
    p.vy -= WORLD.gravity / TICK_RATE;
    p.pos[1] += p.vy / TICK_RATE;
    if (p.pos[1] <= 0) {
      p.pos[1] = 0;
      p.vy = 0;
      p.grounded = true;
    }
  }

  // 3. pickup (auto, id order, up to capacity)
  for (let i = 0; i < g.motes.length && p.carried < T.carry_capacity; ) {
    if (distXZ(p.pos, g.motes[i].pos) <= T.pickup_radius) {
      g.motes.splice(i, 1);
      p.carried++;
      g.score += S.per_mote;
      emit('mote_picked', { carried: p.carried });
    } else i++;
  }

  // 4. interact: deposit into nearest unlit lantern within interact_radius
  if (interactE && p.carried > 0) {
    let best = null;
    let bestD = Infinity;
    for (const l of g.lanterns) {
      if (l.lit) continue;
      const d = distXZ(p.pos, l.pos);
      if (d <= T.interact_radius && d < bestD) {
        best = l;
        bestD = d;
      }
    }
    if (best) {
      const amount = Math.min(p.carried, T.lantern_cost - best.deposited);
      if (amount > 0) {
        p.carried -= amount;
        best.deposited += amount;
        emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
      }
      if (best.deposited >= T.lantern_cost) {
        best.lit = true;
        g.score += S.per_lantern;
        emit('lantern_lit', { lantern_id: best.id });
        if (g.lanterns.every((l) => l.lit)) {
          endGame(g, 'won', 'all_lit', emit);
          return events;
        }
      }
    }
  }

  // 5. pulse: costs light (carried motes), stuns + pushes shades in radius
  if (pulseE && p.cooldown === 0 && p.carried >= T.pulse_cost) {
    p.carried -= T.pulse_cost;
    p.cooldown = secToTicks(T.pulse_cooldown_s);
    const stunned = [];
    for (const s of g.shades) {
      const dx = s.pos[0] - p.pos[0];
      const dz = s.pos[2] - p.pos[2];
      const d = Math.hypot(dx, dz);
      if (d <= T.pulse_radius) {
        s.stun = secToTicks(T.pulse_stun_s);
        const [ux, uz] = d > 1e-9 ? [dx / d, dz / d] : [1, 0];
        s.pos[0] += ux * T.pulse_push_m;
        s.pos[2] += uz * T.pulse_push_m;
        clampToIsland(s.pos);
        keepOutOfSafeZones(g, s);
        stunned.push(s.id);
      }
    }
    g.score += S.per_stun * stunned.length;
    emit('pulse', { stunned_ids: stunned });
  }

  // 6. shades chase the player (stunned shades do not move)
  const sv = T.shade_speed / TICK_RATE;
  for (const s of g.shades) {
    if (s.stun > 0) continue;
    const dx = p.pos[0] - s.pos[0];
    const dz = p.pos[2] - s.pos[2];
    const d = Math.hypot(dx, dz);
    if (d > 1e-9) {
      const stepLen = Math.min(sv, d);
      s.pos[0] += (dx / d) * stepLen;
      s.pos[2] += (dz / d) * stepLen;
    }
    clampToIsland(s.pos);
    keepOutOfSafeZones(g, s);
  }

  // 7. hits (one per step, then invulnerable)
  if (p.invuln === 0) {
    const hitter = g.shades.find((s) => s.stun === 0 && distXZ(p.pos, s.pos) <= T.shade_hit_radius);
    if (hitter) {
      p.flames = Math.max(0, p.flames - 1);
      const dropped = Math.floor(p.carried * T.hit_drop_ratio);
      p.carried -= dropped;
      p.invuln = secToTicks(T.invuln_s);
      emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      if (p.flames === 0) {
        endGame(g, 'lost', 'no_flames', emit);
        return events;
      }
    }
  }

  // 8. spawns
  if (g.randomMotes && ++g.moteTimer >= secToTicks(WORLD.mote_respawn_s)) {
    g.moteTimer = 0;
    if (g.motes.length < WORLD.max_active_motes) spawnRandomMote(g);
  }
  if (g.randomShades && ++g.shadeTimer >= secToTicks(WORLD.shade_spawn_s)) {
    g.shadeTimer = 0;
    if (g.shades.length < WORLD.max_shades) {
      const s = spawnRandomShade(g);
      if (s) emit('shade_spawned', { id: s.id });
    }
  }

  // 9. dawn
  if (g.ticksLeft <= 0) {
    g.ticksLeft = 0;
    endGame(g, 'lost', 'dawn', emit);
  }
  return events;
}

export function snapshot(g, { includeMotes = true } = {}) {
  const v3 = (p) => [r3(p[0]), r3(p[1]), r3(p[2])];
  const snap = {
    type: 'snapshot',
    tick: g.tick,
    sim_tick: g.tick,
    state: g.state,
    time_left_s: r3(g.ticksLeft / TICK_RATE),
    score: g.score,
    player: { pos: v3(g.player.pos), flames: g.player.flames, carried: g.player.carried },
    lanterns: g.lanterns.map((l) => ({ id: l.id, pos: v3(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: g.shades.map((s) => ({ id: s.id, pos: v3(s.pos), state: s.stun > 0 ? 'stunned' : 'chase' })),
    motes_active: g.motes.length,
  };
  if (includeMotes) snap.motes = g.motes.map((m) => ({ id: m.id, pos: v3(m.pos) }));
  return snap;
}
