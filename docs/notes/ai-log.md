# Nhật ký dùng AI

Công cụ: **Claude Code** (model Claude Opus 5.5) trong VS Code. Harness: `AGENTS.md` (+ `CLAUDE.md` trỏ tới), Stop hook `scripts/stop-hook.mjs`, skill `.claude/skills/verify-game`, CI GitHub Actions.

## Phase 1 (2026-11-20)

**Lời nhắc chính:** "đọc bài lab và cả trong link này làm theo từng phase" (link lab board).

**Cách làm:**
1. Agent đọc các file lab (README, GUIDE, RUBRIC, …) và trang lab board (chỉ Phase 1 đã phát hành: PRD-0 + Test Contract v1.0).
2. Chốt kiến trúc trước khi code: logic thuần dùng chung, headless Node, Three.js chỉ để hiển thị.
3. Viết sim + CLI → chạy thử ngay → viết 22 scenario với **giá trị kỳ vọng tính tay từ tuning** (không chép từ output) → test.
4. Bản web → chụp ảnh bằng Edge headless (swiftshader) và **xem ảnh** trước khi ghi vào bằng chứng.
5. Mutation check để chắc test không "luôn đạt".

**AI sai / suýt sai ở đâu và cách phát hiện:**
- Test đạt 42/42 ngay lần đầu → đáng ngờ (có thể test yếu). Phát hiện bằng mutation check: 6/6 lỗi cài cố ý đều làm test đỏ → test thật sự kiểm tra hành vi.
- Lệnh `node -e` đầu tiên để sinh `game.contract.json` lỗi (trộn `require` với top-level `await`); agent chạy lại bằng ES module. Không ảnh hưởng sản phẩm.
- Hướng phím trái/phải trên bản web: theo công thức contract, nhìn theo +Z thì bên phải màn hình là −X; agent đã đảo dấu phím A/D ở UI (giả định A19) thay vì sửa công thức sim.
- Cảnh ban đầu quá tối (thấy qua ảnh chụp) → tăng ánh sáng nền.

**Harness đã thêm và vì sao:**
- `AGENTS.md`: lệnh build/test/headless, quy tắc "sim thuần, số liệu chỉ ở config.js, không chép kỳ vọng từ output".
- Stop hook: agent không được kết thúc lượt khi `npm test` đỏ (rubric B: "cơ chế ngăn kết thúc khi test đỏ").
- Skill `verify-game`: quy trình sinh bằng chứng + chụp ảnh, chỉ nạp khi cần.
- CI (ubuntu + macos): kiểm chứng trên macOS/Linux không phụ thuộc máy Windows của tôi.

**Token / chi phí (ước tính):** ~1 phiên agent, khoảng 150–200k token vào (phần lớn là đọc tài liệu lab + trang lab board ~180 KB HTML, chỉ trích phần văn bản ~10 KB) và ~45k token ra (code + tài liệu). Cách tiết kiệm: trích văn bản từ HTML thay vì đọc nguyên trang; không dùng subagent; viết scenario dạng dữ liệu dùng chung cho test và script bằng chứng; chạy test bằng CLI thật thay vì nhờ agent "đọc code để đoán".

**Người review:** phần đánh giá cuối do người làm bài (tôi) chơi thử và đối chiếu bảng truy vết — không phải agent tự chấm.
