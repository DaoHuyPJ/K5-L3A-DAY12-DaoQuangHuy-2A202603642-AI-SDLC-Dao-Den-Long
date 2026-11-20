# Phase 3 — Ticket-03 "Đèn cạn dầu" (Change Request) + Test Contract v1.2

Quyết định thiết kế: [ADR 0001](../adr/0001-lantern-fuel-and-dawn-win.md). Breaking changes: [CHANGELOG.md](../../CHANGELOG.md).

## 1. Luật bị thay [THAY THẾ] và chỗ bị ảnh hưởng

| Luật cũ | Luật mới | Ảnh hưởng trong code / test |
|---|---|---|
| Đèn đã sáng không nhận thêm đom đóm | Nhiên liệu 100, hao 1/s, châm dầu, hết dầu thì tắt, thắp lại cần 5 | `fuelStep`, `interact`; snapshot thêm `fuel`/`ever_lit`/`relit_count` |
| Bóng Mực không bao giờ vào vùng an toàn | Đèn dầu < 30 mất vùng an toàn; trạng thái `drain` hút 5/s | `zoneActive` thay `lit` ở mọi chỗ kiểm vùng; `moveShades` |
| Thắng ngay khi tất cả đèn sáng | Thắng ở bình minh nếu sáng ≥ ceil(0.6 × tổng); thời gian 240/270/300 s | bước 11 của `step`; R17 viết lại, R17b mới |
| Công thức điểm cũ | +5/đom đóm nạp, +100 thắp đầu, +40 thắp lại, +5/+15 Tỏa Sáng, bình minh +50+floor(fuel) mỗi đèn, +50/lửa; bỏ thưởng thời gian | `TUNING.score`; R07, R08, R17 |
| Giả định B3 (Phase 2): wander quanh điểm sinh | Wander đi tới đèn yếu, nếu không có thì đèn tắt gần nhất | `moveShades` |
| Giả định B4: hết choáng → chase nếu ≤ 12 m | Hết choáng → wander | R10 sửa |

## 2. Giả định cho chỗ ticket chưa nói rõ

| # | Chỗ mơ hồ | Giả định |
|---|---|---|
| C1 | `ever_lit` bật khi nào | Khi thắp lần đầu (đèn đang sáng thì `ever_lit: true`); hết dầu vẫn `true` như ticket nói |
| C2 | Châm dầu lúc dầu vừa hao ở bước 2 | Bước 2 trừ dầu trước bước 5 tương tác, nên đèn "100" đã thành 99.98 → vẫn nhận 1 đom đóm. "Đầy dầu" (used = 0) chỉ xảy ra khi fuelT đúng 6000 |
| C3 | `fuel_drain` | Mỗi Bóng đếm riêng số tick đã hút (tính từ tick đầu tiên thật sự hút); phát ở tick hút thứ 60, 120… với `fuel` sau khi trừ |
| C4 | Bóng `drain` có gây hit không | Không trực tiếp; Mây vào ≤ 6 m thì Bóng chuyển `chase` ở bước 8, rồi mới xét chạm ở bước 9 |
| C5 | `recoil`, `spawning` hết thời gian | Về `wander`, giống luật hết choáng; luật phát hiện 12 m áp dụng lại từ tick sau |
| C6 | Wander tới đèn tắt | Đi tới khi còn cách 2 m thì đứng chờ; không còn đèn tắt nào thì lượn quanh điểm sinh như Phase 2 |
| C7 | Đẩy Bóng khi châm dầu lên ≥ 30 | Áp dụng cho mọi Bóng trong vùng 6 m của đèn có vùng an toàn còn hiệu lực (cùng cơ chế với đèn vừa thắp); Bóng `drain` bị đẩy thì chuyển `wander` |
| C8 | `target_lantern_id` trong scenario | Dùng làm đèn đang hút khi `state: "drain"`; trạng thái khác thì mục tiêu tự tính lại mỗi tick. Snapshot báo `target_lantern_id` (đèn hút hoặc đèn đang đi tới) |
| C9 | `per_second_left` trong contract | Giữ khóa với giá trị 0 (bỏ thưởng thời gian) để parser cũ không vỡ; thêm `per_relight`, `per_stun_drain`, `per_lit_at_dawn` |
| C10 | Đèn đặt `lit: true` có `fuel: 0` | Tắt ngay ở bước 2 của tick 1 (`lantern_out`) |
| C11 | "Số đèn sáng ở tick cuối" | Đếm sau khi đèn hết dầu tắt ở bước 2 của chính tick đó |
| C12 | Chế độ mù màu "đèn tắt bị xếp 20%" | Hiểu là "xẹp 20%": giấy đèn tắt bị ép còn 80% chiều cao + mảng rách tối; đèn sắp cạn nhấp nháy 1 Hz (ở mọi chế độ) |

## 3. Tiêu chí nghiệm thu (mỗi dòng có scenario)

| Luật | Làm A thì thấy B | Scenario |
|---|---|---|
| Hao dầu | Đèn 100 sau 600 tick còn 90.0; `lit: true` không có fuel → 100 | Q01 |
| Hết dầu | fuel 1 → tick 60: `lantern_out`, unlit, deposited 0, ever_lit true | Q02 |
| Châm dầu | fuel 50.5, mang 7 → dùng 5, fuel 100, +25; mang 1 ở fuel 80.5 → 90.5 | Q03, Q03b |
| Thắp lại | ever_lit, mang 5 → `lantern_lit relight: true`, +65, relit_count 1, sức chứa 12 | Q04 |
| Mất vùng an toàn | fuel 31: Bóng bị chặn ≥ 6 m tới tick 60 (fuel đúng 30), vào trong sau đó | Q05 |
| Drain | Bóng wander cách 1.5 m đèn fuel 20 → `drain` ở tick 1, đứng yên, `fuel_drain` ở 61/121/181 (14/8/2), tắt ở 201, Bóng về wander | Q06 |
| Cộng dồn | 2 Bóng hút → 17.8 ở tick 13 (1 Bóng: 18.8) | Q07 |
| Drain → chase | Mây 6.05 m vẫn drain, 5.95 m thì chase | Q08 |
| Tỏa Sáng vào Bóng drain | +15, stunned, hết choáng → wander | Q09 |
| Châm lên ≥ 30 đẩy Bóng | Bóng ra mép trong 30 tick, không hit | Q10 |
| Sức chứa | 10 + 2×thắp, tối đa 20 | R07 (12), Q04 (12), Q11 (20) |
| Thắng/thua ở bình minh | 3/5 sáng → `dawn_survived` 554 điểm; 2/5 → `dawn`; Đêm 2 cần 4/6; Đêm 3 cần 5/7 | R17, Q12, Q14, Q16 |
| Không thắng sớm | Thắp đủ 5/5 → game vẫn tiếp tục | R17b |
| Hết lửa ở tick bình minh | `no_flames` dù đủ đèn | Q13 |
| Thời gian 240/270/300 | snapshot 0 | R01, P18, P20 |
| Hiển thị | Thanh dầu, nhấp nháy 1 Hz khi < 30, vòng an toàn chỉ khi ≥ 30, nhãn thắp lại x/5, mù màu xẹp 20% + rách | `tests/ui.test.mjs`, ảnh `docs/proof/phase-3/screenshots/` |
| Mù màu | Viền + mắt Bóng #00B3FF, cảnh báo #FFFFFF + ⚠, lưu trong cài đặt | `tests/ui.test.mjs` (bảng màu), code `main.js` + chơi tay |

## 4. Test cũ bị Ticket-03 làm sai — đã sửa (không xóa, không skip)

| Test | Trước | Sau | Lý do |
|---|---|---|---|
| R01 | `time_left_s` 300 | 240 (+ kiểm `capacity` 10, `fuel` 0) | Thời gian Đêm 1 mới |
| R07 | Điểm 200, `lantern_lit {lantern_id}` | 150, thêm `relight: false`, fuel 100, sức chứa 12 | Điểm +5/đom đóm; trường `relight`; sức chứa tăng |
| R08 | Điểm 30 | 15 | +5/đom đóm |
| R10 | Hết choáng ở tick 121 → `chase` | `wander` ở 121, `chase` ở 122 | "Hết choáng thì về wander" |
| R17 | Thắp hết đèn → `won/all_lit` 458 | Viết lại: bình minh với 3/5 đèn → `won/dawn_survived` 554 | Bỏ thắng sớm; điểm bình minh mới |
| R17b (mới) | — | Thắp đủ 5/5 không kết thúc | Thay phần "thắng ngay" của R17 cũ |
| P05 | `time_left_s` 300 − 10/60 | 240 − 10/60 | Thời gian Đêm 1 |
| P18 | 330 s | 270 s | Thời gian Đêm 2 |
| P20 | 360 s | 300 s | Thời gian Đêm 3 |
| unit: contract + số chuẩn | v1.1 | v1.2 + khóa fuel/win/capacity, điểm mới (gõ tay từ ticket) | Contract v1.2 |
| cli: tên trạng thái Bóng | 5 trạng thái | thêm `drain` | Trạng thái mới |

## 5. Đánh giá Phase 3

- **Đạt (tự động):** toàn bộ luật Ticket-03 có scenario (Q01–Q16 + sửa R/P); 99 test xanh; mutation 16/16 bị bắt ([mutation-check.md](../proof/phase-3/mutation-check.md)); hồi quy Phase 1–2 không bị thay vẫn xanh.
- **AI suýt sai:** đoạn `autostart` dùng để chụp ảnh bật `lit` mà không có dầu → mọi đèn tắt ngay ở tick 1, nhãn hiện "0/5" (lộ ra nhờ xem ảnh). Luật đúng, công cụ chụp ảnh còn theo mô hình cũ. Đã sửa.
- **Chỉ kiểm tay:** cảm giác chơi với dầu (độ khó), chế độ mù màu trong cửa sổ thật (ảnh chụp từ xa khó thấy vết rách).
