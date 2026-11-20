// Synthesized audio (WebAudio, no asset files): night music + effects. Render/audio only.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.7;
    this.musicTimer = null;
  }
  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null;
      }
    }
    this.ctx?.resume?.();
  }
  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }
  tone(freq, dur = 0.15, type = 'sine', gain = 0.08, delay = 0, slideTo = null) {
    const c = this.ctx;
    if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
  noise(dur = 0.4, gain = 0.05, freq = 800) {
    const c = this.ctx;
    if (!c) return;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }
  // slow pentatonic night music
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const notes = [220, 247, 294, 330, 392, 440, 494];
    let i = 0;
    const tick = () => {
      const n = notes[(i * 3 + (i >> 2)) % notes.length];
      this.tone(n, 1.6, 'sine', 0.025);
      if (i % 4 === 0) this.tone(n / 2, 3, 'triangle', 0.02);
      i++;
    };
    tick();
    this.musicTimer = setInterval(tick, 800);
  }
  stopMusic() {
    clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
  pick(n) { this.tone(660 + n * 40, 0.12, 'triangle', 0.06); }
  deposit() { this.tone(440, 0.2, 'sine', 0.07); }
  lit() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.08, i * 0.09)); }
  pulse() { this.tone(300, 0.35, 'sawtooth', 0.04, 0, 900); this.tone(600, 0.25, 'sine', 0.05, 0.03); }
  hit() { this.tone(160, 0.35, 'square', 0.06, 0, 80); }
  jump() { this.tone(330, 0.15, 'triangle', 0.05, 0, 520); }
  dash() { this.noise(0.18, 0.08, 1800); }
  shade() { this.tone(110, 0.8, 'sawtooth', 0.03, 0, 70); }
  charm() { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.06, i * 0.06)); }
  steal() { this.tone(500, 0.3, 'sine', 0.05, 0, 250); }
  windWarn() { this.noise(1.5, 0.05, 500); }
  countdown() { this.tone(880, 0.08, 'square', 0.04); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.7, 'sine', 0.08, i * 0.15)); }
  lose() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.07, i * 0.2)); }
}
