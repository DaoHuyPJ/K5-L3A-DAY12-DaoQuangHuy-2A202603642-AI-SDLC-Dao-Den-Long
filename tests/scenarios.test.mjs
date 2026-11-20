import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from './scenarios.mjs';
import { runScenario } from './helpers.mjs';

for (const sc of SCENARIOS) {
  test(`${sc.name}: ${sc.req}`, () => {
    const r = runScenario(sc);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.lines.at(-1).type, 'end', 'last line must be end');
    sc.check(r.lines);
  });
}
