# Phase 4 — Ticket-04 "Bình minh: phát hành v1.0.0" + Test Contract v1.3

## 1. Quyết định thiết kế

| Quyết định | Lý do |
|---|---|
| Scene bench là hàm thuần `src/sim/bench.js` (`benchScenario`, `benchCamera`, `benchStats`), đi qua `parseScenario` như mọi scenario | Cùng seed → cùng scene; kiểm được bằng unit test; công thức thống kê đúng từng chữ ticket |
| Cờ `bench` chỉ bật qua `createGame({bench: true})`, không qua scenario | Đầu ra headless bình thường không đổi (mọi test Phase 1–3 vẫn xanh) |
| `bench_cmd` mở **cửa sổ thật** Chrome/Edge 1280×720 qua DevTools Protocol, tắt vsync (`--disable-gpu-vsync --disable-frame-rate-limit`); trang tự đo `dt` từng khung | Ticket yêu cầu cửa sổ, không toàn màn hình, tắt vsync; đo trong trang tránh độ trễ của công cụ ngoài |
| `peak_mem_mb` = tổng RSS mọi tiến trình của trình duyệt chạy bench (đọc từ hệ điều hành mỗi ~1 s) | Trình duyệt chạy nhiều tiến trình; đây là số trung thực nhất có thể với bản web (không ghi `null`) |
| Bóng Mực + đom đóm vẽ bằng **InstancedMesh**; HUD chỉ ghi DOM khi chữ đổi | Đo trước rồi sửa (skill `performance-optimization`): ~1000 draw call → ~6; `p1_low_fps` 24.8 → 48.1 |
| Soak chạy sim thuần trong Node với `--no-opt --max-semi-space-size=1` | Phân tích ở [soak.md](../proof/phase-4/soak.md): RSS tăng do JIT/semi-space, heap JS phẳng |
| Bảng xếp hạng: logic thuần `src/game/leaderboard.js` dùng chung; server lưu file `data/leaderboard.json`; trình duyệt dùng `localStorage` khi không có server (bản web tĩnh / artifact) | "Lưu trên đĩa cục bộ" + lệnh `--export-leaderboard` đọc được từ Node |
| `run_cmd` đổi từ `npm start` thành `node server.js` | Người chấm nối thêm `--export-leaderboard out.json`; `npm start --flag` sẽ nuốt mất cờ |
| Đổi phím: `src/game/keys.js` (thuần, có test phát hiện trùng phím) | Yêu cầu "phát hiện trùng phím và báo" kiểm được tự động |
| Mọi cỡ chữ UI dùng `rem` với `1rem = 18px × --ui`; chữ lớn đặt `--ui: 1.25` | Một chỗ điều khiển; test đọc CSS và từ chối mọi cỡ chữ < 18 px |

## 2. Giả định cho chỗ ticket chưa nói rõ

| # | Chỗ mơ hồ | Giả định |
|---|---|---|
| D1 | Soak: "Đêm thứ i dùng seed 7 + i" | i đếm từ 0 → Đêm đầu dùng seed 7 (seeds 7…16); đêm i là `(i mod 3) + 1` |
| D2 | Soak: xác suất mỗi tick | Mỗi nút được đặt `true` với xác suất đó **trong tick đó** (tick sau rút lại); hai tick `true` liền nhau chỉ là một lần nhấn (luật cạnh lên của contract) |
| D3 | Soak: `results` | Mỗi phần tử là trạng thái cuối của Đêm (`won` / `lost`; `crash` nếu ném lỗi) |
| D4 | Bench: 200 Bóng Mực "rải đều trên đảo" | Phân bố đều theo diện tích trong đĩa bán kính 38 m (seed 42 qua mulberry32) |
| D5 | Bench: "Bóng Mực vẫn di chuyển theo luật wander" | Không chuyển `chase` dù Mây ở gần (cảnh chuẩn, không có tương tác); đèn L1–L3 dầu 100 không hao nên Bóng đi về đèn tắt L4/L5 theo luật Ticket-03 |
| D6 | Bench: thời điểm `load_ms` | Từ `performance.timeOrigin` của tiến trình `bench_cmd` tới khung hình đầu tiên của scene bench (đồng hồ epoch) |
| D7 | Bench: HUD | Giữ HUD như lúc chơi ("đầy đủ hiệu ứng"); tắt âm thanh và phụ đề trong bench |
| D8 | Bảng xếp hạng: `seed` | Seed của lượt chơi (`runSeed`, tạo khi bấm "Bắt đầu") |
| D9 | Tên tiếng Việt | Chấp nhận chữ Unicode có dấu (chuẩn hóa NFC), số và `_`; độ dài 3–12 ký tự sau NFC |
| D10 | "Giảm chuyển động" | Tắt chớp màn hình khi bị đánh và nhấp nháy đồng hồ; game không có rung camera. Mặc định theo `prefers-reduced-motion` của hệ điều hành |
| D11 | Phụ đề | Hiện chữ cho: Bóng Mực xuất hiện (+ mũi tên mép màn hình 3 s), gió sắp thổi/đang thổi, 10 s cuối, đèn có dầu < 30; bật mặc định |
| D12 | Phím Esc | Luôn tạm dừng (ngoài phím `pause` có thể đổi), vì trình duyệt dùng Esc để nhả khóa chuột |

## 3. Tiêu chí nghiệm thu và bằng chứng

| Yêu cầu | Làm A thì thấy B | Bằng chứng |
|---|---|---|
| §1 Bench | `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json` → cửa sổ 1280×720 mở, tự thoát mã 0, bench.json đủ trường | [bench.json](../proof/phase-4/bench.json): avg 97.5 · p1 48.1 · p95 13.2 ms · load 1034 ms |
| §1 Scene chuẩn | 200 wander, 100 đom đóm, L1–L3 dầu 100, không sự kiện, camera quỹ đạo đúng | `tests/phase4.test.mjs` + [bench-scene.png](../proof/phase-4/screenshots/bench-scene.png) |
| §1 Công thức | avg/p1/p95 đúng định nghĩa | `benchStats` test với số tính tay |
| §2 Soak | 10 Đêm, 0 crash, RSS cuối ≤ 1.2 × đầu | [soak.json](../proof/phase-4/soak.json) (1.10) + [soak.md](../proof/phase-4/soak.md) |
| §3 Bảng xếp hạng | Thua / Bình Minh → nhập tên → lưu; top 10; điểm bằng → ai trước đứng trên; màn từ menu; xuất `{"entries": []}` | `tests/phase4.test.mjs` (logic, API, export, tên tiếng Việt) + [menu.png](../proof/phase-4/screenshots/menu.png) |
| §4 Đổi phím | Mọi hành động, trùng phím báo đỏ + dòng cảnh báo, khôi phục mặc định, lưu | test `findConflicts` + [settings-rebind.png](../proof/phase-4/screenshots/settings-rebind.png) |
| §4 Phụ đề / chỉ báo | Bóng Mực xuất hiện (+ mũi tên), gió, 10 s cuối, dầu < 30 | [cues-low-fuel.png](../proof/phase-4/screenshots/cues-low-fuel.png) + chơi tay |
| §4 Giảm chuyển động | Tắt chớp màn hình / nhấp nháy đồng hồ | code (`settings.calm`) + chơi tay |
| §4 Cỡ chữ ≥ 18 px, chữ lớn ×1.25 | Mọi `font-size` ≥ 1rem (18 px); nhãn đèn ~19 px | test CSS + [hud-18px.png](../proof/phase-4/screenshots/hud-18px.png) |
| §5 Đóng gói | Clone sạch → `npm install` → `npm start` | [clean-clone.md](../proof/phase-4/clean-clone.md) |
| §5 Release | `v1.0.0` có bản web tĩnh zip + hướng dẫn | `npm run package` → `dist/dao-den-long-v1.0.0-web.zip` (người làm bài tải lên GitHub Release) |
| §6 Contract v1.3 | `bench_cmd`, `soak_cmd`, `contract_version: "1.3"` | `tests/phase4.test.mjs`, `tests/unit.test.mjs` |
| §7 Retro + video | 1–2 trang; video < 5 phút | [retro.md](retro.md); kịch bản [docs/demo/script.md](../demo/script.md) (người làm bài quay) |

## 4. Test cũ bị Ticket-04 làm sai

| Test | Trước | Sau | Lý do |
|---|---|---|---|
| unit: contract version | `'1.2'` | `'1.3'` | Contract v1.3 (không luật gameplay nào bị thay ở Phase 4) |

## 5. Đánh giá Phase 4

- **Đạt (tự động / đo được):** bench 3/3 ngưỡng trên máy mình, soak đạt, bảng xếp hạng + export, đổi phím, cỡ chữ, contract v1.3; 114 test xanh; mutation 9/9 (sau khi vá 1 lỗ hổng).
- **Lỗi tìm ra trong phase:** (1) `p1_low_fps` 24.8 < 30 → instancing + HUD; (2) soak 1.30 > 1.2 → phân tích bộ nhớ, cờ runtime; (3) tên tiếng Việt bị từ chối khi gửi qua curl → ghép body POST một lần bằng UTF-8 + test e2e; (4) lệnh bench treo lần đầu → thêm timeout cho mọi lời gọi DevTools.
- **Chỉ kiểm tay / phụ thuộc người làm bài:** cảm giác dùng phụ đề và giảm chuyển động; tạo GitHub Release; quay video; repo Public + đổi tên; MSSV.
