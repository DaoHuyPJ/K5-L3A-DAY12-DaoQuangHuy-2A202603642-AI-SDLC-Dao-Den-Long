// Ticket-04 §1: the standard benchmark scene, identical for every run with the same seed.
// Night 1, exactly 200 shades in "wander" spread over the island, exactly 100 motes (may exceed the
// gameplay cap), L1–L3 lit with fuel 100, Mây standing at (0,0,0). The bench flag turns off spawning,
// damage, pickups, fuel decay and the end of the night; shades still move by the normal wander rule.
import { parseScenario } from './io.js';
import { createGame, makeRng } from './world.js';

export const BENCH = Object.freeze({ shades: 200, motes: 100, islandR: 38, warmupMs: 3000, orbitR: 30, orbitY: 15, orbitPeriodS: 15 });

function spread(rng, n, r) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = rng() * 2 * Math.PI;
    const d = Math.sqrt(rng()) * r; // uniform over the disc
    out.push([d * Math.cos(a), 0, d * Math.sin(a)]);
  }
  return out;
}

export function benchScenario(seed = 42) {
  const rng = makeRng(seed ^ 0x9e3779b9);
  return {
    player: { pos: [0, 0, 0] },
    random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false,
    shades: spread(rng, BENCH.shades, BENCH.islandR).map((pos) => ({ pos, state: 'wander' })),
    motes: spread(rng, BENCH.motes, BENCH.islandR),
    lanterns: [{ id: 'L1', lit: true, fuel: 100 }, { id: 'L2', lit: true, fuel: 100 }, { id: 'L3', lit: true, fuel: 100 }],
  };
}

// goes through the same validation as any contract scenario file
export const createBenchGame = (seed = 42) => createGame({ seed, night: 1, scenario: parseScenario(benchScenario(seed)), bench: true });

/** Camera orbit: centre (0,0,0), r 30, Y 15, starts at angle 0 (30,15,0), counter-clockwise seen from above, 15 s per lap. */
export function benchCamera(tSec) {
  const a = (2 * Math.PI * tSec) / BENCH.orbitPeriodS;
  return [BENCH.orbitR * Math.cos(a), BENCH.orbitY, BENCH.orbitR * Math.sin(a)];
}

/** Frame statistics exactly as Ticket-04 defines them; dts = frame times in ms. */
export function benchStats(dts) {
  const N = dts.length;
  if (!N) return { frames: 0, avg_fps: 0, p1_low_fps: 0, frame_ms_p95: 0 };
  const sum = dts.reduce((a, b) => a + b, 0);
  const desc = [...dts].sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil(0.01 * N));
  const worst = desc.slice(0, k).reduce((a, b) => a + b, 0) / k;
  const asc = [...dts].sort((a, b) => a - b);
  const p95 = asc[Math.min(N - 1, Math.ceil(0.95 * N) - 1)]; // nearest-rank 95th percentile
  const r1 = (v) => Math.round(v * 10) / 10;
  return { frames: N, avg_fps: r1((1000 * N) / sum), p1_low_fps: r1(1000 / worst), frame_ms_p95: r1(p95) };
}
