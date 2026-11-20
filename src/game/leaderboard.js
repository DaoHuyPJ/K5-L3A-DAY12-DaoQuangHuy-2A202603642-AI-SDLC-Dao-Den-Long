// Ticket-04 §3 local leaderboard — pure logic shared by the browser game and server.js (no DOM, no fs).
export const MAX_ENTRIES = 10;

/** 3–12 characters: letters (Vietnamese with diacritics allowed), digits or underscore. */
export function validName(name) {
  if (typeof name !== 'string') return false;
  const n = name.normalize('NFC');
  const len = [...n].length;
  return len >= 3 && len <= 12 && /^[\p{L}\p{M}\p{N}_]+$/u.test(n);
}

/** ISO 8601 with the local timezone offset, e.g. 2026-11-20T16:45:03+07:00 */
export function isoWithOffset(date = new Date()) {
  const pad = (v) => String(Math.floor(Math.abs(v))).padStart(2, '0');
  const off = -date.getTimezoneOffset();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${off >= 0 ? '+' : '-'}${pad(off / 60)}:${pad(off % 60)}`;
}

export function makeEntry({ name, score, nights_won, seed, date = new Date() }) {
  if (!validName(name)) throw new Error('tên phải 3–12 ký tự: chữ, số hoặc _');
  if (!Number.isInteger(score) || score < 0) throw new Error('score must be an integer >= 0');
  if (!Number.isInteger(nights_won) || nights_won < 0 || nights_won > 3) throw new Error('nights_won must be 0..3');
  return { name: name.normalize('NFC'), score, nights_won, achieved_at: isoWithOffset(date), seed };
}

/** Sorted by score desc; equal score -> whoever achieved it first ranks higher. Keeps the top 10. */
export function sortEntries(entries) {
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.score - a.e.score || Date.parse(a.e.achieved_at) - Date.parse(b.e.achieved_at) || a.i - b.i)
    .map((x) => x.e)
    .slice(0, MAX_ENTRIES);
}

export const addEntry = (entries, entry) => sortEntries([...(entries || []), entry]);

/** Validates a stored list (drops broken rows) — files on disk can be edited by hand. */
export function cleanEntries(list) {
  if (!Array.isArray(list)) return [];
  return sortEntries(list.filter((e) => e && validName(e.name) && Number.isInteger(e.score) && Number.isInteger(e.nights_won) &&
    typeof e.achieved_at === 'string' && !Number.isNaN(Date.parse(e.achieved_at))));
}
