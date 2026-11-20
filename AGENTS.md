# AGENTS.md — Đảo Đèn Lồng

3D lantern game, 3 nights, + headless mode graded by **Test Contract v1.1** (Ticket-02). Notes: `docs/notes/phase-N.md`.

## Commands
- Install: `npm install` (only dep: three) · Play: `npm start` → http://localhost:8080 (`?fps` FPS counter, `?bench` FPS run)
- Test: `npm test` (node:test) · Proof: `npm run verify -- phase-N` (skill `verify-game`)
- Headless: `node src/headless.js --seed 1 --night 1|2|3 --ticks 600 --out out.jsonl [--scenario f] [--inputs f] [--snapshot-every N]`
- Screenshot (server running): `node scripts/screenshot.mjs <dir> <name> "autostart&night=2&lit=1"` — then LOOK at the png
- FPS proof (real time, GPU): `FPS_UNCAPPED=1 node scripts/measure-fps.mjs phase-N 30` → `docs/proof/phase-N/fps.json` (invalid if the page was ever hidden)
- Lab requirement checklist: `docs/proof/compliance.md` + `node scripts/submission-check.mjs --online` (SUBMISSION §7, writes docs/proof/submission-check.md) — run before every tag; the final hand-in must have no FAIL/TODO
- Web build for claude.ai artifact / static hosting: `npm run build:web` → `dist/web/`

## Layout
- `src/sim/config.js` ALL numbers: `TUNING` (= contract tuning), `RULES` (other Ticket-02 rules, in ticks), `NIGHTS` (maps: lanterns, spawn points, pads, `ground(x,z)`).
- `src/sim/world.js` deterministic step in the **ticket's 12-step order** (pause → counters → move+fall → pickups → lanterns → safe zones → pulse → shades/drifters → contacts → spawns → win/lose). **No DOM, Date, Math.random.**
- `src/headless.js` CLI (exit 0 ok / 1 usage / 2 malformed file) · `src/game/` Three.js view, menus, HUD, sound only.
- `tests/scenarios.mjs` acceptance scenarios (R = Phase-1 reqs on standard numbers, P = Phase-2 features).

## Rules
- Standard numbers come from the ticket; never "tune" them. `game.contract.json` tuning must equal `TUNING` (tests enforce, incl. a hand-typed copy of the ticket values).
- Browser-only features must NOT change headless output: keep them in `src/game/`.
- Tick model: snapshot 0 before input; step k reads input k, events get tick k+1; paused ticks advance `tick` but not `sim_tick`.
- Expected values in tests are derived by hand from the ticket, never pasted from program output. After adding tests, run a mutation (break the rule on purpose) to prove the test can fail.
- A requirement change that breaks an old test: update it **with a reason** in `docs/notes/phase-N.md` (table "test cũ bị làm sai"). Never delete or skip silently.
- Don't invent requirements; quote the ticket. Ambiguity → numbered assumption in `docs/notes/phase-N.md`.
- CSS: any element toggled with `hidden` must not get a `display` rule that overrides it (global `[hidden]{display:none!important}` exists).
- Visuals must not suggest a state the sim does not have (e.g. only `lit` lanterns may glow). Put such rules in pure helpers under `src/game/` and unit-test them (`tests/ui.test.mjs`).
- A measurement only counts if its conditions are valid (page visible, GPU named, duration stated); never average over stalls you have not explained.
- Never hard-code a conclusion in generated evidence; compute it from the check's result (pass/fail text comes from the exit code or the count).
- Small commits, one concern each. Tag `phase-N` only after `npm run verify -- phase-N` passes.
