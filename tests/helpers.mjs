import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const HEADLESS = path.join(ROOT, 'src', 'headless.js');

/** Write scenario/inputs to `dir`, run the real headless CLI, return {code, stderr, lines, outText}. */
export function runScenario(sc, dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-'))) {
  fs.mkdirSync(dir, { recursive: true });
  const args = ['--seed', String(sc.seed ?? 1), '--night', '1', '--ticks', String(sc.ticks)];
  if (sc.scenario) {
    fs.writeFileSync(path.join(dir, 'scenario.json'), JSON.stringify(sc.scenario, null, 2) + '\n');
    args.push('--scenario', path.join(dir, 'scenario.json'));
  }
  if (sc.inputs) {
    fs.writeFileSync(path.join(dir, 'inputs.json'), JSON.stringify(sc.inputs, null, 2) + '\n');
    args.push('--inputs', path.join(dir, 'inputs.json'));
  }
  if (sc.snapshotEvery) args.push('--snapshot-every', String(sc.snapshotEvery));
  const out = path.join(dir, 'out.jsonl');
  args.push('--out', out);
  return runHeadless(args, out);
}

export function runHeadless(args, out) {
  const r = spawnSync(process.execPath, [HEADLESS, ...args], { encoding: 'utf8' });
  let outText = '';
  let lines = [];
  if (out && fs.existsSync(out)) {
    outText = fs.readFileSync(out, 'utf8');
    lines = outText.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  }
  return { code: r.status, stderr: r.stderr, lines, outText };
}

export const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-'));
