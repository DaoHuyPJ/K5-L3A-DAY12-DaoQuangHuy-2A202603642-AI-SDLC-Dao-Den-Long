# Phase 2 — Ticket-02 "Ba hòn đảo" + Test Contract v1.1

## 1. Thay đổi thiết kế (và vì sao)

| Thay đổi | Lý do |
|---|---|
| Mọi số liệu tự chọn ở Phase 1 được thay bằng số chuẩn của Ticket-02 (`src/sim/config.js`: `TUNING` cho contract, `RULES` cho phần còn lại) | Ticket yêu cầu mọi bản cho cảm giác giống nhau; một nguồn số duy nhất, test so với số gõ tay từ ticket |
| Bản đồ chuẩn của từng Đêm là dữ liệu (`NIGHTS[1..3]`: đèn, điểm sinh, bục nhảy, hàm `ground(x,z)`) | Thêm Đêm mới không cần sửa logic; địa hình 3 tầng của Đêm 3 chỉ là một hàm độ cao |
| `step()` viết lại theo đúng 12 bước thứ tự xử lý của ticket | Ticket bắt buộc thứ tự; mỗi bước là một hàm riêng, dễ đối chiếu |
| Di chuyển theo địa hình chung cho Mây và Bóng Mực: bậc ≤ 0.35 m/tick đi được (dốc), cao hơn là vách (chặn), thấp hơn thì rơi | Một quy tắc phục vụ dốc, vách tầng, tháp chuông, mép đảo |
| Mép đảo không còn là tường: ngoài đảo là biển mây, Y < −10 là rơi | Ticket: "Ngoài 40 m là biển mây (rơi)", `fall_enabled: true` |
| Điểm `per_mote` tính khi **nạp** (Phase 1 tính khi nhặt) | Ticket: "+10 mỗi đom đóm nạp" |
| Thắng/thua xét ở cuối tick (Phase 1 xét ngay khi đèn sáng) | Ticket: "Sau mỗi tick: hết lửa → thua; còn sống và tất cả đèn sáng → thắng…" |
| UI viết lại: chuỗi 3 Đêm, tạm dừng, cài đặt, HUD đầy đủ, bảng màu chuẩn | Phần 3 của ticket |

## 2. Giả định cho chỗ ticket chưa nói rõ

| # | Chỗ mơ hồ | Giả định |
|---|---|---|
| B1 | Điểm xuất phát Đêm 2, 3 | Đêm 2: (0,0,0) tâm đảo A. Đêm 3: **(0,0,−30)** vì (0,0,0) nằm trong tháp chuông. Hồi sinh sau khi rơi cũng về điểm này |
| B2 | Thời lượng trạng thái `spawning` | 60 tick, đứng yên, không gây hit (vẫn bị Tỏa Sáng làm choáng) |
| B3 | Trạng thái `wander` | Lượn 1.5 m/s quanh điểm sinh (bán kính 6 m). Bóng Mực từ scenario không có `state` thì `chase` nếu ≤ 12 m, ngược lại `wander` |
| B4 | Hết choáng / hết recoil / hết spawning | Chuyển `chase` nếu ≤ 12 m, ngược lại `wander` |
| B5 | Chênh cao khi chạm Bóng Mực | So chân Mây với chân Bóng Mực (= tâm − 1 m). `shade.pos` là tâm, cao hơn mặt đất 1 m như v1.0 |
| B6 | Bóng Mực và địa hình | Đi theo mặt đất: không xuống biển, không leo vách, được rơi xuống tầng thấp. Đẩy lùi/recoil cũng dừng khi gặp vật cản |
| B7 | Tăng tốc ≤ 0.1 s | Tức thời (0 s, thỏa "≤ 0.1 s"); giữ đúng hồi quy Phase 1 (đi 60 tick = 6 m) |
| B8 | Hướng lướt khi đứng yên | Hướng quay mặt (+Z lúc đầu). Lướt trên không: vy = 0, không trọng lực trong 12 tick. Không nhảy khi đang lướt |
| B9 | Bục nhảy | Kích hoạt khi chân đứng trên bục (XZ ≤ 1 m, cùng độ cao). Hướng ngang: từ tâm bục tới tâm đảo kia (Đêm 2), −Z (Đêm 3). Lướt giữa lúc bay tạm thay vận tốc phóng, hết lướt thì vận tốc phóng tiếp tục |
| B10 | Đom đóm rơi ra biển | Thử tối đa 8 vị trí trên vành 1.5–2.5 m; vị trí nào trên biển/tháp thì bỏ; không có chỗ thì đom đóm đó mất |
| B11 | Trần 30 đom đóm | Đếm mọi đom đóm đang có (cả loại rơi). Đêm 1, 2 chỉ có 24 điểm nên thực tế tối đa 24 đom đóm ngẫu nhiên |
| B12 | Điểm sinh Bóng Mực hợp lệ | Cách Mây ≥ 15 m (mọi Đêm), không trong vùng an toàn của đèn đã sáng, không trùng Bóng Mực khác |
| B13 | "Điểm sương" của Gió Lạc | Dùng các điểm sinh Bóng Mực của Đêm đó; không có sự kiện riêng khi sinh (ticket không liệt kê) |
| B14 | Gió Lạc bị Tỏa Sáng lúc đang `chase` | Chuyển `flee` 240 tick rồi `removed`, không quay lại cướp. Con bị `removed` vẫn nằm trong mảng `drifters` với `state: "removed"` |
| B15 | Gió Lạc bay | Bỏ qua địa hình, độ cao = mặt đất + 1.5 m. Tỏa Sáng trúng nếu khoảng cách 3D tới tâm ≤ 5 m |
| B16 | Gió | Cơn thứ k chiếm sim_tick [1800k, 1800k + 300); hướng (độ nguyên, từ +X về +Z) rút ngẫu nhiên lúc báo trước 120 tick. `wind.dir_deg` giữ hướng của cơn gần nhất. Gió cộng 2 m/s vào chuyển động của Mây (kể cả lúc lướt/bay) |
| B17 | `night_start` | Ghi một lần ngay sau snapshot tick 0, với `tick: 0` (trước mọi bước) |
| B18 | Điểm trong headless khi thua | `score` là điểm chạy của Đêm đó (không về 0). Trong game, tổng điểm chỉ cộng các Đêm thắng |
| B19 | Tạm dừng trong headless | Nhấn pause lần nữa thì `resumed` và bước đó chạy luôn. Dòng `end` khi đang dừng có `state: "paused"` |
| B20 | `player.invuln` | Boolean; thêm `invuln_s` (giây còn lại) |
| B21 | Pha `pause` của bản chơi | Esc/P hoặc mất khóa chuột → mở menu tạm dừng; logic không được gọi khi đang dừng |

## 3. Tiêu chí nghiệm thu Phần 3 (mỗi dòng có scenario hoặc kiểm tra tương ứng)

| Tính năng | Làm A thì thấy B | Kiểm chứng |
|---|---|---|
| Lướt | Nhấn dash khi đứng yên → đi 2.8 m theo +Z trong 12 tick; nhấn lại trước 90 tick không lướt | P01 |
| Lướt trên không | Lướt khi đang nhảy → Y không đổi trong 12 tick | P02 |
| Gió Lạc đuổi | Mang ≥ 5, cách ≤ 15 m → `chase`; mang 4 → `idle` | P06, P07 |
| Gió Lạc cướp | Chạm XZ ≤ 1.2 → `drifter_steal` min(3, mang), `flee` 240 tick → `removed`, không mất lửa | P06 |
| Tỏa Sáng vs Gió Lạc | Trúng lúc `chase` → `flee` không cướp; trúng lúc `flee` có đồ → `drifter_drop`, đồ thành đom đóm rơi, biến mất sau 120 tick | P08, P09 |
| Gió Lạc bỏ qua bất tử + vùng đèn | Đang bất tử, đứng trong vùng đèn sáng vẫn bị cướp | P10 |
| Bùa Gió | Nhặt → `charm_picked` 600 tick, chạy 7.2 m/s, bùa hồi sau 2700 tick (45 s) | P03 |
| Bùa Gió: lướt không hồi chiêu | Có bùa: lướt lại ngay khi lần trước kết thúc; nhấn giữa lúc lướt bị bỏ qua | P04 |
| Chuỗi 3 Đêm | Menu → giới thiệu (tên đảo + lời Ông Đăng) → chơi → kết quả → Đêm kế; thắng Đêm 3 → Bình Minh + tổng điểm; thua → chơi lại Đêm đó | Chơi tay + ảnh `menu.png`; logic trong `showResult()` |
| Tạm dừng | Esc/P: logic dừng; menu Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu. Headless: `paused`/`resumed`, sim_tick đứng yên | P05 (headless) + chơi tay |
| Cài đặt | Âm lượng + độ nhạy chuột lưu vào `localStorage`, còn sau khi tải lại trang | Chơi tay |
| Âm thanh | Nhạc nền + 11 hiệu ứng (nhặt, thắp, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s, báo gió) | Chơi tay (`src/game/sfx.js`) |
| HUD đầy đủ | Lửa trên trái, đồng hồ mm:ss giữa (đỏ nhấp nháy ≤ 30 s), đèn k/n + điểm phải, thanh 10 ô, ô hồi chiêu Lướt/Tỏa Sáng, nhắc "E — Nạp ánh sáng (x/10)", mũi tên tới đèn chưa sáng gần nhất | Ảnh `night1.png`…`night3.png` |
| Bảng màu chuẩn | Hằng `C` trong `main.js` dùng đúng hex của ticket | Đọc code + ảnh |
| Ánh sáng theo tiến độ | `ambient.intensity = 0.15 + 0.55 × lit/total` | Đọc code (`draw()`) |
| Bản đồ chuẩn | Đèn/thời gian/địa hình đúng từng Đêm | R01, P18–P24 |
| Hiệu năng headless | Một Đêm 21 600 tick (snapshot mỗi tick) < 30 s | `cli.test.mjs` (đo được ~0.6 s/Đêm) |
| ≥ 30 FPS ở 1280×720 | Mở `/?bench` (chạy vòng tròn) hoặc `/?fps`, đọc FPS trung bình | **Chưa đo trên máy thật** (headless Edge dùng thời gian ảo, không đo được FPS) |

## 4. Test cũ bị Ticket-02 làm sai: đã sửa (không xóa test nào)

| Test | Phase 1 | Phase 2 | Lý do |
|---|---|---|---|
| R01 | 2 Bóng Mực có sẵn, L2 = (23.776, 0, 7.725), 24 đom đóm | Không Bóng Mực trước tick 300, L2 = (23.8, 0, 7.7), 20 đom đóm, có `night_start` | Bản đồ + lịch sinh chuẩn |
| R05 | Bán kính 1.2, +10 khi nhặt | Bán kính 1.0, nhặt không có điểm | Số chuẩn; điểm tính khi nạp |
| R07–R09 | Bán kính nạp 2.5, chi phí 5, điểm 100 | Bán kính 2.0, chi phí 10, điểm 10×10 + 100 | Số chuẩn |
| R10–R13 | Tỏa sáng 1 đom đóm / 6 m XZ / choáng 180 / đẩy tức thì / hồi 60 / +20 | 3 đom đóm / 5 m 3D từ chân + 0.8 / choáng 120 / đẩy dần 15 tick / hồi 180 / +5 | Số chuẩn |
| R14 | Bóng Mực đứng yên bám người chơi; đom đóm rơi mất | Bóng Mực recoil 2 m / 60 tick; đom đóm rơi ra vành 1.5–2.5 m, TTL 480 | Luật mới |
| R15–R16 | Vùng an toàn 5 m, Bóng Mực xuất phát 13 m | 6 m; xuất phát 11 m (phải ≤ 12 m mới đuổi) | Số chuẩn + bán kính phát hiện |
| R17 | Điểm 448 | 458 (thêm +10 cho đom đóm nạp) | Điểm chuẩn |
| R20 | 1 Bóng Mực mỗi 30 s | 2 con ở tick 300, rồi mỗi 480 tick; bắt đầu `spawning` | Lịch sinh chuẩn |
| R22 | Mép đảo là tường | Rơi khỏi đảo: −1 lửa, mất hết đom đóm, chờ 60 tick, hồi sinh, bất tử 90 tick | `fall_enabled: true` |
| unit: contract | `contract_version` "1.0" | "1.1" + so với số chuẩn gõ tay từ ticket | Contract v1.1 |
| cli: `--night 2` sai | Lỗi | Hợp lệ; giờ `--night 4` mới lỗi | `--night` nhận 1, 2, 3 |

## 5. Đánh giá Phase 2

- **Đạt (có bằng chứng tự động):** số chuẩn, 3 bản đồ, thứ tự tick, lướt, Bùa Gió, Gió Lạc, đom đóm rơi + TTL, rơi khỏi đảo + hồi sinh, tạm dừng, lịch sinh, vùng an toàn + đẩy ra, gió, trạng thái Bóng Mực v1.1, snapshot/scenario/input/sự kiện v1.1, hiệu năng headless. 73 test, 46 scenario, tất định 3 Đêm, 18 mutation bị bắt.
- **Hồi quy Phase 1:** mọi yêu cầu Phase 1 vẫn có scenario (R01–R22) chạy với số chuẩn; thay đổi kỳ vọng nào cũng ghi ở mục 4.
- **Chỉ kiểm tay / chưa đạt:** FPS ≥ 30 chưa đo trên máy thật; cài đặt lưu giữa các lần mở, âm thanh, chuỗi menu mới chỉ kiểm bằng chơi tay; chưa có test tự động cho UI.
- **Mutation check tìm ra 2 lỗ hổng test** (Bóng Mực `spawning` di chuyển, Bóng Mực đang bị đẩy ra vẫn đuổi) → đã thêm kiểm tra tính tay vào R20, P15.

## 6. Lỗi người dùng báo sau khi chơi thử: "thắp đèn hết rồi vẫn tính là chưa thắp"

- **Triệu chứng:** đèn trông đã sáng nhưng HUD vẫn "Đèn 0/5", không thắng.
- **Điều tra:** logic đúng (nạp 6 → `deposited 6, lit false`; thêm 4 → `lit true`, có scenario R07/R08/R17). Lỗi ở **hiển thị**: đèn nạp dở được vẽ phát sáng theo tỉ lệ (9/10 gần như sáng hẳn, có cả lõi sáng và đèn chiếu). Với số chuẩn mới (chi phí 10 = đúng sức chứa, Tỏa Sáng tốn 3) người chơi hầu như luôn nạp dở, nên lỗi lộ ra ở Phase 2.
- **Sửa:** quy tắc thuần `src/game/lanternLook.js` — chỉ đèn `lit` mới phát sáng/chiếu/hiện vòng an toàn; đèn chưa sáng giữ màu tắt #5B5F6E và có nhãn "L2 · 6/10" kích thước cố định trên màn hình; thông báo khi nạp ghi "còn thiếu N đom đóm".
- **Kiểm chứng:** `tests/ui.test.mjs` (hồi quy: 0, 1, 6, 9/10 không phát sáng), ảnh [lantern-progress.png](../proof/phase-2/screenshots/lantern-progress.png) (L1 đã thắp sáng + vòng, L2 6/10 tối + nhãn).
- **Bài học:** test headless chỉ chứng minh luật đúng; cách hiển thị trạng thái cũng là yêu cầu ("đèn sáng/đèn tắt" có màu chuẩn trong ticket) và cần kiểm tra riêng.
