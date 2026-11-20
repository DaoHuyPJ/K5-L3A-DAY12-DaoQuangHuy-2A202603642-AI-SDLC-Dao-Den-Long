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
  assert.equal(c.contract_version, '1.0');
  for (const k of ['team', 'build_cmd', 'run_cmd', 'headless_cmd']) assert.equal(typeof c[k], 'string', k);
  assert.deepEqual(c.tuning, JSON.parse(JSON.stringify(TUNING)));
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
  const ev = step(g, { move: [0, 0] });
  assert.equal(ev.at(-1).name, 'game_over');
  assert.deepEqual(step(g, { move: [0, 1] }), []);
  assert.equal(g.tick, 1);
});

test('tuning sanity: shade slower than player, lantern cost fits capacity', () => {
  assert.ok(TUNING.shade_speed < TUNING.player_speed);
  assert.ok(TUNING.lantern_cost <= TUNING.carry_capacity);
});
