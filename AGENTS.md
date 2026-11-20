# AGENTS.md — Đảo Đèn Lồng

3D lantern game + headless mode graded by **Test Contract** (spec: lab board; notes in `docs/notes/`).

## Commands
- Install: `npm install` (only dep: three) · Play: `npm start` → http://localhost:8080
- Test: `npm test` (node:test, no extra deps) · Proof: `npm run verify -- phase-N` (skill `verify-game`)
- Headless: `node src/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl [--scenario f] [--inputs f] [--snapshot-every N]`

## Layout
- `src/sim/` pure deterministic logic (config, io validation, world step). **No DOM, Date, Math.random.**
- `src/headless.js` CLI (exit 0 ok / 1 usage / 2 malformed file) · `src/game/` Three.js view only.
- `tests/scenarios.mjs` acceptance scenarios (shared by tests + verify script).

## Rules
- Every gameplay number lives in `src/sim/config.js`; `game.contract.json` tuning must match (test enforces).
- Browser-only features (visuals, sound, creative extras) must NOT change headless output: keep them in `src/game/`.
- Follow the tick model exactly: snapshot 0 before input; step k reads input k, events get tick k+1.
- Expected values in tests are derived by hand from the spec/tuning, never pasted from program output.
- A requirement change that breaks an old test: update/remove the test **with a reason** in `docs/notes/phase-N.md`.
- Don't invent requirements; quote the ticket. Ambiguity → write an assumption in `docs/notes/phase-N.md`.
- Small commits, one concern each. Tag `phase-N` only after `npm run verify` passes.
