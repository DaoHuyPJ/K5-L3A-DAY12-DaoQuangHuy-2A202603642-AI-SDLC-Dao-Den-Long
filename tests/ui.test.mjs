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

test('palette equals the Ticket-02 colour table (typed by hand from the ticket)', async () => {
  const { C } = await import('../src/game/palette.js');
  const hex = (n) => '#' + n.toString(16).toUpperCase().padStart(6, '0');
  assert.deepEqual(Object.fromEntries(Object.entries(C).map(([k, v]) => [k, hex(v)])), {
    sky: '#0E1430', fog: '#1B2350', grass: '#2F5D50', sand: '#C9B48A', wood: '#6B4A2F', sea: '#12384A',
    lit: '#FFB347', core: '#FFE9B0', off: '#5B5F6E', moteCore: '#FFF6C2', moteHalo: '#FFE58A',
    shade: '#120A1A', shadeRim: '#7A3CFF', shadeStun: '#3A3450', shirt: '#E8E2D0', scarf: '#C8102E',
    gold: '#F2C14E', drifter: '#8FA3B8', danger: '#FF5A5F', uiText: '#F5F1E6',
  });
});

test('main.js uses no hard-coded colour for listed parts (all via palette C)', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/game/main.js', import.meta.url), 'utf8');
  for (const bad of ['0x3a6b5c', '0x467a6a', '0x4e3420']) assert.ok(!src.includes(bad), bad);
});
