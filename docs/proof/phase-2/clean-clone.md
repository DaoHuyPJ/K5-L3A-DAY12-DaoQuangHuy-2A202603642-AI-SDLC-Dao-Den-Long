# Phase 2 — clone sạch (như người chấm: SUBMISSION §6)

Clone repo sang thư mục mới ở commit `afda190`, làm đúng 3 lệnh trong README, chạy lại headless và so với bằng chứng đã commit. 2026-11-20T08:51Z, Node v24.18.0.

```
$ npm install
exit 0
$ npm test
ℹ tests 77
ℹ pass 77
ℹ fail 0
$ npm run verify -- phase-2
exit 0
$ (bảng kết quả scenario: so với docs/proof/phase-2/results.md đã commit, bỏ dòng thời gian)
46/46 dòng scenario GIỐNG HỆT bản đã commit
$ node src/headless.js --seed 7 --night 3 --ticks 21600 --snapshot-every 600 --out n3.jsonl
exit 0
{"type":"end","ticks":11732,"state":"lost","score":0}
```

Sau khi verify sinh lại toàn bộ `docs/proof/phase-2/scenarios/*` trong bản clone: `git status` báo **118 / 118** file thay đổi → scenario.json, inputs.json và out.jsonl sinh lại **giống từng byte** bản đã commit (bằng chứng khớp mã ở tag).
