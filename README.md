# Đảo Đèn Lồng

> **Video demo:** _(sẽ thêm ở Phase 4, Release `v1.0.0`)_

Game 3D góc nhìn thứ ba (Three.js, chạy trên trình duyệt) + chế độ headless theo **Test Contract v1.0**.
Mây, người giữ đèn nhỏ tuổi đội nón lá, gom đom đóm để thắp lại 5 Đèn Lồng Lớn của Đảo Bến trước bình minh, né Bóng Mực trong sương đen.

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

Kiểm thử và bằng chứng:

```bash
npm test                    # 42 test: unit + 22 scenario headless + contract/CLI + tất định
npm run verify -- phase-1   # chạy lại scenario, sinh docs/proof/phase-1/results.md
```

## Điều khiển

| Phím | Hành động |
|---|---|
| W A S D | Di chuyển (theo hướng camera) |
| Bấm vào màn hình rồi rê chuột (Esc nhả) · kéo chuột · ← → | Xoay camera (rê lên/xuống: nâng/hạ góc) |
| Lăn chuột | Zoom camera |
| Space | Nhảy |
| E | Nạp đom đóm vào Đèn Lồng gần nhất (trong 2.5 m) |
| F | Tỏa sáng: tốn 1 đom đóm, choáng + đẩy lùi Bóng Mực trong 6 m |
| R | Chơi lại (bất cứ lúc nào, kể cả sau khi thắng/thua) |

## Luật chơi (Đêm 1 – Đảo Bến)

- Đảo tròn bán kính 40 m, mép đảo là tường (không rơi). 5 Đèn Lồng Lớn trên vòng tròn 25 m.
- Đom đóm tự nhặt khi đi qua (≤ 1.2 m), mang tối đa 10. Mỗi đèn cần 5 đom đóm để sáng.
- Bóng Mực đuổi theo (3.5 m/s, chậm hơn Mây 6 m/s). Chạm (≤ 1 m) → mất 1 ngọn lửa, rơi mất một nửa số đom đóm đang mang (làm tròn xuống), bất tử 1.5 s.
- Bóng Mực **không vào được vòng 5 m quanh đèn đã thắp**. Mỗi 30 s có thêm một Bóng Mực (tối đa 6).
- Thắng: thắp cả 5 đèn. Thua: hết 3 ngọn lửa, hoặc hết 300 s (bình minh).

## Cách tính điểm

| Sự kiện | Điểm |
|---|---|
| Nhặt 1 đom đóm | +10 |
| Thắp sáng 1 đèn | +100 |
| Mỗi Bóng Mực bị choáng bởi một lần tỏa sáng | +20 |
| Khi thắng: mỗi giây còn lại (làm tròn xuống) | +2 |
| Khi thắng: mỗi ngọn lửa còn lại | +50 |

Thua thì không có điểm thưởng cuối. Dựng scenario không cộng điểm.

## Test Contract

- [game.contract.json](game.contract.json) khai đúng các số trong [src/sim/config.js](src/sim/config.js) (test `unit.test.mjs` bắt buộc hai bên khớp nhau).
- `fall_enabled: false`: mép đảo là tường nên không có sự kiện `player_hit` với `by: "fall"`.
- Mọi khái niệm trong `tuning` đều có trong game, không có trường `null`.
- Giả định cho những chỗ contract/PRD chưa nói rõ: [docs/notes/phase-1.md](docs/notes/phase-1.md).

## Kiến trúc

```
src/sim/      logic thuần, tất định (config, kiểm tra input, world.step) — dùng chung cho cả hai chế độ
src/headless.js  CLI theo contract
src/game/     hiển thị Three.js + âm thanh, chỉ đọc state, không đổi luật
tests/        node:test — scenarios.mjs là bộ tiêu chí nghiệm thu dùng chung với scripts/verify.mjs
docs/notes/   giả định, tiêu chí nghiệm thu, nhật ký AI   ·   docs/proof/  bằng chứng từng phase
```

## Sáng tạo của tôi

Tất cả nằm trong `src/game/` (chỉ hiển thị/âm thanh), không chạm `src/sim/`, nên **không đổi đầu ra headless**. Bằng chứng: `npm test` vẫn 42/42 và headless không import gì từ `src/game/` ([results.md](docs/proof/phase-1/results.md)).

1. **Đom đóm bay quanh nón lá** của Mây — số đốm sáng quay quanh nón đúng bằng số đang mang, đèn của Mây sáng mạnh dần theo số đó ([ảnh](docs/proof/phase-1/screenshots/gameplay.png)).
2. **Âm thanh tự tổng hợp** bằng WebAudio (không file asset): tiếng chuông khi nhặt, khi đèn sáng, khi thắng/thua.
3. **Bầu trời ửng hồng dần** trong 40% cuối đêm báo bình minh sắp đến; đảo sáng dần và sương mỏng đi khi thắp đèn; vòng sáng hiện quanh đèn đã thắp cho biết vùng an toàn.

## Bằng chứng và ghi chép

- Bảng truy vết yêu cầu → bằng chứng: [docs/proof/phase-1/README.md](docs/proof/phase-1/README.md)
- Giả định + tiêu chí nghiệm thu Phase 1: [docs/notes/phase-1.md](docs/notes/phase-1.md)
- Nhật ký dùng AI + token: [docs/notes/ai-log.md](docs/notes/ai-log.md)
- Harness AI: [AGENTS.md](AGENTS.md), [.claude/settings.json](.claude/settings.json) (Stop hook chặn kết thúc khi test đỏ), [.claude/skills/verify-game](.claude/skills/verify-game/SKILL.md), CI [.github/workflows/ci.yml](.github/workflows/ci.yml)
