# Phase 2 — clone sạch (như người chấm: SUBMISSION §6)

Clone repo sang thư mục mới ở commit `e5d5b1c` (Windows, Node v24.18.0, 2026-11-20), làm đúng các lệnh trong README rồi so bằng chứng sinh lại với bản đã commit.

```
$ npm install                    -> exit 0
$ npm test                       -> ℹ tests 77 · ℹ pass 77 · ℹ fail 0
$ npm run verify -- phase-2      -> exit 0
$ git status --porcelain -- docs/proof/phase-2/scenarios   -> 0 / 118 file thay đổi
$ git diff --quiet -- docs/proof/phase-2/scenarios          -> không khác nội dung
$ git status --porcelain
 M docs/proof/phase-2/results.md       (chỉ dòng "Generated … on <thời gian>")
 M docs/proof/phase-2/test-report.txt  (chỉ thời lượng "(…ms)"; 0 dòng khác ngoài thời lượng)
```

**Kết luận:** toàn bộ `scenario.json`, `inputs.json`, `out.jsonl` của 46 scenario sinh lại **giống từng byte** bản đã commit → bằng chứng khớp mã ở tag.

## Đính chính lần kiểm tra trước (commit ebe5102)

Lần đầu (trước khi có `.gitattributes`) `git status` liệt kê 118/118 file scenario là "thay đổi", nhưng câu kết luận tự động trong file này lại ghi "giống từng byte" — **câu đó sai cách kiểm**. Điều tra: `git diff` không có dòng nội dung nào khác; nguyên nhân là git trên Windows đổi LF→CRLF khi checkout, còn script sinh file bằng LF. Đã sửa tận gốc bằng `.gitattributes` (`* text=auto eol=lf`) và chạy lại từ một clone mới — kết quả ở trên.
