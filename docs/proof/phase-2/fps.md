# Phase 2 — FPS ≥ 30 ở 1280×720 (DoD Ticket-02)

Lệnh: `node scripts/measure-fps.mjs phase-2 30` (tự bật server + Edge, mở `/?bench`: nhân vật chạy liên tục, camera xoay, sim chạy thật; đếm khung hình bằng vòng `requestAnimationFrame` độc lập với bộ đếm của game; đọc trạng thái trang mỗi giây).
Máy: Intel Core i7-10870H, 16 GB RAM, **GPU Intel UHD Graphics (Direct3D11)** — chuỗi renderer WebGL ghi trong file JSON, không phải SwiftShader.

| Lần đo | File | Trung bình | Giây thấp nhất | Hợp lệ? |
|---|---|---|---|---|
| Headless, vsync bật | [fps-headless-vsync.json](fps-headless-vsync.json) | 37.8 | 1 | **Không dùng làm kết luận** (xem dưới) |
| Headless, tắt vsync/giới hạn khung (`FPS_UNCAPPED=1`) | [fps.json](fps.json) | **122.8** | **69** | Có — trang luôn `visible`, 30 s liên tục |

**Kết luận:** đạt (≥ 30 FPS trung bình; giây chậm nhất 69 FPS).

## Quá trình điều tra (giữ lại vì đây là chỗ dễ kết luận sai)

1. Lần đo đầu: 71 FPS trung bình nhưng 6 giây cuối = 0 FPS. Thêm đầu dò `window.__ddl` (chỉ có ở `?bench`) → `visibilityState` chuyển `hidden` ở giây 10: Edge headless đưa trang xuống nền và ngừng vẽ. Con số 71 là **không hợp lệ**. Script giờ đánh `valid: false` nếu trang bị ẩn bất kỳ giây nào.
2. Ép trang luôn hiển thị → ~100 FPS trong 11 s rồi tụt dần về 1 FPS. Số liệu renderer ổn định (≈60 draw call, ≈7k tam giác, 6 shader, ≈200 object) và **thời gian CPU mỗi khung chỉ ≈2 ms** (sim 0.1, chuẩn bị cảnh 0.3, gửi lệnh vẽ 1.5) kể cả lúc 1 FPS → game không chậm đi; khâu trình chiếu khung hình của headless bị dồn nhịp.
3. Tắt vsync + giới hạn khung → 122.8 FPS trung bình, thấp nhất 69 FPS trong 30 s.

## Vấn đề còn lại (ghi cho Phase sau)

- Có vài khung hình khựng riêng lẻ (đo được 0.4–0.9 s thời gian gửi lệnh vẽ ở một khung), nghi do biên dịch shader khi một loại vật thể xuất hiện lần đầu. Chưa ảnh hưởng FPS trung bình nhưng thấy được khi chơi → cần `renderer.compile()` trước khi vào Đêm.
- Chưa đo trong cửa sổ trình duyệt thật (không headless). Cách tự kiểm: mở `http://localhost:8080/?bench`, đợi 30 s, đọc "trung bình" ở góc dưới trái.
