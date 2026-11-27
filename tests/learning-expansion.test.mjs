import assert from 'node:assert/strict';
import { test } from 'node:test';
import crypto from 'node:crypto';
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import {
  verifyWireSignature,
  webhookIntent,
  wirePaymentMatches,
  hostedCheckoutUrl,
  createPaymentIntent,
  createCheckoutSession,
  retrievePaymentIntent,
} from '../src/lib/wire.mjs';
import { fulfillPayment, checkoutRequest } from '../src/db/payment-fulfillment.mjs';
import { assessPlacement, placementQuestions } from '../src/lib/learning/placement.ts';
import { emptySnapshot, listenedSeconds, snapshotSchema } from '../src/lib/learning/snapshot.ts';
import { learningMetrics } from '../src/lib/learning/metrics.ts';
import { captionMatches, usableMongolian } from '../src/lib/learning/captions.ts';
import { safeReturnTo } from '../src/lib/safe-return.ts';
import { playerCaptionUrl } from '../src/lib/watch/captions.ts';
import { dictionaryMeaning } from '../src/lib/learning/dictionary.ts';
import { mergeLearningSnapshots } from '../src/lib/learning/merge.ts';
import { checkoutKey } from '../src/lib/checkout-key.ts';
import { internalMongolianSource } from '../src/lib/learning/movie.ts';
import {
  readCineMessage,
  createCineSession,
  CINESRC_ORIGIN,
} from '../src/lib/learning/player-adapter/cinesrc.ts';

test('Wire verifies fresh raw-body HMAC, rejects stale/future/tampered/ambiguous timestamps', () => {
  const now = 1795400000000,
    body = '{"type":"payment_intent.succeeded"}';
  const sign = (timestamp, value = body) =>
    `t=${timestamp},v1=${crypto.createHmac('sha256', 'fixture-secret').update(`${timestamp}.${value}`).digest('hex')}`;
  const timestamp = now / 1000;
  assert.equal(verifyWireSignature(body, sign(timestamp), 'fixture-secret', now), true);
  for (const header of [
    sign(timestamp - 300),
    sign(timestamp + 301),
    sign(timestamp, body + ' '),
    sign(timestamp) + `,t=${timestamp}`,
    't=NaN,v1=00',
  ])
    assert.equal(verifyWireSignature(body, header, 'fixture-secret', now), false);
});
test('Wire official direct data envelope and legacy nested object are both parsed without trusting object string', () => {
  const intent = { id: 'pi_fixture', object: 'payment_intent', status: 'succeeded' };
  assert.deepEqual(webhookIntent({ data: intent }), intent);
  assert.deepEqual(webhookIntent({ data: { object: intent } }), intent);
  assert.equal(webhookIntent({ data: { object: 'payment_intent' } }), null);
});
test('only matching provider, intent, MNT amount, reference and succeeded receipt can grant VIP', () => {
  const payment = {
    provider: 'wire',
    providerRef: 'pi_fixture',
    amountMnt: 5900,
    currency: 'MNT',
    txnId: 'tx_fixture',
  };
  const intent = {
    id: 'pi_fixture',
    amount: 5900,
    currency: 'MNT',
    status: 'succeeded',
    metadata: { reference: 'tx_fixture' },
  };
  assert.equal(wirePaymentMatches(payment, intent), true);
  for (const change of [
    { id: 'pi_other' },
    { amount: 1 },
    { amount: '5900' },
    { currency: 'USD' },
    { status: 'processing' },
    { metadata: { reference: 'tx_other' } },
  ])
    assert.equal(wirePaymentMatches(payment, { ...intent, ...change }), false);
  assert.equal(wirePaymentMatches({ ...payment, provider: 'bank' }, intent), false);
  assert.equal(
    hostedCheckoutUrl('https://pay.wire.mn/c/cs_fixture'),
    'https://pay.wire.mn/c/cs_fixture',
  );
  for (const value of [
    'javascript:alert(1)',
    'https://pay.wire.mn.evil.test/c/cs_x',
    'https://user@pay.wire.mn/c/cs_x',
  ])
    assert.equal(hostedCheckoutUrl(value), null);
});
test('Wire client uses official paths, stable idempotency keys and never confirms hosted intent', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.WIRE_SECRET_KEY;
  const originalBase = process.env.WIRE_API_BASE;
  process.env.WIRE_SECRET_KEY = 'fixture-not-a-real-key';
  process.env.WIRE_API_BASE = 'https://api.wire.mn';
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json({ id: 'pi_fixture' });
  };
  try {
    await createPaymentIntent({
      amountMnt: 5900,
      reference: 'tx_fixture',
      idempotencyKey: 'fixture-create',
    });
    await createCheckoutSession({
      paymentIntentId: 'pi_fixture',
      successUrl: 'https://example.test/pricing',
      cancelUrl: 'https://example.test/pricing',
      idempotencyKey: 'fixture-checkout',
    });
    await retrievePaymentIntent('pi_fixture');
    assert.deepEqual(
      calls.map((call) => call.url),
      [
        'https://api.wire.mn/v1/payment_intents',
        'https://api.wire.mn/v1/checkout/sessions',
        'https://api.wire.mn/v1/payment_intents/pi_fixture',
      ],
    );
    assert.equal(calls[0].options.headers['Idempotency-Key'], 'fixture-create');
    assert.equal(JSON.parse(calls[0].options.body).amount, 5900);
    assert.equal(JSON.parse(calls[1].options.body).payment_intent, 'pi_fixture');
    assert.equal(calls[2].options.method, 'GET');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.WIRE_SECRET_KEY;
    else process.env.WIRE_SECRET_KEY = originalKey;
    if (originalBase === undefined) delete process.env.WIRE_API_BASE;
    else process.env.WIRE_API_BASE = originalBase;
  }
});
test('concurrent payment callbacks grant once, separate payments stack, retries reuse owned checkout row', async () => {
  const client = createClient({ url: ':memory:' });
  try {
    await client.executeMultiple(
      fs.readFileSync(new URL('../data/db/schema.sql', import.meta.url), 'utf8'),
    );
    await client.executeMultiple(
      fs.readFileSync(new URL('../data/db/seeds.sql', import.meta.url), 'utf8'),
    );
    await client
      .execute(
        "INSERT INTO users (id,email,username,password_hash,role_id) VALUES ('fixture-user','fixture@example.test','fixture-user','not-a-password','role_user')",
      )
      .catch(async () => {
        const role = (await client.execute('SELECT id FROM roles LIMIT 1')).rows[0].id;
        await client.execute({
          sql: 'INSERT INTO users (id,email,username,password_hash,role_id) VALUES (?,?,?,?,?)',
          args: ['fixture-user', 'fixture@example.test', 'fixture-user', 'not-a-password', role],
        });
      });
    const plan = (
      await client.execute("SELECT id,price_mnt FROM subscription_plans WHERE code='MONTHLY'")
    ).rows[0];
    const args = {
      userId: 'fixture-user',
      requestKey: 'fixture-request-key',
      planId: plan.id,
      amountMnt: plan.price_mnt,
      provider: 'wire',
      returnTo: '/learn',
    };
    const [first, retry] = await Promise.all([
      checkoutRequest(client, args),
      checkoutRequest(client, args),
    ]);
    assert.equal(first.txnId, retry.txnId);
    assert.equal((await client.execute('SELECT COUNT(*) AS n FROM payments')).rows[0].n, 1);
    const results = await Promise.all([
      fulfillPayment(client, first.txnId),
      fulfillPayment(client, first.txnId),
    ]);
    assert.equal(results.filter((value) => value.activated).length, 1);
    assert.equal((await client.execute('SELECT COUNT(*) AS n FROM subscriptions')).rows[0].n, 1);
    const other = await checkoutRequest(client, { ...args, requestKey: 'fixture-request-other' });
    await fulfillPayment(client, other.txnId);
    const span = (
      await client.execute(
        "SELECT MAX(julianday(expires_at)) - julianday('now') AS days FROM subscriptions",
      )
    ).rows[0].days;
    assert.ok(span > 59.9 && span <= 60.1);
    assert.equal(
      (await checkoutRequest(client, { ...args, provider: 'bank' })).error.code,
      'IDEMPOTENCY_CONFLICT',
    );
  } finally {
    client.close();
  }
});
test('placement validates complete answers, skips and rejects invented results', () => {
  const correct = Object.fromEntries(
    placementQuestions.map((question) => [question.id, question.answer]),
  );
  const skipped = Object.fromEntries(placementQuestions.map((question) => [question.id, null]));
  assert.equal(assessPlacement(correct, 1).band, 'intermediate');
  assert.equal(assessPlacement(skipped, 1).band, 'beginner');
  assert.throws(() => assessPlacement({}, 1));
  assert.throws(() => assessPlacement({ ...correct, greeting: 'invented' }, 1));
  assert.equal(
    snapshotSchema.safeParse({ ...emptySnapshot(), assessments: [{ answers: {}, completedAt: 1 }] })
      .success,
    false,
  );
});
test('progress counts actual visible media deltas and compares real review windows without fabricating baseline', () => {
  assert.equal(listenedSeconds({ media: 2, wall: 1000 }, 3, 2000), 1);
  assert.equal(listenedSeconds({ media: 2, wall: 1000 }, 100, 2000), 0);
  assert.equal(listenedSeconds({ media: 2, wall: 1000 }, 2, 2000), 0);
  assert.equal(listenedSeconds({ media: 2, wall: 1000 }, 3, 10000), 0);
  const snapshot = emptySnapshot(),
    now = Date.UTC(2026, 10, 23);
  assert.equal(learningMetrics(snapshot, now).recentRate, null);
  snapshot.activity.push({
    id: crypto.randomUUID(),
    kind: 'review',
    at: now,
    movieId: 'inception',
    correct: true,
  });
  const metrics = learningMetrics(snapshot, now);
  assert.equal(metrics.recentRate, 100);
  assert.equal(metrics.previousRate, null);
  assert.equal(metrics.seconds, 0);
});
test('caption matching keeps exact movie/show/season/episode and language; English is not Mongolian', () => {
  const identity = { tmdbId: 1396, mediaType: 'tv', season: 1, episode: 2 };
  const candidate = { fileId: 1, language: 'mn', parentTmdbId: 1396, season: 1, episode: 2 };
  assert.equal(captionMatches(candidate, identity, 'mn'), true);
  assert.equal(captionMatches({ ...candidate, episode: 1 }, identity, 'mn'), false);
  assert.equal(captionMatches({ ...candidate, language: 'en' }, identity, 'mn'), false);
  assert.equal(usableMongolian('WEBVTT\n\n00:01.000 --> 00:03.000\nHello world\n'), false);
  assert.equal(usableMongolian('WEBVTT\n\n00:01.000 --> 00:03.000\nСайн байна уу\n'), true);
});
test('CineSrc binds TV episode and numeric catalog IDs; internal next-episode stops stale transcript clock', () => {
  const source = { postMessage() {} },
    frame = {
      src: `${CINESRC_ORIGIN}/embed/tv/1396?s=1&e=2`,
      contentWindow: source,
      isConnected: true,
    };
  const identity = { mediaType: 'tv', season: 1, episode: 2 };
  const event = {
    origin: CINESRC_ORIGIN,
    source,
    data: { type: 'cinesrc:timeupdate', tmdbId: 1396, currentTime: 2, duration: 100 },
  };
  assert.ok(readCineMessage(event, frame, '1396', identity));
  assert.equal(readCineMessage(event, frame, 1396, { ...identity, episode: 1 }), null);
  const states = [],
    session = createCineSession(frame, '1396', (state) => states.push(state), identity);
  session.receive(event);
  assert.equal(states.at(-1).time, 2);
  session.receive({ ...event, data: { type: 'cinesrc:nextepisode', season: 1, episode: 3 } });
  session.receive(event);
  assert.equal(states.at(-1).time, null);
  assert.equal(states.at(-1).status, 'error');
  session.dispose();
});
test('login and payment return paths never redirect outside the application', () => {
  assert.equal(safeReturnTo('/watch/inception?learn=1'), '/watch/inception?learn=1');
  for (const value of [
    '//evil.test',
    '/\\evil.test',
    'https://evil.test',
    '/api/admin',
    '/watch/x\n',
  ])
    assert.equal(safeReturnTo(value), '/learning');
});
test('selected captions reach supported embeds, off means off, and external sources are rejected', () => {
  const origin = 'https://example.test',
    url = '/api/subtitles/source/12345678-1234-1234-1234-123456789abc';
  assert.equal(
    playerCaptionUrl(origin, 'inception', { url, label: 'Mongolian', enabled: true }),
    origin + url,
  );
  assert.equal(
    playerCaptionUrl(origin, 'inception', { url, label: 'Mongolian', enabled: false }),
    null,
  );
  assert.equal(
    playerCaptionUrl(origin, 'inception', {
      url: 'https://evil.test/sub.vtt',
      label: 'Mongolian',
      enabled: true,
    }),
    null,
  );
});
test('dictionary glosses handle common words and leave unknown contextual meaning to the learner', () => {
  assert.match(dictionaryMeaning(' Train '), /галт тэрэг/);
  assert.match(dictionaryMeaning('right'), /зөв.*баруун/);
  assert.equal(dictionaryMeaning('unlisted-fictional-word'), null);
});
test('explicit device merge deduplicates events and assessments instead of inventing extra practice', () => {
  const local = emptySnapshot(),
    remote = emptySnapshot();
  const event = {
    id: crypto.randomUUID(),
    kind: 'review',
    at: 1,
    movieId: 'inception',
    correct: true,
  };
  local.activity.push(event);
  remote.activity.push(event);
  assert.equal(mergeLearningSnapshots(local, remote).activity.length, 1);
  assert.deepEqual(mergeLearningSnapshots(local, remote), mergeLearningSnapshots(remote, local));
});
test('checkout retries survive reload, separate users stay separate and expired keys rotate', () => {
  const values = new Map(),
    storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
  const first = checkoutKey('user1:MONTHLY', storage, 1000);
  assert.equal(checkoutKey('user1:MONTHLY', storage, 2000), first);
  assert.notEqual(checkoutKey('user2:MONTHLY', storage, 2000), first);
  assert.notEqual(checkoutKey('user1:MONTHLY', storage, 3_700_000), first);
  assert.match(
    checkoutKey(
      'blocked',
      {
        getItem() {
          throw new Error();
        },
        setItem() {
          throw new Error();
        },
      },
      1000,
    ),
    /^[a-f0-9-]{36}$/,
  );
});
test('personal translated VTT bridges into learning without trusting foreign or wrong-title subtitle URLs', () => {
  const origin = 'https://example.test',
    path = '/api/subtitles/translated/12345678-1234-1234-1234-123456789abc';
  assert.equal(internalMongolianSource(path, origin, 'inception'), origin + path);
  assert.equal(
    internalMongolianSource('/api/subtitles/mongolian/inception', origin, 'inception'),
    origin + '/api/subtitles/mongolian/inception',
  );
  for (const input of [
    'https://evil.test' + path,
    '/api/subtitles/mongolian/other-film',
    path + '?url=evil',
    'https://user@example.test' + path,
  ])
    assert.equal(internalMongolianSource(input, origin, 'inception'), null);
});
