// Parsing + validation of Test Contract v1.0 input files.
// Any problem throws FormatError -> headless exits with code 2.

export class FormatError extends Error {}

const BUTTONS = ['jump', 'interact', 'pulse', 'dash'];

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);
const fail = (msg) => {
  throw new FormatError(msg);
};

/** Validate an inputs file object. Returns a sorted, validated frame list. */
export function parseInputs(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) fail('inputs: root must be an object');
  if (!Array.isArray(obj.frames)) fail('inputs: "frames" must be an array');
  let prev = -1;
  return obj.frames.map((f, i) => {
    if (!f || typeof f !== 'object' || Array.isArray(f)) fail(`inputs: frame ${i} must be an object`);
    if (!Number.isInteger(f.tick) || f.tick < 0) fail(`inputs: frame ${i} tick must be an integer >= 0`);
    if (f.tick <= prev) fail(`inputs: frame ${i} tick ${f.tick} not strictly increasing`);
    prev = f.tick;
    const out = { tick: f.tick };
    if ('move' in f) {
      const m = f.move;
      if (!Array.isArray(m) || m.length !== 2 || !m.every(isNum) || m.some((c) => c < -1 || c > 1))
        fail(`inputs: frame ${i} move must be [x, z] with components in [-1, 1]`);
      out.move = [m[0], m[1]];
    }
    if ('cam_yaw_deg' in f) {
      if (!isNum(f.cam_yaw_deg)) fail(`inputs: frame ${i} cam_yaw_deg must be a number`);
      out.cam_yaw_deg = f.cam_yaw_deg;
    }
    for (const b of BUTTONS) {
      if (b in f) {
        if (typeof f[b] !== 'boolean') fail(`inputs: frame ${i} ${b} must be boolean`);
        out[b] = f[b];
      }
    }
    return out;
  });
}

/** Holds the "current" input state; frames only change fields they contain. */
export class InputTimeline {
  constructor(frames = []) {
    this.frames = frames;
    this.idx = 0;
    this.state = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false };
  }
  /** Input to use for step k (reads frames with tick <= k). */
  at(k) {
    while (this.idx < this.frames.length && this.frames[this.idx].tick <= k) {
      Object.assign(this.state, this.frames[this.idx]);
      this.idx++;
    }
    return this.state;
  }
}

/** Validate a scenario object. Returns a normalized copy. */
export function parseScenario(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) fail('scenario: root must be an object');
  const s = {};
  if ('player' in obj) {
    const p = obj.player;
    if (!p || typeof p !== 'object' || Array.isArray(p)) fail('scenario: player must be an object');
    s.player = {};
    if ('pos' in p) {
      if (!isVec3(p.pos)) fail('scenario: player.pos must be [x, y, z]');
      s.player.pos = [...p.pos];
    }
    for (const k of ['carried', 'flames']) {
      if (k in p) {
        if (!Number.isInteger(p[k]) || p[k] < 0) fail(`scenario: player.${k} must be an integer >= 0`);
        s.player[k] = p[k];
      }
    }
  }
  for (const k of ['random_motes', 'random_shades']) {
    if (k in obj) {
      if (typeof obj[k] !== 'boolean') fail(`scenario: ${k} must be boolean`);
      s[k] = obj[k];
    }
  }
  if ('motes' in obj) {
    if (!Array.isArray(obj.motes)) fail('scenario: motes must be an array');
    s.motes = obj.motes.map((m, i) => {
      // accept [x,y,z] (contract form) or {pos:[x,y,z], id?}
      if (isVec3(m)) return { pos: [...m] };
      if (m && typeof m === 'object' && isVec3(m.pos)) {
        if ('id' in m && typeof m.id !== 'string') fail(`scenario: motes[${i}].id must be a string`);
        return { pos: [...m.pos], id: m.id };
      }
      return fail(`scenario: motes[${i}] must be [x, y, z]`);
    });
  }
  if ('shades' in obj) {
    if (!Array.isArray(obj.shades)) fail('scenario: shades must be an array');
    s.shades = obj.shades.map((sh, i) => {
      if (!sh || typeof sh !== 'object' || !isVec3(sh.pos)) fail(`scenario: shades[${i}].pos must be [x, y, z]`);
      if ('id' in sh && typeof sh.id !== 'string') fail(`scenario: shades[${i}].id must be a string`);
      return { pos: [...sh.pos], id: sh.id };
    });
  }
  if ('lanterns' in obj) {
    if (!Array.isArray(obj.lanterns)) fail('scenario: lanterns must be an array');
    s.lanterns = obj.lanterns.map((l, i) => {
      if (!l || typeof l !== 'object' || typeof l.id !== 'string') fail(`scenario: lanterns[${i}].id required`);
      const o = { id: l.id };
      if ('pos' in l) {
        if (!isVec3(l.pos)) fail(`scenario: lanterns[${i}].pos must be [x, y, z]`);
        o.pos = [...l.pos];
      }
      if ('deposited' in l) {
        if (!Number.isInteger(l.deposited) || l.deposited < 0) fail(`scenario: lanterns[${i}].deposited invalid`);
        o.deposited = l.deposited;
      }
      if ('lit' in l) {
        if (typeof l.lit !== 'boolean') fail(`scenario: lanterns[${i}].lit must be boolean`);
        o.lit = l.lit;
      }
      return o;
    });
  }
  if ('time_left_s' in obj) {
    if (!isNum(obj.time_left_s) || obj.time_left_s <= 0) fail('scenario: time_left_s must be a number > 0');
    s.time_left_s = obj.time_left_s;
  }
  return s;
}
