# Kịch bản video demo (< 5 phút) — người làm bài quay

Quay bằng Xbox Game Bar (Win+Alt+R) hoặc OBS, cửa sổ 1280×720. Xuất `.mp4`, đính kèm Release `v1.0.0`
(hoặc `docs/demo/demo.mp4` nếu < 100 MB), rồi thay dòng "Video demo" ở đầu README bằng link.

| Thời gian | Nội dung | Lệnh / thao tác |
|---|---|---|
| 0:00–0:20 | Giới thiệu: repo, tag `phase-1…4`, README | Mở GitHub repo |
| 0:20–1:40 | **Chơi thật** Đêm 1: nhặt đom đóm, thắp đèn, châm dầu, Tỏa Sáng đuổi Bóng Mực đang hút dầu, phụ đề hiện | `npm start` → Bắt đầu |
| 1:40–2:00 | Cài đặt: đổi phím (trùng phím báo đỏ), mù màu, chữ lớn, giảm chuyển động | Menu → Cài đặt |
| 2:00–2:20 | Thua / Bình Minh → nhập tên → Bảng xếp hạng; xuất file | `node server.js --export-leaderboard out.json` |
| 2:20–3:00 | **Test + headless**: 114 test xanh; một Đêm headless | `npm test` · `node src/headless.js --seed 1 --night 2 --ticks 600 --out out.jsonl` |
| 3:00–3:50 | **Bench** (cửa sổ 1280×720 tự mở, tự đóng) + **soak** | `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json` · `node --expose-gc --no-opt --max-semi-space-size=1 scripts/soak.mjs --seed 7 --nights 10 --out soak.json` |
| 3:50–4:30 | Bằng chứng + harness: `docs/proof/*`, mutation check, AGENTS.md, Stop hook, skills, `git log --oneline` | Mở file trong VS Code |
| 4:30–4:50 | Checklist nộp bài | `node scripts/submission-check.mjs --online` |
