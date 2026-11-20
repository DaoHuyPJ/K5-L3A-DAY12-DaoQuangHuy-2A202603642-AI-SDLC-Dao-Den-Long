# Phase 2 — mutation check (tests must be able to fail)

Each row: one deliberate bug injected into `src/sim/world.js` (or `config.js`), then `node --test`; file restored after each row (73/73 pass afterwards). Output of the shell loop, pasted verbatim. Rows 6 and 8 first showed **fail 0** — real gaps in the tests; R20 and P15 were strengthened and the second table shows them caught. The "ramps missing" row in the first table did not apply (pattern lives in config.js) and is redone in the second table.

| Mutation (src/sim/world.js) | Result | Failing tests |
|---|---|---|
| charm does not remove dash cooldown | ℹ fail 1 | ✖ P04-charm-dash-no-cooldown  |
| air dash affected by gravity | ℹ fail 1 | ✖ P02-air-dash-keeps-height  |
| drifter steals everything | ℹ fail 1 | ✖ P06-drifter-steal-flee-remove  |
| drifter chases with any load | ℹ fail 1 | ✖ P07-drifter-idle-below-5  |
| pause ignored | ℹ fail 1 | ✖ P05-pause  |
| spawning shades move | ℹ fail 0 |  |
| pulse center at foot (no +0.8) | ℹ fail 1 | ✖ R11-pulse-radius-3d  |
| expelled shades keep chasing | ℹ fail 0 |  |
| no fall detection | ℹ fail 1 | ✖ R22-fall-respawn  |
| only 1 shade at tick 300 | ℹ fail 1 | ✖ R20-shade-spawn-schedule  |
| no score for deposited motes | ℹ fail 3 | ✖ R07-deposit-and-light ✖ R08-partial-deposit ✖ R17-win-all-lit  |
| wind ignores X | ℹ fail 1 | ✖ P23-night3-wind  |
| ramps missing (config, not world) | ℹ fail 0 |  |

### After strengthening the tests

| Mutation | Result | Failing tests |
|---|---|---|
| spawning shades move | ℹ fail 1 | ✖ R20-shade-spawn-schedule  |
| expelled shades keep chasing | ℹ fail 1 | ✖ P15-safe-zone-expel  |
| Night 3 ramps missing (config.js) | ℹ fail 1 | ✖ P21-night3-ramp-cliff-tower  |
| cliffs/tower not blocking | ℹ fail 2 | ✖ P22-night3-cliff-blocks ✖ P24-night3-tower-blocks  |
| jump pad without horizontal launch | ℹ fail 2 | ✖ P19-night2-jump-pad ✖ P20-night3-map-and-pad  |
