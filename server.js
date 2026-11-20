// Zero-dependency static server for the browser game: `npm start` / `node server.js` -> http://localhost:8080
// Also stores the local leaderboard on disk (data/leaderboard.json) and exports it:
//   node server.js --export-leaderboard out.json   -> {"entries": [...]} in rank order, then exits.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanEntries, makeEntry, addEntry } from './src/game/leaderboard.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const LB_FILE = process.env.DDL_LEADERBOARD || path.join(ROOT, 'data', 'leaderboard.json');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const ALLOWED = ['/index.html', '/src/', '/node_modules/three/build/'];

const readBoard = () => {
  try {
    return cleanEntries(JSON.parse(fs.readFileSync(LB_FILE, 'utf8')).entries);
  } catch {
    return [];
  }
};
const writeBoard = (entries) => {
  fs.mkdirSync(path.dirname(LB_FILE), { recursive: true });
  fs.writeFileSync(LB_FILE, JSON.stringify({ entries }, null, 2) + '\n');
};

const exportIdx = process.argv.indexOf('--export-leaderboard');
if (exportIdx !== -1) {
  const out = process.argv[exportIdx + 1];
  if (!out) {
    console.error('usage: node server.js --export-leaderboard out.json');
    process.exit(1);
  }
  fs.writeFileSync(path.resolve(out), JSON.stringify({ entries: readBoard() }, null, 2) + '\n');
  console.log(`exported ${readBoard().length} entries to ${out}`);
  process.exit(0);
}

const json = (res, code, obj) => res.writeHead(code, { 'Content-Type': 'application/json' }).end(JSON.stringify(obj));

http
  .createServer((req, res) => {
    let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (url === '/api/leaderboard') {
      if (req.method === 'GET') return json(res, 200, { entries: readBoard() });
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (c) => {
          body += c;
          if (body.length > 10000) req.destroy();
        });
        req.on('end', () => {
          try {
            const e = JSON.parse(body);
            const entry = makeEntry({ name: e.name, score: e.score, nights_won: e.nights_won, seed: e.seed });
            const entries = addEntry(readBoard(), entry);
            writeBoard(entries);
            json(res, 200, { entries, saved: entry });
          } catch (err) {
            json(res, 400, { error: err.message });
          }
        });
        return;
      }
      return json(res, 405, { error: 'method not allowed' });
    }
    if (url === '/') url = '/index.html';
    const file = path.normalize(path.join(ROOT, url));
    if (!file.startsWith(ROOT) || !ALLOWED.some((p) => url.startsWith(p))) {
      res.writeHead(404).end('not found');
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) return res.writeHead(404).end('not found');
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`Đảo Đèn Lồng: open http://localhost:${PORT}`));
