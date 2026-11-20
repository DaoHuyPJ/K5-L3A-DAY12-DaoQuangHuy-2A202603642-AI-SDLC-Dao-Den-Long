# Đối chiếu yêu cầu bài lab → bằng chứng (cập nhật ở mỗi phase)

Nguồn yêu cầu: [RUBRIC](../lab/RUBRIC.md), [SUBMISSION](../lab/SUBMISSION.md), [CHECKPOINTS](../lab/CHECKPOINTS.md), DoD của từng ticket. Trạng thái tại tag `phase-2`.
Ký hiệu: ✅ có bằng chứng · 🟡 làm một phần / chỉ kiểm tay · ⏳ cần người làm bài (không tự làm được) · ❌ chưa đạt.

## A. Test tự động ẩn (30) — chuẩn bị cho chấm headless

| Yêu cầu | TT | Bằng chứng |
|---|---|---|
| `game.contract.json` v1.1, tuning = số chuẩn | ✅ | `tests/unit.test.mjs` (so cả với bản gõ tay từ ticket) |
| Headless đúng CLI, tick model, JSONL, mã thoát 0/1/2 | ✅ | `tests/cli.test.mjs`, [phase-2/results.md](phase-2/results.md) |
| Hồi quy Phase 1 với số chuẩn | ✅ | R01–R22, bảng thay đổi kỳ vọng ở [phase-2.md §4](../notes/phase-2.md) |
| ≥ 1 scenario headless cho mỗi tính năng mới | ✅ | P01–P24 |
| Tất định | ✅ | `cli.test.mjs` (3 Đêm) + sha256 trong results.md |
| Một Đêm ≤ 30 s | ✅ | `cli.test.mjs` (≈0.7 s) |

## B. Kiểm chứng và bằng chứng (20)

| Tiêu chí | TT | Bằng chứng |
|---|---|---|
| Truy vết yêu cầu → bằng chứng, chỗ chưa đạt ghi trung thực | ✅ | [phase-1/README.md](phase-1/README.md), [phase-2/README.md](phase-2/README.md) |
| Bằng chứng thật, khớp tag | ✅ | Sinh bằng `npm run verify -- phase-N`; clone sạch chạy lại ra cùng kết quả ([phase-2/clean-clone.md](phase-2/clean-clone.md)) |
| Test đơn vị + scenario của mình, chạy 1 lệnh, tất định | ✅ | `npm test` (77 test) |
| Tự động hóa kiểm chứng (CI) | 🟡 | `.github/workflows/ci.yml` (ubuntu + macos) — ⏳ chưa thấy kết quả CI trên GitHub vì phase-2 chưa push |
| Agent tự kiểm chứng: chạy game + lưu bằng chứng | ✅ | skill `verify-game`, `scripts/verify.mjs`, `scripts/screenshot.mjs`, `scripts/measure-fps.mjs` |
| Cơ chế ngăn kết thúc khi test đỏ | ✅ | Stop hook — [phase-2/hook-check.md](phase-2/hook-check.md) (exit 2 khi có lỗi cài cố ý) |
| Đánh giá do người/agent khác người viết | ⏳ | Người làm bài chơi thử và đối chiếu bảng truy vết (đã phát hiện lỗi hiển thị đèn — [phase-2.md §6](../notes/phase-2.md)). Có thể chạy thêm `/code-review` do người dùng kích hoạt |
| Test có khả năng bắt lỗi | ✅ | [phase-1/mutation-check.md](phase-1/mutation-check.md), [phase-2/mutation-check.md](phase-2/mutation-check.md) |

## C. Quy trình SDLC và harness (15)

| Tiêu chí | TT | Bằng chứng |
|---|---|---|
| Giả định + tiêu chí nghiệm thu mỗi phase | ✅ | [phase-1.md](../notes/phase-1.md) (A1–A19), [phase-2.md](../notes/phase-2.md) (B1–B21, tiêu chí cho từng mục Phần 3) |
| Xử lý thay đổi yêu cầu (lý do, sửa test kèm lý do) | ✅ | phase-2.md §1, §4 |
| File hướng dẫn agent ngắn, có lệnh, cập nhật qua phase | ✅ | `AGENTS.md` — lịch sử git: `git log --oneline -- AGENTS.md` |
| ≥ 1 thành phần harness hữu ích ngoài file hướng dẫn | ✅ | Stop hook, skill `verify-game`, CI, scripts verify/screenshot/measure-fps |
| Git: commit nhỏ, tag đủ, Release v1.0.0 | 🟡 | Commit nhỏ theo việc; `phase-1` đã push; `phase-2` ⏳ chờ push; Release ở Phase 4 |

## D. Evaluation và retro (10)

| Tiêu chí | TT | Bằng chứng |
|---|---|---|
| Đánh giá từng phase | ✅ | phase-1.md §4, phase-2.md §5–7 |
| Phân tích lỗi của AI + chỉnh harness | ✅ | [ai-log.md](../notes/ai-log.md) (mỗi lỗi → quy tắc mới trong AGENTS.md/skill) |
| Token / chi phí mỗi phase | ✅ | ai-log.md |
| Retro toàn dự án | ⏳ | Phase 4 |

## E–G

| Tiêu chí | TT | Bằng chứng |
|---|---|---|
| E. Hiệu năng: ≥ 30 FPS 1280×720 | ✅ | [phase-2/fps.md](phase-2/fps.md): 122.8 trung bình, thấp nhất 69 (GPU thật). Khựng lẻ tẻ ghi làm việc cần làm |
| E. Headless ≤ 30 s / Đêm | ✅ | cli.test.mjs |
| F. Đúng yêu cầu, chơi được | 🟡 | Scenario + ảnh chụp 3 Đêm; chơi tay bởi người làm bài |
| F. Sáng tạo có mục "Sáng tạo của tôi" + không đổi headless | ✅ | README; phần thêm chỉ ở `src/game/` |
| G. Video demo < 5 phút | ⏳ | Phase 4 |

## SUBMISSION — việc chỉ người làm bài làm được

| Việc | TT |
|---|---|
| MSSV thật trong `game.contract.json` → `team` (đang là `MSSV-dao-quang-huy`) | ⏳ |
| Đổi tên repo theo quy ước `K5-<L3A/L3B>-DAY12-<HoVaTen>-<MSSV>-AI-SDLC-Dao-Den-Long`, để Public | ⏳ |
| Push tag `phase-2` trước mốc 2h, xem CI xanh trên GitHub | ⏳ |
| Không có `.env` / key trong repo | ✅ `git ls-files` không có; `.gitignore` chặn `.env*` |
| `CREDITS.md`, `LICENSE` | ✅ |
