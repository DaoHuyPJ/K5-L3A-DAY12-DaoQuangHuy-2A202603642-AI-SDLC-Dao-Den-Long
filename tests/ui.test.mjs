// UI rules that can be checked without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blinkOn, lanternLook } from '../src/game/lanternLook.js';

test('regression (phase 2): a partially filled lantern does not glow and shows its progress', () => {
  for (const deposited of [0, 1, 6, 9]) {
    const look = lanternLook({ id: 'L1', lit: false, deposited }, { cost: 10 });
    assert.deepEqual([look.glow, look.light, look.ring, look.fuelBar], [0, false, false, null], `deposited ${deposited}`);
    assert.equal(look.label, `L1 · ${deposited}/10`);
  }
});

test('Ticket-03: a relight shows the relight cost (5) in the label', () => {
  assert.equal(lanternLook({ id: 'L2', lit: false, deposited: 2 }, { cost: 5 }).label, 'L2 · 2/5');
});

test('Ticket-03: lit lantern shows a fuel bar; ring (safe zone) only while fuel >= 30', () => {
  const full = lanternLook({ id: 'L1', lit: true, fuel: 100 }, { cost: 10 });
  assert.deepEqual([full.glow, full.light, full.ring, full.fuelBar, full.blink], [1, true, true, 1, false]);
  const at30 = lanternLook({ id: 'L1', lit: true, fuel: 30 }, { cost: 10 });
  assert.deepEqual([at30.ring, at30.blink, at30.fuelBar], [true, false, 0.3]);
  const low = lanternLook({ id: 'L1', lit: true, fuel: 29.9 }, { cost: 10, t: 0.1 });
  assert.deepEqual([low.ring, low.blink], [false, true]);
});

test('Ticket-03: low-fuel lantern blinks slowly at 1 Hz (on 0.5 s, off 0.5 s)', () => {
  const at = (t) => lanternLook({ id: 'L1', lit: true, fuel: 10 }, { cost: 10, t }).light;
  assert.deepEqual([at(0.1), at(0.4), at(0.6), at(0.9), at(1.1)], [true, true, false, false, true]);
  assert.equal(blinkOn(2.25), true);
});

test('Ticket-03 colour-blind mode: unlit lanterns are squashed 20% and torn; lit ones are not', () => {
  const off = lanternLook({ id: 'L1', lit: false, deposited: 0 }, { cost: 10, colorBlind: true });
  assert.deepEqual([off.squash, off.torn], [0.8, true]);
  const offNormal = lanternLook({ id: 'L1', lit: false, deposited: 0 }, { cost: 10 });
  assert.deepEqual([offNormal.squash, offNormal.torn], [1, false]);
  const on = lanternLook({ id: 'L1', lit: true, fuel: 80 }, { cost: 10, colorBlind: true });
  assert.deepEqual([on.squash, on.torn], [1, false]);
});

test('palette equals the Ticket-02 colour table + Ticket-03 colour-blind colours (typed by hand)', async () => {
  const { C } = await import('../src/game/palette.js');
  const hex = (n) => '#' + n.toString(16).toUpperCase().padStart(6, '0');
  assert.deepEqual(Object.fromEntries(Object.entries(C).map(([k, v]) => [k, hex(v)])), {
    sky: '#0E1430', fog: '#1B2350', grass: '#2F5D50', sand: '#C9B48A', wood: '#6B4A2F', sea: '#12384A',
    lit: '#FFB347', core: '#FFE9B0', off: '#5B5F6E', moteCore: '#FFF6C2', moteHalo: '#FFE58A',
    shade: '#120A1A', shadeRim: '#7A3CFF', shadeStun: '#3A3450', shirt: '#E8E2D0', scarf: '#C8102E',
    gold: '#F2C14E', drifter: '#8FA3B8', danger: '#FF5A5F', uiText: '#F5F1E6',
    cbShadeRim: '#00B3FF', cbDanger: '#FFFFFF',
  });
});

test('main.js uses no hard-coded colour for listed parts (all via palette C)', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/game/main.js', import.meta.url), 'utf8');
  for (const bad of ['0x3a6b5c', '0x467a6a', '0x4e3420', '0x7a3cff']) assert.ok(!src.toLowerCase().includes(bad), bad);
});
