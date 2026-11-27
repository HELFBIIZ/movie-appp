import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

test('existing store contracts use only a disposable SQLite database, with all network forbidden', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vxnta-store-regression-'));
  assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep));
  const env = { ...process.env };
  for (const key of ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'NETLIFY']) delete env[key];
  try {
    fs.mkdirSync(path.join(temporary, 'data/db'), { recursive: true });
    for (const name of ['schema.sql', 'seeds.sql']) {
      fs.copyFileSync(path.join(root, 'data/db', name), path.join(temporary, 'data/db', name));
    }
    const store = fs.existsSync(path.join(root, 'src/db/index.mjs'))
      ? 'src/db/index.mjs'
      : 'src/lib/db.mjs';
    const result = spawnSync(
      process.execPath,
      [
        '--conditions=react-server',
        path.join(root, 'tests/fixtures/store-check.mjs'),
        pathToFileURL(path.join(root, store)).href,
      ],
      { cwd: temporary, env, encoding: 'utf8', timeout: 60000 },
    );
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.match(result.stdout, /payment-idempotency\/rate-limit passed/);
  } finally {
    // Only the verified directory created above is removed; never the real data/db.
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
