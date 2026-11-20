# Đảo Đèn Lồng

> **Video demo:** _(sẽ thêm ở Phase 4, Release `v1.0.0`)_

Game 3D góc nhìn thứ ba (Three.js, chạy trên trình duyệt), 3 Đêm, + chế độ headless theo **Test Contract v1.1**.
Mây, người giữ đèn nhỏ tuổi đội nón lá, gom đom đóm để thắp lại các Đèn Lồng Lớn của ba hòn đảo trước bình minh, né Bóng Mực và Gió Lạc.

Bài lab Day 12 AI SDLC — đề bài gốc ở [docs/lab/](docs/lab/README.md) và lab board.

## Cài đặt và chạy (macOS / Linux / Windows, cần Node.js ≥ 18)

```bash
npm install        # cài three.js (dependency duy nhất)
npm start          # mở http://localhost:8080 trên trình duyệt
```

Chế độ headless (không cửa sổ, không GPU):

```bash
node src/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl [--scenario s.json] [--inputs i.json] [--snapshot-every 10]
```

`--night` nhận 1, 2, 3. Một Đêm đầy đủ (21 600 tick) chạy trong khoảng 0.7 giây.

Kiểm thử và bằng chứng:

```bash
npm test                    # 73 test: unit + 46 scenario headless + contract/CLI + tất định + hiệu năng
npm run verify -- phase-2   # chạy lại scenario, sinh docs/proof/phase-2/results.md
```

## Điều khiển

| Phím | Hành động |
|---|---|
| W A S D | Di chuyển (theo hướng camera) |
| Bấm vào màn hình rồi rê chuột · ← → | Xoay camera (rê lên/xuống: nâng/hạ góc) |
| Lăn chuột | Zoom camera |
| Space | Nhảy |
| Shift | Lướt (14 m/s trong 0.2 s, hồi 1.5 s) |
| E | Nạp đom đóm vào Đèn Lồng gần nhất (trong 2 m) |
| F | Tỏa Sáng: tốn 3 đom đóm, choáng + đẩy lùi Bóng Mực trong 5 m |
| Esc / P | Tạm dừng (Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu) |

Cài đặt (âm lượng, độ nhạy chuột) được lưu trong trình duyệt.

## Luật chơi

Ba Đêm nối tiếp: **Đêm 1 – Đảo Bến** (5 đèn, 300 s), **Đêm 2 – Đảo Cau** (2 đảo nối cầu tre, bục nhảy, 6 đèn, 330 s), **Đêm 3 – Đảo Chuông** (3 tầng, dốc, tháp chuông, gió mạnh, 7 đèn, 360 s). Số liệu theo Ticket-02.

- Đom đóm tự nhặt (≤ 1 m), mang tối đa 10. Mỗi đèn cần 10 đom đóm, nạp nhiều lần được.
- Bóng Mực phát hiện trong 12 m, bỏ đuổi ngoài 18 m. Chạm → mất 1 ngọn lửa, rơi một nửa số đom đóm ra quanh Mây (nhặt lại được trong 8 s).
- Đèn đã sáng tạo vùng an toàn 6 m mà Bóng Mực không vào được.
- Rơi xuống biển mây: mất 1 ngọn lửa và toàn bộ đom đóm, hồi sinh ở điểm xuất phát.
- **Gió Lạc** (Đêm 2, 3) cướp 3 đom đóm khi bạn mang ≥ 5; Tỏa Sáng làm nó bỏ chạy hoặc đánh rơi đồ cướp.
- **Bùa Gió** (đỏ viền vàng): 10 s chạy 7.2 m/s và lướt không cần chờ.
- Thắng Đêm: thắp hết đèn. Thua: hết 3 ngọn lửa hoặc hết giờ (chơi lại Đêm đó). Thắng Đêm 3 → Bình Minh.

## Cách tính điểm

| Sự kiện | Điểm |
|---|---|
| Mỗi đom đóm nạp vào đèn | +10 |
| Thắp sáng 1 đèn | +100 |
| Mỗi Bóng Mực trúng một lần Tỏa Sáng | +5 |
| Khi thắng Đêm: mỗi giây còn lại (làm tròn xuống) | +2 |
| Khi thắng Đêm: mỗi ngọn lửa còn lại | +50 |

Tổng điểm game là tổng điểm các Đêm đã thắng. Dựng scenario không cộng điểm.

## Test Contract v1.1

- [game.contract.json](game.contract.json) khai đúng các số chuẩn trong [src/sim/config.js](src/sim/config.js) (test so với số gõ tay từ ticket).
- `shade_speed` là 4.0 (Đêm 1, 2); Đêm 3 dùng 4.5 theo ticket. Không có trường `null`.
- Giả định cho chỗ chưa rõ: [docs/notes/phase-1.md](docs/notes/phase-1.md) (A1–A19, một số đã được Ticket-02 thay) và [docs/notes/phase-2.md](docs/notes/phase-2.md) (B1–B21).

## Kiến trúc

```
src/sim/config.js  mọi con số + bản đồ 3 Đêm (dữ liệu)
src/sim/world.js   logic tất định, đúng thứ tự 12 bước của ticket — dùng chung cho headless và bản chơi
src/headless.js    CLI theo contract
src/game/          Three.js: cảnh, menu, HUD, âm thanh — chỉ đọc state, không đổi luật
tests/             node:test — scenarios.mjs là bộ tiêu chí nghiệm thu dùng chung với scripts/verify.mjs
docs/notes/        giả định, tiêu chí nghiệm thu, nhật ký AI   ·   docs/proof/  bằng chứng từng phase
```

## Sáng tạo của tôi

Tất cả nằm trong `src/game/` (hiển thị/âm thanh), không chạm `src/sim/`, nên **không đổi đầu ra headless**. Bằng chứng: `npm test` vẫn xanh và headless không import gì từ `src/game/`.

1. **Đom đóm bay quanh nón lá** của Mây — số đốm sáng quay quanh nón đúng bằng số đang mang ([ảnh](docs/proof/phase-2/screenshots/night1.png)).
2. **Âm thanh tự tổng hợp** bằng WebAudio (không file asset): nhạc nền ngũ cung, chuông khi nhặt/thắp đèn, tiếng gió rít lúc báo gió.
3. **Lời Ông Đăng** giới thiệu từng Đêm, kèm mẹo cho đảo đó.
4. **Lá bay** theo hướng gió 2 s trước mỗi cơn gió ở Đêm 3; đom đóm rơi nhấp nháy khi sắp tắt; Bóng Mực phồng dần khi đang `spawning`.

## Bằng chứng và ghi chép

- Truy vết yêu cầu → bằng chứng: [Phase 1](docs/proof/phase-1/README.md) · [Phase 2](docs/proof/phase-2/README.md)
- Giả định + tiêu chí nghiệm thu: [phase-1.md](docs/notes/phase-1.md) · [phase-2.md](docs/notes/phase-2.md)
- Nhật ký dùng AI + token: [docs/notes/ai-log.md](docs/notes/ai-log.md)
- Harness AI: [AGENTS.md](AGENTS.md), [.claude/settings.json](.claude/settings.json) (Stop hook chặn kết thúc khi test đỏ), [.claude/skills/verify-game](.claude/skills/verify-game/SKILL.md), CI [.github/workflows/ci.yml](.github/workflows/ci.yml), [scripts/screenshot.mjs](scripts/screenshot.mjs)
- Bản web cho claude.ai artifact / host tĩnh: `npm run build:web`
