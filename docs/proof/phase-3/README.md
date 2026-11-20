# Phase 3 — bằng chứng (truy vết Ticket-03 → bằng chứng)

Chạy lại ở tag `phase-3`: `npm install && npm test && npm run verify -- phase-3`.
Sinh tự động (không sửa tay): [results.md](results.md), [test-report.txt](test-report.txt), `scenarios/<tên>/{scenario.json, inputs.json, out.jsonl}`.
Quyết định thiết kế: [ADR 0001](../../adr/0001-lantern-fuel-and-dawn-win.md) · Giả định + tiêu chí + test bị thay: [phase-3.md](../../notes/phase-3.md) · Breaking changes: [CHANGELOG.md](../../../CHANGELOG.md).

| Yêu cầu Ticket-03 | Kiểm chứng | Kết quả |
|---|---|---|
| §1 Nhiên liệu 100, hao 1/s, tính bằng đơn vị 1/60 | Q01 (100 → 95 → 90 sau 300/600 tick) | Đạt |
| §1 Châm dầu: used = min(mang, ceil((100−fuel)/10)), +10/đom đóm, tối đa 100, sự kiện `refuel` | Q03, Q03b | Đạt |
| §1 Chọn đèn: chỉ đèn nhận được, gần nhất, id nhỏ hơn | P14 (hòa → L1), Q03 | Đạt |
| §1 Hết dầu: tắt, deposited 0, `lantern_out`, ever_lit | Q02 | Đạt |
| §1 Thắp lại cần 5; chưa từng sáng cần 10 | Q04, R08 | Đạt |
| §1 Hiển thị thanh dầu, nhấp nháy 1 Hz khi < 30 | `tests/ui.test.mjs` + [fuel-bars.png](screenshots/fuel-bars.png), [low-fuel.png](screenshots/low-fuel.png) | Đạt |
| §2 Đèn dầu < 30 mất vùng an toàn, đúng 30 còn | Q05 | Đạt |
| §2 Wander tìm đèn yếu gần nhất, không có thì đèn tắt | Q15, Q06 | Đạt |
| §2 Drain: ≤ 2 m, đứng yên, 5/s cộng dồn + hao 1/s, `fuel_drain` mỗi 60 tick | Q06, Q07 | Đạt |
| §2 Drain → chase (≤ 6 m) / stunned / wander (đèn tắt, ≥ 30, > 2 m) | Q08, Q09, Q06 (tắt → wander), Q10 | Đạt |
| §2 Hết choáng → wander | R10, Q09 | Đạt |
| §2 Châm lên ≥ 30 đẩy Bóng ra mép ≤ 30 tick, không hit | Q10 | Đạt |
| §3 Thời gian 240/270/300 | R01, P18, P20 | Đạt |
| §3 Thắng ở bình minh nếu sáng ≥ ceil(0.6 × tổng); không thắng sớm | R17, R17b, Q12, Q14, Q16 | Đạt |
| §3 Hết lửa luôn thua trước, kể cả tick bình minh | Q13 | Đạt |
| §3 Thứ tự: trừ dầu ở bước 2, tắt ngay sau bước 2 | Q02 (tắt đúng tick 60), Q06 (tick 201) | Đạt |
| §4 Sức chứa 10 + 2×thắp (cả thắp lại), tối đa 20; HUD mang/sức chứa | R07, Q04, Q11 + ảnh HUD "6/10" | Đạt |
| §5 Điểm mới (+5, +100, +40, +5/+15, bình minh 50+floor(fuel), +50/lửa, bỏ thưởng thời gian) | R07, R08, Q03, Q04, Q09, R17 | Đạt |
| §6 Mù màu: viền/mắt Bóng #00B3FF, cảnh báo #FFFFFF + ⚠, đèn tắt xẹp 20% + rách, lưu cài đặt | `tests/ui.test.mjs` (bảng màu + quy tắc đèn), [colorblind.png](screenshots/colorblind.png) | Đạt (vết rách khó thấy trong ảnh chụp từ xa — kiểm tay) |
| §7 Contract v1.2 (tuning, snapshot, scenario, sự kiện, `drain`) | `unit.test.mjs`, `cli.test.mjs`, Q-series | Đạt |
| DoD: ADR | [docs/adr/0001](../../adr/0001-lantern-fuel-and-dawn-win.md) | Đạt |
| DoD: test cũ cập nhật có lý do, không skip | phase-3.md §4 (10 test, đánh dấu `[T03]`) | Đạt |
| DoD: changelog breaking changes | CHANGELOG.md → phase-3 | Đạt |
| DoD: test ẩn Phase 1–2 không bị thay vẫn đạt | R/P scenario còn lại không đổi kỳ vọng, vẫn xanh | Đạt |
| Test có khả năng bắt lỗi | [mutation-check.md](mutation-check.md): 16/16 | Đạt |
| Tất định | [results.md](results.md) | Đạt |
