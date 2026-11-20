import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { TUNING } from '../src/sim/config.js';
import { InputTimeline, parseInputs } from '../src/sim/io.js';
import { createGame, makeRng, r3, step } from '../src/sim/world.js';
import { ROOT } from './helpers.mjs';

test('game.contract.json declares exactly the tuning the game uses', () => {
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8'));
  assert.equal(c.contract_version, '1.3');
  for (const k of ['team', 'build_cmd', 'run_cmd', 'headless_cmd']) assert.equal(typeof c[k], 'string', k);
  assert.deepEqual(c.tuning, JSON.parse(JSON.stringify(TUNING)));
});

test('tuning equals the Ticket-02 standard numbers + Ticket-03 changes (typed by hand from the tickets)', () => {
  const T = JSON.parse(JSON.stringify(TUNING));
  assert.deepEqual(T, {
    player_speed: 6, carry_capacity: 10, lantern_cost: 10, lantern_count_night1: 5,
    pickup_radius: 1, interact_radius: 2, pulse_cost: 3, pulse_radius: 5,
    night1_duration_s: 240, night2_duration_s: 270, night3_duration_s: 300, // Ticket-03
    flames: 3, invuln_s: 1.5, hit_drop_ratio: 0.5, pulse_stun_s: 2, pulse_push_m: 4, pulse_cooldown_s: 3,
    safe_radius: 6, shade_speed: 4, shade_hit_radius: 1, fall_enabled: true,
    dash_speed: 14, dash_duration_s: 0.2, dash_cooldown_s: 1.5,
    fuel_max: 100, fuel_decay_per_s: 1, fuel_per_mote: 10, relight_cost: 5, win_ratio: 0.6, // Ticket-03
    drain_per_s: 5, low_fuel_threshold: 30, capacity_max: 20,
    score: { per_mote: 5, per_lantern: 100, per_relight: 40, per_stun: 5, per_stun_drain: 15, per_second_left: 0, per_lit_at_dawn: 50, per_flame_left: 50 },
  });
});

test('InputTimeline: absent fields keep their previous value; defaults before first frame', () => {
  const tl = new InputTimeline(parseInputs({ frames: [{ tick: 3, move: [0, 1], cam_yaw_deg: 30 }, { tick: 5, pulse: true }] }));
  assert.deepEqual(tl.at(0).move, [0, 0]);
  assert.equal(tl.at(2).cam_yaw_deg, 0);
  assert.deepEqual(tl.at(3).move, [0, 1]);
  const s5 = tl.at(5);
  assert.deepEqual([s5.move, s5.cam_yaw_deg, s5.pulse], [[0, 1], 30, true]);
});

test('rng is deterministic per seed', () => {
  const a = makeRng(7), b = makeRng(7), c = makeRng(8);
  const sa = [a(), a(), a()];
  assert.deepEqual(sa, [b(), b(), b()]);
  assert.notDeepEqual(sa, [c(), c(), c()]);
});

test('r3 rounds to 3 decimals and never returns -0', () => {
  assert.equal(r3(1.23456), 1.235);
  assert.ok(Object.is(r3(-0.0001), 0));
});

test('step is a no-op after game over', () => {
  const g = createGame({ seed: 1, scenario: { random_motes: false, random_shades: false, motes: [], shades: [], time_left_s: 1 / 60 } });
  assert.equal(g.state, 'playing');
  const ev = step(g, { move: [0, 0] });
  assert.equal(ev.at(-1).name, 'game_over');
  assert.deepEqual(step(g, { move: [0, 1] }), []);
  assert.equal(g.tick, 1);
});

test('tuning sanity: shade slower than player, lantern cost fits capacity', () => {
  assert.ok(TUNING.shade_speed < TUNING.player_speed);
  assert.ok(TUNING.lantern_cost <= TUNING.carry_capacity);
});
