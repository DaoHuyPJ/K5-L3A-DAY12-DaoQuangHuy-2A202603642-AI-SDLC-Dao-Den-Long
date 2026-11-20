// Phase-1 acceptance scenarios. Each one = scenario file + inputs file + headless args + a check.
// Used by tests/scenarios.test.mjs (pass/fail) and scripts/verify.mjs (writes proof files).
// Expected numbers are derived by hand from the tuning in src/sim/config.js (see docs/notes/phase-1.md).

import assert from 'node:assert/strict';

const EMPTY = { random_motes: false, random_shades: false, motes: [], shades: [] };
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const snaps = (L) => L.filter((l) => l.type === 'snapshot');
const snapAt = (L, t) => snaps(L).find((s) => s.tick === t);
const evs = (L, name) => L.filter((l) => l.type === 'event' && (!name || l.name === name));
const end = (L) => L[L.length - 1];

export const SCENARIOS = [
  {
    name: 'R01-default-world',
    req: 'Night 1 default: 5 lanterns L1..L5, player at origin, 300 s, 3 flames, motes + shades exist',
    seed: 1, ticks: 0,
    check(L) {
      const s = snapAt(L, 0);
      assert.equal(s.lanterns.length, 5);
      assert.deepEqual(s.lanterns.map((l) => l.id), ['L1', 'L2', 'L3', 'L4', 'L5']);
      assert.deepEqual(s.lanterns[0].pos, [0, 0, 25]);
      assert.deepEqual(s.player, { pos: [0, 0, 0], flames: 3, carried: 0 });
      assert.equal(s.time_left_s, 300);
      assert.ok(s.motes_active > 0 && s.shades.length > 0);
      assert.deepEqual(end(L), { type: 'end', ticks: 0, state: 'playing', score: 0 });
    },
  },
  {
    name: 'R02-move-speed',
    req: 'player_speed = 6 m/s: move [0,1] for 60 ticks -> (0,0,6)',
    seed: 1, ticks: 60, scenario: EMPTY,
    inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 0 }] },
    check(L) {
      assert.deepEqual(snapAt(L, 60).player.pos, [0, 0, 6]);
    },
  },
  {
    name: 'R03-camera-yaw',
    req: 'cam_yaw_deg 90 rotates move [0,1] to world +X',
    seed: 1, ticks: 60, scenario: EMPTY,
    inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }] },
    check(L) {
      const p = snapAt(L, 60).player.pos;
      assert.ok(near(p[0], 6) && near(p[2], 0), `pos ${p}`);
    },
  },
  {
    name: 'R04-move-normalized',
    req: 'move vectors longer than 1 are normalized: [1,1] for 1 s -> 6 m total',
    seed: 1, ticks: 60, scenario: EMPTY,
    inputs: { frames: [{ tick: 0, move: [1, 1] }] },
    check(L) {
      const p = snapAt(L, 60).player.pos;
      assert.ok(near(p[0], 4.243) && near(p[2], 4.243), `pos ${p}`);
    },
  },
  {
    name: 'R05-pickup-radius',
    req: 'auto pickup within pickup_radius 1.2 (<=), not beyond; +10 score per mote',
    seed: 1, ticks: 5, snapshotEvery: 1,
    scenario: { ...EMPTY, motes: [[0, 0, 1.2], [0, 0, -1.25]] },
    check(L) {
      const picks = evs(L, 'mote_picked');
      assert.equal(picks.length, 1);
      assert.deepEqual(picks[0], { type: 'event', tick: 1, name: 'mote_picked', data: { carried: 1 } });
      const s = snapAt(L, 5);
      assert.equal(s.motes_active, 1);
      assert.equal(s.score, 10);
    },
  },
  {
    name: 'R06-carry-capacity',
    req: 'cannot carry more than carry_capacity 10',
    seed: 1, ticks: 5, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 9 }, motes: [[0, 0, 0.5], [0, 0, -0.5]] },
    check(L) {
      assert.equal(evs(L, 'mote_picked').length, 1);
      assert.equal(snapAt(L, 5).player.carried, 10);
      assert.equal(snapAt(L, 5).motes_active, 1);
    },
  },
  {
    name: 'R07-deposit-and-light',
    req: 'interact within interact_radius 2.5 deposits; lantern_cost 5 lights it; +100',
    seed: 1, ticks: 5, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 22.5], carried: 7 } },
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }] },
    check(L) {
      assert.deepEqual(evs(L, 'deposit')[0].data, { lantern_id: 'L1', amount: 5, deposited: 5 });
      assert.deepEqual(evs(L, 'lantern_lit')[0], { type: 'event', tick: 1, name: 'lantern_lit', data: { lantern_id: 'L1' } });
      const s = snapAt(L, 1);
      assert.equal(s.player.carried, 2);
      assert.equal(s.lanterns[0].lit, true);
      assert.equal(s.score, 100);
    },
  },
  {
    name: 'R08-partial-deposit',
    req: 'partial deposit accumulates, lantern stays unlit until lantern_cost',
    seed: 1, ticks: 3, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 23], carried: 3 }, lanterns: [{ id: 'L1', deposited: 1 }] },
    inputs: { frames: [{ tick: 0, interact: true }] },
    check(L) {
      assert.deepEqual(evs(L, 'deposit')[0].data, { lantern_id: 'L1', amount: 3, deposited: 4 });
      assert.equal(evs(L, 'lantern_lit').length, 0);
      assert.equal(snapAt(L, 3).lanterns[0].lit, false);
    },
  },
  {
    name: 'R09-deposit-out-of-range',
    req: 'no deposit beyond interact_radius (2.6 m)',
    seed: 1, ticks: 3, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 22.4], carried: 5 } },
    inputs: { frames: [{ tick: 0, interact: true }] },
    check(L) {
      assert.equal(evs(L, 'deposit').length, 0);
      assert.equal(snapAt(L, 3).player.carried, 5);
    },
  },
  {
    name: 'R10-pulse-stun-push',
    req: 'pulse costs 1 light, stuns shades within 6 m for 3 s (180 ticks), pushes 4 m, +20 per stun',
    seed: 1, ticks: 200, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 2 }, shades: [{ id: 'S1', pos: [3, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    check(L) {
      assert.deepEqual(evs(L, 'pulse')[0], { type: 'event', tick: 1, name: 'pulse', data: { stunned_ids: ['S1'] } });
      const s1 = snapAt(L, 1);
      assert.equal(s1.player.carried, 1);
      assert.equal(s1.score, 20);
      assert.equal(s1.shades[0].state, 'stunned');
      assert.ok(near(s1.shades[0].pos[0], 7), `pushed to ${s1.shades[0].pos}`);
      const s180 = snapAt(L, 180);
      assert.equal(s180.shades[0].state, 'stunned');
      assert.ok(near(s180.shades[0].pos[0], 7), 'stunned shade must not move');
      assert.equal(snapAt(L, 181).shades[0].state, 'chase');
      assert.ok(snapAt(L, 190).shades[0].pos[0] < 7);
    },
  },
  {
    name: 'R11-pulse-radius-edge',
    req: 'shade beyond pulse_radius is not stunned; pulse still costs light',
    seed: 1, ticks: 2, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 2 }, shades: [{ id: 'S1', pos: [6.05, 0, 0] }, { id: 'S2', pos: [0, 0, -6] }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    check(L) {
      assert.deepEqual(evs(L, 'pulse')[0].data, { stunned_ids: ['S2'] });
      assert.equal(snapAt(L, 1).player.carried, 1);
    },
  },
  {
    name: 'R12-pulse-needs-light',
    req: 'no pulse when carried < pulse_cost',
    seed: 1, ticks: 5, snapshotEvery: 1,
    scenario: { ...EMPTY, shades: [{ pos: [3, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    check(L) {
      assert.equal(evs(L, 'pulse').length, 0);
    },
  },
  {
    name: 'R13-pulse-cooldown-and-edge',
    req: 'pulse fires on false->true edge only, with pulse_cooldown_s 1 (60 ticks)',
    seed: 1, ticks: 100, snapshotEvery: 50,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 5 } },
    inputs: {
      frames: [
        { tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 30, pulse: true }, { tick: 31, pulse: false },
        { tick: 60, pulse: true }, // held from here on -> only one more pulse
      ],
    },
    check(L) {
      assert.deepEqual(evs(L, 'pulse').map((e) => e.tick), [1, 61]);
      assert.equal(snapAt(L, 100).player.carried, 3);
    },
  },
  {
    name: 'R14-hit-invuln-drop-lose',
    req: 'shade touch: -1 flame, drop floor(carried*0.5), 1.5 s invuln; 0 flames -> lost/no_flames',
    seed: 1, ticks: 400,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 5 }, shades: [{ id: 'S1', pos: [0.5, 0, 0] }] },
    check(L) {
      const hits = evs(L, 'player_hit');
      assert.deepEqual(hits.map((h) => [h.tick, h.data.flames, h.data.dropped, h.data.by]), [
        [1, 2, 2, 'shade'], [91, 1, 1, 'shade'], [181, 0, 1, 'shade'],
      ]);
      assert.deepEqual(evs(L, 'game_over')[0], { type: 'event', tick: 181, name: 'game_over', data: { result: 'lost', reason: 'no_flames' } });
      assert.deepEqual(end(L), { type: 'end', ticks: 181, state: 'lost', score: 0 });
    },
  },
  {
    name: 'R15-safe-radius-lit',
    req: 'shades never enter safe_radius 5 around a LIT lantern',
    seed: 1, ticks: 600, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 25] }, lanterns: [{ id: 'L1', lit: true }], shades: [{ id: 'S1', pos: [0, 0, 12] }] },
    check(L) {
      for (const s of snaps(L)) assert.ok(dist(s.shades[0].pos, [0, 0, 25]) > 5, `tick ${s.tick}: ${s.shades[0].pos}`);
      assert.equal(evs(L, 'player_hit').length, 0);
    },
  },
  {
    name: 'R16-unlit-lantern-no-safety',
    req: 'assumption: an unlit lantern gives no protection',
    seed: 1, ticks: 600,
    scenario: { ...EMPTY, player: { pos: [0, 0, 25] }, shades: [{ id: 'S1', pos: [0, 0, 12] }] },
    check(L) {
      assert.ok(evs(L, 'player_hit').length > 0);
    },
  },
  {
    name: 'R17-win-all-lit',
    req: 'lighting the last lantern -> won/all_lit; bonus 2*floor(time_left) + 50*flames',
    seed: 1, ticks: 10,
    scenario: {
      ...EMPTY,
      player: { pos: [10, 0, 10], carried: 1, flames: 3 },
      lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }, { id: 'L4', lit: true }, { id: 'L5', pos: [10, 0, 10], deposited: 4 }],
      time_left_s: 100,
    },
    inputs: { frames: [{ tick: 0, interact: true }] },
    check(L) {
      assert.deepEqual(evs(L, 'game_over')[0], { type: 'event', tick: 1, name: 'game_over', data: { result: 'won', reason: 'all_lit' } });
      // 100 (lantern) + 2 * floor(99.983) + 50 * 3 = 448 ; scenario-lit lanterns give nothing
      assert.deepEqual(end(L), { type: 'end', ticks: 1, state: 'won', score: 448 });
    },
  },
  {
    name: 'R18-lose-dawn',
    req: 'time_left reaches 0 -> lost/dawn; time_left_s = duration - steps/60',
    seed: 1, ticks: 100, snapshotEvery: 30,
    scenario: { ...EMPTY, time_left_s: 1 },
    check(L) {
      assert.equal(snapAt(L, 30).time_left_s, 0.5);
      assert.deepEqual(evs(L, 'game_over')[0].data, { result: 'lost', reason: 'dawn' });
      assert.equal(evs(L, 'game_over')[0].tick, 60);
      assert.deepEqual(end(L), { type: 'end', ticks: 60, state: 'lost', score: 0 });
    },
  },
  {
    name: 'R19-scenario-setup-no-score',
    req: 'scenario setup emits no events and gives no score (lit: true)',
    seed: 1, ticks: 1,
    scenario: { ...EMPTY, lanterns: [{ id: 'L1', lit: true }, { id: 'L2', deposited: 2 }] },
    check(L) {
      assert.equal(evs(L).length, 0);
      const s = snapAt(L, 0);
      assert.equal(s.score, 0);
      assert.equal(s.lanterns[0].lit, true);
      assert.equal(s.lanterns[1].deposited, 2);
    },
  },
  {
    name: 'R20-shade-spawn',
    req: 'random_shades: a new shade spawns every 30 s with shade_spawned event',
    seed: 3, ticks: 1800, snapshotEvery: 1800,
    scenario: { random_motes: false, motes: [], shades: [] },
    check(L) {
      assert.deepEqual(evs(L, 'shade_spawned'), [{ type: 'event', tick: 1800, name: 'shade_spawned', data: { id: 'S1' } }]);
      assert.equal(snapAt(L, 1800).shades.length, 1);
    },
  },
  {
    name: 'R21-jump',
    req: 'jump: rises above ground then lands back at Y = 0',
    seed: 1, ticks: 60, snapshotEvery: 1, scenario: EMPTY,
    inputs: { frames: [{ tick: 0, jump: true }] },
    check(L) {
      const ys = snaps(L).map((s) => s.player.pos[1]);
      const max = Math.max(...ys);
      assert.ok(max > 1 && max < 1.4, `apex ${max}`);
      assert.equal(snapAt(L, 60).player.pos[1], 0);
    },
  },
  {
    name: 'R22-island-edge',
    req: 'fall_enabled false: island radius 40 is a wall, no fall events',
    seed: 1, ticks: 600, scenario: EMPTY,
    inputs: { frames: [{ tick: 0, move: [1, 0] }] },
    check(L) {
      assert.deepEqual(snapAt(L, 600).player.pos, [40, 0, 0]);
      assert.equal(evs(L, 'player_hit').length, 0);
    },
  },
];
