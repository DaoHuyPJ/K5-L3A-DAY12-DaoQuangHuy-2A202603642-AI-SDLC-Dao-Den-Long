// Zero-dependency static server for the browser game: `npm start` -> http://localhost:8080
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const ALLOWED = ['/index.html', '/src/', '/node_modules/three/build/'];

http
  .createServer((req, res) => {
    let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
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
