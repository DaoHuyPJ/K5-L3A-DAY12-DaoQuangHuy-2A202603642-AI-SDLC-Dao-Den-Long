# Phase 3 — mutation check (Ticket-03 rules)

Each row: one deliberate bug injected into `src/sim/world.js`, then `node --test`; file restored after each row (96/96 pass afterwards, before the UI tests were added). Output of the loop, verbatim. **16/16 caught.**

| Mutation (src/sim/world.js) | Result | Failing tests |
|---|---|---|
| draining shades do not drain | ℹ fail 3 | ✖ Q06-drain ✖ Q07-drain-stacks ✖ Q10-refuel-expels-shades  |
| relight costs 10 like a new lantern | ℹ fail 1 | ✖ Q04-relight-cost-5  |
| zone needs fuel > 30 (exactly 30 loses it) | ℹ fail 1 | ✖ Q05-low-fuel-loses-safe-zone  |
| low fuel keeps the safe zone | ℹ fail 6 | ✖ Q05-low-fuel-loses-safe-zone ✖ Q06-drain ✖ Q07-drain-stacks  |
| stun end -> chase (old rule) | ℹ fail 2 | ✖ Q09-pulse-on-drainer ✖ R10-pulse-stun-push  |
| threshold one lantern too low | ℹ fail 2 | ✖ Q12-lose-dawn-below-threshold ✖ Q14-night2-threshold  |
| early win when all lit (old rule back) | ℹ fail 1 | ✖ R17b-all-lit-does-not-end  |
| capacity never grows | ℹ fail 3 | ✖ Q04-relight-cost-5 ✖ Q11-capacity-max-20 ✖ R07-deposit-and-light  |
| no +15 for a draining shade | ℹ fail 1 | ✖ Q09-pulse-on-drainer  |
| fuel_drain every 30 ticks | ℹ fail 1 | ✖ Q06-drain  |
| refuel does not expel drainers | ℹ fail 1 | ✖ Q10-refuel-expels-shades  |
| drain -> chase at 12 m instead of 6 m | ℹ fail 1 | ✖ Q08-drain-to-chase-at-6m  |
| wander ignores weak lanterns | ℹ fail 2 | ✖ Q06-drain ✖ Q15-wander-seeks-weak-lantern  |
| no dawn bonus per lit lantern | ℹ fail 1 | ✖ R17-win-at-dawn  |
| refuel above 100 | ℹ fail 1 | ✖ Q03-refuel  |
| out lantern keeps deposited | ℹ fail 1 | ✖ Q02-lantern-out  |
