---
name: verify-game
description: Run the game headless against the acceptance scenarios and regenerate proof files for a phase. Use after any gameplay/contract change, and before tagging a phase.
---

# verify-game

1. `npm test` — must be green (the Stop hook enforces this too).
2. `npm run verify -- phase-N` — runs every scenario in `tests/scenarios.mjs` through the real
   headless CLI, saves `docs/proof/phase-N/scenarios/<name>/{scenario,inputs}.json + out.jsonl`,
   checks determinism, writes `docs/proof/phase-N/results.md` and `test-report.txt`.
3. Visual proof (optional, needs the server: `npm start` in background):
   `msedge|chrome --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1280,720
   --virtual-time-budget=5000 --screenshot=docs/proof/phase-N/screenshots/x.png "http://localhost:8080/?autostart&lit=1&carried=3"`
   then LOOK at the image before claiming anything about it.
4. Update the traceability table in `docs/proof/phase-N/README.md` (requirement -> scenario -> result).
   Never hand-edit generated files; a requirement that is not met is written as "chưa đạt" with the reason.

Adding a scenario: append to `SCENARIOS` in `tests/scenarios.mjs` with `name`, `req`, `seed`, `ticks`,
optional `scenario`/`inputs`/`snapshotEvery`, and a `check(lines)` using node:assert. Derive expected
numbers from `src/sim/config.js` by hand first — never copy them from the program's own output.
