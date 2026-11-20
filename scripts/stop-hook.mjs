#!/usr/bin/env node
// Claude Code Stop hook: the agent may not finish its turn while tests are red.
// Exit 2 + stderr => Claude Code blocks the stop and shows the failure to the agent.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = spawnSync(process.execPath, ['--test'], { cwd: root, encoding: 'utf8' });
if (r.status !== 0) {
  const fails = (r.stdout || '').split('\n').filter((l) => l.startsWith('✖')).slice(0, 15).join('\n');
  process.stderr.write(`Tests are failing — fix them (or document why a test was changed) before stopping:\n${fails}\n`);
  process.exit(2);
}
process.exit(0);
