# ADR 0001 — Đèn có nhiên liệu và luật thắng ở bình minh

- **Trạng thái:** Chấp nhận (Phase 3, Ticket-03 "Đèn cạn dầu", Contract v1.2)
- **Ngày:** 2026-11-20

## Bối cảnh

Đến Phase 2, đèn là trạng thái một chiều `unlit → lit`. Thắp hết đèn thì thắng ngay (`all_lit`). Playtest: người chơi giỏi thắng sau khoảng 2 phút, cuối Đêm không còn căng thẳng. Ticket-03 thay luật cốt lõi: đèn đã thắp vẫn có thể tắt, và mục tiêu chuyển sang "giữ đảo sáng tới bình minh".

## Quyết định

### 1. Mô hình trạng thái đèn

```
            deposit ≥ cost (10, hoặc 5 nếu ever_lit)
 [unlit] ───────────────────────────────────────────▶ [lit, fuel=100]
    ▲                                                  │  mỗi tick: −1/60 (hao) −5/60 × số Bóng đang drain
    │  fuel ≤ 0 (ngay sau bước 2):                     │  refuel: +10 mỗi đom đóm, tối đa 100
    │  lantern_out, deposited=0, ever_lit=true         ▼
    └──────────────────────────────────────────── [lit, fuel<30]: mất vùng an toàn, nhấp nháy 1 Hz
```

- Dầu lưu bằng **số nguyên đơn vị 1/60** (`fuelT`, đầy = 6000). Hao 1 đơn vị/tick, mỗi Bóng hút thêm 5. Không có sai số dấu phẩy động; chỉ làm tròn 1 chữ số thập phân khi xuất snapshot và sự kiện.
- `ever_lit` bật khi đèn được thắp lần đầu và giữ nguyên mãi. Nó quyết định giá thắp lại (5 hay 10) và điểm thắp (+40 thắp lại, +100 lần đầu).
- Vùng an toàn là thuộc tính suy ra: `zoneActive = lit && fuelT ≥ 30×60`. Mọi chỗ trước đây kiểm `lit` cho vùng an toàn (chặn Bóng, đẩy Bóng ra, điểm sinh Bóng hợp lệ) giờ dùng `zoneActive`. Vì vậy luật "châm dầu lên ≥ 30 thì đẩy Bóng ra" dùng lại đúng cơ chế đẩy của "đèn vừa thắp", không cần code riêng.

### 2. Trạng thái Bóng Mực

Thêm `drain`. Bóng chỉ vào `drain` từ `wander`, khi cách đèn sáng có dầu < 30 không quá 2 m. Ở `drain`: đứng yên, `drainTarget` ghi đèn đang hút, phát `fuel_drain` mỗi 60 tick. Rời `drain`: Mây vào trong 6 m → `chase`; trúng Tỏa Sáng → `stunned`; đèn tắt, dầu ≥ 30 hoặc cách đèn > 2 m → `wander`. Mục tiêu khi `wander`: đèn yếu gần nhất, nếu không có thì đèn tắt gần nhất. Hết `stunned`, `recoil`, `spawning` đều về `wander`, và luật phát hiện 12 m chỉ áp dụng lại từ tick sau.

### 3. Luật thắng

Bỏ thắng sớm. Bước 11 của tick: hết lửa → `lost/no_flames` (luôn xét trước). Nếu hết giờ: số đèn sáng ≥ `ceil(0.6 × tổng)` → `won/dawn_survived`, ngược lại `lost/dawn`. Ngưỡng tính bằng `ceil(round(0.6×n, 6 chữ số))`, vì `0.6×5` trong dấu phẩy động bằng `3.0000000000000004`, `ceil` trực tiếp sẽ ra 4.

### 4. Điểm và sức chứa

Công thức điểm thay toàn bộ (`score.per_*` trong `TUNING`, test so với bản gõ tay từ ticket). Sức chứa `min(20, 10 + 2 × successful_lights)`, đếm cả thắp lại, không đếm đèn đặt sẵn bằng scenario.

## Hệ quả

- **Phá vỡ tương thích:** liệt kê ở [CHANGELOG.md](../../CHANGELOG.md) (mục phase-3).
- **Test cũ:** 10 test có kỳ vọng bị thay, đã sửa và đánh dấu `[T03]` trong `tests/scenarios.mjs`. Danh sách và lý do: [docs/notes/phase-3.md §4](../notes/phase-3.md). Không test nào bị xóa hay skip.
- **Rủi ro:** một số chỗ ticket chưa nói rõ đã ghi thành giả định C1–C12 (phase-3.md §2). Nếu test ẩn hiểu khác, chỉ cần đổi ở một chỗ (`fuelStep`, `interact`, `moveShades`).
- **Phương án đã cân nhắc và bỏ:** lưu dầu bằng số thực (bị trôi sai số theo thời gian, trái với gợi ý của ticket); tạo cơ chế đẩy riêng cho châm dầu (trùng lặp với cơ chế đẩy khi đèn vừa thắp).
