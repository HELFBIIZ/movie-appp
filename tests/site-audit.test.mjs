import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { createHtmlVideoSession } from '../src/lib/learning/player-adapter/html-video.ts';
import { normalizeToVtt } from '../src/lib/subtitles-format.ts';
import { parseVtt } from '../src/lib/learning/vtt.ts';
import { assignCatalogSlugs } from '../src/lib/catalog/identity.ts';
import { clerkCspSources } from '../src/lib/clerk-csp.mjs';
import { verifiedClerkEmail } from '../src/lib/verified-email.ts';

class Video extends EventTarget {
  isConnected = true;
  readyState = 0;
  duration = Number.NaN;
  currentTime = 0;
  seeking = false;
  paused = true;
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}
test('native learning clock waits for real metadata, follows seeks and stops after disposal', () => {
  const video = new Video(),
    states = [];
  const session = createHtmlVideoSession(video, (state) => states.push(state));
  assert.equal(states.at(-1).time, null);
  assert.equal(session.seek(5), false);
  video.duration = 30;
  video.readyState = 1;
  video.currentTime = 2;
  video.dispatchEvent(new Event('loadedmetadata'));
  assert.equal(states.at(-1).time, 2);
  assert.equal(states.at(-1).contentVerified, false);
  assert.equal(session.seek(8), true);
  assert.equal(states.at(-1).time, 2, 'no invented acknowledgment');
  video.dispatchEvent(new Event('seeked'));
  assert.equal(states.at(-1).time, 8);
  assert.equal(session.seek(31), false);
  assert.equal(session.seek(Number.NaN), false);
  const count = states.length;
  session.dispose();
  video.dispatchEvent(new Event('timeupdate'));
  assert.equal(states.length, count);
});
test('native sentence replay uses the video boundaries and cancellation stops looping', () => {
  const video = new Video();
  video.duration = 30;
  video.readyState = 1;
  const session = createHtmlVideoSession(video, () => {});
  assert.equal(session.replay(3, 6), true);
  video.currentTime = 6;
  video.dispatchEvent(new Event('timeupdate'));
  assert.equal(video.paused, true);
  assert.equal(session.replay(3, 6, true), true);
  video.currentTime = 6;
  video.dispatchEvent(new Event('timeupdate'));
  assert.equal(video.currentTime, 3);
  session.cancelReplay();
  video.currentTime = 6;
  video.dispatchEvent(new Event('timeupdate'));
  assert.equal(video.currentTime, 6);
  assert.equal(session.replay(7, 6), false);
  session.dispose();
});
test('converted legacy SRT becomes strict native VTT with every cue intact', () => {
  const srt =
    '1\n00:00:01,000 --> 00:00:03,000\nНэгдүгээр мөр\n\n2\n00:00:06,250 --> 00:00:08,750\nХоёрдугаар мөр\n';
  const parsed = parseVtt(normalizeToVtt(srt));
  assert.deepEqual(
    parsed.map((cue) => [cue.start, cue.end, cue.text]),
    [
      [1, 3, 'Нэгдүгээр мөр'],
      [6.25, 8.75, 'Хоёрдугаар мөр'],
    ],
  );
});
test('same-name movie and TV records retain distinct routes without deleting either identity', () => {
  const input = [
    { slug: 'same', year: 1955, tmdbId: 1 },
    { slug: 'same', year: 2014, tmdbId: 2 },
    { slug: 'same', year: 2014, tmdbId: 3 },
  ];
  const result = assignCatalogSlugs(input);
  assert.deepEqual(
    result.map((movie) => movie.slug),
    ['same', 'same-2014', 'same-2014-2'],
  );
  assert.deepEqual(
    result.map((movie) => movie.tmdbId),
    [1, 2, 3],
  );
  assert.equal(input[1].slug, 'same');
});
test('catalog aliases refer to existing files and never assert verified movie or translation identity', () => {
  const aliases = JSON.parse(fs.readFileSync('data/subtitles/aliases.json', 'utf8'));
  const manifest = JSON.parse(fs.readFileSync('data/subtitles/manifest.json', 'utf8'));
  for (const original of Object.values(aliases))
    assert.ok(fs.existsSync('data/subtitles/' + manifest[original].file));
});

test('optional OAuth CSP allows only its configured public hostname and documented protection hosts', () => {
  const key = 'pk_test_' + Buffer.from('example.clerk.accounts.dev$').toString('base64');
  assert.match(clerkCspSources(key, true), /https:\/\/example\.clerk\.accounts\.dev/);
  assert.match(clerkCspSources(key, true), /challenges\.cloudflare\.com/);
  assert.equal(clerkCspSources(key, false), '');
  const invalid = 'pk_test_' + Buffer.from('example.com; script-src *$').toString('base64');
  assert.equal(clerkCspSources(invalid, true), '');
  assert.equal(clerkCspSources('invalid', true), '');
});

test('an unverified OAuth address cannot link an existing privileged native account', () => {
  const primary = { emailAddress: 'admin@example.test', verification: { status: 'unverified' } };
  assert.equal(verifiedClerkEmail({ primaryEmailAddress: primary }), null);
  assert.equal(
    verifiedClerkEmail({
      primaryEmailAddress: primary,
      emailAddresses: [
        { emailAddress: 'learner@example.test', verification: { status: 'verified' } },
      ],
    }),
    'learner@example.test',
  );
  assert.equal(
    verifiedClerkEmail({
      primaryEmailAddress: { ...primary, verification: { status: 'verified' } },
    }),
    'admin@example.test',
  );
});

test('Render without a persistent connection cannot silently create a replacement user/payment database', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vxnta-storage-guard-'));
  const script = path.join(temporary, 'verify.mjs');
  const moduleUrl = pathToFileURL(path.resolve('src/db/index.mjs')).href;
  fs.writeFileSync(
    script,
    `import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nconst db = await import(${JSON.stringify(moduleUrl)});\nawait assert.rejects(db.getDb(), /PERSISTENT_DATABASE_REQUIRED/);\nassert.equal(fs.existsSync('data/db/app.db'), false);\n`,
  );
  const environment = { ...process.env, RENDER: 'true' };
  delete environment.TURSO_DATABASE_URL;
  delete environment.TURSO_AUTH_TOKEN;
  try {
    execFileSync(process.execPath, ['--conditions=react-server', script], {
      cwd: temporary,
      env: environment,
      stdio: 'pipe',
    });
  } finally {
    assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(temporary, { recursive: true });
  }
});
