// How a lantern should look. Pure (no DOM / three) so it can be unit-tested.
// Bug fixed in phase 2: partially filled lanterns used to glow, so players thought they were lit.
// Rule now: only a LIT lantern emits light; an unlit one shows its progress as a label.
export function lanternLook(l, cost) {
  if (l.lit) return { glow: 1, light: true, ring: true, label: null };
  return { glow: 0, light: false, ring: false, label: `${l.id} · ${l.deposited}/${cost}` };
}
