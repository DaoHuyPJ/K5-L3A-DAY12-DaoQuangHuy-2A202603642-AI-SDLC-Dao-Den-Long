// How a lantern should look. Pure (no DOM / three) so it can be unit-tested.
// Phase 2 fix: only a LIT lantern emits light (partially filled ones used to glow).
// Ticket-03: lit lanterns show a fuel bar; fuel < 30 -> lantern + bar blink slowly (1 Hz) and the
// safe ring disappears (no safe zone). Colour-blind mode: unlit lanterns are squashed 20% and torn,
// so lit/unlit is readable without colour; labels also get a shape icon (✖ unlit, ☀ lit).
export const blinkOn = (t) => Math.floor(t * 2) % 2 === 0; // 1 Hz: 0.5 s on, 0.5 s off

export function lanternLook(l, { cost, fuelMax = 100, lowThreshold = 30, t = 0, colorBlind = false } = {}) {
  if (l.lit) {
    const fuel = l.fuel ?? fuelMax;
    const low = fuel < lowThreshold;
    const on = !low || blinkOn(t);
    return {
      glow: on ? 1 : 0.2, light: on, ring: !low, fuelBar: Math.max(0, Math.min(1, fuel / fuelMax)),
      blink: low, label: `${colorBlind ? '☀ ' : ''}${l.id} · ${Math.ceil(fuel)}`, squash: 1, torn: false,
    };
  }
  return {
    glow: 0, light: false, ring: false, fuelBar: null, blink: false,
    label: `${colorBlind ? '✖ ' : ''}${l.id} · ${l.deposited}/${cost}`, squash: colorBlind ? 0.8 : 1, torn: colorBlind,
  };
}
