# Phase 4 — bằng chứng (truy vết Ticket-04 → bằng chứng)

Chạy lại ở tag `phase-4`: `npm install && npm test && npm run verify -- phase-4`, rồi `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json` và `npm run soak`.
Giả định + tiêu chí: [phase-4.md](../../notes/phase-4.md) · Retro: [retro.md](../../notes/retro.md) · Checklist nộp bài: [submission-check.md](../submission-check.md).

| Yêu cầu | Kiểm chứng | Kết quả |
|---|---|---|
| §1 Bench: cửa sổ 1280×720, vsync tắt, scene chuẩn, 3 s khởi động, tự thoát 0 | [bench.json](bench.json) (máy: i7-10870H, Intel UHD, Windows 11, Edge) + [bench-scene.png](screenshots/bench-scene.png) | **avg 97.5 ≥ 60 · p1 48.1 ≥ 30 · load 1034 ms ≤ 10000** — đạt (số tham khảo; máy chấm quyết định) |
| §1 Định nghĩa avg / p1_low / p95 | `tests/phase4.test.mjs` (số tính tay, 3 ca) | Đạt |
| §1 Scene: 200 wander, 100 đom đóm, L1–L3 dầu 100, không sinh/sát thương/nhặt/hao dầu/kết thúc; camera quỹ đạo | `tests/phase4.test.mjs` | Đạt |
| §1 Trước tối ưu | Lần đo đầu: p1 24.8 (chưa đạt) → InstancedMesh + HUD ghi có điều kiện → 31.4 → 48.1 | Ghi trong [phase-4.md](../../notes/phase-4.md) |
| §2 Soak: 10 Đêm một tiến trình, input ngẫu nhiên theo seed | [soak.json](soak.json): crashes 0, RSS 38.0 → 41.9 (1.10 ≤ 1.2) | Đạt — phân tích + đối chiếu cờ mặc định (1.30) ở [soak.md](soak.md) |
| §3 Bảng xếp hạng: nhập tên sau Bình Minh/thua, 3–12 ký tự, tiếng Việt, top 10, hòa điểm → ai trước đứng trên, lưu đĩa, màn từ menu, lệnh xuất | `tests/phase4.test.mjs` (logic, API thật + tên có dấu, export) + [menu.png](screenshots/menu.png) | Đạt |
| §4 Đổi phím + báo trùng + khôi phục mặc định + lưu | test `findConflicts`/`loadKeys` + [settings-rebind.png](screenshots/settings-rebind.png) | Đạt |
| §4 Phụ đề / chỉ báo hình ảnh | [cues-low-fuel.png](screenshots/cues-low-fuel.png); Bóng Mực xuất hiện + mũi tên, gió, 10 s cuối: code `drawCues` + chơi tay | Đạt (một phần chỉ kiểm tay) |
| §4 Giảm chuyển động | `settings.calm`: không chớp màn hình, đồng hồ không nhấp nháy | Đạt — kiểm tay |
| §4 Chữ ≥ 18 px, chữ lớn ×1.25 | test đọc CSS (mọi `font-size` ≥ 1rem = 18 px) + [hud-18px.png](screenshots/hud-18px.png) | Đạt |
| §5 Clone sạch → ≤ 3 lệnh → chơi được | [clean-clone.md](clean-clone.md) | Xem file |
| §5 README / CHANGELOG 4 phase / CREDITS / LICENSE | README (yêu cầu hệ thống, ảnh, lệnh test/headless/bench/soak), CHANGELOG có v1.0.0 + phase 1–3 | Đạt |
| §5 GitHub Release v1.0.0 có bản chạy được | `npm run package` → `dist/dao-den-long-v1.0.0-web.zip` (web tĩnh, HTML đầy đủ, đã thử chạy qua `python -m http.server`) | **Chờ người làm bài tạo Release trên GitHub** |
| §6 Contract v1.3 | `tests/phase4.test.mjs`, `tests/unit.test.mjs` | Đạt |
| §7 Retro | [retro.md](../../notes/retro.md) | Đạt |
| §7 Video < 5 phút | Kịch bản [docs/demo/script.md](../../demo/script.md) | **Chờ người làm bài quay** |
| DoD: bench.json + soak.json do mình chạy, commit vào repo | file trong thư mục này | Đạt |
| DoD: test ẩn Phase 1–3 còn hiệu lực vẫn đạt | 64 scenario R/P/Q không đổi, xanh | Đạt |
| Test bắt được lỗi | [mutation-check.md](mutation-check.md): 9/9 (sau khi vá 1 lỗ hổng) | Đạt |
