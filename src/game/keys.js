// Ticket-04 §4 key rebinding — pure helpers (no DOM) so conflicts can be unit-tested.
export const ACTIONS = [
  ['up', 'Đi lên'], ['down', 'Đi xuống'], ['left', 'Sang trái'], ['right', 'Sang phải'],
  ['jump', 'Nhảy'], ['dash', 'Lướt'], ['interact', 'Nạp / châm dầu'], ['pulse', 'Tỏa sáng'], ['pause', 'Tạm dừng'],
];
export const DEFAULT_KEYS = Object.freeze({
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
  jump: 'Space', dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyF', pause: 'KeyP',
});

/** action -> list of other actions bound to the same key */
export function findConflicts(keys) {
  const byKey = {};
  for (const [a] of ACTIONS) (byKey[keys[a]] ||= []).push(a);
  const out = {};
  for (const list of Object.values(byKey)) if (list.length > 1) for (const a of list) out[a] = list.filter((b) => b !== a);
  return out;
}

/** Merge stored bindings over the defaults (unknown actions / bad values ignored). */
export function loadKeys(stored) {
  const k = { ...DEFAULT_KEYS };
  if (stored && typeof stored === 'object') for (const [a] of ACTIONS) if (typeof stored[a] === 'string' && stored[a]) k[a] = stored[a];
  return k;
}

export function keyLabel(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return { Space: 'Space', ShiftLeft: 'Shift trái', ShiftRight: 'Shift phải', ControlLeft: 'Ctrl', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', Tab: 'Tab' }[code] ?? code;
}
