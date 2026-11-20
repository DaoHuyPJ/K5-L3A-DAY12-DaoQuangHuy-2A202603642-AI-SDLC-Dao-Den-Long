// UI rules that can be checked without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lanternLook } from '../src/game/lanternLook.js';

test('regression: a partially filled lantern does not glow and shows its progress', () => {
  for (const deposited of [0, 1, 6, 9]) {
    const look = lanternLook({ id: 'L1', lit: false, deposited }, 10);
    assert.deepEqual([look.glow, look.light, look.ring], [0, false, false], `deposited ${deposited}`);
    assert.equal(look.label, `L1 · ${deposited}/10`);
  }
});

test('only a lit lantern glows, lights the area and shows its safe ring', () => {
  assert.deepEqual(lanternLook({ id: 'L3', lit: true, deposited: 10 }, 10), { glow: 1, light: true, ring: true, label: null });
});
