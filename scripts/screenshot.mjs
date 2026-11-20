#!/usr/bin/env node
// Visual proof: headless Edge/Chrome screenshots of the running game (needs `npm start` in another shell).
// Usage: node scripts/screenshot.mjs <outDir> <name> "<query>" [budgetMs]
//   e.g. node scripts/screenshot.mjs docs/proof/phase-2/screenshots night2 "autostart&night=2&lit=1" 6000
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [outDir, name, query = '', budget = '5000'] = process.argv.slice(2);
if (!outDir || !name) {
  console.error('usage: screenshot.mjs <outDir> <name> "<query>" [budgetMs]');
  process.exit(1);
}
const candidates = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const browser = candidates.find((c) => fs.existsSync(c));
if (!browser) {
  console.error('no Edge/Chrome found');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
const file = path.resolve(outDir, `${name}.png`);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-shot-'));
const url = `http://localhost:${process.env.PORT || 8080}/${query ? `?${query}` : ''}`;
const r = spawnSync(browser, [
  '--headless=new', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--window-size=1280,720', `--virtual-time-budget=${budget}`, `--screenshot=${file}`, url,
], { encoding: 'utf8', timeout: 120000 });
const ok = fs.existsSync(file);
console.log(ok ? `${file} (${fs.statSync(file).size} bytes)` : `FAILED: ${r.stderr}`);
process.exit(ok ? 0 : 1);
