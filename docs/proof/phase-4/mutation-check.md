# Phase 4 — mutation check (Ticket-04 rules)

Each row: one deliberate bug, then `node --test`, file restored after each row. Output verbatim. The first row was **not caught** (all worst frames in the test data had the same length) → added a hand-computed case with different worst frames; the last row shows it caught. **9/9 caught after the fix.**

| Mutation | Result | Failing tests |
|---|---|---|
| p1_low uses the k-th worst frame instead of the mean of k | ℹ fail 0 |  |
| p95 off by one rank | ℹ fail 2 | ✖ benchStats follows the Ticket-04 definitions;✖ benchStats p95 nearest rank picks the 190th value of 200; |
| bench scene drains fuel | ℹ fail 1 | ✖ bench scene: exactly 200 wander shades, 100 motes, L1-L3 lit at 100, nothing spawns/drains/ends; |
| bench shades chase the player | ℹ fail 1 | ✖ bench scene: exactly 200 wander shades, 100 motes, L1-L3 lit at 100, nothing spawns/drains/ends; |
| ties: later entry ranks first | ℹ fail 2 | ✖ export command: node server.js --export-leaderboard out.json -> {"entries": [...]} in rank order;✖ leaderboard: score desc, ties -> earlier first, top 10 only; |
| name length not enforced | ℹ fail 3 | ✖ export command: node server.js --export-leaderboard out.json -> {"entries": [...]} in rank order;✖ leaderboard entry fields; achieved_at is ISO 8601 with timezone; |
| duplicate keys not detected | ℹ fail 1 | ✖ key rebinding: duplicates are detected; stored bindings merge over defaults; |
| one HUD text at 13.5 px | ℹ fail 1 | ✖ every UI font-size in index.html is >= 18 px at 1280x720; |
| camera orbits clockwise | ℹ fail 1 | ✖ bench camera: r 30, y 15, starts at; |
| p1_low uses the k-th worst frame (after adding the test) | ✖ benchStats p1_low = 1000 / mean of the k worst frames (not the k-th worst) (2.5415ms) | ✖ benchStats p1_low = 1000 / mean of the k worst frames |
