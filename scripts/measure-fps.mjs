#!/usr/bin/env node
// Measures real-time FPS of the browser game at 1280x720 (Ticket-02 DoD: >= 30 FPS average).
// Starts the static server + Edge/Chrome (headless, real time, GPU if available), opens /?bench
// (scripted run: always moving, camera turning), samples the page's own FPS counter for N seconds,
// and writes docs/proof/<phase>/fps.json with the GPU/renderer string and machine info.
// Usage: node scripts/measure-fps.mjs [phase-2] [seconds=20]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phase = process.argv[2] || 'phase-2';
const seconds = Number(process.argv[3] || 20);
const PORT = 8090;
const DBG = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((c) => fs.existsSync(c));
if (!browser) throw new Error('no Edge/Chrome found');

const server = spawn(process.execPath, [path.join(ROOT, 'server.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-fps-'));
const edge = spawn(browser, [
  '--headless=new', `--user-data-dir=${profile}`, `--remote-debugging-port=${DBG}`, '--window-size=1280,720',
  '--ignore-gpu-blocklist', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', ...(process.env.FPS_UNCAPPED ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : []), '--enable-gpu-rasterization', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required',
  'about:blank',
], { stdio: 'ignore' });

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
  return {
    send: (method, params = {}) => new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    }),
    close: () => ws.close(),
  };
}

let result;
try {
  let targets;
  for (let i = 0; i < 40 && !targets; i++) {
    await sleep(250);
    try {
      targets = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json();
    } catch {
      /* not up yet */
    }
  }
  const page = targets.find((t) => t.type === 'page');
  const c = await cdp(page.webSocketDebuggerUrl);
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await c.send('Page.bringToFront');
  await c.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?bench` });
  await sleep(3000); // load + warm-up (not counted)
  const evalJs = async (expr) => (await c.send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.result.value;
  const renderer = await evalJs(`(() => { const g = document.createElement('canvas').getContext('webgl');
    const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`);
  // count frames ourselves over the window (independent of the page counter)
  await evalJs(`window.__f = 0; (function loop(){ window.__f++; requestAnimationFrame(loop); })(); window.__t0 = performance.now(); 1`);
  const perSecond = [];
  const probes = [];
  let last = 0;
  for (let s = 0; s < seconds; s++) {
    await sleep(1000);
    const f = await evalJs('window.__f');
    perSecond.push(f - last);
    probes.push(await evalJs('window.__ddl ? window.__ddl() : null'));
    last = f;
  }
  const total = await evalJs('({ frames: window.__f, ms: performance.now() - window.__t0, size: innerWidth + "x" + innerHeight, hud: document.getElementById("fps").textContent })');
  c.close();
  const avg = (total.frames / total.ms) * 1000;
  const hiddenSeconds = probes.filter((p) => p && p.visible !== 'visible').length;
  result = {
    measured_at: new Date().toISOString(),
    url: '/?bench (scripted run, sim running, camera turning)',
    viewport: total.size,
    seconds,
    avg_fps: Math.round(avg * 10) / 10,
    min_1s_fps: Math.min(...perSecond),
    per_second: perSecond,
    page_counter: total.hud,
    sim_ticks: probes.map((p) => p && p.tick),
    probes,
    threshold: 30,
    hidden_seconds: hiddenSeconds, // measurement is only valid if the page stayed visible
    valid: hiddenSeconds === 0,
    pass: hiddenSeconds === 0 && avg >= 30,
    browser: path.basename(browser),
    webgl_renderer: renderer,
    machine: { platform: `${os.platform()} ${os.release()}`, cpu: os.cpus()[0]?.model, cores: os.cpus().length, ram_gb: Math.round(os.totalmem() / 2 ** 30) },
    note: 'headless browser; if webgl_renderer mentions SwiftShader the GPU was not used (software rendering, pessimistic)',
  };
} finally {
  edge.kill();
  server.kill();
}
const out = path.join(ROOT, 'docs', 'proof', phase, 'fps.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
process.exit(result.pass ? 0 : 1);
