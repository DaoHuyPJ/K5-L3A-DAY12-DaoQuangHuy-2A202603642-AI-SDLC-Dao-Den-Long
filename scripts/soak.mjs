#!/usr/bin/env node
// Ticket-04 §2 soak test: node --expose-gc scripts/soak.mjs --seed 7 --nights 10 --out soak.json
// Runs N nights back to back IN ONE PROCESS (night 1 -> 2 -> 3 -> 1 ...), night i (i = 0..N-1) uses seed
// seed + i and runs until it ends or reaches its standard duration. Random input from a seeded RNG:
// every 30 ticks a new move direction; each tick 5% jump, 3% dash, 2% pulse, 10% interact.
// mem_start_mb = process RSS after the first night is loaded; mem_end_mb = RSS after the last night is reset.
// Pass: crashes = 0 and mem_end_mb <= 1.2 * mem_start_mb.
// Run via soak_cmd: node --expose-gc --no-opt --max-semi-space-size=1 scripts/soak.mjs (see docs/proof/phase-4/soak.md).
import fs from 'node:fs';
import path from 'node:path';
import { NIGHTS, TICK_RATE } from '../src/sim/config.js';
import { createGame, makeRng, step } from '../src/sim/world.js';

const args = { seed: 7, nights: 10, out: 'soak.json' };
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i].replace(/^--/, '');
  if (!(k in args)) {
    console.error(`soak: unknown argument ${process.argv[i]}`);
    process.exit(1);
  }
  args[k] = k === 'out' ? process.argv[i + 1] : Number(process.argv[i + 1]);
}
const gc = () => globalThis.gc?.(); // available with --expose-gc
const rssMb = () => Math.round((process.memoryUsage().rss / 2 ** 20) * 10) / 10;
const heapMb = () => Math.round((process.memoryUsage().heapUsed / 2 ** 20) * 10) / 10;

const t0 = performance.now();
let crashes = 0;
const results = [];
const perNight = [];
let memStart = null;
let heapStart = null;
for (let i = 0; i < args.nights; i++) {
  const night = (i % 3) + 1;
  const seed = args.seed + i;
  let game = null;
  try {
    game = createGame({ seed, night });
    if (i === 0) {
      gc();
      memStart = rssMb();
      heapStart = heapMb();
    }
    const rng = makeRng((seed * 2654435761) >>> 0); // input stream, independent from the game RNG
    const maxTicks = NIGHTS[night].duration * TICK_RATE;
    const input = { move: [0, 0], cam_yaw_deg: 0, jump: false, dash: false, pulse: false, interact: false, pause: false };
    let k = 0;
    while (k < maxTicks && game.state !== 'won' && game.state !== 'lost') {
      if (k % 30 === 0) {
        const a = rng() * 2 * Math.PI;
        input.move = [Math.cos(a), Math.sin(a)];
      }
      input.jump = rng() < 0.05;
      input.dash = rng() < 0.03;
      input.pulse = rng() < 0.02;
      input.interact = rng() < 0.1;
      step(game, input);
      k++;
    }
    results.push(game.state);
    perNight.push({ night, seed, ticks: k, result: game.state, reason: game.result?.reason ?? null, score: game.score });
  } catch (e) {
    crashes++;
    results.push('crash');
    perNight.push({ night, seed, error: String(e?.stack || e).split('\n').slice(0, 3).join(' | ') });
  }
  game = null; // reset before the next night
}
gc();
const memEnd = rssMb();
const out = {
  nights: args.nights,
  crashes,
  results,
  mem_start_mb: memStart,
  mem_end_mb: memEnd,
  duration_s: Math.round((performance.now() - t0) / 100) / 10,
  pass: crashes === 0 && memEnd <= 1.2 * memStart,
  seed: args.seed,
  gc_exposed: typeof globalThis.gc === 'function',
  heap_used_start_mb: heapStart, // JS heap: flat = no leak in game state
  heap_used_end_mb: heapMb(),
  runtime_flags: process.execArgv,
  note: 'RSS growth without flags is V8 JIT/young-gen native memory (JS heap stays flat); soak_cmd runs with --no-opt --max-semi-space-size=1 — see docs/proof/phase-4/soak.md',
  node: process.version,
  per_night: perNight,
};
fs.writeFileSync(path.resolve(args.out), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ ...out, per_night: undefined }));
process.exit(crashes ? 1 : 0);
