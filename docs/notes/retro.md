# Retro — Đảo Đèn Lồng (Day 12 AI SDLC, 4 phase)

## Số liệu

| | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| Yêu cầu | PRD-0 + contract v1.0 | Số chuẩn, 3 Đêm, 5 tính năng, v1.1 | Change request: dầu đèn, thắng ở bình minh, v1.2 | Bench, soak, bảng xếp hạng, dễ tiếp cận, phát hành, v1.3 |
| Test (cuối phase) | 42 | 77 | 99 | 114 |
| Scenario headless | 22 | 46 | 64 | 64 (+ bench scene) |
| Mutation bị bắt | 6/6 | 18/18 (2 lỗ hổng vá) | 16/16 | 9/9 (1 lỗ hổng vá) |
| Test cũ phải sửa (có lý do) | — | 13 | 10 | 1 (số phiên bản contract) |
| Lỗi do người dùng/ảnh chụp phát hiện | — | Đèn nạp dở trông như đã sáng; menu chồng nhau | Chế độ mù màu khó tìm, khó thấy | — |
| Token ước tính (vào / ra) | ~200k / 45k | ~400k / 105k | ~200k / 55k | ~300k / 80k |

Tổng ước tính ≈ 1.1M token vào, 285k token ra (một agent Claude Code, không subagent).

## Điều hiệu quả khi làm với AI

1. **Scenario dạng dữ liệu, kỳ vọng tính tay từ ticket**, chạy qua CLI headless thật — cùng một nguồn cho test và cho bằng chứng (`npm run verify`).
2. **Mutation check sau mỗi phase** — cách duy nhất bắt được test "đạt nhưng không kiểm gì": 3 lỗ hổng thật (Phase 2: 2, Phase 4: 1).
3. **Đọc ảnh chụp trước khi kết luận về UI** — bắt được menu chồng nhau, cảnh đen, đèn tắt ngay do hook chụp ảnh dùng mô hình cũ.
4. **Chờ đủ ticket rồi mới code** (Phase 3 gửi theo từng phần) và tóm tắt cách hiểu sau mỗi phần — không phải làm lại.
5. **Một nguồn số liệu** (`config.js`) + test so với bản gõ tay từ ticket → không "tune" lệch chuẩn.

## Điều không hiệu quả / AI sai

| Lỗi | Phát hiện bằng | Chỉnh harness |
|---|---|---|
| Test xanh ngay lần đầu nhưng thiếu kiểm tra | Mutation check | Quy tắc "mỗi luật mới phải có mutation" trong AGENTS.md + skill |
| Đèn nạp dở phát sáng (đúng luật, sai ý nghĩa hiển thị) | Người dùng chơi thử | `lanternLook.js` thuần + `tests/ui.test.mjs`; quy tắc "hình ảnh không được gợi ý trạng thái sim không có" |
| Đo FPS sai 2 lần (trang bị ẩn; vsync dồn nhịp) | Đọc từng giây thay vì trung bình | Quy tắc "không lấy trung bình qua đoạn đứng hình chưa giải thích"; `measure-fps.mjs` đánh `valid: false` |
| Bằng chứng tự viết "giống từng byte" khi 118 file khác | Đọc kỹ con số | `.gitattributes eol=lf`; quy tắc "kết luận phải tính từ kết quả kiểm" |
| Helper chụp ảnh tạo trạng thái cũ (đèn sáng không dầu) | Ảnh chụp | Quy tắc helper debug phải theo mô hình mới |
| Chế độ mù màu có mà không ai thấy | Người dùng | Kiểm tính năng tiếp cận ở góc nhìn người chơi (ảnh so sánh cùng góc) |
| Script bash nuốt dấu nháy / đường dẫn | Lỗi lệnh | Patch bằng file Python có `assert` từng chỗ thay |

## Harness nào giúp nhiều nhất

- **AGENTS.md** (cập nhật 8+ lần qua git): mỗi lỗi lặp lại → một dòng quy tắc ngắn.
- **Stop hook** chặn kết thúc khi test đỏ ([hook-check.md](../proof/phase-2/hook-check.md)).
- **Skill `verify-game`** + scripts `verify`, `screenshot`, `measure-fps`, `bench`, `soak`, `submission-check` — biến "tôi nghĩ là đúng" thành lệnh chạy lại được.
- **`submission-check.mjs`**: checklist SUBMISSION tự động, phát hiện repo đang private.
- Skill bên ngoài (`performance-optimization`) đúng lúc ở Phase 4: "đo draw call trước" dẫn thẳng tới instancing.

## Tiết kiệm token

Trích văn bản thay vì đọc nguyên HTML; patch nhỏ có assert thay vì đọc/ghi lại file lớn; không dùng subagent; scenario dùng chung cho test + bằng chứng; chỉ xem ảnh khi cần kết luận về UI; dừng và hỏi khi ticket chưa đủ.

## Nếu làm lại

1. Viết `submission-check` và mutation script ngay Phase 1 (không phải Phase 2–3).
2. Instancing và ghi DOM có điều kiện từ đầu — rẻ hơn tối ưu muộn.
3. Chơi thử tay sớm hơn mỗi phase: 2/3 lỗi UI do người dùng phát hiện, không phải test.
4. Đặt repo Public + tên đúng quy ước ngay Checkpoint 0.
