// Contract-level checks of the headless CLI: format, cadence, determinism, exit codes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runHeadless, runScenario, tmp } from './helpers.mjs';

const PLAY_INPUTS = {
  frames: [
    { tick: 0, move: [0, 1], cam_yaw_deg: 0 },
    { tick: 200, move: [1, 0.3], cam_yaw_deg: 45, pulse: true },
    { tick: 201, pulse: false, jump: true },
    { tick: 202, jump: false },
    { tick: 600, move: [-1, -1], interact: true },
    { tick: 601, interact: false },
    { tick: 1500, move: [0, -1], cam_yaw_deg: -30, pulse: true },
    { tick: 1501, pulse: false },
  ],
};

test('determinism: same seed + inputs -> byte-identical output (default random world)', () => {
  const a = runScenario({ seed: 42, ticks: 3000, inputs: PLAY_INPUTS });
  const b = runScenario({ seed: 42, ticks: 3000, inputs: PLAY_INPUTS });
  assert.equal(a.code, 0, a.stderr);
  assert.ok(a.outText.length > 1000);
  assert.equal(a.outText, b.outText);
});

for (const night of [2, 3]) {
  test(`determinism night ${night}: same seed + inputs -> identical output`, () => {
    const a = runScenario({ seed: 9, night, ticks: 3000, inputs: PLAY_INPUTS });
    const b = runScenario({ seed: 9, night, ticks: 3000, inputs: PLAY_INPUTS });
    assert.equal(a.code, 0, a.stderr);
    assert.equal(a.outText, b.outText);
  });
}

test('performance: a full night (21600 ticks, snapshot every tick) finishes well under 30 s', () => {
  for (const night of [1, 2, 3]) {
    const t0 = Date.now();
    const r = runScenario({ seed: 2, night, ticks: 21600, snapshotEvery: 1 });
    assert.equal(r.code, 0, r.stderr);
    assert.ok(Date.now() - t0 < 30000, `night ${night} took ${Date.now() - t0} ms`);
  }
});

test('shade states only use the v1.2 names (v1.1 + drain)', () => {
  const r = runScenario({ seed: 11, night: 3, ticks: 6000, snapshotEvery: 30, inputs: PLAY_INPUTS });
  const allowed = new Set(['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain']);
  for (const s of r.lines.filter((l) => l.type === 'snapshot')) for (const sh of s.shades) assert.ok(allowed.has(sh.state), sh.state);
});

test('different seeds give different random worlds', () => {
  const a = runScenario({ seed: 1, ticks: 0 });
  const b = runScenario({ seed: 2, ticks: 0 });
  assert.notDeepEqual(a.lines[0].motes, b.lines[0].motes);
});

test('snapshot cadence: tick 0 then every N; end is last; events precede the snapshot of their tick', () => {
  const r = runScenario({ seed: 5, ticks: 95, snapshotEvery: 10, scenario: { random_shades: false, shades: [] } });
  const snaps = r.lines.filter((l) => l.type === 'snapshot').map((s) => s.tick);
  assert.deepEqual(snaps, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
  assert.deepEqual(r.lines.at(-1), { type: 'end', ticks: 95, state: 'playing', score: 0 });
  const s = r.lines[0];
  for (const k of ['type', 'tick', 'sim_tick', 'night', 'state', 'time_left_s', 'score', 'wind', 'player', 'lanterns', 'shades', 'motes_active', 'motes', 'drifters', 'charms'])
    assert.ok(k in s, `snapshot missing ${k}`);
  for (const k of ['pos', 'vel', 'grounded', 'flames', 'carried', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s', 'capacity'])
    assert.ok(k in s.player, `player missing ${k}`);
  assert.deepEqual(Object.keys(s.wind), ['active', 'dir_deg']);
  for (const k of ['fuel', 'ever_lit', 'relit_count']) assert.ok(k in s.lanterns[0], `lantern missing ${k}`);
  assert.equal(s.sim_tick, s.tick);
});

test('coordinates are rounded to 3 decimals', () => {
  const r = runScenario({ seed: 9, ticks: 50, snapshotEvery: 7, inputs: { frames: [{ tick: 0, move: [0.37, 0.81], cam_yaw_deg: 13 }] } });
  for (const s of r.lines.filter((l) => l.type === 'snapshot'))
    for (const v of [...s.player.pos, ...s.shades.flatMap((x) => x.pos)])
      assert.equal(Math.round(v * 1000) / 1000, v);
});

test('stops early when the game ends (end.ticks < --ticks)', () => {
  const r = runScenario({ seed: 1, ticks: 5000, scenario: { random_motes: false, random_shades: false, motes: [], shades: [], time_left_s: 2 } });
  assert.equal(r.lines.at(-1).ticks, 120);
  assert.equal(r.lines.at(-1).state, 'lost');
});

const badCases = {
  'invalid JSON inputs': ['inputs', '{ "frames": [ '],
  'ticks not increasing': ['inputs', JSON.stringify({ frames: [{ tick: 5 }, { tick: 5 }] })],
  'move out of range': ['inputs', JSON.stringify({ frames: [{ tick: 0, move: [2, 0] }] })],
  'button not boolean': ['inputs', JSON.stringify({ frames: [{ tick: 0, pulse: 1 }] })],
  'frames missing': ['inputs', JSON.stringify({ steps: [] })],
  'scenario bad pos': ['scenario', JSON.stringify({ player: { pos: [0, 0] } })],
  'scenario unknown lantern': ['scenario', JSON.stringify({ lanterns: [{ id: 'L9', lit: true }] })],
  'scenario invalid JSON': ['scenario', 'nope'],
  'scenario bad shade state': ['scenario', JSON.stringify({ shades: [{ pos: [1, 0, 1], state: 'angry' }] })],
  'scenario fuel out of range': ['scenario', JSON.stringify({ lanterns: [{ id: 'L1', lit: true, fuel: 150 }] })],
  'dash not boolean': ['inputs', JSON.stringify({ frames: [{ tick: 0, dash: 'yes' }] })],
};
for (const [name, [kind, text]] of Object.entries(badCases)) {
  test(`malformed ${kind} file (${name}) -> exit 2 + stderr`, () => {
    const dir = tmp();
    const f = path.join(dir, `${kind}.json`);
    fs.writeFileSync(f, text);
    const r = runHeadless(['--seed', '1', '--night', '1', '--ticks', '10', `--${kind}`, f, '--out', path.join(dir, 'o.jsonl')]);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /headless:/);
  });
}

test('bad CLI usage -> non-zero exit + stderr', () => {
  const out = path.join(tmp(), 'o.jsonl');
  for (const args of [
    ['--night', '1', '--ticks', '10', '--out', out], // no seed
    ['--seed', '1', '--night', '1', '--out', out], // no ticks
    ['--seed', '1', '--night', '4', '--ticks', '1', '--out', out], // unknown night
    ['--seed', 'x', '--night', '1', '--ticks', '1', '--out', out],
  ]) {
    const r = runHeadless(args);
    assert.notEqual(r.code, 0, args.join(' '));
    assert.ok(r.stderr.length > 0);
  }
});
