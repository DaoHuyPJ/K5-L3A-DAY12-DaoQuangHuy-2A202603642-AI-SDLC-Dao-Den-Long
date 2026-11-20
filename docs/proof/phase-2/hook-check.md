# Stop hook check — the agent cannot finish its turn while tests are red

Hook: `.claude/settings.json` → `node scripts/stop-hook.mjs` (Claude Code blocks the stop when it exits 2 and shows stderr to the agent).
Run on 2026-11-20T08:49Z, output pasted verbatim.

## 1. Tests green → hook allows stopping
```
exit code: 0
```

## 2. Deliberate bug (dash cooldown removed in src/sim/world.js) → hook blocks
```
Tests are failing — fix them (or document why a test was changed) before stopping:
✖ P01-dash: dash 14 m/s for 12 ticks in facing direction (+Z when idle), cooldown 90 ticks from dash start (70.8787ms)
✖ failing tests:
✖ P01-dash: dash 14 m/s for 12 ticks in facing direction (+Z when idle), cooldown 90 ticks from dash start (70.8787ms)
exit code: 2
```

## 3. File restored → hook allows stopping again
```
exit code: 0
```
