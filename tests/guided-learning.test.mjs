import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recallCorrect, recallContext, recallQueue } from '../src/lib/learning/recall.ts';
import { emptySnapshot } from '../src/lib/learning/snapshot.ts';
import { learningMetrics } from '../src/lib/learning/metrics.ts';
import { createCineSession } from '../src/lib/learning/player-adapter/cinesrc.ts';
import { createClient } from '@libsql/client';
import {
  reserveTranslation,
  findTranslation,
  getTranslation,
  saveTranslation,
  translatedContent,
} from '../src/db/translation-jobs.mjs';
import { createSubtitleTranslationClient } from '../src/lib/opensubtitles-ai.mjs';
import { buildSrt, parseCues } from '../src/lib/subtitles-format.ts';

test('translation upload serializes VTT cue clocks as SRT instead of sending VTT as an SRT file', () => {
  assert.equal(
    buildSrt(parseCues('WEBVTT\n\n00:01.000 --> 00:04.069\nHello!\n')),
    '1\n00:00:01,000 --> 00:00:04,069\nHello!\n',
  );
});

test('recall hides exact words and contractions, accepts spelling variants but rejects a different answer', () => {
  assert.equal(
    recallContext({ word: 'train', example: 'Train, train! Training starts.' }),
    '_____, _____! Training starts.',
  );
  assert.equal(
    recallContext({ word: "don't", example: "I don't know. Don't go." }),
    'I _____ know. _____ go.',
  );
  assert.equal(recallContext({ word: 'C++', example: 'Try C++.' }), 'Try _____.');
  assert.ok(recallCorrect({ word: "don't" }, '  DON’T  '));
  assert.equal(recallCorrect({ word: 'train' }, 'training'), false);
  assert.equal(recallCorrect({ word: 'train' }, ''), false);
});
test('short recall session prioritizes overdue words, excludes sentences and never mutates the library', () => {
  const items = [
    { id: 'future', kind: 'word', meaning: 'x', dueAt: 100, savedAt: 1 },
    { id: 'due', kind: 'word', meaning: 'x', dueAt: 1, savedAt: 2 },
    { id: 'sentence', kind: 'sentence', meaning: 'x', dueAt: 0 },
    { id: 'empty', kind: 'word', meaning: ' ', dueAt: 0 },
  ];
  assert.deepEqual(
    recallQueue(items, 50, 1).map((item) => item.id),
    ['due'],
  );
  assert.equal(items[0].id, 'future');
});
test('daily practice uses the Mongolian calendar, a real activity streak and no empty-page credit', () => {
  const snapshot = emptySnapshot();
  const now = Date.parse('2026-11-23T16:30:00Z'); // 00:30 in Mongolia, next calendar day.
  snapshot.activity = [
    { id: 'today', kind: 'review', at: now, correct: true, movieId: 'sample' },
    { id: 'yesterday', kind: 'listen', at: now - 3600_000, seconds: 15, movieId: 'sample' },
    { id: 'empty', kind: 'listen', at: now - 86400_000 * 2, seconds: 0, movieId: 'sample' },
  ];
  const stats = learningMetrics(snapshot, now);
  assert.equal(stats.streak, 2);
  assert.equal(stats.todayReviews, 1);
  assert.equal(stats.todaySeconds, 0);
  assert.equal(stats.days.at(-1).key, '2026-11-24');
  assert.equal(learningMetrics(emptySnapshot(), now).streak, 0);
});
test('movie sentence replay waits for the bound seek acknowledgement, stops at the end, and cancels loops on reset', () => {
  const commands = [];
  const peer = { postMessage: (message) => commands.push(message.command) };
  const frame = {
    src: 'https://cinesrc.st/embed/movie/27205',
    contentWindow: peer,
    isConnected: true,
  };
  const player = createCineSession(frame, 27205, () => {});
  const event = (type, time) => ({
    origin: 'https://cinesrc.st',
    source: peer,
    data: { type, currentTime: time, duration: 100 },
  });
  assert.equal(player.replay(1, 4), false);
  player.receive(event('cinesrc:timeupdate', 20));
  assert.ok(player.replay(1, 4));
  assert.deepEqual(commands, ['seek']);
  player.receive({ ...event('cinesrc:seeked', 1), source: {} });
  assert.deepEqual(commands, ['seek']);
  player.receive(event('cinesrc:seeked', 1));
  player.receive(event('cinesrc:timeupdate', 4.1));
  assert.deepEqual(commands, ['seek', 'play', 'pause']);
  player.replay(5, 8, true);
  player.receive(event('cinesrc:seeked', 5));
  player.receive(event('cinesrc:timeupdate', 8));
  assert.equal(commands.at(-1), 'seek');
  player.reset();
  player.receive(event('cinesrc:seeked', 5));
  assert.equal(commands.at(-1), 'seek');
  player.dispose();
});

const session = async () => ({
  baseUrl: 'https://vip-api.opensubtitles.com/api/v1',
  headers: { 'Api-Key': 'test-only', Authorization: 'Bearer test-only' },
});
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
test('translation preflight rejects empty credits before any paid submission and selects a supported engine', async () => {
  let credits = 0;
  const client = createSubtitleTranslationClient(session, async (url) => {
    if (url.endsWith('/ai/credits')) return json({ data: { credits } });
    assert.ok(url.endsWith('/ai/info/translation'));
    return json({
      data: [
        { name: 'unsupported', price: 0.001, languages_supported: [{ language_code: 'en' }] },
        {
          name: 'supported',
          price: 0.01,
          languages_supported: [{ language_code: 'en' }, { language_code: 'mn' }],
        },
      ],
    });
  });
  await assert.rejects(client.prepare('Hello'), /Автомат орчуулга түр боломжгүй/);
  credits = 100;
  assert.deepEqual(await client.prepare('Hello'), { engine: 'supported' });
});
test('translation uses a multipart upload, POST status and authenticated allowlisted file download', async () => {
  const calls = [];
  const client = createSubtitleTranslationClient(session, async (url, options) => {
    calls.push(url);
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    assert.equal(options.redirect, 'error');
    if (url.endsWith('/ai/translate')) {
      assert.equal(options.method, 'POST');
      assert.ok(options.body instanceof FormData);
      assert.equal(options.body.get('translate_to'), 'mn');
      assert.equal(await options.body.get('file').text(), 'source subtitle');
      assert.equal(options.headers['Content-Type'], undefined);
      return json({ status: 'CREATED', correlation_id: 'ref_123' });
    }
    if (url.includes('/ai/translation/')) {
      assert.equal(options.method, 'POST');
      return json({
        status: 'COMPLETED',
        data: {
          quality: { valid: true },
          url: 'https://vip-api.opensubtitles.com/api/v1/ai/files/123/result.srt',
        },
      });
    }
    return new Response('translated subtitle');
  });
  assert.equal(await client.start('source subtitle', 'supported'), 'ref_123');
  assert.deepEqual(await client.poll('ref_123'), {
    status: 'completed',
    content: 'translated subtitle',
  });
  assert.equal(calls.length, 3);
});
test('invalid quality and external download URLs never expose translation auth headers', async () => {
  for (const data of [
    { quality: { valid: false }, url: 'https://evil.test/file' },
    { quality: { valid: true }, url: 'https://evil.test/file' },
  ]) {
    let count = 0;
    const client = createSubtitleTranslationClient(session, async () => {
      count++;
      return json({ status: 'COMPLETED', data });
    });
    if (data.quality.valid) await assert.rejects(client.poll('123'), /хаяг буруу/);
    else assert.deepEqual(await client.poll('123'), { status: 'failed' });
    assert.equal(count, 1);
  }
});
test('durable translation reservation survives a restart, separates users and reserves one paid submission', async () => {
  const db = createClient({ url: 'file::memory:' });
  try {
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        reserveTranslation(db, 'alice', 'same-content', { status: 'starting' }),
      ),
    );
    assert.equal(results.filter((result) => result.created).length, 1);
    const job = results[0].job;
    assert.equal(await getTranslation(db, job.id, 'bob'), null);
    job.status = 'completed';
    job.vtt = 'WEBVTT\n';
    await saveTranslation(db, 'alice', job);
    await saveTranslation(db, 'alice', { ...job, status: 'failed', vtt: '' });
    assert.equal((await findTranslation(db, 'alice', 'same-content')).status, 'completed');
    assert.equal(await translatedContent(db, job.id), 'WEBVTT\n');
    assert.ok(
      (await reserveTranslation(db, 'bob', 'same-content', { status: 'starting' })).created,
    );
  } finally {
    db.close();
  }
});
