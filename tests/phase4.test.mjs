// Ticket-04 (contract v1.3): bench statistics + scene, soak, leaderboard (+ export command), key rebinding, font size.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { BENCH, benchCamera, benchStats, createBenchGame } from '../src/sim/bench.js';
import { snapshot, step } from '../src/sim/world.js';
import { addEntry, cleanEntries, isoWithOffset, makeEntry, sortEntries, validName } from '../src/game/leaderboard.js';
import { DEFAULT_KEYS, findConflicts, loadKeys } from '../src/game/keys.js';
import { ROOT, tmp } from './helpers.mjs';

test('benchStats follows the Ticket-04 definitions (values computed by hand)', () => {
  // 100 frames: 98 x 10 ms, 2 x 50 ms -> sum 1080 ms
  const dts = [...Array(98).fill(10), 50, 50];
  const s = benchStats(dts);
  assert.equal(s.frames, 100);
  assert.equal(s.avg_fps, 92.6); // 1000*100/1080 = 92.59
  assert.equal(s.p1_low_fps, 20); // k = max(1, ceil(1)) = 1 worst frame = 50 ms -> 20
  assert.equal(s.frame_ms_p95, 10); // nearest-rank: 95th of 100 sorted = 10
  const s2 = benchStats([...Array(190).fill(10), ...Array(10).fill(40)]); // k = 2 -> mean(40, 40)
  assert.equal(s2.p1_low_fps, 25);
  assert.equal(s2.frame_ms_p95, 10); // nearest rank ceil(0.95*200) = 190th smallest of [190 x 10, 10 x 40] = 10
});

test('benchStats p1_low = 1000 / mean of the k worst frames (not the k-th worst)', () => {
  // 200 frames: 198 x 10 ms, one 30 ms, one 50 ms -> k = 2 -> mean(50, 30) = 40 ms -> 25 fps (k-th worst alone would give 33.3)
  assert.equal(benchStats([...Array(198).fill(10), 30, 50]).p1_low_fps, 25);
});

test('benchStats p95 nearest rank picks the 190th value of 200', () => {
  const dts = Array.from({ length: 200 }, (_, i) => i + 1); // 1..200
  assert.equal(benchStats(dts).frame_ms_p95, 190);
});

test('bench scene: exactly 200 wander shades, 100 motes, L1-L3 lit at 100, nothing spawns/drains/ends', () => {
  const g = createBenchGame(42);
  let events = [];
  for (let i = 0; i < 1800; i++) events = events.concat(step(g, { move: [0, 0] }));
  const s = snapshot(g);
  assert.equal(s.shades.length, BENCH.shades);
  assert.ok(s.shades.every((x) => x.state === 'wander'));
  assert.equal(s.motes_active, BENCH.motes);
  assert.deepEqual(s.lanterns.map((l) => [l.lit, l.fuel]), [[true, 100], [true, 100], [true, 100], [false, 0], [false, 0]]);
  assert.deepEqual(s.player.pos, [0, 0, 0]);
  assert.equal(s.player.flames, 3);
  assert.equal(s.state, 'playing');
  assert.equal(events.length, 0, `no gameplay events in the bench scene, got ${events.map((e) => e.name)}`);
  assert.ok(s.shades.some((x, i) => x.pos[0] !== createBenchGame(42).shades[i].pos[0]), 'shades move (wander rule)');
});

test('bench scene is identical for the same seed', () => {
  const a = snapshot(createBenchGame(42));
  const b = snapshot(createBenchGame(42));
  assert.deepEqual(a, b);
});

test('bench camera: r 30, y 15, starts at (30,15,0), counter-clockwise seen from above, 15 s per lap', () => {
  const near = (p, q) => p.every((v, i) => Math.abs(v - q[i]) < 1e-9);
  assert.ok(near(benchCamera(0), [30, 15, 0]));
  assert.ok(near(benchCamera(3.75), [0, 15, 30])); // quarter lap -> +Z (angles from +X toward +Z, as in the map spec)
  assert.ok(near(benchCamera(15), [30, 15, 0]));
});

test('soak: runs nights in one process, reports the contract fields', () => {
  const out = path.join(tmp(), 'soak.json');
  const r = spawnSync(process.execPath, ['--expose-gc', path.join(ROOT, 'scripts', 'soak.mjs'), '--seed', '7', '--nights', '4', '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const s = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(s.nights, 4);
  assert.equal(s.crashes, 0);
  assert.equal(s.results.length, 4);
  assert.ok(s.results.every((x) => ['won', 'lost'].includes(x)));
  assert.deepEqual(s.per_night.map((n) => [n.night, n.seed]), [[1, 7], [2, 8], [3, 9], [1, 10]]);
  for (const k of ['mem_start_mb', 'mem_end_mb', 'duration_s']) assert.equal(typeof s[k], 'number', k);
});

test('leaderboard names: 3-12 chars of letters/digits/_; Vietnamese diacritics allowed', () => {
  for (const ok of ['Huy', 'dao_quang_99', 'Mây', 'Đào_Huy', 'abcdefghijkl']) assert.ok(validName(ok), ok);
  for (const bad of ['ab', 'abcdefghijklm', 'a b c', 'x-y-z', '', 'hi!', null]) assert.ok(!validName(bad), String(bad));
});

test('leaderboard: score desc, ties -> earlier first, top 10 only', () => {
  const t = (m) => new Date(Date.UTC(2026, 10, 20, 9, m));
  let list = [];
  for (let i = 0; i < 12; i++) list = addEntry(list, makeEntry({ name: `p${i}xx`, score: i * 10, nights_won: 1, seed: i, date: t(i) }));
  assert.equal(list.length, 10);
  assert.equal(list[0].score, 110);
  assert.ok(!list.some((e) => e.score < 20), 'two lowest dropped');
  const tie = sortEntries([
    makeEntry({ name: 'late', score: 500, nights_won: 3, seed: 1, date: t(30) }),
    makeEntry({ name: 'early', score: 500, nights_won: 3, seed: 2, date: t(10) }),
  ]);
  assert.deepEqual(tie.map((e) => e.name), ['early', 'late']);
});

test('leaderboard entry fields; achieved_at is ISO 8601 with timezone', () => {
  const e = makeEntry({ name: 'Mây', score: 1234, nights_won: 3, seed: 42 });
  assert.deepEqual(Object.keys(e), ['name', 'score', 'nights_won', 'achieved_at', 'seed']);
  assert.match(e.achieved_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  assert.match(isoWithOffset(new Date()), /[+-]\d{2}:\d{2}$/);
  assert.throws(() => makeEntry({ name: 'x', score: 1, nights_won: 0, seed: 1 }));
});

test('export command: node server.js --export-leaderboard out.json -> {"entries": [...]} in rank order', () => {
  const dir = tmp();
  const store = path.join(dir, 'lb.json');
  fs.writeFileSync(store, JSON.stringify({ entries: [
    { name: 'bob', score: 100, nights_won: 1, achieved_at: '2026-11-20T10:00:00+07:00', seed: 1 },
    { name: 'x', score: 999, nights_won: 3, achieved_at: '2026-11-20T10:00:00+07:00', seed: 2 }, // invalid name -> dropped
    { name: 'amy', score: 300, nights_won: 2, achieved_at: '2026-11-20T11:00:00+07:00', seed: 3 },
    { name: 'cat', score: 300, nights_won: 2, achieved_at: '2026-11-20T09:00:00+07:00', seed: 4 },
  ] }));
  const out = path.join(dir, 'out.json');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'server.js'), '--export-leaderboard', out], { encoding: 'utf8', env: { ...process.env, DDL_LEADERBOARD: store } });
  assert.equal(r.status, 0, r.stderr);
  const got = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.deepEqual(got.entries.map((e) => e.name), ['cat', 'amy', 'bob']);
  assert.deepEqual(cleanEntries(got.entries), got.entries);
});

test('key rebinding: duplicates are detected; stored bindings merge over defaults', () => {
  assert.deepEqual(findConflicts(DEFAULT_KEYS), {});
  const c = findConflicts({ ...DEFAULT_KEYS, jump: 'KeyE' });
  assert.deepEqual(c, { jump: ['interact'], interact: ['jump'] });
  assert.deepEqual(loadKeys({ jump: 'KeyJ', bogus: 'KeyZ', up: 42 }), { ...DEFAULT_KEYS, jump: 'KeyJ' });
  assert.deepEqual(Object.keys(DEFAULT_KEYS), ['up', 'down', 'left', 'right', 'jump', 'dash', 'interact', 'pulse', 'pause']);
});

test('every UI font-size in index.html is >= 18 px at 1280x720 (1rem = 18px)', () => {
  const css = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.match(css, /html \{ font-size: calc\(18px \* var\(--ui\)\); \}/);
  assert.match(css, /html\.bigtext \{ --ui: 1\.25; \}/);
  const sizes = [...css.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => m[1].trim()).filter((v) => !v.startsWith('calc(18px'));
  assert.ok(sizes.length >= 14, `only ${sizes.length} font-size declarations found`);
  for (const v of sizes) {
    const rem = v.match(/^([\d.]+)rem$/);
    const px = v.match(/^([\d.]+)px$/);
    assert.ok((rem && Number(rem[1]) >= 1) || (px && Number(px[1]) >= 18), `font-size ${v} < 18px`);
  }
});

test('game.contract.json v1.3 declares bench_cmd and soak_cmd that exist', () => {
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8'));
  assert.equal(c.contract_version, '1.3');
  assert.match(c.bench_cmd, /scripts\/bench\.mjs/);
  assert.match(c.soak_cmd, /scripts\/soak\.mjs/);
  assert.equal(c.run_cmd, 'node server.js');
  for (const f of ['scripts/bench.mjs', 'scripts/soak.mjs', 'server.js']) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
});

test('server API saves a Vietnamese name (UTF-8 body) and the export keeps rank order', async () => {
  const { spawn } = await import('node:child_process');
  const dir = tmp();
  const env = { ...process.env, DDL_LEADERBOARD: path.join(dir, 'lb.json'), PORT: '8197' };
  const srv = spawn(process.execPath, [path.join(ROOT, 'server.js')], { env, stdio: 'ignore' });
  try {
    let ok = false;
    for (let i = 0; i < 40 && !ok; i++) {
      await new Promise((r) => setTimeout(r, 100));
      ok = await fetch('http://127.0.0.1:8197/api/leaderboard').then((r) => r.ok, () => false);
    }
    const post = (e) => fetch('http://127.0.0.1:8197/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e) });
    assert.equal((await post({ name: 'Mây', score: 900, nights_won: 2, seed: 1 })).status, 200);
    assert.equal((await post({ name: 'ab', score: 5, nights_won: 0, seed: 2 })).status, 400);
    assert.equal((await post({ name: 'Đào_Huy', score: 1200, nights_won: 3, seed: 3 })).status, 200);
  } finally {
    srv.kill();
  }
  const out = path.join(dir, 'out.json');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'server.js'), '--export-leaderboard', out], { encoding: 'utf8', env });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')).entries.map((e) => e.name), ['Đào_Huy', 'Mây']);
});
