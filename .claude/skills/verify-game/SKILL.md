---
name: verify-game
description: Run the game headless against the acceptance scenarios, mutation-check new rules, and regenerate proof files for a phase. Use after any gameplay/contract change, and before tagging a phase.
---

# verify-game

1. `npm test` — must be green (the Stop hook enforces this too).
2. `npm run verify -- phase-N` — runs every scenario in `tests/scenarios.mjs` (all 3 nights) through the real
   headless CLI, saves `docs/proof/phase-N/scenarios/<name>/{scenario,inputs}.json + out.jsonl`,
   checks determinism, writes `docs/proof/phase-N/results.md` and `test-report.txt`.
3. Mutation check for every NEW rule: break it on purpose in `src/sim/world.js` (sed on a backup copy),
   run `node --test`, record "rule | fail count | failing test" in `docs/proof/phase-N/mutation-check.md`,
   restore the file. A mutation with `fail 0` = a hole in the tests: add a hand-derived assertion, re-run.
4. Visual proof (needs `npm start` in the background):
   `node scripts/screenshot.mjs docs/proof/phase-N/screenshots <name> "autostart&night=2&lit=1&carried=4"`
   then LOOK at the image before claiming anything about it. FPS cannot be measured in headless Edge
   (virtual time) — use `/?bench` on a real machine and write the number down with the machine spec.
5. Update the traceability table in `docs/proof/phase-N/README.md` (requirement -> check -> evidence -> result).
   Never hand-edit generated files; a requirement that is not met is written as "chưa đạt" with the reason.

Adding a scenario: append to `SCENARIOS` in `tests/scenarios.mjs` with `name`, `req`, `seed`, `night`, `ticks`,
optional `scenario`/`inputs`/`snapshotEvery`, and a `check(lines)` using node:assert. Derive expected
numbers from the ticket by hand first — never copy them from the program's own output.
