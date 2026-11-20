# Third-party agent skills — awesome-gamedev-agent-skills

- Source: https://github.com/gamedev-skills/awesome-gamedev-agent-skills (commit `c6ca6c4`, 2026-11-20)
- License: Apache-2.0 — [LICENSE](LICENSE), attribution in [NOTICE](NOTICE). Copied **unmodified**.
- Reviewed before adding: Markdown only (no scripts), scanned for shell/network commands and prompt-injection text — none found.

| Skill (in `.claude/skills/`) | Why it is useful here |
|---|---|
| `threejs-scene-setup` | Renderer/loop/resize/import-map debugging for the Three.js view (black canvas, module errors) |
| `threejs-materials-lighting` | Materials, lights, tone mapping — lantern glow, low-fuel blink, palette fidelity |
| `performance-optimization` | Measure-first profiling; uncapped measurement; shader-compile hitches (open item from Phase 2–3) |
| `game-ui-ux` | HUD/menus, safe areas, accessibility minimums (colour-blind mode, Ticket-03 §6) |
| `game-feel` | Juice (shake, hit-stop, tweens) for the creative part — view only, never in `src/sim` |

Not added: engine-specific skills (Godot/Unity/Unreal/…), `threejs-gltf-loading` (only needed if glTF trees are brought into the repo).

**Project rules win over these skills** (see AGENTS.md): they target three r187; this project pins **three 0.160** — check an API exists in 0.160 before using it (e.g. `THREE.Timer` is r163+, so keep the current loop).
