import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@libsql/client';
import {
  contextualWord,
  teachingLesson,
  meaningChoices,
  normalizeWord,
} from '../src/lib/learning/teaching.ts';
import { translateWord } from '../src/lib/learning/word-provider.ts';
import { reserveWordLookup } from '../src/db/word-budget.mjs';
import { recallContext } from '../src/lib/learning/recall.ts';
import { studyCues } from '../src/lib/learning/study-cues.ts';

test('clicked word positions distinguish two senses in the same subtitle', () => {
  const sentence = 'Turn right. You are right about the tickets.';
  assert.equal(teachingLesson('right', sentence, sentence.indexOf('right')).meaning, 'баруун');
  assert.equal(teachingLesson('right', sentence, sentence.lastIndexOf('right')).meaning, 'зөв');
  assert.equal(teachingLesson('last', 'I saw it last week.', 12).meaning, 'өнгөрсөн');
  assert.equal(teachingLesson('like', 'It looks like a train.', 9).meaning, 'шиг; адилхан');
});

test('phrasal verbs teach the selected phrase together and contractions keep their meaning', () => {
  const sentence = 'We can figure it out together.';
  const word = contextualWord('out', sentence, sentence.indexOf('out'));
  assert.equal(word, 'figure it out');
  assert.match(teachingLesson(word, sentence, sentence.indexOf('out')).meaning, /учрыг нь олох/);
  const contraction = 'I’m used to the noise.';
  const phrase = contextualWord('used', contraction, contraction.indexOf('used'));
  assert.equal(
    teachingLesson(phrase, contraction, contraction.indexOf('used')).meaning,
    'дассан байх',
  );
  assert.equal(contextualWord('out', 'Figure it out, then go out.', 22), 'out');
  assert.equal(normalizeWord('  DON’T   GIVE UP '), "don't give up");
});

test('meaning quiz contains exactly one correct choice; recall hides typographic contractions', () => {
  for (const word of ['train', 'last', 'help', 'promise']) {
    const lesson = teachingLesson(word, word);
    const choices = meaningChoices(word, lesson.meaning);
    assert.equal(choices.length, 3);
    assert.equal(choices.filter((choice) => choice === lesson.meaning).length, 1);
    assert.deepEqual(choices, meaningChoices(word, lesson.meaning));
  }
  assert.equal(
    recallContext({ word: "don't", example: 'Don’t stop. I don’t know.' }),
    '_____ stop. I _____ know.',
  );
});

test('word translation sends only a bounded word query to the fixed documented endpoint', async () => {
  let calls = 0;
  const request = async (input, options) => {
    calls++;
    const url = new URL(input);
    assert.equal(url.origin, 'https://api.mymemory.translated.net');
    assert.equal(url.pathname, '/get');
    assert.deepEqual([...url.searchParams.keys()], ['q', 'langpair']);
    assert.equal(url.searchParams.get('q'), 'astonished');
    assert.equal(url.searchParams.get('langpair'), 'en|mn');
    assert.equal(options.redirect, 'error');
    assert.equal(options.body, undefined);
    return Response.json({
      responseStatus: 200,
      quotaFinished: false,
      responseData: { translatedText: '<b>ихэд гайхсан</b>' },
    });
  };
  assert.equal(await translateWord('astonished', request), 'ихэд гайхсан');
  for (const invalid of [
    'https://evil.test',
    'a'.repeat(81),
    'one two three four five six seven',
    '',
  ])
    assert.equal(await translateWord(invalid, request), null);
  assert.equal(calls, 1);
});

test('quota, HTTP and non-Mongolian provider failures are not taught as translations', async () => {
  for (const result of [
    { responseStatus: 429, responseData: { translatedText: 'хязгаар' } },
    { responseStatus: 200, quotaFinished: true, responseData: { translatedText: 'хязгаар' } },
    { responseStatus: 200, responseData: { translatedText: 'astonished' } },
    { responseStatus: 200 },
    { responseStatus: 200, responseData: { translatedText: 'ү'.repeat(301) } },
  ])
    assert.equal(await translateWord('astonished', async () => Response.json(result)), null);
  assert.equal(
    await translateWord('astonished', async () => new Response('', { status: 503 })),
    null,
  );
});

test('daily translation budget reserves atomically under concurrent requests and resets by day', async () => {
  const client = createClient({ url: ':memory:' });
  try {
    const reserved = await Promise.all(
      Array.from({ length: 40 }, () => reserveWordLookup(client, 80, '2026-11-24')),
    );
    assert.equal(reserved.filter(Boolean).length, 37);
    assert.equal(await reserveWordLookup(client, 40, '2026-11-24'), true);
    assert.equal(await reserveWordLookup(client, 1, '2026-11-24'), false);
    assert.equal(await reserveWordLookup(client, 80, '2026-11-25'), true);
    assert.equal(await reserveWordLookup(client, -1, '2026-11-25'), false);
  } finally {
    client.close();
  }
});

test('practice excludes credits, URLs and sound-only or MN-only cues without changing the transcript', () => {
  const cues = [
    'Hello there.',
    '[MUSIC]',
    'www.example.test',
    'Subtitles by Test',
    'a'.repeat(501),
  ].map((text, index) => ({
    id: String(index),
    start: index,
    end: index + 1,
    text,
    translation: '',
  }));
  cues.push({
    id: 'mn',
    start: 10,
    end: 11,
    text: 'Монгол subtitle',
    translation: '',
    language: 'mn',
  });
  assert.deepEqual(
    studyCues(cues).map((cue) => cue.text),
    ['Hello there.'],
  );
  assert.equal(cues.length, 6);
});
