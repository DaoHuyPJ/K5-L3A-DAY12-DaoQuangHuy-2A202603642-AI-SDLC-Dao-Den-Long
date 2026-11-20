# Phase 1 — PRD-0 + Test Contract v1.0: yêu cầu, giả định, tiêu chí nghiệm thu

## 1. Quyết định kỹ thuật

| Quyết định | Lý do |
|---|---|
| JavaScript: Node cho headless, Three.js trên trình duyệt | Một codebase logic dùng chung cho cả hai chế độ; chạy trên macOS/Linux/Windows chỉ cần Node; không cần GPU cho headless |
| Logic thuần trong `src/sim/`, hiển thị trong `src/game/` | Contract yêu cầu headless không cửa sổ; tách ra để thêm phần sáng tạo mà không đổi output headless |
| Bước cố định 60 tick/s, đếm thời gian bằng số tick nguyên | Tránh sai số float khi tính `time_left_s`; tất định |
| PRNG mulberry32 có seed, không dùng `Math.random`/`Date` trong sim | Yêu cầu tất định (cùng seed → output giống hệt) |
| Không dùng dependency ngoài `three`; test bằng `node:test` | Cài nhanh, ít rủi ro trên máy chấm |

## 2. Giả định cho chỗ PRD-0 / contract chưa nói rõ

| # | Chỗ mơ hồ | Giả định của tôi |
|---|---|---|
| A1 | "Tỏa sáng tốn ánh sáng" — tốn gì? | Tốn `pulse_cost` = 1 đom đóm đang mang. Không đủ thì không tỏa sáng, không có sự kiện. Đang hồi chiêu thì nhấn bị bỏ qua (không xếp hàng) |
| A2 | Lửa (`flames`) là gì | Là máu: 3 ngọn lửa, mỗi lần bị chạm mất 1, về 0 thì thua (`no_flames`) |
| A3 | "Bóng Mực sợ đèn" — đèn nào? | Chỉ **đèn đã thắp** tạo vùng an toàn `safe_radius`; đèn chưa thắp không bảo vệ (scenario R16). Bóng Mực bị đẩy ra mép vùng (cách tâm 5.01 m) |
| A4 | Đom đóm rơi khi bị chạm đi đâu | `dropped = floor(carried × 0.5)`, rơi mất hẳn (không sinh lại tại chỗ) |
| A5 | Nạp đèn | Phím interact (cạnh lên) → đèn **chưa thắp gần nhất** trong `interact_radius`; nạp `min(carried, lantern_cost − deposited)`; phần thừa giữ lại |
| A6 | Nhặt đom đóm | Tự động khi ≤ `pickup_radius`, theo thứ tự id, không vượt `carry_capacity` (đom đóm thừa nằm lại) |
| A7 | Bình minh | Hết `time_left` → thua `dawn`. Nếu đèn cuối sáng đúng tick hết giờ thì thắng |
| A8 | Điểm thưởng cuối | Chỉ khi thắng: `per_second_left × floor(time_left_s)` + `per_flame_left × flames` |
| A9 | `per_stun` | Cộng cho mỗi Bóng Mực trong `stunned_ids` (kể cả đang bị choáng sẵn — choáng lại làm mới thời gian) |
| A10 | Tỏa sáng | Choáng mọi Bóng Mực ≤ `pulse_radius`, đẩy ra xa Mây `pulse_push_m` (trùng vị trí thì đẩy theo +X). Bóng Mực choáng không di chuyển, không gây sát thương |
| A11 | Rơi khỏi đảo | Không có: mép đảo (r = 40 m) là tường → `fall_enabled: false` |
| A12 | Nhảy | Vận tốc 7 m/s, trọng lực 20 m/s² (đỉnh ≈ 1.2 m, ~0.7 s). Nhảy không giúp né Bóng Mực vì khoảng cách đo trên XZ |
| A13 | Sinh ngẫu nhiên mặc định | 24 đom đóm ban đầu, sinh thêm 1 mỗi 4 s khi < 20; 2 Bóng Mực ban đầu ở vòng 36 m, thêm 1 mỗi 30 s (tối đa 6), cách Mây ≥ 15 m. Chỉ Bóng Mực sinh **trong lúc chơi** mới có sự kiện `shade_spawned` |
| A14 | `random_*: false` mà không liệt kê | Không có con nào ("chỉ có những con được liệt kê") |
| A15 | Scenario: đèn `lit: true` không có `deposited` | `deposited = lantern_cost`. Id đèn không tồn tại (khác L1..L5) → file sai định dạng, mã thoát 2 |
| A16 | Thứ tự trong một bước | đồng hồ → di chuyển/nhảy → nhặt → nạp đèn → tỏa sáng → Bóng Mực di chuyển → va chạm → sinh mới → kiểm tra bình minh. Game kết thúc giữa bước thì bỏ phần còn lại của bước |
| A17 | Snapshot | Chỉ ở tick 0 và bội số của `--snapshot-every` (không thêm snapshot cuối); sự kiện của tick k ghi trước snapshot tick k. Có kèm mảng `motes` (khuyến nghị) |
| A18 | Lỗi CLI | Thiếu/sai tham số, `--night` ≠ 1 → mã 1. File inputs/scenario không đọc được hoặc sai định dạng → mã 2 |
| A19 | Hướng camera trên bản web | Phím D đi sang phải màn hình = `move.x = −1` (vì nhìn theo +Z thì bên phải là −X); headless dùng đúng công thức contract |

## 3. Tiêu chí nghiệm thu (mỗi dòng = một scenario headless trong `tests/scenarios.mjs`)

| Mã | Làm A thì thấy B |
|---|---|
| R01 | Chạy mặc định → 5 đèn L1..L5 (L1 tại (0,0,25)), Mây tại gốc, 300 s, 3 lửa |
| R02–R04 | Đi [0,1] 60 tick → (0,0,6); yaw 90° → đi +X; [1,1] được chuẩn hóa |
| R05–R06 | Đom đóm cách 1.2 m được nhặt, 1.25 m thì không; đang mang 9 chỉ nhặt thêm 1 |
| R07–R09 | Cách đèn 2.5 m nạp được, đủ 5 → `lantern_lit`, +100; 2.6 m không nạp; nạp một phần cộng dồn |
| R10–R13 | Tỏa sáng: −1 đom đóm, choáng 180 tick, đẩy 4 m, +20; ngoài 6 m không choáng; không có đom đóm thì không tỏa; hồi chiêu 60 tick, giữ phím chỉ kích hoạt một lần |
| R14 | Bị chạm: lửa 3→2→1→0 ở tick 1/91/181, rơi 2/1/1, thua `no_flames` ở tick 181 |
| R15–R16 | Đèn đã thắp: Bóng Mực không bao giờ vào ≤ 5 m; đèn chưa thắp: Mây bị chạm |
| R17–R18 | Thắp đèn cuối → `won/all_lit`, điểm 448 (tính tay); hết giờ → `lost/dawn` |
| R19–R22 | Dựng scenario không có sự kiện/điểm; Bóng Mực mới ở tick 1800; nhảy lên rồi đáp về Y=0; mép đảo r=40 |
| CLI | Tất định (2 lần chạy giống hệt), nhịp snapshot, làm tròn 3 số, dừng sớm khi kết thúc, mã thoát 2 / khác 0 |

## 4. Đánh giá Phase 1

- **Đạt:** toàn bộ phạm vi PRD-0 (di chuyển, nhảy, camera 3D, đom đóm, nạp/thắp đèn, Bóng Mực đuổi, tỏa sáng, thắng/thua, điểm, HUD, chơi lại) + contract v1.0. 42/42 test, 22/22 scenario, tất định ([results.md](../proof/phase-1/results.md)).
- **Kiểm chứng test có thể đỏ:** 6 lỗi cài cố ý đều bị bắt ([mutation-check.md](../proof/phase-1/mutation-check.md)).
- **Chưa kiểm chứng tự động:** cảm giác chơi trên trình duyệt (chỉ có ảnh chụp headless Edge + chơi tay). Chưa thử trên macOS/Linux thật — CI GitHub Actions chạy ubuntu + macos sẽ xác nhận khi push.
- **Rủi ro:** các giả định A3, A4, A9, A13 có thể khác cách hiểu của bộ test ẩn; đã ghi rõ để điều chỉnh khi Phase 2 làm rõ.
