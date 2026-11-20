// Single source of truth for every gameplay number.
// game.contract.json "tuning" MUST equal TUNING (enforced by tests/contract.test.mjs).

export const TICK_RATE = 60;

export const TUNING = Object.freeze({
  player_speed: 6, // m/s
  carry_capacity: 10, // motes Mây can carry
  lantern_cost: 5, // motes needed to light one lantern
  lantern_count_night1: 5,
  pickup_radius: 1.2, // m, auto pickup
  interact_radius: 2.5, // m, deposit into lantern
  pulse_cost: 1, // carried motes spent per pulse
  pulse_radius: 6, // m
  night1_duration_s: 300,
  flames: 3, // health
  invuln_s: 1.5,
  hit_drop_ratio: 0.5, // dropped = floor(carried * ratio), dropped motes are lost
  pulse_stun_s: 3,
  pulse_push_m: 4,
  pulse_cooldown_s: 1,
  safe_radius: 5, // around LIT lanterns
  shade_speed: 3.5, // m/s
  shade_hit_radius: 1,
  fall_enabled: false, // island edge is a wall
  score: Object.freeze({
    per_mote: 10, // on pickup
    per_lantern: 100, // on lantern_lit
    per_stun: 20, // per shade stunned by a pulse
    per_second_left: 2, // on win: floor(time_left_s) * this
    per_flame_left: 50, // on win: flames * this
  }),
});

// Internal world constants (not part of the contract tuning block).
export const WORLD = Object.freeze({
  island_radius: 40,
  lantern_ring_radius: 25,
  jump_speed: 7, // m/s
  gravity: 20, // m/s^2
  shade_height: 1, // shade.pos is its center, hovering 1 m above ground
  initial_motes: 24,
  mote_respawn_s: 4,
  max_active_motes: 20,
  mote_min_r: 4,
  mote_max_r: 37,
  mote_lantern_clearance: 3,
  initial_shades: 2,
  shade_spawn_s: 30,
  max_shades: 6,
  shade_spawn_ring: 36,
  shade_spawn_min_player_dist: 15,
});
