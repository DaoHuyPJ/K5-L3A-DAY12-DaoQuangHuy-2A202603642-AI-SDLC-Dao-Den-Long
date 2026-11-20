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

## Phase 2 (2026-11-20) — Ticket-02 "Ba hòn đảo"

**Lời nhắc chính:** dán nguyên văn Ticket-02 + "phase 2". Lab board (bản agent đọc được) vẫn chỉ có Phase 1, nên bản dán là nguồn yêu cầu.

**Cách làm:** đọc ticket → liệt kê chỗ mơ hồ (B1–B21) → viết lại `config.js` (số chuẩn + bản đồ dạng dữ liệu) và `world.js` theo đúng 12 bước của ticket → chạy 3 Đêm đầy đủ đo thời gian → viết 24 scenario mới + sửa 13 kỳ vọng cũ (có bảng lý do) → mutation check → UI → ảnh chụp → tài liệu.

**AI sai / suýt sai và cách phát hiện:**
- 46/46 scenario đạt ngay lần đầu → nghi test yếu. Mutation check: **2/13 lỗi cài cố ý không bị bắt** (Bóng Mực `spawning` vẫn đi, Bóng Mực đang bị đẩy khỏi vùng đèn vẫn đuổi). Đã thêm kiểm tra tính tay (vị trí đứng yên 60 tick; công thức đẩy d + (6.001−d)/30). Bài học ghi vào AGENTS.md + skill: mỗi luật mới phải có mutation.
- Ảnh chụp đầu tiên của UI mới: mọi menu chồng lên nhau + cảnh đen. Nguyên nhân: `.screen { display:flex }` đè thuộc tính `hidden`. Sửa bằng `[hidden]{display:none!important}` và thêm quy tắc vào AGENTS.md. Không có test tự động nào bắt được lỗi này — chỉ nhìn ảnh mới thấy.
- Script chụp ảnh bằng bash ghi sai tên file (`screenshots$1.png`) do cách bash xử lý `\$1` → chuyển sang `scripts/screenshot.mjs` (Node), dùng profile Edge tạm riêng (Edge đang mở của người dùng làm lệnh chụp không ghi file).
- Một mutation (dốc ở Đêm 3) áp vào nhầm file nên kết quả "fail 0" là giả; chạy lại đúng file thì bị bắt. Đã ghi rõ trong mutation-check.md thay vì xóa dòng.

- **Người dùng chơi thử phát hiện:** đèn nạp dở trông như đã sáng nhưng HUD báo 0/5. AI đã vẽ đèn sáng theo tỉ lệ tiến độ — không vi phạm test nào nhưng sai ý nghĩa "đèn sáng / đèn tắt". Sửa + test hồi quy `tests/ui.test.mjs` (xem phase-2.md §6). Lab board tab Phase 2 nạp nội dung từ database của trang (tổ chức khác) nên agent không đọc được; dùng bản ticket người dùng dán.

**Harness thay đổi:** AGENTS.md (v1.1, thứ tự 12 bước, quy tắc mutation, quy tắc `hidden`, lệnh screenshot/build:web), skill `verify-game` (bước mutation, FPS phải đo máy thật), `scripts/screenshot.mjs`.

**Token / chi phí (ước tính):** ~250–300k token vào, ~70k token ra (ticket dài + viết lại sim/UI). Tiết kiệm: không đọc lại file lớn sau khi sửa; patch nhỏ bằng script thay vì viết lại file; scenario dạng dữ liệu dùng chung cho test + bằng chứng; chỉ xem ảnh chụp khi cần xác nhận UI.

### Phase 2 — vòng kiểm tra theo yêu cầu lab (người dùng nhắc: "bám sát rule + yêu cầu bài lab, đưa bằng chứng")

- Lập `docs/proof/compliance.md`: đối chiếu từng mục RUBRIC/SUBMISSION/DoD → bằng chứng / chưa đạt / cần người làm bài.
- **Đo FPS (DoD) — AI suýt kết luận sai hai lần:** lần 1 trung bình 71 FPS nhưng 6 giây cuối 0 FPS (trang bị headless ẩn đi); lần 2 trang hiển thị nhưng tụt về 1 FPS trong khi CPU mỗi khung chỉ ≈2 ms (khâu trình chiếu của headless dồn nhịp). Chỉ chấp nhận lần 3 (tắt vsync): 122.8 trung bình, thấp nhất 69 FPS, GPU thật. Quy tắc mới trong AGENTS.md: không lấy trung bình qua những đoạn đứng hình chưa giải thích.
- **Chứng minh Stop hook:** chạy hook với lỗi cài cố ý → exit 2 + danh sách test đỏ; khôi phục → exit 0 (`docs/proof/phase-2/hook-check.md`).
- **Clone sạch — AI viết kết luận sai:** script tự in "giống từng byte" trong khi `git status` báo 118/118 file thay đổi (đã commit nhầm ở ebe5102). Kiểm lại: chỉ khác ký tự xuống dòng (LF/CRLF trên Windows). Sửa gốc bằng `.gitattributes eol=lf`, chạy lại clone mới: 0/118 khác, ghi đính chính trong `clean-clone.md`. Bài học: câu kết luận trong bằng chứng phải được tính từ kết quả kiểm, không viết sẵn.
- Token ước tính thêm cho vòng này: ~80k vào, ~20k ra.

## Phase 3 (2026-11-20) — Ticket-03 "Đèn cạn dầu" (Change Request)

**Lời nhắc chính:** người dùng gửi ticket theo từng phần (ảnh chụp + văn bản). Agent tóm tắt cách hiểu sau mỗi phần, liệt kê chỗ mơ hồ, **chỉ bắt đầu code khi đủ ticket** (luật cốt lõi bị thay, làm theo từng mẩu dễ sai).

**Cách làm:** liệt kê luật [THAY THẾ] → mô hình trạng thái đèn trong ADR 0001 → sửa sim (dầu số nguyên 1/60, `zoneActive`, `drain`, thắng ở bình minh, sức chứa, điểm) → chạy test để thấy đúng 10 test cũ đỏ → sửa từng test có lý do (`[T03]`) + 19 scenario mới tính tay → mutation 16/16 → UI (thanh dầu, nhấp nháy 1 Hz, mù màu) → ảnh chụp → tài liệu.

**AI sai / suýt sai:**
- Patch script đầu tiên bị bash hiểu sai dấu nháy (heredoc dài) → chuyển sang file Python riêng có `assert` cho từng chỗ thay; không có thay đổi nửa vời.
- Python trên Windows ghi file với CRLF → nhờ `.gitattributes eol=lf` (thêm ở Phase 2) nên repo vẫn LF; các patch sau ghi `newline='
'`.
- Ảnh chụp đầu tiên: mọi đèn đặt sẵn đều tắt ngay, nhãn "0/5" — hook `?autostart&lit=` bật `lit` mà không nạp dầu (theo mô hình cũ). Luật đúng; công cụ sai. Sửa + thêm quy tắc vào AGENTS.md: helper debug phải tạo trạng thái hợp lệ theo mô hình mới.
- Phát hiện cạm bẫy số thực: `Math.ceil(0.6 * 5)` = 4 vì `0.6*5 = 3.0000000000000004` → làm tròn 6 chữ số trước khi `ceil` (ghi trong ADR, có Q12/Q14/Q16 kiểm ngưỡng).

**Harness thay đổi:** AGENTS.md (v1.2, dầu 1/60, `zoneActive`, quy tắc ADR + CHANGELOG khi đổi luật, quy tắc helper debug), `submission-check.mjs` (kiểm ADR, changelog, test bị thay mỗi phase).

**Token / chi phí (ước tính):** ~200k token vào, ~55k ra. Tiết kiệm: chờ đủ ticket rồi mới code (không phải làm lại), patch bằng file có assert thay vì đọc/ghi lại file lớn, scenario dạng dữ liệu.

### Harness — thêm skill bên ngoài (sau tag phase-3)

Người dùng đề xuất repo `gamedev-skills/awesome-gamedev-agent-skills` (Apache-2.0). Agent clone vào thư mục tạm, **không chạy gì**, đọc và quét nội dung (chỉ Markdown, không script, không lệnh mạng/xóa, không câu chèn lệnh). Chỉ chọn 5/~80 skill hợp với Three.js + vấn đề đang mở (hiệu năng, UI/khả năng tiếp cận, juice), chép nguyên văn kèm LICENSE + NOTICE vào `.claude/skills/`, ghi CREDITS và quy tắc trong AGENTS.md: skill bên ngoài nhắm three r187, repo dùng 0.160 → luật dự án và ticket thắng. Lý do không cài cả bộ: mỗi skill thêm mô tả vào ngữ cảnh mọi lần chạy (tốn token), rubric chấm harness "nhỏ, hữu ích".

- **Người dùng báo "chưa có chế độ mù màu":** tính năng có nhưng giấu trong Cài đặt và hiệu ứng quá nhỏ (agent chỉ kiểm bằng unit test + một ảnh chụp từ xa). Sửa: nút ở menu, huy hiệu HUD, vết rách chữ X, biểu tượng ✖/☀ trên nhãn; kiểm bằng ảnh so sánh cùng góc (phase-3.md §6).

## Phase 4 (2026-11-20) — Ticket-04 "Bình minh: phát hành v1.0.0"

**Cách làm:** ưu tiên phần chấm tự động (bench → soak → export bảng xếp hạng → contract v1.3), rồi checklist (dễ tiếp cận, tài liệu), cuối cùng đóng gói. Mỗi số đo đều chạy thật và lưu file.

**AI sai / suýt sai:**
- Bench lần đầu `p1_low_fps` 24.8 < 30 — không "làm tròn" con số mà đo nguyên nhân theo skill `performance-optimization`: ~1000 draw call → InstancedMesh (31.4), rồi HUD ghi DOM mỗi khung → chỉ ghi khi đổi (48.1).
- Soak 1.30 > 1.2: thay vì kết luận "rò rỉ" hay "đạt", đo heap JS (phẳng) và từng vùng V8 → phần tăng là JIT/semi-space native. Chọn cờ runtime, lưu cả lần chạy cờ mặc định làm bằng chứng (`soak-default-flags.json`, `soak.md`).
- Hai kỳ vọng test do AI tự tính sai (p95 = 40 trong khi chú thích tính ra 10; ngưỡng "> 15" khai báo font không đếm thật) → sửa test, không sửa code.
- Mutation `p1_low` dùng "khung chậm thứ k" không bị bắt (dữ liệu test có các khung chậm bằng nhau) → thêm ca khác nhau.
- Tên "Mây" bị từ chối khi gửi qua curl Windows → nghi bảng mã; vẫn sửa server ghép body một lần UTF-8 và thêm test e2e bằng `fetch`.
- Lệnh bench treo lần đầu (Edge chạy lần đầu với profile mới) → mọi lời gọi DevTools có timeout 5 s.
- Gói Release: `build-web` bỏ `<!doctype>` (cho artifact) → bản zip dùng HTML đầy đủ; nén zip trên Windows bằng `Compress-Archive` (máy không có `zip`).

**Harness:** AGENTS.md (v1.3, lệnh bench/soak/package, quy tắc InstancedMesh + `setText`, cờ bench không đổi headless); script mới `bench.mjs`, `soak.mjs`, `package-release.mjs`.

**Token (ước tính):** ~300k vào, ~80k ra.
