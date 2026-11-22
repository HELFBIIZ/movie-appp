import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vxnta-visual-'));
assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep));
const baseline = path.join(temporary, 'learning-baseline');
// The requested placement/dashboard/payment UI intentionally changes the old
// refactor baseline. Compare this reviewed feature implementation, rebuilt in
// the same browser, while retaining the original baseline in Git history.
const baselineCommit = '1771883174ed100d409b9822f5338b86939ceee9';
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/TURSO|CLERK|WIRE_|QPAY_|OPENSUBTITLES|TRANSLATE|TMDB|^NETLIFY$/.test(key)) delete env[key];
}
env.HUSKY = '0';
env.VXNTA_BASELINE_DIR = path.join(root, '.refactor-evidence/baseline');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this script through npm run test:visual.');
function run(command, args, cwd = root, variables = env) {
  const result = spawnSync(command, args, { cwd, env: variables, stdio: 'inherit' });
  if (result.status !== 0)
    throw new Error(`${path.basename(command)} ${args[0]} failed (${result.status})`);
}
async function capture(cwd, port, update) {
  const server = spawn(
    process.execPath,
    [path.join(cwd, 'node_modules/next/dist/bin/next'), 'start', '--port', String(port)],
    { cwd, env, stdio: 'inherit' },
  );
  const stopped = new Promise((resolve) => server.once('exit', resolve));
  try {
    const deadline = Date.now() + 90000;
    while (true) {
      if (server.exitCode !== null)
        throw new Error('Visual test server exited before becoming ready');
      try {
        const response = await fetch(`http://127.0.0.1:${port}/login`, {
          signal: AbortSignal.timeout(2000),
        });
        if (response.ok) break;
      } catch {
        /* Only poll the disposable local server. */
      }
      if (Date.now() > deadline) throw new Error('Visual test server readiness timed out');
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const variables = { ...env, SCENECHAIN_BASE_URL: `http://127.0.0.1:${port}` };
    if (!update) variables.VXNTA_AFTER_DIR = path.join(root, '.refactor-evidence/after');
    run(
      process.execPath,
      [
        path.join(root, 'node_modules/@playwright/test/cli.js'),
        'test',
        '--config',
        'playwright.refactor.config.ts',
        ...(update ? ['--update-snapshots'] : []),
      ],
      root,
      variables,
    );
  } finally {
    if (server.exitCode === null) server.kill();
    await stopped;
  }
}
let added = false;
try {
  run('git', ['worktree', 'add', '--detach', baseline, baselineCommit]);
  added = true;
  run(process.execPath, [npmCli, 'ci', '--no-audit', '--no-fund'], baseline);
  run(process.execPath, [npmCli, 'run', 'build'], baseline);
  await capture(baseline, 3101, true);
  await capture(root, 3100, false);
} finally {
  // Delete only our verified temporary worktree; no user checkout/database is touched.
  if (added) run('git', ['worktree', 'remove', '--force', baseline]);
  fs.rmSync(temporary, { recursive: true, force: true });
}
