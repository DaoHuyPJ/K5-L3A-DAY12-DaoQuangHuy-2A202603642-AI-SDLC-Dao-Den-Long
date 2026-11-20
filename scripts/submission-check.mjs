#!/usr/bin/env node
// Automates docs/lab/SUBMISSION.md §7 "Checklist trước khi nộp" as far as a script can.
// Usage: node scripts/submission-check.mjs [--online]   (--online also asks the public GitHub API:
//        is the repo public? does Release v1.0.0 exist? — only the repo path from `git remote` is sent)
// Writes docs/proof/submission-check.md. Status: PASS / FAIL / TODO (later phase) / MANUAL (person must check).
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const online = process.argv.includes('--online');
const sh = (cmd) => {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const read = (p) => (exists(p) ? fs.readFileSync(path.join(ROOT, p), 'utf8') : '');
const rows = [];
const add = (group, item, status, detail) => rows.push({ group, item, status, detail });

const remote = sh('git remote get-url origin');
const repoPath = (remote.match(/github\.com[:/](.+?)(\.git)?$/) || [])[1] || '';
const repoName = repoPath.split('/')[1] || '';
const localTags = sh('git tag --list').split('\n').filter(Boolean);
const remoteTags = sh('git ls-remote --tags origin').split('\n').map((l) => l.split('refs/tags/')[1]).filter(Boolean);
const readme = read('README.md');

// ---------- Sản phẩm
const nameOk = /^K5-L3[AB]-DAY12-[A-Za-z]+-[A-Za-z0-9]+-AI-SDLC-Dao-Den-Long$/.test(repoName);
add('Sản phẩm', 'Repo tên đúng quy ước', nameOk ? 'PASS' : 'FAIL', `remote: ${repoName || '(none)'}`);
let isPublic = null;
let release = null;
if (online && repoPath) {
  const api = async (u) => (await fetch(`https://api.github.com/repos/${repoPath}${u}`, { headers: { 'User-Agent': 'submission-check' } })).status;
  isPublic = (await api('')) === 200;
  release = (await api('/releases/tags/v1.0.0')) === 200;
}
add('Sản phẩm', 'Repo Public', isPublic === null ? 'MANUAL' : isPublic ? 'PASS' : 'FAIL', isPublic === null ? 'chạy với --online hoặc mở bằng cửa sổ ẩn danh' : `GitHub API ${isPublic ? '200' : 'không thấy (private/không tồn tại)'}`);
const cmds = (readme.match(/## Cài đặt và chạy[\s\S]*?```bash\n([\s\S]*?)```/) || [])[1] || '';
const nCmds = cmds.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).length;
add('Sản phẩm', 'README: cài + chạy ≤ 3 lệnh', nCmds >= 1 && nCmds <= 3 ? 'PASS' : 'FAIL', `${nCmds} lệnh (${cmds.split('\n').filter(Boolean).map((l) => l.split('#')[0].trim()).join(' ; ')})`);
add('Sản phẩm', 'Clone sạch chạy được', exists('docs/proof/phase-2/clean-clone.md') ? 'PASS' : 'MANUAL', 'docs/proof/phase-*/clean-clone.md');
const tmp = path.join(os.tmpdir(), `subcheck-${Date.now()}.jsonl`);
const hl = spawnSync(process.execPath, ['src/headless.js', '--seed', '1', '--night', '1', '--ticks', '60', '--out', tmp], { cwd: ROOT });
const endLine = hl.status === 0 ? fs.readFileSync(tmp, 'utf8').trim().split('\n').at(-1) : '';
add('Sản phẩm', 'Headless chạy theo contract', hl.status === 0 && endLine.includes('"type":"end"') ? 'PASS' : 'FAIL', `exit ${hl.status}; ${endLine}`);
for (const t of ['phase-1', 'phase-2', 'phase-3', 'phase-4']) {
  const loc = localTags.includes(t), rem = remoteTags.includes(t);
  const later = t === 'phase-3' || t === 'phase-4';
  add('Sản phẩm', `Tag ${t}`, rem ? 'PASS' : loc ? 'FAIL' : later ? 'TODO' : 'FAIL', rem ? 'có trên GitHub' : loc ? 'chỉ có ở máy — cần push' : 'chưa có');
}
add('Sản phẩm', 'Release v1.0.0 có bản chạy được', release === true ? 'PASS' : 'TODO', release === null ? 'Phase 4 (bản web tĩnh: npm run build:web)' : release ? 'có' : 'chưa có');

// ---------- Bằng chứng và ghi chép
const phases = [1, 2, 3, 4].filter((n) => localTags.includes(`phase-${n}`) || exists(`docs/proof/phase-${n}`));
for (const n of phases) {
  add('Bằng chứng', `Phase ${n}: bảng truy vết + kết quả sinh tự động`, exists(`docs/proof/phase-${n}/README.md`) && exists(`docs/proof/phase-${n}/results.md`) ? 'PASS' : 'FAIL', `docs/proof/phase-${n}/`);
  add('Bằng chứng', `Phase ${n}: giả định + tiêu chí nghiệm thu`, exists(`docs/notes/phase-${n}.md`) ? 'PASS' : 'FAIL', `docs/notes/phase-${n}.md`);
}
add('Bằng chứng', 'Bằng chứng khớp mã ở tag (sinh lại giống từng byte)', /0 \/ \d+ file thay đổi/.test(read('docs/proof/phase-2/clean-clone.md')) ? 'PASS' : 'MANUAL', 'clean-clone.md');
add('Bằng chứng', 'Test cũ bị đổi có lý do', /test cũ bị Ticket-02 làm sai/i.test(read('docs/notes/phase-2.md')) ? 'PASS' : 'FAIL', 'docs/notes/phase-2.md §4');
const ai = read('docs/notes/ai-log.md');
add('Bằng chứng', 'Nhật ký dùng AI có token/chi phí', /token/i.test(ai) ? 'PASS' : 'FAIL', 'docs/notes/ai-log.md');
add('Bằng chứng', 'Retro', exists('docs/notes/retro.md') ? 'PASS' : 'TODO', 'Phase 4: docs/notes/retro.md');

// ---------- Harness AI
for (const f of ['AGENTS.md', 'CLAUDE.md', '.claude/settings.json', '.claude/skills/verify-game/SKILL.md', 'scripts/stop-hook.mjs', '.github/workflows/ci.yml']) {
  const n = Number(sh(`git log --oneline -- "${f}" | wc -l`) || 0);
  add('Harness AI', `${f} trong repo + lịch sử git`, exists(f) && n > 0 ? 'PASS' : 'FAIL', `${n} commit`);
}

// ---------- Video, giấy phép, bảo mật
const top = readme.split('\n').slice(0, 6).join('\n');
const videoOk = /\.mp4|releases\/(download|tag)/.test(top);
add('Video/giấy phép/bảo mật', 'Video .mp4 < 5 phút, link ở đầu README', videoOk ? 'PASS' : 'TODO', videoOk ? 'có link' : 'Phase 4 (người làm bài quay màn hình)');
add('Video/giấy phép/bảo mật', 'CREDITS + LICENSE', exists('CREDITS.md') && exists('LICENSE') ? 'PASS' : 'FAIL', 'CREDITS.md, LICENSE');
const secretFiles = sh('git log --all --name-only --format=').split('\n').filter((f) => /(^|\/)\.env($|\.)|\.pem$|\.key$|credentials/i.test(f));
const secretText = sh(`git grep -I -lE "(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,})" $(git rev-list --all)`);
add('Video/giấy phép/bảo mật', 'Không có .env / key trong repo và lịch sử', !secretFiles.length && !secretText ? 'PASS' : 'FAIL', secretFiles.concat(secretText ? [secretText] : []).join(', ') || 'quét toàn bộ lịch sử: không có');
const team = (JSON.parse(read('game.contract.json') || '{}').team || '');
add('Video/giấy phép/bảo mật', 'game.contract.json "team" có MSSV thật', /MSSV/i.test(team) ? 'FAIL' : 'PASS', team);

// ---------- output
const icon = { PASS: '✅ PASS', FAIL: '❌ FAIL', TODO: '⏳ TODO', MANUAL: '👤 MANUAL' };
const count = (s) => rows.filter((r) => r.status === s).length;
const md = `# SUBMISSION checklist — kết quả kiểm tự động

> Sinh bởi \`node scripts/submission-check.mjs${online ? ' --online' : ''}\` lúc ${new Date().toISOString()} ở commit \`${sh('git rev-parse --short HEAD')}\`. Không sửa tay.
> Nguồn: [docs/lab/SUBMISSION.md §7](../lab/SUBMISSION.md). PASS ${count('PASS')} · FAIL ${count('FAIL')} · TODO ${count('TODO')} · MANUAL ${count('MANUAL')}

| Nhóm | Mục | Trạng thái | Chi tiết |
|---|---|---|---|
${rows.map((r) => `| ${r.group} | ${r.item} | ${icon[r.status]} | ${String(r.detail).replace(/\|/g, '\\|')} |`).join('\n')}
`;
fs.writeFileSync(path.join(ROOT, 'docs', 'proof', 'submission-check.md'), md);
console.log(md);
