#!/usr/bin/env node
// Builds a self-contained static web build in dist/web/ (no server needed beyond static hosting):
//  - three.js loaded from jsDelivr (pinned 0.160.0) instead of node_modules
//  - module paths made relative
//  - <html>/<head>/<body> wrappers stripped (claude.ai artifacts add their own skeleton;
//    browsers also accept the page as-is)
// Usage: npm run build:web   -> dist/web/index.html + dist/web/src/**
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist', 'web');
const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const replace = (from, to) => {
  if (!html.includes(from)) throw new Error(`build-web: pattern not found: ${from}`);
  html = html.replace(from, to);
};
replace('/node_modules/three/build/three.module.js', THREE_CDN);
replace('src="/src/game/main.js"', 'src="src/game/main.js"');
replace('html, body { margin: 0;', ':root { color-scheme: dark; }\n    html, body { margin: 0;');
html = html
  .replace(/<!doctype html>\s*/i, '')
  .replace(/<\/?html[^>]*>\s*/gi, '')
  .replace(/<\/?head>\s*/gi, '')
  .replace(/<\/?body>\s*/gi, '')
  .replace(/\s*<meta charset[^>]*>/i, '')
  .replace(/\s*<meta name="viewport"[^>]*>/i, '');
fs.writeFileSync(path.join(OUT, 'index.html'), html);

const files = [];
for (const dir of ['src/sim', 'src/game']) {
  fs.mkdirSync(path.join(OUT, dir), { recursive: true });
  for (const f of fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.js'))) {
    fs.copyFileSync(path.join(ROOT, dir, f), path.join(OUT, dir, f));
    files.push(`${dir}/${f}`);
  }
}
console.log(`dist/web/index.html + ${files.length} modules:\n  ${files.join('\n  ')}`);
