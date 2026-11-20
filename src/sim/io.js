// Parsing + validation of Test Contract v1.1 input files.
// Any problem throws FormatError -> headless exits with code 2.

export class FormatError extends Error {}

export const BUTTONS = ['jump', 'interact', 'pulse', 'dash', 'pause'];
export const SHADE_STATES = ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'];
export const DRIFTER_STATES = ['idle', 'chase', 'flee', 'removed'];

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isTicks = (v) => Number.isInteger(v) && v >= 0;
const fail = (msg) => {
  throw new FormatError(msg);
};

/** Validate an inputs file object. Returns the validated frame list. */
export function parseInputs(obj) {
  if (!isObj(obj)) fail('inputs: root must be an object');
  if (!Array.isArray(obj.frames)) fail('inputs: "frames" must be an array');
  let prev = -1;
  return obj.frames.map((f, i) => {
    if (!isObj(f)) fail(`inputs: frame ${i} must be an object`);
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
    this.state = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
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

function optTicks(src, key, where) {
  if (!(key in src)) return undefined;
  if (!isTicks(src[key])) fail(`scenario: ${where}.${key} must be an integer >= 0`);
  return src[key];
}
function optBool(src, key, where) {
  if (!(key in src)) return undefined;
  if (typeof src[key] !== 'boolean') fail(`scenario: ${where}.${key} must be boolean`);
  return src[key];
}
function optId(src, where) {
  if (!('id' in src)) return undefined;
  if (typeof src.id !== 'string' || !src.id) fail(`scenario: ${where}.id must be a non-empty string`);
  return src.id;
}

/** Validate a scenario object. Returns a normalized copy (undefined = use game default). */
export function parseScenario(obj) {
  if (!isObj(obj)) fail('scenario: root must be an object');
  const s = {};
  if ('player' in obj) {
    const p = obj.player;
    if (!isObj(p)) fail('scenario: player must be an object');
    s.player = {};
    if ('pos' in p) {
      if (!isVec3(p.pos)) fail('scenario: player.pos must be [x, y, z]');
      s.player.pos = [...p.pos];
    }
    for (const k of ['carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks', 'successful_lights']) {
      const v = optTicks(p, k, 'player');
      if (v !== undefined) s.player[k] = v;
    }
  }
  for (const k of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) {
    const v = optBool(obj, k, 'root');
    if (v !== undefined) s[k] = v;
  }
  if ('motes' in obj) {
    if (!Array.isArray(obj.motes)) fail('scenario: motes must be an array');
    s.motes = obj.motes.map((m, i) => {
      if (isVec3(m)) return { pos: [...m] };
      if (!isObj(m) || !isVec3(m.pos)) fail(`scenario: motes[${i}] must be [x, y, z] or {pos}`);
      const o = { pos: [...m.pos], id: optId(m, `motes[${i}]`) };
      if ('kind' in m) {
        if (m.kind !== 'random' && m.kind !== 'dropped') fail(`scenario: motes[${i}].kind must be random|dropped`);
        o.kind = m.kind;
      }
      o.ttl_ticks = optTicks(m, 'ttl_ticks', `motes[${i}]`);
      return o;
    });
  }
  if ('shades' in obj) {
    if (!Array.isArray(obj.shades)) fail('scenario: shades must be an array');
    s.shades = obj.shades.map((sh, i) => {
      if (!isObj(sh) || !isVec3(sh.pos)) fail(`scenario: shades[${i}].pos must be [x, y, z]`);
      const o = { pos: [...sh.pos], id: optId(sh, `shades[${i}]`) };
      if ('state' in sh) {
        if (!SHADE_STATES.includes(sh.state)) fail(`scenario: shades[${i}].state must be one of ${SHADE_STATES.join('|')}`);
        o.state = sh.state;
      }
      o.state_ticks_left = optTicks(sh, 'state_ticks_left', `shades[${i}]`);
      if ('target_lantern_id' in sh) {
        if (typeof sh.target_lantern_id !== 'string') fail(`scenario: shades[${i}].target_lantern_id must be a string`);
        o.target_lantern_id = sh.target_lantern_id;
      }
      return o;
    });
  }
  if ('drifters' in obj) {
    if (!Array.isArray(obj.drifters)) fail('scenario: drifters must be an array');
    s.drifters = obj.drifters.map((d, i) => {
      if (!isObj(d) || !isVec3(d.pos)) fail(`scenario: drifters[${i}].pos must be [x, y, z]`);
      const o = { pos: [...d.pos], id: optId(d, `drifters[${i}]`) };
      if ('state' in d) {
        if (!DRIFTER_STATES.includes(d.state)) fail(`scenario: drifters[${i}].state must be one of ${DRIFTER_STATES.join('|')}`);
        o.state = d.state;
      }
      o.stolen = optTicks(d, 'stolen', `drifters[${i}]`);
      o.state_ticks_left = optTicks(d, 'state_ticks_left', `drifters[${i}]`);
      return o;
    });
  }
  if ('charms' in obj) {
    if (!Array.isArray(obj.charms)) fail('scenario: charms must be an array');
    s.charms = obj.charms.map((c, i) => {
      if (!isObj(c)) fail(`scenario: charms[${i}] must be an object`);
      const o = { id: optId(c, `charms[${i}]`) };
      if ('pos' in c) {
        if (!isVec3(c.pos)) fail(`scenario: charms[${i}].pos must be [x, y, z]`);
        o.pos = [...c.pos];
      }
      o.available = optBool(c, 'available', `charms[${i}]`);
      o.respawn_ticks = optTicks(c, 'respawn_ticks', `charms[${i}]`);
      return o;
    });
  }
  if ('lanterns' in obj) {
    if (!Array.isArray(obj.lanterns)) fail('scenario: lanterns must be an array');
    s.lanterns = obj.lanterns.map((l, i) => {
      if (!isObj(l) || typeof l.id !== 'string') fail(`scenario: lanterns[${i}].id required`);
      const o = { id: l.id };
      if ('pos' in l) {
        if (!isVec3(l.pos)) fail(`scenario: lanterns[${i}].pos must be [x, y, z]`);
        o.pos = [...l.pos];
      }
      o.deposited = optTicks(l, 'deposited', `lanterns[${i}]`);
      o.lit = optBool(l, 'lit', `lanterns[${i}]`);
      o.ever_lit = optBool(l, 'ever_lit', `lanterns[${i}]`);
      if ('fuel' in l) {
        if (!isNum(l.fuel) || l.fuel < 0 || l.fuel > 100) fail(`scenario: lanterns[${i}].fuel must be a number in [0, 100]`);
        o.fuel = l.fuel;
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
