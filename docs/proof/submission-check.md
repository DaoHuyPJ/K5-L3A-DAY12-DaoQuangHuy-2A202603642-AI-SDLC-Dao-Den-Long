# SUBMISSION checklist — kết quả kiểm tự động

> Sinh bởi `node scripts/submission-check.mjs --online` lúc 2026-11-20T15:03:34.911Z ở commit `fe3bccc`. Không sửa tay.
> Nguồn: [docs/lab/SUBMISSION.md §7](../lab/SUBMISSION.md). PASS 36 · FAIL 0 · TODO 0 · MANUAL 0

| Nhóm | Mục | Trạng thái | Chi tiết |
|---|---|---|---|
| Sản phẩm | Repo tên đúng quy ước | ✅ PASS | remote: K5-L3A-DAY12-DaoQuangHuy-2A202603642-AI-SDLC-Dao-Den-Long |
| Sản phẩm | Repo Public | ✅ PASS | GitHub API 200 |
| Sản phẩm | README: cài + chạy ≤ 3 lệnh | ✅ PASS | 2 lệnh (npm install ; npm start) |
| Sản phẩm | Clone sạch chạy được | ✅ PASS | docs/proof/phase-*/clean-clone.md |
| Sản phẩm | Headless chạy theo contract | ✅ PASS | exit 0; {"type":"end","ticks":60,"state":"playing","score":0} |
| Sản phẩm | Tag phase-1 | ✅ PASS | có trên GitHub |
| Sản phẩm | Tag phase-2 | ✅ PASS | có trên GitHub |
| Sản phẩm | Tag phase-3 | ✅ PASS | có trên GitHub |
| Sản phẩm | Tag phase-4 | ✅ PASS | có trên GitHub |
| Sản phẩm | Release v1.0.0 có bản chạy được | ✅ PASS | có |
| Bằng chứng | Phase 1: bảng truy vết + kết quả sinh tự động | ✅ PASS | docs/proof/phase-1/ |
| Bằng chứng | Phase 1: giả định + tiêu chí nghiệm thu | ✅ PASS | docs/notes/phase-1.md |
| Bằng chứng | Phase 2: bảng truy vết + kết quả sinh tự động | ✅ PASS | docs/proof/phase-2/ |
| Bằng chứng | Phase 2: giả định + tiêu chí nghiệm thu | ✅ PASS | docs/notes/phase-2.md |
| Bằng chứng | Phase 3: bảng truy vết + kết quả sinh tự động | ✅ PASS | docs/proof/phase-3/ |
| Bằng chứng | Phase 3: giả định + tiêu chí nghiệm thu | ✅ PASS | docs/notes/phase-3.md |
| Bằng chứng | Phase 4: bảng truy vết + kết quả sinh tự động | ✅ PASS | docs/proof/phase-4/ |
| Bằng chứng | Phase 4: giả định + tiêu chí nghiệm thu | ✅ PASS | docs/notes/phase-4.md |
| Bằng chứng | Bằng chứng khớp mã ở tag (sinh lại giống từng byte) | ✅ PASS | phase-4/clean-clone.md |
| Bằng chứng | Phase 2: test cũ bị đổi có lý do | ✅ PASS | docs/notes/phase-2.md |
| Bằng chứng | Phase 3: test cũ bị đổi có lý do | ✅ PASS | docs/notes/phase-3.md |
| Bằng chứng | Phase 4: test cũ bị đổi có lý do | ✅ PASS | docs/notes/phase-4.md |
| Bằng chứng | ADR cho thay đổi luật (Phase 3 DoD) | ✅ PASS | docs/adr/ |
| Bằng chứng | Changelog breaking changes (Phase 3 DoD) | ✅ PASS | CHANGELOG.md |
| Bằng chứng | Nhật ký dùng AI có token/chi phí | ✅ PASS | docs/notes/ai-log.md |
| Bằng chứng | Retro | ✅ PASS | Phase 4: docs/notes/retro.md |
| Harness AI | AGENTS.md trong repo + lịch sử git | ✅ PASS | 9 commit |
| Harness AI | CLAUDE.md trong repo + lịch sử git | ✅ PASS | 1 commit |
| Harness AI | .claude/settings.json trong repo + lịch sử git | ✅ PASS | 1 commit |
| Harness AI | .claude/skills/verify-game/SKILL.md trong repo + lịch sử git | ✅ PASS | 5 commit |
| Harness AI | scripts/stop-hook.mjs trong repo + lịch sử git | ✅ PASS | 1 commit |
| Harness AI | .github/workflows/ci.yml trong repo + lịch sử git | ✅ PASS | 1 commit |
| Video/giấy phép/bảo mật | Video .mp4 < 5 phút, link ở đầu README | ✅ PASS | có link |
| Video/giấy phép/bảo mật | CREDITS + LICENSE | ✅ PASS | CREDITS.md, LICENSE |
| Video/giấy phép/bảo mật | Không có .env / key trong repo và lịch sử | ✅ PASS | quét toàn bộ lịch sử: không có |
| Video/giấy phép/bảo mật | game.contract.json "team" có MSSV thật | ✅ PASS | 2A202603642-dao-quang-huy |
