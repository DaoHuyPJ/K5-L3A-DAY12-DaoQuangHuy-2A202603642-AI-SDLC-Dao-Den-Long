// Single source of truth for every gameplay number — Ticket-02 standard values (contract v1.1).
// game.contract.json "tuning" MUST equal TUNING (enforced by tests/unit.test.mjs).

export const TICK_RATE = 60;

export const TUNING = Object.freeze({
  player_speed: 6,
  carry_capacity: 10,
  lantern_cost: 10,
  lantern_count_night1: 5,
  pickup_radius: 1,
  interact_radius: 2,
  pulse_cost: 3,
  pulse_radius: 5,
  night1_duration_s: 300,
  night2_duration_s: 330,
  night3_duration_s: 360,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 2,
  pulse_push_m: 4,
  pulse_cooldown_s: 3,
  safe_radius: 6,
  shade_speed: 4, // night 3 uses 4.5 (NIGHTS[3].shadeSpeed)
  shade_hit_radius: 1,
  fall_enabled: true,
  dash_speed: 14,
  dash_duration_s: 0.2,
  dash_cooldown_s: 1.5,
  score: Object.freeze({
    per_mote: 10, // per mote DEPOSITED
    per_lantern: 100,
    per_stun: 5, // per shade hit by a pulse (each time, even if already stunned)
    per_second_left: 2,
    per_flame_left: 50,
  }),
});

const s2t = (s) => Math.round(s * TICK_RATE);

// Rules from Ticket-02 that are not tuning keys. All durations in ticks.
export const RULES = Object.freeze({
  jump_speed: 7,
  gravity: 20,
  step_height: 0.35, // max ground rise walkable per tick (ramps); cliffs are taller -> blocked
  dash_ticks: s2t(TUNING.dash_duration_s), // 12
  dash_cd: s2t(TUNING.dash_cooldown_s), // 90
  charm_speed: 7.2,
  charm_ticks: 600,
  charm_respawn: 2700,
  pickup_dy: 1.5,
  mote_initial: 20,
  mote_cap: 30,
  mote_every: 240,
  dropped_ttl: 480,
  drop_rmin: 1.5,
  drop_rmax: 2.5,
  pulse_cd: s2t(TUNING.pulse_cooldown_s), // 180
  pulse_height: 0.8,
  stun_ticks: s2t(TUNING.pulse_stun_s), // 120
  push_ticks: 15,
  invuln_ticks: s2t(TUNING.invuln_s), // 90
  shade_height: 1, // shade.pos = center, 1 m above its ground
  hit_dy: 1.5,
  shade_detect: 12,
  shade_lose: 18,
  shade_wander_speed: 1.5,
  shade_wander_radius: 6,
  shade_spawn_ticks: 60, // "spawning" state length
  shade_first_spawn: 300,
  shade_min_player_dist: 15,
  recoil_ticks: 60,
  recoil_m: 2,
  expel_ticks: 30,
  fall_y: -10,
  respawn_wait: 60,
  drifter_speed: 7,
  drifter_idle_speed: 2,
  drifter_max: 2,
  drifter_every: 1200,
  drifter_detect: 15,
  drifter_min_carry: 5,
  drifter_touch: 1.2,
  drifter_steal: 3,
  drifter_flee_ticks: 240,
  drifter_drop_ticks: 120,
  drifter_height: 1.5,
  drifter_wander_radius: 8,
  wind_every: 1800,
  wind_ticks: 300,
  wind_warn: 120,
  wind_speed: 2,
});

// ---------- standard maps (angles from +X toward +Z: point = (cx + r cos a, y, cz + r sin a)) ----------
const deg = (d) => (d * Math.PI) / 180;
const ring = (r, startDeg, stepDeg, count, y = 0, cx = 0, cz = 0) =>
  Array.from({ length: count }, (_, i) => {
    const a = deg(startDeg + i * stepDeg);
    return [cx + r * Math.cos(a), y, cz + r * Math.sin(a)];
  });

const N3_RAMPS = [30, 150].map((d) => ({ ux: Math.cos(deg(d)), uz: Math.sin(deg(d)) }));

export const NIGHTS = Object.freeze({
  1: {
    name: 'Đảo Bến',
    duration: TUNING.night1_duration_s,
    start: [0, 0, 0],
    lanterns: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
    moteSpawns: [...ring(12, 0, 45, 8), ...ring(33, 0, 22.5, 16)],
    shadeSpawns: ring(37, 15, 30, 12),
    shadeInterval: 480,
    shadeMax: 6,
    shadeSpeed: 4,
    charms: [],
    drifters: false,
    wind: false,
    pads: [],
    ground: (x, z) => (Math.hypot(x, z) <= 40 ? 0 : null),
  },
  2: {
    name: 'Đảo Cau',
    duration: TUNING.night2_duration_s,
    start: [0, 0, 0],
    lanterns: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
    moteSpawns: [
      ...ring(10, 0, 90, 4), ...ring(22, 0, 45, 8),
      ...ring(10, 0, 90, 4, 0, 70, 0), ...ring(22, 0, 45, 8, 0, 70, 0),
    ],
    shadeSpawns: [...ring(26, 22.5, 45, 8), ...ring(26, 22.5, 45, 8, 0, 70, 0)],
    shadeInterval: 420,
    shadeMax: 8,
    shadeSpeed: 4,
    charms: [[35, 0, 0]],
    drifters: true,
    wind: false,
    pads: [
      { pos: [20, 0, 18], r: 1, vy: 14, vh: 24, target: [70, 0] },
      { pos: [50, 0, -18], r: 1, vy: 14, vh: 24, target: [0, 0] },
    ],
    ground: (x, z) => {
      if (Math.hypot(x, z) <= 28 || Math.hypot(x - 70, z) <= 28) return 0;
      if (x >= 26 && x <= 44 && z >= -2 && z <= 2) return 0; // bamboo bridge
      return null;
    },
  },
  3: {
    name: 'Đảo Chuông',
    duration: TUNING.night3_duration_s,
    start: [0, 0, -30], // assumption: (0,0,0) is inside the bell tower
    lanterns: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
    moteSpawns: [...ring(34, 0, 20, 18), ...ring(18, 20, 20, 8, 3), ...ring(5, 45, 90, 4, 6)],
    shadeSpawns: ring(43, 0, 22.5, 16),
    shadeInterval: 360,
    shadeMax: 10,
    shadeSpeed: 4.5,
    charms: [[30, 0, 25], [-30, 0, 25]],
    drifters: true,
    wind: true,
    pads: [{ pos: [0, 3, 13], r: 1, vy: 12, vh: 8, dir: [0, -1] }],
    tower: { r: 2, top: 14 },
    ground: (x, z) => {
      const r = Math.hypot(x, z);
      if (r > 45) return null;
      if (r < 2) return 14; // bell tower (8 m on tier 2): unclimbable wall
      if (r <= 8) return 6;
      if (r >= 12 && r <= 24 && z > 0) return 3;
      for (const { ux, uz } of N3_RAMPS) {
        const s = x * ux + z * uz; // distance along the ramp axis
        const lat = Math.abs(x * uz - z * ux);
        if (lat <= 1.5 && s >= 24 && s <= 30) return (3 * (30 - s)) / 6;
      }
      return 0;
    },
  },
});
