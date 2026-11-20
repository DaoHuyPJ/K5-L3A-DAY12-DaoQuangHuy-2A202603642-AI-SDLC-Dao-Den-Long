#!/usr/bin/env node
// Headless runner — Test Contract v1.1.
// node src/headless.js --seed <int> --night <1|2|3> [--scenario f.json] [--inputs f.json]
//                      --ticks <int> --out <file.jsonl> [--snapshot-every <int, default 10>]
// Exit codes: 0 ok, 1 usage/runtime error, 2 malformed inputs/scenario file.

import fs from 'node:fs';
import { FormatError, InputTimeline, parseInputs, parseScenario } from './sim/io.js';
import { createGame, snapshot, step } from './sim/world.js';

class UsageError extends Error {}

function parseArgs(argv) {
  const a = { snapshotEvery: 10, night: 1 };
  const intArg = (name, v) => {
    if (v === undefined || !/^-?\d+$/.test(v)) throw new UsageError(`${name} expects an integer, got "${v}"`);
    return Number(v);
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case '--seed': a.seed = intArg(k, v); i++; break;
      case '--night': a.night = intArg(k, v); i++; break;
      case '--ticks': a.ticks = intArg(k, v); i++; break;
      case '--snapshot-every': a.snapshotEvery = intArg(k, v); i++; break;
      case '--scenario': a.scenario = v; i++; break;
      case '--inputs': a.inputs = v; i++; break;
      case '--out': a.out = v; i++; break;
      default: throw new UsageError(`unknown argument "${k}"`);
    }
  }
  if (a.seed === undefined) throw new UsageError('--seed is required');
  if (a.ticks === undefined || a.ticks < 0) throw new UsageError('--ticks <int >= 0> is required');
  if (!a.out) throw new UsageError('--out is required');
  if (![1, 2, 3].includes(a.night)) throw new UsageError(`--night ${a.night} not available (1, 2 or 3)`);
  if (a.snapshotEvery < 1) throw new UsageError('--snapshot-every must be >= 1');
  for (const k of ['scenario', 'inputs']) if (k in a && !a[k]) throw new UsageError(`--${k} needs a file path`);
  return a;
}

function readJson(path, label) {
  let text;
  try {
    text = fs.readFileSync(path, 'utf8');
  } catch (e) {
    throw new FormatError(`${label}: cannot read "${path}": ${e.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new FormatError(`${label}: invalid JSON in "${path}": ${e.message}`);
  }
}

export function run(argv) {
  const args = parseArgs(argv);
  const scenario = args.scenario ? parseScenario(readJson(args.scenario, 'scenario')) : {};
  const frames = args.inputs ? parseInputs(readJson(args.inputs, 'inputs')) : [];
  const game = createGame({ seed: args.seed, night: args.night, scenario });
  const timeline = new InputTimeline(frames);

  const fd = fs.openSync(args.out, 'w');
  let buf = [];
  const write = (obj) => {
    buf.push(JSON.stringify(obj));
    if (buf.length >= 512) {
      fs.writeSync(fd, buf.join('\n') + '\n');
      buf = [];
    }
  };
  write(snapshot(game));
  write({ type: 'event', tick: 0, name: 'night_start', data: { night: args.night } });
  let k = 0;
  const over = () => game.state === 'won' || game.state === 'lost';
  while (k < args.ticks && !over()) {
    for (const e of step(game, timeline.at(k))) write(e);
    k++;
    if (k % args.snapshotEvery === 0) write(snapshot(game));
  }
  write({ type: 'end', ticks: k, state: game.state, score: game.score });
  fs.writeSync(fd, buf.join('\n') + '\n');
  fs.closeSync(fd);
}

try {
  run(process.argv.slice(2));
  process.exitCode = 0;
} catch (e) {
  process.stderr.write(`headless: ${e.message}\n`);
  process.exitCode = e instanceof FormatError ? 2 : 1;
}
