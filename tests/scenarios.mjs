// Acceptance scenarios (contract v1.1 / Ticket-02 standard numbers).
// Each = scenario file + inputs file + headless args + a check. Used by tests/scenarios.test.mjs and scripts/verify.mjs.
// Expected numbers are derived by hand from Ticket-02 (see docs/notes/phase-2.md), never pasted from program output.
// R01–R22: Phase-1 requirements re-expressed with the standard numbers (changes listed in docs/notes/phase-2.md §4).
// P01–P24: new Phase-2 features.

import assert from 'node:assert/strict';

const EMPTY = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes: [], shades: [], drifters: [] };
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const snaps = (L) => L.filter((l) => l.type === 'snapshot');
const snapAt = (L, t) => {
  const s = snaps(L).find((x) => x.tick === t);
  assert.ok(s, `no snapshot at tick ${t}`);
  return s;
};
const evs = (L, name) => L.filter((l) => l.type === 'event' && (!name || l.name === name));
const end = (L) => L[L.length - 1];
const deg = (d) => (d * Math.PI) / 180;

export const SCENARIOS = [
  // ------------------------------------------------------------ Phase 1 requirements, standard numbers
  {
    name: 'R01-default-world',
    req: 'Night 1 default: 5 standard lanterns, start (0,0,0), 300 s, 3 flames, 20 motes, no shade before tick 300',
    seed: 1, ticks: 0,
    check(L) {
      const s = snapAt(L, 0);
      assert.equal(s.night, 1);
      assert.deepEqual(s.lanterns.map((l) => [l.id, l.pos]), [
        ['L1', [0, 0, 25]], ['L2', [23.8, 0, 7.7]], ['L3', [14.7, 0, -20.2]], ['L4', [-14.7, 0, -20.2]], ['L5', [-23.8, 0, 7.7]],
      ]);
      assert.deepEqual(s.player.pos, [0, 0, 0]);
      assert.equal(s.player.flames, 3);
      assert.equal(s.time_left_s, 300);
      assert.equal(s.motes_active, 20);
      assert.equal(s.shades.length, 0);
      assert.deepEqual(evs(L), [{ type: 'event', tick: 0, name: 'night_start', data: { night: 1 } }]);
    },
  },
  {
    name: 'R02-move-speed',
    req: 'run speed 6 m/s: move [0,1] for 60 ticks -> (0,0,6)',
    seed: 1, ticks: 60, scenario: EMPTY,
    inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 0 }] },
    check(L) {
      assert.deepEqual(snapAt(L, 60).player.pos, [0, 0, 6]);
      assert.deepEqual(snapAt(L, 60).player.vel, [0, 0, 6]);
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
    req: 'move vectors longer than 1 are normalized: [1,1] for 1 s -> 6 m',
    seed: 1, ticks: 60, scenario: EMPTY,
    inputs: { frames: [{ tick: 0, move: [1, 1] }] },
    check(L) {
      const p = snapAt(L, 60).player.pos;
      assert.ok(near(p[0], 4.243) && near(p[2], 4.243), `pos ${p}`);
    },
  },
  {
    name: 'R05-pickup-radius',
    req: 'auto pickup at XZ <= 1.0 m, not at 1.05 m; picking gives no score (score is per deposit)',
    seed: 1, ticks: 5, snapshotEvery: 1,
    scenario: { ...EMPTY, motes: [[0, 0, 1.0], [0, 0, -1.05]] },
    check(L) {
      assert.deepEqual(evs(L, 'mote_picked'), [{ type: 'event', tick: 1, name: 'mote_picked', data: { carried: 1 } }]);
      assert.equal(snapAt(L, 5).motes_active, 1);
      assert.equal(snapAt(L, 5).score, 0);
    },
  },
  {
    name: 'R06-carry-capacity',
    req: 'cannot carry more than 10',
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
    req: 'interact within 2.0 m deposits; 10 motes light it; +10 per mote deposited, +100 per lantern',
    seed: 1, ticks: 3, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 23], carried: 10 } },
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }] },
    check(L) {
      assert.deepEqual(evs(L, 'deposit')[0], { type: 'event', tick: 1, name: 'deposit', data: { lantern_id: 'L1', amount: 10, deposited: 10 } });
      assert.deepEqual(evs(L, 'lantern_lit')[0].data, { lantern_id: 'L1' });
      const s = snapAt(L, 1);
      assert.equal(s.player.carried, 0);
      assert.equal(s.lanterns[0].lit, true);
      assert.equal(s.score, 200);
    },
  },
  {
    name: 'R08-partial-deposit',
    req: 'deposits accumulate (lantern remembers progress), unlit until 10',
    seed: 1, ticks: 3, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 23.5], carried: 3 }, lanterns: [{ id: 'L1', deposited: 1 }] },
    inputs: { frames: [{ tick: 0, interact: true }] },
    check(L) {
      assert.deepEqual(evs(L, 'deposit')[0].data, { lantern_id: 'L1', amount: 3, deposited: 4 });
      assert.equal(evs(L, 'lantern_lit').length, 0);
      assert.equal(snapAt(L, 3).lanterns[0].lit, false);
      assert.equal(snapAt(L, 3).score, 30);
    },
  },
  {
    name: 'R09-deposit-out-of-range',
    req: 'no deposit beyond interact radius 2.0 (2.1 m)',
    seed: 1, ticks: 3, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 22.9], carried: 5 } },
    inputs: { frames: [{ tick: 0, interact: true }] },
    check(L) {
      assert.equal(evs(L, 'deposit').length, 0);
      assert.equal(snapAt(L, 3).player.carried, 5);
    },
  },
  {
    name: 'R10-pulse-stun-push',
    req: 'pulse: -3 motes, 3D <= 5 m from foot+0.8, stun 120 ticks, pushed 4 m during first 15 ticks, +5 per shade',
    seed: 1, ticks: 130, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 5 }, shades: [{ id: 'S1', pos: [3, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    check(L) {
      assert.deepEqual(evs(L, 'pulse')[0], { type: 'event', tick: 1, name: 'pulse', data: { stunned_ids: ['S1'] } });
      const s1 = snapAt(L, 1);
      assert.equal(s1.player.carried, 2);
      assert.equal(s1.score, 5);
      assert.equal(s1.shades[0].state, 'stunned');
      assert.ok(near(s1.shades[0].pos[0], 3 + 4 / 15), `push step ${s1.shades[0].pos}`);
      assert.ok(near(snapAt(L, 15).shades[0].pos[0], 7), 'total push 4 m by tick 15');
      assert.ok(near(snapAt(L, 120).shades[0].pos[0], 7), 'stunned shade does not move');
      assert.equal(snapAt(L, 120).shades[0].state, 'stunned');
      assert.equal(snapAt(L, 121).shades[0].state, 'chase');
      assert.ok(near(snapAt(L, 1).player.pulse_cd_s, 3));
    },
  },
  {
    name: 'R11-pulse-radius-3d',
    req: 'pulse targets: 3D distance to shade center <= 5 m (5.05 m out, 4.9 m in); still costs 3',
    seed: 1, ticks: 2, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 3 }, shades: [{ id: 'S1', pos: [5.05, 0, 0] }, { id: 'S2', pos: [0, 0, -4.9] }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    check(L) {
      assert.deepEqual(evs(L, 'pulse')[0].data, { stunned_ids: ['S2'] });
      assert.equal(snapAt(L, 1).player.carried, 0);
    },
  },
  {
    name: 'R12-pulse-needs-3-motes',
    req: 'no pulse with fewer than 3 motes',
    seed: 1, ticks: 5, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 2 }, shades: [{ pos: [3, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    check(L) {
      assert.equal(evs(L, 'pulse').length, 0);
      assert.equal(snapAt(L, 1).player.carried, 2);
    },
  },
  {
    name: 'R13-pulse-cooldown-and-edge',
    req: 'pulse on false->true edge only, cooldown 3 s (180 ticks)',
    seed: 1, ticks: 300, snapshotEvery: 50,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 9 } },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 30, pulse: true }, { tick: 31, pulse: false }, { tick: 180, pulse: true }] },
    check(L) {
      assert.deepEqual(evs(L, 'pulse').map((e) => e.tick), [1, 181]);
      assert.equal(snapAt(L, 300).player.carried, 3);
    },
  },
  {
    name: 'R14-hit-recoil-drop-lose',
    req: 'shade hit: -1 flame, floor(carried/2) dropped on 1.5–2.5 m ring (480-tick TTL), 90 invuln, shade recoils 60 ticks; 0 flames -> lost',
    seed: 1, ticks: 400, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 5 }, shades: [{ id: 'S1', pos: [0.5, 0, 0] }] },
    check(L) {
      const hits = evs(L, 'player_hit').map((h) => [h.tick, h.data.by, h.data.flames, h.data.dropped]);
      assert.deepEqual(hits, [[1, 'shade', 2, 2], [91, 'shade', 1, 1], [181, 'shade', 0, 1]]);
      const s1 = snapAt(L, 1);
      assert.equal(s1.shades[0].state, 'recoil');
      assert.equal(s1.player.invuln, true);
      const dropped = s1.motes.filter((m) => m.kind === 'dropped');
      assert.equal(dropped.length, 2);
      for (const m of dropped) {
        const d = dist(m.pos, [0, 0, 0]);
        assert.ok(d >= 1.5 - 1e-3 && d <= 2.5 + 1e-3, `drop ring ${d}`);
        assert.equal(m.ttl_s, 8);
      }
      assert.ok(dist(snapAt(L, 60).shades[0].pos, [0, 0, 0]) > 2, 'recoil moved the shade back ~2 m');
      assert.deepEqual(evs(L, 'game_over')[0], { type: 'event', tick: 181, name: 'game_over', data: { result: 'lost', reason: 'no_flames' } });
      assert.deepEqual(end(L), { type: 'end', ticks: 181, state: 'lost', score: 0 });
    },
  },
  {
    name: 'R15-safe-radius-lit',
    req: 'shades are stopped at the 6 m edge of a LIT lantern',
    seed: 1, ticks: 600, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 25] }, lanterns: [{ id: 'L1', lit: true }], shades: [{ id: 'S1', pos: [0, 0, 14] }] },
    check(L) {
      for (const s of snaps(L)) assert.ok(dist(s.shades[0].pos, [0, 0, 25]) >= 6 - 1e-3, `tick ${s.tick}: ${s.shades[0].pos}`);
      assert.ok(near(dist(snapAt(L, 600).shades[0].pos, [0, 0, 25]), 6, 0.01));
      assert.equal(evs(L, 'player_hit').length, 0);
    },
  },
  {
    name: 'R16-unlit-lantern-no-safety',
    req: 'an unlit lantern gives no protection',
    seed: 1, ticks: 600,
    scenario: { ...EMPTY, player: { pos: [0, 0, 25] }, shades: [{ id: 'S1', pos: [0, 0, 14] }] },
    check(L) {
      assert.ok(evs(L, 'player_hit').length > 0);
    },
  },
  {
    name: 'R17-win-all-lit',
    req: 'all lanterns lit -> won/all_lit; score = deposits*10 + 100 + floor(time_left)*2 + 50*flames',
    seed: 1, ticks: 10,
    scenario: {
      ...EMPTY,
      player: { pos: [10, 0, 10], carried: 1, flames: 3 },
      lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }, { id: 'L4', lit: true }, { id: 'L5', pos: [10, 0, 10], deposited: 9 }],
      time_left_s: 100,
    },
    inputs: { frames: [{ tick: 0, interact: true }] },
    check(L) {
      assert.deepEqual(evs(L, 'game_over')[0], { type: 'event', tick: 1, name: 'game_over', data: { result: 'won', reason: 'all_lit' } });
      // 10 + 100 + 2 * floor(99.983) + 50 * 3 = 458
      assert.deepEqual(end(L), { type: 'end', ticks: 1, state: 'won', score: 458 });
    },
  },
  {
    name: 'R18-lose-dawn',
    req: 'time_left reaches 0 -> lost/dawn',
    seed: 1, ticks: 100, snapshotEvery: 30,
    scenario: { ...EMPTY, time_left_s: 1 },
    check(L) {
      assert.equal(snapAt(L, 30).time_left_s, 0.5);
      assert.deepEqual(evs(L, 'game_over')[0], { type: 'event', tick: 60, name: 'game_over', data: { result: 'lost', reason: 'dawn' } });
      assert.deepEqual(end(L), { type: 'end', ticks: 60, state: 'lost', score: 0 });
    },
  },
  {
    name: 'R19-scenario-setup-no-score',
    req: 'scenario setup emits no gameplay events and gives no score',
    seed: 1, ticks: 1,
    scenario: { ...EMPTY, lanterns: [{ id: 'L1', lit: true }, { id: 'L2', deposited: 2 }] },
    check(L) {
      assert.deepEqual(evs(L).map((e) => e.name), ['night_start']);
      const s = snapAt(L, 0);
      assert.equal(s.score, 0);
      assert.equal(s.lanterns[0].lit, true);
      assert.equal(s.lanterns[1].deposited, 2);
    },
  },
  {
    name: 'R20-shade-spawn-schedule',
    req: 'Night 1: 2 shades at tick 300, then 1 every 480 ticks; ids S1, S2…; new shades start "spawning"',
    seed: 3, ticks: 800, snapshotEvery: 10,
    scenario: { random_motes: false, motes: [], shades: [] },
    check(L) {
      assert.deepEqual(evs(L, 'shade_spawned').map((e) => [e.tick, e.data.id]), [[300, 'S1'], [300, 'S2'], [780, 'S3']]);
      const s = snapAt(L, 300);
      assert.deepEqual(s.shades.map((x) => x.state), ['spawning', 'spawning']);
      for (const sh of s.shades) {
        assert.ok(near(dist(sh.pos, [0, 0, 0]), 37, 0.01), 'on the 37 m ring');
        const a = (((Math.atan2(sh.pos[2], sh.pos[0]) * 180) / Math.PI + 360) % 360);
        assert.ok(near((a - 15 + 360) % 30, 0, 0.05) || near((a - 15 + 360) % 30, 30, 0.05), `angle ${a}`);
      }
      assert.notEqual(snapAt(L, 370).shades[0].state, 'spawning');
    },
  },
  {
    name: 'R21-jump',
    req: 'jump 7 m/s, gravity 20: apex ~1.2 m, lands at Y=0',
    seed: 1, ticks: 60, snapshotEvery: 1, scenario: EMPTY,
    inputs: { frames: [{ tick: 0, jump: true }] },
    check(L) {
      const ys = snaps(L).map((s) => s.player.pos[1]);
      const max = Math.max(...ys);
      assert.ok(max > 1.1 && max < 1.3, `apex ${max}`);
      assert.equal(snapAt(L, 60).player.pos[1], 0);
      assert.equal(snapAt(L, 60).player.grounded, true);
      assert.equal(snapAt(L, 10).player.grounded, false);
    },
  },
  {
    name: 'R22-fall-respawn',
    req: 'beyond 40 m is sea: Y < -10 -> -1 flame, lose all motes (once), 60-tick wait, respawn at start with 90 invuln',
    seed: 1, ticks: 600, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [39, 0, 0], carried: 4 } },
    inputs: { frames: [{ tick: 0, move: [1, 0] }, { tick: 20, move: [0, 0] }] },
    check(L) {
      const falls = evs(L, 'player_hit');
      assert.equal(falls.length, 1);
      assert.deepEqual(falls[0].data, { by: 'fall', flames: 2, dropped: 0, lost: 4 });
      const t = falls[0].tick;
      assert.equal(snapAt(L, t).player.carried, 0);
      assert.ok(snapAt(L, t + 59).player.pos[1] < -10, 'still waiting');
      const r = snapAt(L, t + 60);
      assert.deepEqual(r.player.pos, [0, 0, 0]);
      assert.equal(r.player.invuln, true);
      assert.ok(near(r.player.invuln_s, 1.5));
    },
  },
  // ------------------------------------------------------------ Phase 2 features
  {
    name: 'P01-dash',
    req: 'dash 14 m/s for 12 ticks in facing direction (+Z when idle), cooldown 90 ticks from dash start',
    seed: 1, ticks: 120, snapshotEvery: 1, scenario: EMPTY,
    inputs: { frames: [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 30, dash: true }, { tick: 31, dash: false }, { tick: 90, dash: true }, { tick: 91, dash: false }] },
    check(L) {
      assert.deepEqual(evs(L, 'dash').map((e) => e.tick), [1, 91]);
      assert.ok(near(snapAt(L, 12).player.pos[2], 2.8), `dash distance ${snapAt(L, 12).player.pos}`);
      assert.ok(near(snapAt(L, 13).player.pos[2], 2.8), 'dash ends after 12 ticks');
      assert.ok(near(snapAt(L, 1).player.dash_cd_s, 1.5));
    },
  },
  {
    name: 'P02-air-dash-keeps-height',
    req: 'dash in the air keeps altitude for its 12 ticks, in the moving direction',
    seed: 1, ticks: 40, snapshotEvery: 1, scenario: EMPTY,
    inputs: { frames: [{ tick: 0, jump: true }, { tick: 10, dash: true, move: [1, 0] }] },
    check(L) {
      const y = snapAt(L, 11).player.pos[1];
      assert.ok(y > 0.5);
      for (let t = 11; t <= 22; t++) assert.equal(snapAt(L, t).player.pos[1], y, `tick ${t}`);
      assert.ok(snapAt(L, 22).player.pos[0] > 2.5, 'dashed along +X');
      assert.ok(snapAt(L, 30).player.pos[1] < y, 'falls after the dash');
    },
  },
  {
    name: 'P03-charm-speed-and-free-dash',
    req: 'Night 2 charm C1 at (35,0,0): charm_picked 600 ticks, run 7.2 m/s, dash with no cooldown, respawn 2700 ticks',
    seed: 1, night: 2, ticks: 60, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [35, 0, 0] } },
    inputs: { frames: [{ tick: 0, move: [1, 0] }] },
    check(L) {
      assert.deepEqual(evs(L, 'charm_picked')[0], { type: 'event', tick: 1, name: 'charm_picked', data: { charm_id: 'C1', charm_ticks: 600 } });
      // tick 1 moves at 6 (pickup happens after movement), then 59 ticks at 7.2
      assert.ok(near(snapAt(L, 60).player.pos[0], 35 + 0.1 + 59 * 0.12), `pos ${snapAt(L, 60).player.pos}`);
      const c = snapAt(L, 1).charms[0];
      assert.deepEqual([c.id, c.available, c.respawn_s], ['C1', false, 45]);
      assert.ok(near(snapAt(L, 1).player.charm_s, 10));
    },
  },
  {
    name: 'P04-charm-dash-no-cooldown',
    req: 'with the charm, a new dash press works right after the previous dash ends (press during a dash is ignored)',
    seed: 1, night: 2, ticks: 40, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], charm_ticks: 600 } },
    inputs: { frames: [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 5, dash: true }, { tick: 6, dash: false }, { tick: 14, dash: true }] },
    check(L) {
      assert.deepEqual(evs(L, 'dash').map((e) => e.tick), [1, 15]);
      assert.equal(snapAt(L, 2).player.dash_cd_s, 0);
    },
  },
  {
    name: 'P05-pause',
    req: 'pause toggles on edge: tick advances, sim_tick/time/motion freeze, state "paused", events paused/resumed',
    seed: 1, ticks: 30, snapshotEvery: 5, scenario: EMPTY,
    inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 10, pause: true }, { tick: 11, pause: false }, { tick: 20, pause: true }, { tick: 21, pause: false }] },
    check(L) {
      assert.deepEqual(evs(L).filter((e) => e.name !== 'night_start').map((e) => [e.tick, e.name]), [[11, 'paused'], [21, 'resumed']]);
      const p = snapAt(L, 15);
      assert.equal(p.state, 'paused');
      assert.equal(p.sim_tick, 10);
      assert.ok(near(p.player.pos[2], 1));
      assert.ok(near(p.time_left_s, 300 - 10 / 60, 0.001));
      const e = snapAt(L, 30);
      assert.equal(e.state, 'playing');
      assert.equal(e.sim_tick, 20);
      assert.ok(near(e.player.pos[2], 2));
    },
  },
  {
    name: 'P06-drifter-steal-flee-remove',
    req: 'Gió Lạc chases when carried >= 5 within 15 m, steals min(3, carried) at XZ <= 1.2, flees 240 ticks then removed',
    seed: 1, night: 2, ticks: 400, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 6 }, drifters: [{ id: 'D1', pos: [3, 0, 0] }] },
    check(L) {
      assert.equal(snapAt(L, 1).drifters[0].state, 'chase');
      const st = evs(L, 'drifter_steal');
      assert.equal(st.length, 1);
      assert.deepEqual(st[0].data, { drifter_id: 'D1', amount: 3, carried: 3 });
      const t = st[0].tick;
      assert.deepEqual([snapAt(L, t).drifters[0].state, snapAt(L, t).drifters[0].stolen], ['flee', 3]);
      assert.equal(snapAt(L, t + 239).drifters[0].state, 'flee');
      assert.equal(snapAt(L, t + 240).drifters[0].state, 'removed');
      assert.equal(snapAt(L, 400).player.flames, 3, 'no flame lost');
    },
  },
  {
    name: 'P07-drifter-idle-below-5',
    req: 'Gió Lạc stays idle when Mây carries fewer than 5',
    seed: 1, night: 2, ticks: 120, snapshotEvery: 60,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 4 }, drifters: [{ id: 'D1', pos: [3, 0, 0] }] },
    check(L) {
      assert.equal(snapAt(L, 120).drifters[0].state, 'idle');
      assert.equal(evs(L, 'drifter_steal').length, 0);
    },
  },
  {
    name: 'P08-pulse-scares-chasing-drifter',
    req: 'pulse hitting a chasing Gió Lạc -> flee without stealing, removed 240 ticks later',
    seed: 1, night: 2, ticks: 300, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 8 }, drifters: [{ id: 'D1', pos: [4, 0, 0] }] },
    inputs: { frames: [{ tick: 5, pulse: true }] },
    check(L) {
      assert.equal(snapAt(L, 5).drifters[0].state, 'chase');
      assert.equal(snapAt(L, 6).drifters[0].state, 'flee');
      assert.equal(evs(L, 'drifter_steal').length, 0);
      assert.equal(snapAt(L, 246).drifters[0].state, 'removed');
      assert.equal(snapAt(L, 300).player.carried, 5);
    },
  },
  {
    name: 'P09-pulse-fleeing-drifter-drops-loot',
    req: 'pulse hitting a fleeing Gió Lạc with loot -> drifter_drop, loot becomes dropped motes, removed after 120 ticks',
    seed: 1, night: 2, ticks: 130, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 3 }, drifters: [{ id: 'D1', pos: [2, 0, 0], state: 'flee', stolen: 3 }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    check(L) {
      assert.deepEqual(evs(L, 'drifter_drop')[0], { type: 'event', tick: 1, name: 'drifter_drop', data: { drifter_id: 'D1', amount: 3 } });
      const s = snapAt(L, 1);
      assert.equal(s.motes.filter((m) => m.kind === 'dropped').length, 3);
      assert.equal(s.drifters[0].stolen, 0);
      assert.equal(snapAt(L, 120).drifters[0].state, 'flee');
      assert.equal(snapAt(L, 121).drifters[0].state, 'removed');
    },
  },
  {
    name: 'P10-drifter-ignores-invuln-and-safezone',
    req: 'invulnerability does not prevent theft; lit lantern zones do not block Gió Lạc',
    seed: 1, night: 2, ticks: 120, snapshotEvery: 10,
    scenario: { ...EMPTY, player: { pos: [0, 0, 20], carried: 6, invuln_ticks: 600 }, lanterns: [{ id: 'L1', lit: true }], drifters: [{ id: 'D1', pos: [0, 0, 24] }] },
    check(L) {
      assert.equal(evs(L, 'drifter_steal').length, 1);
    },
  },
  {
    name: 'P11-dropped-mote-ttl-and-repick',
    req: 'dropped motes live 480 ticks and can be picked up again',
    seed: 1, ticks: 490, snapshotEvery: 1,
    scenario: { ...EMPTY, motes: [{ pos: [0, 0, 0.5], kind: 'dropped', ttl_ticks: 480 }, { pos: [10, 0, 10], kind: 'dropped', ttl_ticks: 480 }] },
    check(L) {
      assert.equal(evs(L, 'mote_picked').length, 1);
      assert.equal(snapAt(L, 1).motes.length, 1);
      assert.ok(near(snapAt(L, 1).motes[0].ttl_s, 479 / 60, 0.001));
      assert.equal(snapAt(L, 479).motes.length, 1);
      assert.equal(snapAt(L, 480).motes.length, 0);
    },
  },
  {
    name: 'P12-mote-spawn-schedule',
    req: '20 motes at 20 distinct spawn points; +1 at ticks 240, 480… at an empty point (Night 1: 24 points)',
    seed: 5, ticks: 1200, snapshotEvery: 240,
    scenario: { random_shades: false },
    check(L) {
      const s0 = snapAt(L, 0);
      assert.equal(s0.motes_active, 20);
      assert.equal(new Set(s0.motes.map((m) => m.pos.join())).size, 20);
      for (const m of s0.motes) {
        const r = dist(m.pos, [0, 0, 0]);
        assert.ok(near(r, 12) || near(r, 33), `r ${r}`);
      }
      assert.deepEqual([240, 480, 720, 960, 1200].map((t) => snapAt(L, t).motes_active), [21, 22, 23, 24, 24]);
    },
  },
  {
    name: 'P13-pickup-height',
    req: 'pickup needs |foot Y - mote ground Y| <= 1.5',
    seed: 1, ticks: 2, snapshotEvery: 1,
    scenario: { ...EMPTY, motes: [[0, 1.4, 0.5], [0, 1.6, -0.5]] },
    check(L) {
      assert.equal(evs(L, 'mote_picked').length, 1);
      assert.deepEqual(snapAt(L, 1).motes.map((m) => m.pos), [[0, 1.6, -0.5]]);
    },
  },
  {
    name: 'P14-interact-tie-smaller-id',
    req: 'equal distance to two unlit lanterns -> deposit into the smaller id',
    seed: 1, ticks: 2,
    scenario: { ...EMPTY, player: { pos: [0, 0, 0], carried: 3 }, lanterns: [{ id: 'L1', pos: [-1.5, 0, 0] }, { id: 'L2', pos: [1.5, 0, 0] }] },
    inputs: { frames: [{ tick: 0, interact: true }] },
    check(L) {
      assert.equal(evs(L, 'deposit')[0].data.lantern_id, 'L1');
    },
  },
  {
    name: 'P15-safe-zone-expel',
    req: 'shade inside when a lantern lights is pushed to the 6 m edge within 30 ticks and deals no damage meanwhile',
    seed: 1, ticks: 40, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 0, 23.5], carried: 1 }, lanterns: [{ id: 'L1', deposited: 9 }], shades: [{ id: 'S1', pos: [0, 0, 24.5] }] },
    inputs: { frames: [{ tick: 0, interact: true }] },
    check(L) {
      assert.equal(evs(L, 'lantern_lit').length, 1);
      const d15 = dist(snapAt(L, 15).shades[0].pos, [0, 0, 25]);
      assert.ok(d15 > 0.5 && d15 < 6, `gradual ${d15}`);
      assert.ok(dist(snapAt(L, 30).shades[0].pos, [0, 0, 25]) >= 6 - 1e-3);
      assert.equal(evs(L, 'player_hit').length, 0);
    },
  },
  {
    name: 'P16-shade-wander-detect',
    req: 'shade wanders beyond 12 m, chases within 12 m, gives up beyond 18 m',
    seed: 1, ticks: 200, snapshotEvery: 10,
    scenario: { ...EMPTY, shades: [{ id: 'S1', pos: [13, 0, 0] }, { id: 'S2', pos: [0, 0, 11] }, { id: 'S3', pos: [-19, 0, 0], state: 'chase' }] },
    check(L) {
      const s = snapAt(L, 10).shades;
      assert.deepEqual(s.map((x) => x.state), ['wander', 'chase', 'wander']);
    },
  },
  {
    name: 'P17-night3-shade-speed',
    req: 'Night 3 shade speed 4.5 m/s',
    seed: 1, night: 3, ticks: 30, snapshotEvery: 30,
    scenario: { ...EMPTY, player: { pos: [0, 0, -30] }, shades: [{ id: 'S1', pos: [8, 0, -30] }] },
    check(L) {
      assert.ok(near(snapAt(L, 30).shades[0].pos[0], 8 - 2.25), `${snapAt(L, 30).shades[0].pos}`);
    },
  },
  {
    name: 'P18-night2-map',
    req: 'Night 2: 6 lanterns L1..L6, 330 s, two islands + bridge (walk across without falling)',
    seed: 1, night: 2, ticks: 720, snapshotEvery: 60,
    scenario: { ...EMPTY, player: { pos: [20, 0, 0] } },
    inputs: { frames: [{ tick: 0, move: [1, 0] }] },
    check(L) {
      const s0 = snapAt(L, 0);
      assert.deepEqual(s0.lanterns.map((l) => l.pos), [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]]);
      assert.equal(s0.time_left_s, 330);
      assert.equal(s0.night, 2);
      assert.equal(evs(L, 'player_hit').length, 0);
      assert.ok(snapAt(L, 600).player.pos[0] > 75, 'crossed the bridge to island B');
    },
  },
  {
    name: 'P19-night2-jump-pad',
    req: 'Night 2 pad (20,0,18): vy 14, 24 m/s toward island B, ~1.4 s flight, lands on island B',
    seed: 1, night: 2, ticks: 120, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [20, 0, 18] } },
    inputs: { frames: [{ tick: 0, move: [-1, 0] }] }, // move keys must not override the launch
    check(L) {
      const land = snaps(L).find((s) => s.tick > 5 && s.player.grounded);
      assert.ok(land, 'landed');
      assert.ok(land.tick >= 80 && land.tick <= 90, `flight ${land.tick} ticks`);
      assert.ok(dist(land.player.pos, [70, 0, 0]) <= 28, `landed on B at ${land.player.pos}`);
      assert.equal(evs(L, 'player_hit').length, 0);
    },
  },
  {
    name: 'P20-night3-map-and-pad',
    req: 'Night 3: 7 lanterns, 360 s; pad (0,3,13) launches onto tier 2 (Y=6)',
    seed: 1, night: 3, ticks: 120, snapshotEvery: 1,
    scenario: { ...EMPTY, player: { pos: [0, 3, 13] } },
    check(L) {
      const s0 = snapAt(L, 0);
      assert.equal(s0.lanterns.length, 7);
      assert.deepEqual(s0.lanterns[0].pos, [0, 6, 6]);
      assert.equal(s0.time_left_s, 360);
      const land = snaps(L).find((s) => s.tick > 5 && s.player.grounded);
      assert.equal(land.player.pos[1], 6);
      assert.ok(Math.hypot(land.player.pos[0], land.player.pos[2]) <= 8);
    },
  },
  {
    name: 'P21-night3-ramp-cliff-tower',
    req: 'Night 3: ramp at 30° leads up to tier 1 (Y=3); tier-1 cliff blocks from below',
    seed: 1, night: 3, ticks: 120, snapshotEvery: 60,
    scenario: { ...EMPTY, player: { pos: [31 * Math.cos(deg(30)), 0, 31 * Math.sin(deg(30))] } },
    inputs: { frames: [{ tick: 0, move: [-Math.cos(deg(30)), -Math.sin(deg(30))] }] },
    check(L) {
      const p = snapAt(L, 120).player.pos;
      assert.equal(p[1], 3, `on tier 1: ${p}`);
      assert.ok(Math.hypot(p[0], p[2]) < 24);
    },
  },
  {
    name: 'P22-night3-cliff-blocks',
    req: 'Night 3: walking from tier 0 into the tier-1 cliff (r = 24) is blocked',
    seed: 1, night: 3, ticks: 120, snapshotEvery: 60,
    scenario: { ...EMPTY, player: { pos: [0, 0, 27] } },
    inputs: { frames: [{ tick: 0, move: [0, -1] }] },
    check(L) {
      const p = snapAt(L, 120).player.pos;
      assert.equal(p[1], 0);
      assert.ok(p[2] > 24 && p[2] < 24.2, `stopped at the cliff: ${p}`);
    },
  },
  {
    name: 'P23-night3-wind',
    req: 'Night 3 wind: every 30 s a 5 s gust pushes 2 m/s (10 m total), reported in snapshot.wind',
    seed: 4, night: 3, ticks: 2110, snapshotEvery: 10,
    scenario: { random_motes: false, random_shades: false, random_drifters: false, motes: [], shades: [] },
    check(L) {
      assert.equal(snapAt(L, 1790).wind.active, false);
      const w = snapAt(L, 1800).wind;
      assert.equal(w.active, true);
      assert.equal(snapAt(L, 2090).wind.dir_deg, w.dir_deg);
      assert.equal(snapAt(L, 2100).wind.active, false);
      const moved = dist(snapAt(L, 1790).player.pos, snapAt(L, 2110).player.pos);
      assert.ok(near(moved, 10, 0.05), `pushed ${moved} m`);
    },
  },
  {
    name: 'P24-night3-tower-blocks',
    req: 'Night 3: bell tower (r = 2) on tier 2 cannot be entered',
    seed: 1, night: 3, ticks: 60, snapshotEvery: 60,
    scenario: { ...EMPTY, player: { pos: [0, 6, 5] } },
    inputs: { frames: [{ tick: 0, move: [0, -1] }] },
    check(L) {
      const p = snapAt(L, 60).player.pos;
      assert.ok(Math.hypot(p[0], p[2]) >= 2 - 1e-6, `${p}`);
      assert.equal(p[1], 6);
    },
  },
];
