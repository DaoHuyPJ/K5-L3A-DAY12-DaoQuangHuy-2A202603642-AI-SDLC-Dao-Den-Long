#!/usr/bin/env node
// Ticket-04 §1 benchmark: node scripts/bench.mjs --seed 42 --duration 30 --out bench.json
// Opens a 1280x720 browser window (Chrome / Chromium / Edge; set CHROME_PATH to override) with vsync and
// the frame-rate cap turned off, loads the standard bench scene (/?benchmark), lets the page measure its
// own frame times after a 3 s warm-up, samples the browser's memory (RSS of all its processes) and writes
// bench.json. Exits 0 on success, 1 on error. BENCH_HEADLESS=1 runs without a visible window.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROCESS_START = performance.timeOrigin; // load_ms is measured from here
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = { seed: 42, duration: 30, out: 'bench.json' };
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i].replace(/^--/, '');
  if (!(k in args)) throw new Error(`unknown argument ${process.argv[i]}`);
  args[k] = k === 'out' ? process.argv[i + 1] : Number(process.argv[i + 1]);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 8092;
const DBG = 9334;
const browser = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((c) => c && fs.existsSync(c));
if (!browser) {
  console.error('bench: no Chrome/Chromium/Edge found (set CHROME_PATH)');
  process.exit(1);
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-bench-'));
const marker = path.basename(profile);

/** Sum of RSS (MB) over every browser process started with our profile dir. null if it cannot be read. */
function browserRssMb() {
  try {
    if (process.platform === 'win32') {
      const ps = `(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${marker}*' } | Measure-Object WorkingSetSize -Sum).Sum`;
      const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }).trim();
      return out ? Number(out) / 2 ** 20 : null;
    }
    const out = execFileSync('ps', ['-axo', 'rss=,command='], { encoding: 'utf8', maxBuffer: 1 << 26 });
    const kb = out.split('\n').filter((l) => l.includes(marker)).reduce((a, l) => a + Number(l.trim().split(/\s+/)[0] || 0), 0);
    return kb ? kb / 1024 : null;
  } catch {
    return null;
  }
}

async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const withTimeout = (pr, ms) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error('cdp timeout')), ms))]);
  const evaluate = async (expression) => (await withTimeout(send('Runtime.evaluate', { expression, returnByValue: true }), 5000)).result.result.value;
  return { send, evaluate, close: () => ws.close() };
}

const server = spawn(process.execPath, [path.join(ROOT, 'server.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const url = `http://127.0.0.1:${PORT}/?benchmark&seed=${args.seed}&duration=${args.duration}`;
const flags = [
  `--user-data-dir=${profile}`, `--remote-debugging-port=${DBG}`, '--window-size=1280,720', '--window-position=40,40',
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-gpu-vsync', '--disable-frame-rate-limit', // vsync off (Ticket-04 §1.1)
  '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required',
];
if (process.env.BENCH_HEADLESS) flags.unshift('--headless=new');
const edge = spawn(browser, [...flags, 'about:blank'], { stdio: 'ignore' });

let code = 0;
try {
  await sleep(300);
  let page;
  for (let i = 0; i < 60 && !page; i++) {
    await sleep(250);
    try {
      page = (await (await fetch(`http://127.0.0.1:${DBG}/json`)).json()).find((t) => t.type === 'page');
    } catch {
      /* browser not up yet */
    }
  }
  if (!page) throw new Error('browser did not start');
  if (process.env.BENCH_DEBUG) console.error('bench: targets', JSON.stringify((await (await fetch(`http://127.0.0.1:${DBG}/json`)).json()).map((t) => [t.type, t.url])));
  const c = await cdp(page.webSocketDebuggerUrl);
  const version = await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json();
  // exactly 1280x720 CSS pixels for the canvas, regardless of window chrome
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await c.send('Page.bringToFront');
  await c.send('Page.navigate', { url });
  const deadline = Date.now() + (args.duration + 60) * 1000;
  let peak = null;
  let result = null;
  while (!result && Date.now() < deadline) {
    await sleep(1000);
    const rss = browserRssMb();
    if (rss !== null) peak = Math.max(peak ?? 0, rss);
    result = await c.evaluate('window.__benchResult || null').catch(() => null);
    if (process.env.BENCH_DEBUG) console.error('bench: probe', await c.evaluate('JSON.stringify({ t: document.readyState, r: !!window.__benchResult, f: typeof window.__benchResult })').catch((e) => e.message), 'rss', rss);
  }
  if (!result) throw new Error('bench did not finish in time');
  const renderer = await c.evaluate(`(() => { const g = document.createElement('canvas').getContext('webgl2');
    const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`);
  c.close();
  const out = {
    contract_version: '1.3',
    avg_fps: result.avg_fps,
    p1_low_fps: result.p1_low_fps,
    frame_ms_p95: result.frame_ms_p95,
    frames: result.frames,
    load_ms: Math.round(result.first_frame_epoch_ms - PROCESS_START),
    peak_mem_mb: peak === null ? null : Math.round(peak),
    vsync_off: true,
    renderer: `three.js r160 WebGL2 · ${renderer} · ${version.Browser}`,
    os: `${os.type()} ${os.release()} (${os.platform()} ${os.arch()}) · ${os.cpus()[0]?.model} · ${os.cpus().length} threads · ${Math.round(os.totalmem() / 2 ** 30)} GB RAM`,
    seed: args.seed,
    duration_s: args.duration,
    viewport: result.viewport,
    window: process.env.BENCH_HEADLESS ? 'headless' : 'windowed 1280x720',
    measured_at: new Date().toISOString(),
    notes: 'peak_mem_mb = peak sum of RSS over all browser processes of this run (multi-process browser), sampled every ~1 s; null if the OS query failed',
  };
  fs.writeFileSync(path.resolve(args.out), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
} catch (e) {
  console.error(`bench: ${e.message}`);
  code = 1;
} finally {
  edge.kill();
  server.kill();
}
process.exit(code);
