# SUBMISSION checklist — kết quả kiểm tự động

> Sinh bởi `node scripts/submission-check.mjs --online` lúc 2026-11-20T09:18:51.582Z ở commit `4011f0f`. Không sửa tay.
> Nguồn: [docs/lab/SUBMISSION.md §7](../lab/SUBMISSION.md). PASS 25 · FAIL 3 · TODO 5 · MANUAL 0

| Nhóm | Mục | Trạng thái | Chi tiết |
|---|---|---|---|
| Sản phẩm | Repo tên đúng quy ước | ❌ FAIL | remote: K5-L3-LAB-Day12-AI-SDLC |
| Sản phẩm | Repo Public | ❌ FAIL | GitHub API không thấy (private/không tồn tại) |
| Sản phẩm | README: cài + chạy ≤ 3 lệnh | ✅ PASS | 2 lệnh (npm install ; npm start) |
| Sản phẩm | Clone sạch chạy được | ✅ PASS | docs/proof/phase-*/clean-clone.md |
| Sản phẩm | Headless chạy theo contract | ✅ PASS | exit 0; {"type":"end","ticks":60,"state":"playing","score":0} |
| Sản phẩm | Tag phase-1 | ✅ PASS | có trên GitHub |
| Sản phẩm | Tag phase-2 | ✅ PASS | có trên GitHub |
| Sản phẩm | Tag phase-3 | ⏳ TODO | chưa có |
| Sản phẩm | Tag phase-4 | ⏳ TODO | chưa có |
| Sản phẩm | Release v1.0.0 có bản chạy được | ⏳ TODO | chưa có |
| Bằng chứng | Phase 1: bảng truy vết + kết quả sinh tự động | ✅ PASS | docs/proof/phase-1/ |
| Bằng chứng | Phase 1: giả định + tiêu chí nghiệm thu | ✅ PASS | docs/notes/phase-1.md |
| Bằng chứng | Phase 2: bảng truy vết + kết quả sinh tự động | ✅ PASS | docs/proof/phase-2/ |
| Bằng chứng | Phase 2: giả định + tiêu chí nghiệm thu | ✅ PASS | docs/notes/phase-2.md |
| Bằng chứng | Phase 3: bảng truy vết + kết quả sinh tự động | ✅ PASS | docs/proof/phase-3/ |
| Bằng chứng | Phase 3: giả định + tiêu chí nghiệm thu | ✅ PASS | docs/notes/phase-3.md |
| Bằng chứng | Bằng chứng khớp mã ở tag (sinh lại giống từng byte) | ✅ PASS | phase-3/clean-clone.md |
| Bằng chứng | Phase 2: test cũ bị đổi có lý do | ✅ PASS | docs/notes/phase-2.md |
| Bằng chứng | Phase 3: test cũ bị đổi có lý do | ✅ PASS | docs/notes/phase-3.md |
| Bằng chứng | ADR cho thay đổi luật (Phase 3 DoD) | ✅ PASS | docs/adr/ |
| Bằng chứng | Changelog breaking changes (Phase 3 DoD) | ✅ PASS | CHANGELOG.md |
| Bằng chứng | Nhật ký dùng AI có token/chi phí | ✅ PASS | docs/notes/ai-log.md |
| Bằng chứng | Retro | ⏳ TODO | Phase 4: docs/notes/retro.md |
| Harness AI | AGENTS.md trong repo + lịch sử git | ✅ PASS | 7 commit |
| Harness AI | CLAUDE.md trong repo + lịch sử git | ✅ PASS | 1 commit |
| Harness AI | .claude/settings.json trong repo + lịch sử git | ✅ PASS | 1 commit |
| Harness AI | .claude/skills/verify-game/SKILL.md trong repo + lịch sử git | ✅ PASS | 5 commit |
| Harness AI | scripts/stop-hook.mjs trong repo + lịch sử git | ✅ PASS | 1 commit |
| Harness AI | .github/workflows/ci.yml trong repo + lịch sử git | ✅ PASS | 1 commit |
| Video/giấy phép/bảo mật | Video .mp4 < 5 phút, link ở đầu README | ⏳ TODO | Phase 4 (người làm bài quay màn hình) |
| Video/giấy phép/bảo mật | CREDITS + LICENSE | ✅ PASS | CREDITS.md, LICENSE |
| Video/giấy phép/bảo mật | Không có .env / key trong repo và lịch sử | ✅ PASS | quét toàn bộ lịch sử: không có |
| Video/giấy phép/bảo mật | game.contract.json "team" có MSSV thật | ❌ FAIL | MSSV-dao-quang-huy |
