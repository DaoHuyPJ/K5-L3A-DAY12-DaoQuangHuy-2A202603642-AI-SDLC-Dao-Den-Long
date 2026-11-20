# Phase 2 — bằng chứng (truy vết yêu cầu Ticket-02 → bằng chứng)

Chạy lại ở tag `phase-2`: `npm install && npm test && npm run verify -- phase-2`.
File sinh tự động (không sửa tay): [results.md](results.md), [test-report.txt](test-report.txt), `scenarios/<tên>/{scenario.json, inputs.json, out.jsonl}`.
Giả định + tiêu chí nghiệm thu: [docs/notes/phase-2.md](../../notes/phase-2.md).

| Yêu cầu | Kiểm chứng | Kết quả |
|---|---|---|
| Phần 1 — số chuẩn trong contract | `unit.test.mjs` so `TUNING` với bản gõ tay từ ticket + so `game.contract.json` | Đạt |
| Chạy 6 m/s, nhảy 7/−20, chỉ nhảy khi chạm đất | R02–R04, R21 | Đạt |
| Lướt 14 m/s · 0.2 s · hồi 1.5 s, hướng di chuyển/quay mặt, trên không giữ độ cao | P01, P02 | Đạt |
| Nhặt XZ ≤ 1.0 + chênh cao ≤ 1.5, sức chứa 10 | R05, R06, P13 | Đạt |
| 20 đom đóm ở 20 điểm, +1 mỗi 240 tick ở điểm trống | P12 | Đạt |
| Đèn: chi phí 10, nạp nhiều lần, bán kính 2.0, chọn gần nhất / id nhỏ hơn | R07–R09, P14 | Đạt |
| Vùng an toàn 6 m: chặn ở mép; bóng ở trong bị đẩy ra ≤ 30 tick, không gây sát thương | R15, R16, P15 | Đạt |
| Tỏa Sáng 3 / 5 m (3D từ chân + 0.8) / hồi 3 s / choáng 120 / đẩy 4 m trong 15 tick / +5 | R10–R13 | Đạt |
| Bóng Mực 4.0 (Đêm 3: 4.5) m/s, phát hiện 12 / bỏ 18 m | P16, P17 | Đạt |
| Chạm: XZ ≤ 1, chênh cao ≤ 1.5, 1 lần/tick, recoil 2 m/60 tick, bất tử 90 tick | R14 | Đạt |
| Lịch sinh Bóng Mực: 2 con ở tick 300, rồi mỗi khoảng; id S1…; trạng thái `spawning` | R20 | Đạt |
| Bị đánh: rơi floor(n/2) ra vành 1.5–2.5 m, TTL 480, nhặt lại được | R14, P11 | Đạt |
| Rơi khỏi đảo: 1 lần, −1 lửa, mất hết, chờ 60, hồi sinh, bất tử 90 | R22 | Đạt |
| Thắng/thua cuối tick, thời gian 300/330/360 | R17, R18, P18, P20 | Đạt |
| Điểm chuẩn (+10/đom đóm nạp, +100, +5, thưởng thắng) | R07, R08, R10, R17 | Đạt |
| Thứ tự 12 bước, tạm dừng (tick tăng, sim_tick đứng) | P05 + cấu trúc `step()` | Đạt |
| Bản đồ Đêm 1 chuẩn hóa | R01, R20 (vòng 37 m, góc 15°+30k), P12 (bán kính 12/33) | Đạt |
| Đêm 2: 2 đảo + cầu, bục nhảy, 6 đèn, Bùa Gió (35,0,0) | P18, P19, P03 | Đạt |
| Đêm 3: 3 tầng, dốc, vách, tháp, bục nhảy, 7 đèn, gió | P20–P24 | Đạt |
| Gió Lạc: idle/chase/flee/removed, cướp, Tỏa Sáng | P06–P10 | Đạt |
| Bùa Gió: 7.2 m/s, lướt không hồi chiêu, hồi 2700 tick | P03, P04 | Đạt |
| Contract v1.1: `--night 1..3`, trường snapshot mới, scenario mới, input dash/pause, sự kiện mới, mã thoát | `cli.test.mjs`, P-series | Đạt |
| Tên trạng thái Bóng Mực v1.1 | `cli.test.mjs` (Đêm 3, 6000 tick) | Đạt |
| Tất định (cả 3 Đêm) | `cli.test.mjs` + [results.md](results.md) | Đạt |
| Headless 1 Đêm ≤ 30 s | `cli.test.mjs` (21 600 tick, snapshot mỗi tick): ~0.6–0.7 s/Đêm | Đạt |
| Chuỗi 3 Đêm, giới thiệu + lời Ông Đăng, Bình Minh, chơi lại khi thua | Chơi tay; [menu.png](screenshots/menu.png) | Đạt — chỉ kiểm tay |
| Tạm dừng + menu, Cài đặt lưu giữa các lần mở | Chơi tay | Đạt — chỉ kiểm tay |
| Âm thanh (nhạc nền + hiệu ứng) | Chơi tay | Đạt — chỉ kiểm tay |
| HUD đầy đủ + mũi tên + nhắc "E — Nạp ánh sáng" | [night1.png](screenshots/night1.png), [night2.png](screenshots/night2.png), [night3.png](screenshots/night3.png) | Đạt (kiểm bằng mắt; chưa có ảnh nhắc E và đồng hồ đỏ) |
| Bảng màu chuẩn, ánh sáng 0.15 + 0.55 × tiến độ | Hằng `C` và `draw()` trong `src/game/main.js` | Đạt (đọc code) |
| ≥ 30 FPS trung bình ở 1280×720 | `/?bench` trên máy thật | **Chưa đo** — headless Edge dùng thời gian ảo nên không đo được FPS |
| Test có khả năng bắt lỗi | [mutation-check.md](mutation-check.md): 18 lỗi cài cố ý, tất cả bị bắt (sau khi vá 2 lỗ hổng) | Đạt |
| Hồi quy Phase 1 | R01–R22 chạy với số chuẩn; thay đổi kỳ vọng ghi ở phase-2.md §4 | Đạt |
