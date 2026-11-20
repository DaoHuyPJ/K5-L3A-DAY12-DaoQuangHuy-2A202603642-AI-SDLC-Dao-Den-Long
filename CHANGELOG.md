# Changelog

## phase-3 — Ticket-03 "Đèn cạn dầu" (Contract v1.2)

### Breaking changes
- **Win rule:** no early win; `game_over.reason` `all_lit` removed, new `dawn_survived`. Win only at dawn with lit lanterns ≥ ceil(0.6 × total).
- **Night durations:** 300/330/360 s → **240/270/300 s** (`night*_duration_s`).
- **Score:** whole formula replaced (+5 per mote put in a lantern, +100 first light, +40 relight, +5 / +15 pulse, dawn bonus 50 + floor(fuel) per lit lantern + 50 per flame; time bonus removed, `per_second_left: 0`).
- **Lanterns can go out:** fuel 100, −1/s; at 0 → `lantern_out`, `deposited` reset to 0. Relight costs 5.
- **Safe zone:** only while fuel ≥ 30 (was: any lit lantern).
- **Shade states:** new `drain`; stun/recoil/spawning end → `wander` (was: chase if within 12 m). Wander walks to weak / unlit lanterns.
- **Capacity:** no longer fixed at 10: `min(20, 10 + 2 × successful_lights)`.
- **Contract v1.2:** new tuning keys; snapshot lanterns `fuel`, `ever_lit`, `relit_count`; `player.capacity`; scenario `lit/fuel/ever_lit`, `player.successful_lights`, `shades[].target_lantern_id`; events `refuel`, `lantern_out`, `fuel_drain`; `lantern_lit.relight`.

### Added
- Fuel bar over lit lanterns, 1 Hz blink below 30 fuel, relight label `L# · x/5`, HUD `carried/capacity` with a growing bar, goal text "need N lit at dawn".
- Colour-blind setting (saved): shade rim/eyes #00B3FF, warning #FFFFFF + ⚠, unlit lanterns squashed 20% + torn.
- ADR 0001, 19 new scenarios (Q01–Q16, R17b), mutation check (16 rules), `tests/ui.test.mjs` lantern/blink/colour-blind rules.

## phase-2
- Ticket-02: standard numbers, Night 2 (Đảo Cau) + Night 3 (Đảo Chuông), dash, Wind Charm, Lost Wind drifters, dropped motes, falling + respawn, pause, wind.
- Contract v1.1 (snapshot/scenario/input/events), 73 tests (46 scenarios), mutation check (18 rules).
- UI: 3-night flow, pause menu, saved settings, full HUD, standard palette, music + SFX.

## phase-1
- Night 1 "Đảo Bến": movement, jump, 3D camera, fireflies, lantern deposit/lighting, Ink Shades chase, light pulse, win/lose, score, HUD, replay.
- Headless mode + `game.contract.json` per Test Contract v1.0.
- 42 tests (22 headless acceptance scenarios), determinism check, mutation check, CI, Stop hook, verify skill.
