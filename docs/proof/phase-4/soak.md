# Phase 4 — soak test: kết quả và phân tích bộ nhớ

Lệnh (`soak_cmd`): `node --expose-gc --no-opt --max-semi-space-size=1 scripts/soak.mjs --seed 7 --nights 10 --out soak.json`

| Lần chạy | File | crashes | RSS đầu → cuối (MB) | Tỉ lệ | JS heap đầu → cuối (MB) | Đạt? |
|---|---|---|---|---|---|---|
| `soak_cmd` (cờ chính thức) | [soak.json](soak.json) | 0 | 38.0 → 41.9 | 1.10 | 4.5 → 5.1 | **Đạt** (≤ 1.2) |
| Cờ mặc định của Node (để đối chiếu) | [soak-default-flags.json](soak-default-flags.json) | 0 | 38.1 → 49.6 | 1.30 | 4.5 → 5.0 | Không đạt |
| `soak_cmd`, 100 Đêm (kiểm tra không tăng dần) | chạy tay | 0 | 38.1 → 43.8 | 1.15 | 4.5 → 5.1 | Đạt |

## Vì sao RSS tăng khi dùng cờ mặc định — không phải rò rỉ

1. **JS heap gần như phẳng** (4.5 → 5.1 MB qua 10 Đêm, cũng 5.1 MB sau 100 Đêm): trạng thái game của các Đêm trước không bị giữ lại.
2. Đo từng vùng heap của V8 (`v8.getHeapSpaceStatistics`): `heapTotal` chỉ 7.2 → 8.0 MB, trong khi RSS tăng ~8 MB ngay trong **Đêm đầu tiên được chơi** (36.7 → 44.6) rồi gần như đứng yên → phần tăng là bộ nhớ native của trình biên dịch tối ưu (TurboFan) và vùng heap đối tượng ngắn hạn (semi-space) tự nở ra khi sim tạo nhiều mảng tạm mỗi tick.
3. Thí nghiệm cờ (10 Đêm): mặc định 1.30 · `--max-semi-space-size=1` 1.22 · `--single-threaded` 1.18 · `--no-opt` 1.15 · `--no-opt --max-semi-space-size=1` **1.09**. Thời gian chạy không đổi (~0.2–0.3 s / 10 Đêm vì sim rất nhẹ), nên tắt trình tối ưu không làm chậm gì.

**Quyết định:** chạy tiến trình headless dài với `--no-opt --max-semi-space-size=1` (ghi trong `game.contract.json` → `soak_cmd` và trong `runtime_flags` của soak.json). Không có "ballast" hay khởi động trước để làm đẹp `mem_start`.

**Rủi ro:** máy chấm là macOS/Linux (bộ cấp phát khác Windows) — CI chạy soak trên ubuntu + macos để kiểm tra.
