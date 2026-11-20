#!/usr/bin/env node
// Builds the GitHub Release asset: dist/dao-den-long-v1.0.0-web.zip = static web build (three.js from CDN)
// + HOW-TO-RUN.txt. Usage: npm run package
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-web.mjs')], { stdio: 'inherit' });
const web = path.join(ROOT, 'dist', 'web');
// release keeps a complete HTML document (build-web strips the skeleton for claude.ai artifacts)
const page = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace('/node_modules/three/build/three.module.js', 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js')
  .replace('src="/src/game/main.js"', 'src="src/game/main.js"');
if (!page.startsWith('<!doctype html>') || !page.includes('cdn.jsdelivr.net/npm/three@0.160.0')) throw new Error('release index.html not built');
fs.writeFileSync(path.join(web, 'index.html'), page);
fs.writeFileSync(path.join(web, 'HOW-TO-RUN.txt'), `Dao Den Long v${version} - static web build

The game uses ES modules, so it must be served over http (opening index.html from disk will not work).
Pick one, run it inside this folder, then open http://localhost:8000 in Chrome, Edge or Firefox:

  npx serve -l 8000 .            (Node.js)
  python3 -m http.server 8000    (Python)

three.js is loaded from cdn.jsdelivr.net (internet needed on first load).
Headless mode, tests, bench_cmd and soak_cmd need the source repo: npm install && npm test.
Leaderboard in this build is stored in the browser (localStorage); the repo version also writes data/leaderboard.json.
`);
const zip = path.join(ROOT, 'dist', `dao-den-long-v${version}-web.zip`);
fs.rmSync(zip, { force: true });
if (process.platform === 'win32') {
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${web}' -DestinationPath '${zip}' -Force`], { stdio: 'inherit' });
} else if (process.platform === 'darwin') {
  execFileSync('ditto', ['-c', '-k', '--keepParent', web, zip], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-r', zip, 'web'], { cwd: path.join(ROOT, 'dist'), stdio: 'inherit' });
}
console.log(`${zip} (${fs.statSync(zip).size} bytes)`);
