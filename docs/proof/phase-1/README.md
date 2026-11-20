# Phase 1 — bằng chứng (truy vết yêu cầu → bằng chứng)

Chạy lại ở tag `phase-1`: `npm install && npm test && npm run verify -- phase-1`.
File sinh tự động (không sửa tay): [results.md](results.md), [test-report.txt](test-report.txt), `scenarios/<tên>/{scenario.json, inputs.json, out.jsonl}`.

| Yêu cầu (PRD-0 / Contract v1.0) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Một màn Đêm 1, đảo tròn, 5 Đèn Lồng Lớn | Scenario R01 | `scenarios/R01-default-world/out.jsonl` | Đạt |
| Nhân vật đi lại (tốc độ, camera yaw, chuẩn hóa) | R02, R03, R04 | `scenarios/R02…R04` | Đạt |
| Nhảy | R21 (đỉnh 1–1.4 m, đáp về Y=0) | `scenarios/R21-jump` | Đạt |
| Camera 3D | Ảnh chụp bản web | [screenshots/gameplay.png](screenshots/gameplay.png), [gameplay-lit-lantern.png](screenshots/gameplay-lit-lantern.png) | Đạt (kiểm bằng mắt) |
| Đom đóm rải rác, nhặt được, giới hạn mang | R01, R05, R06 | `scenarios/R05…R06` | Đạt |
| Nạp ánh sáng để thắp đèn | R07, R08, R09 | `scenarios/R07…R09` | Đạt |
| Bóng Mực xuất hiện và đuổi | R10 (đuổi lại sau choáng), R16, R20 (sinh mới) | `scenarios/R16`, `R20` | Đạt |
| Chạm Bóng Mực mất máu, bất tử, rơi đom đóm | R14 | `scenarios/R14-hit-invuln-drop-lose` | Đạt |
| Tỏa sáng xua Bóng Mực, tốn ánh sáng, hồi chiêu | R10–R13 | `scenarios/R10…R13` | Đạt |
| Bóng Mực sợ đèn (`safe_radius`) | R15, R16 | `scenarios/R15`, `R16` | Đạt (theo giả định A3: chỉ đèn đã thắp) |
| Thắng / thua (no_flames, dawn) + điểm | R14, R17, R18 | `scenarios/R14`, `R17`, `R18` | Đạt |
| HUD | Ảnh chụp: lửa, đom đóm, đèn, thời gian, điểm, trạng thái tỏa sáng | [screenshots/gameplay.png](screenshots/gameplay.png) | Đạt (kiểm bằng mắt) |
| Chơi lại sau thắng/thua | Phím R / nút "Chơi lại" gọi `startGame()` tạo game mới | Chơi tay (chưa có ảnh/clip) | Đạt — chỉ kiểm tay |
| Contract: CLI, tick model, JSONL, mã thoát | `tests/cli.test.mjs` (14 test) | [test-report.txt](test-report.txt) | Đạt |
| Contract: tất định | Chạy 2 lần so sánh byte / sha256 | [results.md](results.md) mục Determinism | Đạt |
| Contract: `game.contract.json` khớp số thật | `unit.test.mjs` so với `src/sim/config.js` | [test-report.txt](test-report.txt) | Đạt |
| Scenario dựng không phát sự kiện/điểm | R19 | `scenarios/R19…` | Đạt |
| Test có khả năng bắt lỗi | 6 mutation cài cố ý | [mutation-check.md](mutation-check.md) | 6/6 bị bắt |
| Chạy trên macOS/Linux | CI ubuntu-latest + macos-latest | `.github/workflows/ci.yml` | **Chưa xác nhận** — cần push lên GitHub để CI chạy |
| Phần sáng tạo không đổi output headless | Phần thêm chỉ ở `src/game/`; headless không import `src/game/`; test vẫn xanh | `grep import src/headless.js src/sim/*.js` | Đạt |
