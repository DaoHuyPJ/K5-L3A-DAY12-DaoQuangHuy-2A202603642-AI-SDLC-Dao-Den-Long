// Tiny synthesized sound effects (WebAudio, no asset files). Render/audio only.
export class Sfx {
  constructor() {
    this.ctx = null;
  }
  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        this.ctx = null;
      }
    }
    this.ctx?.resume?.();
  }
  tone(freq, dur = 0.15, type = 'sine', gain = 0.08, delay = 0) {
    const c = this.ctx;
    if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  pick(n) { this.tone(660 + n * 40, 0.12, 'triangle', 0.06); }
  deposit() { this.tone(440, 0.2, 'sine', 0.07); }
  lit() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.08, i * 0.09)); }
  pulse() { this.tone(300, 0.3, 'sawtooth', 0.04); this.tone(600, 0.25, 'sine', 0.05, 0.03); }
  hit() { this.tone(140, 0.35, 'square', 0.06); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.6, 'sine', 0.08, i * 0.15)); }
  lose() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.07, i * 0.2)); }
}
