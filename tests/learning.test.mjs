import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { activeCues, alignCues, parseTimestamp, parseVtt } from '../src/lib/learning/vtt.ts';
import { DAY_MS, isDue, reviewItem } from '../src/lib/learning/srs.ts';
import {
  addItem,
  decodeProgress,
  emptyProgress,
  itemId,
  persistProgress,
} from '../src/lib/learning/storage.ts';
import { isCorrect, vocabularyQuestions } from '../src/lib/learning/quiz.ts';
import { htmlVideoAdapter, iframeProviders } from '../src/lib/learning/player-adapter/index.ts';
import { contextQuestion, sampleLines } from '../src/lib/learning/sample.ts';

const vtt = (body) => `WEBVTT\n\n${body}`;
const cue = (text = 'Hello', start = '00:01.000', end = '00:03.000') =>
  `${start} --> ${end}\n${text}`;
const card = (overrides = {}) => ({
  id: 'card1',
  kind: 'word',
  word: 'train',
  meaning: 'галт тэрэг',
  example: 'The last train leaves in ten minutes.',
  movieId: 'inception',
  mediaId: 'sample',
  cueStart: 1,
  cueEnd: 4,
  stage: 0,
  correct: 0,
  incorrect: 0,
  dueAt: 0,
  savedAt: 0,
  ...overrides,
});

test('VTT accepts BOM, CRLF, cue identifiers, settings and both timestamp forms', () => {
  const cues = parseVtt(
    '\uFEFF' +
      vtt(
        `first\n00:00:01.000 --> 00:00:03.000 align:start\nHello\n\n${cue('World', '00:04.000', '00:05.000')}`,
      ).replace(/\n/g, '\r\n'),
  );
  assert.equal(cues.length, 2);
  assert.deepEqual(
    cues.map((c) => [c.start, c.end, c.text]),
    [
      [1, 3, 'Hello'],
      [4, 5, 'World'],
    ],
  );
});
test('VTT ignores NOTE/STYLE/REGION and rejects malformed times and reversed intervals', () => {
  assert.equal(
    parseVtt(
      vtt(
        `NOTE ignored\n${cue()}\n\nSTYLE\n::cue { color: red }\n\nREGION\nid:fred\n\n${cue('bad', '00:60.000')}\n\n${cue('reversed', '00:09.000', '00:01.000')}\n\n${cue('valid')}`,
      ),
    ).length,
    1,
  );
  for (const invalid of ['01:61.000', '-1:00.000', '00:00.1', 'NaN', '01:99:00.000'])
    assert.equal(parseTimestamp(invalid), null);
  assert.throws(() => parseVtt('not a vtt'), /header/);
  assert.throws(() => parseVtt('a'.repeat(1_000_001)), /1 MB/);
});
test('VTT strips executable markup and preserves escaped text as plain characters', () => {
  const [parsed] = parseVtt(
    vtt(cue('<script>alert(1)</script><b>Hello</b> &amp; &lt;img onerror=evil&gt;')),
  );
  assert.equal(parsed.text, 'Hello & <img onerror=evil>');
  assert.ok(!parsed.text.includes('<script>'));
});
test('alignment uses positive overlap, multiple translations and half-open cue boundaries', () => {
  const en = parseVtt(vtt(`${cue('one')}\n\n${cue('two', '00:02.000', '00:04.000')}`));
  const mn = parseVtt(
    vtt(`${cue('нэг', '00:01.500', '00:02.500')}\n\n${cue('хоёр', '00:02.500', '00:03.500')}`),
  );
  const aligned = alignCues(en, mn);
  assert.equal(aligned[0].translation, 'нэг хоёр');
  assert.equal(activeCues(aligned, 2).length, 2);
  assert.deepEqual(
    activeCues(aligned, 3).map((c) => c.text),
    ['two'],
  );
  assert.equal(activeCues(aligned, 4).length, 0);
  assert.equal(activeCues(aligned, Number.NaN).length, 0);
  assert.equal(
    alignCues(en, [{ id: 'x', start: 4, end: 5, text: 'touch only' }])[1].translation,
    '',
  );
});
test('SRS schedules 1/3/7/14 days, caps at 14, and resets failure to ten minutes', () => {
  const now = 1000;
  let item = card();
  for (const days of [1, 3, 7, 14, 14]) {
    item = reviewItem(item, true, now);
    assert.equal(item.dueAt, now + days * DAY_MS);
  }
  assert.equal(item.stage, 4);
  assert.equal(item.correct, 5);
  item = reviewItem(item, false, now);
  assert.equal(item.stage, 0);
  assert.equal(item.incorrect, 1);
  assert.equal(item.dueAt, now + 600_000);
  assert.equal(isDue(item, item.dueAt - 1), false);
  assert.equal(isDue(item, item.dueAt), true);
});
test('storage round-trips review state and deduplicates across case but isolates media', () => {
  const item = card();
  assert.equal(itemId(item), itemId({ ...item, word: ' TRAIN ', cueStart: 15 }));
  assert.notEqual(itemId(item), itemId({ ...item, mediaId: 'local-123' }));
  assert.notEqual(
    itemId({ ...item, kind: 'sentence' }),
    itemId({ ...item, kind: 'sentence', cueStart: 15 }),
  );
  const state = addItem(emptyProgress(), item);
  assert.equal(addItem(state, item).items.length, 1);
  assert.deepEqual(decodeProgress(JSON.stringify(state)), state);
  assert.throws(() => decodeProgress('{oops'));
  assert.throws(
    () => decodeProgress(JSON.stringify({ ...state, items: [item, item] })),
    /Давхардсан/,
  );
  assert.throws(() => decodeProgress(JSON.stringify({ ...state, items: [card({ stage: 99 })] })));
});
test('failed/quota storage write throws instead of reporting success', () => {
  assert.throws(
    () =>
      persistProgress(
        {
          setItem: () => {
            throw new Error('quota');
          },
        },
        emptyProgress(),
      ),
    /quota/,
  );
});
test('vocabulary quiz has unique options, genuine correctness and a usable one-word quiz', () => {
  const questions = vocabularyQuestions([
    card(),
    card({ id: 'two', word: 'ticket', meaning: 'тасалбар' }),
  ]);
  for (const question of questions) {
    assert.equal(new Set(question.choices).size, question.choices.length);
    assert.equal(isCorrect(question, question.answer), true);
    assert.equal(
      isCorrect(
        question,
        question.choices.find((choice) => choice !== question.answer),
      ),
      false,
    );
    assert.equal(isCorrect(question, 'injected choice'), false);
  }
  assert.equal(vocabularyQuestions([card()])[0].choices.length, 4);
  assert.equal(vocabularyQuestions([card({ kind: 'sentence' })]).length, 0);
  assert.ok(contextQuestion.explanation.includes('10'));
});
test('iframe capabilities stay false; HTML video adapter controls only a real video interface', async () => {
  for (const provider of iframeProviders)
    assert.deepEqual(Object.values(provider.capabilities), [false, false, false, false]);
  const video = {
    currentTime: 0,
    duration: 20,
    play: async () => 'played',
    pause() {
      this.paused = true;
    },
  };
  const adapter = htmlVideoAdapter(video);
  assert.equal(adapter.seek(-1), false);
  assert.equal(adapter.seek(Number.NaN), false);
  assert.equal(adapter.seek(99), true);
  assert.equal(adapter.getCurrentTime(), 20);
  assert.equal(await adapter.play(), 'played');
  adapter.pause();
  assert.equal(video.paused, true);
});
test('committed sample captions match the original script and actual narration-buffer timings', () => {
  const en = parseVtt(fs.readFileSync('public/learning/last-train.en.vtt', 'utf8'));
  const mn = parseVtt(fs.readFileSync('public/learning/last-train.mn.vtt', 'utf8'));
  const manifest = JSON.parse(fs.readFileSync('public/learning/timings.json', 'utf8'));
  assert.deepEqual(
    en.map((c) => c.text),
    sampleLines.map((line) => line.en),
  );
  assert.deepEqual(
    mn.map((c) => c.text),
    sampleLines.map((line) => line.mn),
  );
  en.forEach((c, i) => {
    assert.ok(Math.abs(c.start - manifest.cues[i].start) < 0.002);
    assert.ok(Math.abs(c.end - manifest.cues[i].end) < 0.002);
  });
  assert.ok(en.at(-1).end < manifest.duration);
  assert.ok(fs.statSync('public/learning/last-train.webm').size > 10000);
});
