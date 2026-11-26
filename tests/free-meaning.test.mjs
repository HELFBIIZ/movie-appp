import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeSentence,
  hasMongolianMeaning,
  readSentenceBody,
} from '../src/lib/learning/sentence-text.ts';
import { translateSentence, createSentenceLookup } from '../src/lib/learning/sentence-meaning.ts';

test('free sentence requests accept one bounded segment, never a URL or bulk paragraph', () => {
  assert.equal(normalizeSentence('  Hello,\n my friend! '), 'Hello, my friend!');
  for (const value of [
    null,
    '',
    'hello\n\nworld',
    'hello\r\rworld',
    'a'.repeat(401),
    'a'.repeat(399) + '’',
    'Visit https://example.test',
    'hello\u0000there',
  ])
    assert.equal(normalizeSentence(value), null);
  assert.equal(hasMongolianMeaning('Untranslated English'), false);
  assert.equal(hasMongolianMeaning('Peter, энд ир!'), true);
});

test('JSON body is bounded even with chunked input or an incorrect content length', async () => {
  assert.deepEqual(
    await readSentenceBody(
      new Request('https://local.test', { method: 'POST', body: '{"text":"hello"}' }),
    ),
    { text: 'hello' },
  );
  assert.equal(
    await readSentenceBody(new Request('https://local.test', { method: 'POST', body: 'invalid' })),
    null,
  );
  assert.equal(
    await readSentenceBody(
      new Request('https://local.test', {
        method: 'POST',
        headers: { 'content-length': '1' },
        body: 'x'.repeat(5000),
      }),
    ),
    null,
  );
});

test('free provider uses only the documented anonymous GET and never invokes a paid fallback', async () => {
  let calls = 0;
  const request = async (input, options) => {
    calls++;
    const url = new URL(input);
    assert.equal(url.origin, 'https://api.mymemory.translated.net');
    assert.equal(url.pathname, '/get');
    assert.deepEqual([...url.searchParams.keys()], ['q', 'langpair']);
    assert.equal(url.searchParams.get('q'), 'Hello, my friend!');
    assert.equal(options.body, undefined);
    assert.equal(options.headers.Authorization, undefined);
    return Response.json({
      responseStatus: 200,
      responseData: { translatedText: 'Сайн уу, найз минь!' },
    });
  };
  assert.equal(await translateSentence('Hello, my friend!', request), 'Сайн уу, найз минь!');
  assert.equal(await translateSentence('a'.repeat(501), request), null);
  assert.equal(calls, 1);
});

test('concurrent equal sentences share one lookup; a cache hit does not spend the shared budget', async () => {
  const cache = new Map();
  let reserved = 0,
    translated = 0;
  const lookup = createSentenceLookup({
    read: async (key) => cache.get(key),
    write: async (key, value) => {
      cache.set(key, value);
    },
    reserve: async (bytes) => {
      reserved += bytes;
      return true;
    },
    translate: async () => {
      translated++;
      return 'Сайн байна уу!';
    },
  });
  const results = await Promise.all(Array.from({ length: 20 }, () => lookup('same', 'Hello!')));
  assert.equal(
    results.every((result) => result.translation === 'Сайн байна уу!'),
    true,
  );
  assert.equal(translated, 1);
  assert.equal(reserved, 6);
  assert.deepEqual(await lookup('same', 'Hello!'), { translation: 'Сайн байна уу!' });
  assert.equal(translated, 1);
  assert.equal(reserved, 6);
});

test('exhausted budget and invalid translations never become successful cache entries', async () => {
  let calls = 0,
    writes = 0;
  const dependencies = {
    read: async () => null,
    write: async () => {
      writes++;
    },
    reserve: async () => false,
    translate: async () => {
      calls++;
      return 'English';
    },
  };
  assert.deepEqual(await createSentenceLookup(dependencies)('key', 'Hello!'), {
    error: 'FREE_LIMIT_REACHED',
  });
  assert.equal(calls, 0);
  assert.deepEqual(
    await createSentenceLookup({ ...dependencies, reserve: async () => true })('key', 'Hello!'),
    { error: 'MEANING_UNAVAILABLE' },
  );
  assert.equal(writes, 0);
});
