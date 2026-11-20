import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import {
  readCineMessage,
  createCineSession,
  CINESRC_ORIGIN,
} from '../src/lib/learning/player-adapter/cinesrc.ts';
import {
  movieCues,
  internalEnglishSource,
  parseExistingVtt,
  shiftCues,
  transcriptFingerprint,
} from '../src/lib/learning/movie.ts';
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
import {
  assessPlacement,
  decodePlacement,
  persistPlacement,
  placementQuestions,
  placementBands,
  PLACEMENT_KEY,
} from '../src/lib/learning/placement.ts';

const placementAnswers = (right) =>
  Object.fromEntries(
    placementQuestions.map((question, index) => [
      question.id,
      right(index) ? question.answer : null,
    ]),
  );
test('placement uses eight unique original questions and reports actual skill totals', () => {
  assert.equal(new Set(placementQuestions.map((q) => q.id)).size, 8);
  for (const q of placementQuestions) {
    assert.ok(q.choices.includes(q.answer));
    assert.equal(new Set(q.choices).size, q.choices.length);
  }
  const result = assessPlacement(
    placementAnswers(() => true),
    1000,
  );
  assert.equal(result.correct, 8);
  assert.equal(result.band, 'intermediate');
  assert.deepEqual(result.skills, {
    vocabulary: { correct: 2, total: 2 },
    grammar: { correct: 3, total: 3 },
    reading: { correct: 3, total: 3 },
  });
  assert.equal(placementBands[result.band].words, 8);
  assert.equal(placementBands[result.band].showTranslations, false);
});
test('placement recommendations are conservative and skipped answers never earn points', () => {
  assert.equal(
    assessPlacement(
      placementAnswers(() => false),
      1000,
    ).band,
    'beginner',
  );
  assert.equal(
    assessPlacement(
      placementAnswers(() => false),
      1000,
    ).correct,
    0,
  );
  assert.equal(
    assessPlacement(
      placementAnswers((i) => i < 4),
      1000,
    ).band,
    'foundation',
  );
  assert.equal(
    assessPlacement(
      placementAnswers((i) => i >= 4),
      1000,
    ).band,
    'beginner',
  );
  assert.equal(
    assessPlacement(
      placementAnswers((i) => i !== 3),
      1000,
    ).band,
    'intermediate',
  );
  assert.equal(
    assessPlacement(
      placementAnswers((i) => i !== 0),
      1000,
    ).band,
    'foundation',
  );
});
test('placement rejects missing, extra, forged and malformed responses', () => {
  const answers = placementAnswers(() => true);
  assert.throws(() => assessPlacement({}, 1000));
  assert.throws(() => assessPlacement({ ...answers, extra: null }, 1000));
  assert.throws(() => assessPlacement({ ...answers, greeting: 'not an offered answer' }, 1000));
  assert.throws(() => assessPlacement(answers, Infinity));
  assert.throws(() => decodePlacement('{broken'));
  assert.throws(() => decodePlacement(JSON.stringify({ version: 2, answers, completedAt: 1000 })));
  assert.equal(decodePlacement(null), null);
});
test('placement persists independently, recomputes the band, and exposes failed writes', () => {
  const writes = [];
  const answers = placementAnswers(() => false);
  persistPlacement({ setItem: (key, value) => writes.push([key, value]) }, answers, 1000);
  assert.equal(writes[0][0], PLACEMENT_KEY);
  assert.notEqual(PLACEMENT_KEY, 'vxnta.scenechain.v1');
  const raw = JSON.parse(writes[0][1]);
  raw.band = 'intermediate';
  assert.equal(decodePlacement(JSON.stringify(raw)).band, 'beginner');
  assert.throws(
    () =>
      persistPlacement(
        {
          setItem: () => {
            throw new Error('Quota');
          },
        },
        answers,
        1000,
      ),
    /Quota/,
  );
});

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

function cineFixture() {
  const sent = [];
  const peer = { postMessage: (message, origin) => sent.push({ message, origin }) };
  const frame = {
    src: 'https://cinesrc.st/embed/movie/969681',
    contentWindow: peer,
    isConnected: true,
  };
  const event = (data = { type: 'cinesrc:timeupdate', currentTime: 72.3, duration: 8700 }) => ({
    origin: CINESRC_ORIGIN,
    source: peer,
    data,
  });
  return { sent, peer, frame, event };
}
test('CineSrc accepts only the bound frame, exact origin, movie URL and valid payload', () => {
  const f = cineFixture();
  assert.ok(readCineMessage(f.event(), f.frame, 969681));
  for (const invalid of [
    { ...f.event(), origin: 'https://cinesrc.st.evil.example' },
    { ...f.event(), source: {} },
    { ...f.event(), data: JSON.stringify(f.event().data) },
    f.event({ ...f.event().data, tmdbId: 42 }),
    f.event({ ...f.event().data, movieId: 42 }),
    f.event({ ...f.event().data, mediaType: 'tv' }),
    f.event({ ...f.event().data, currentTime: -1 }),
    f.event({ ...f.event().data, currentTime: NaN }),
    f.event({ ...f.event().data, duration: Infinity }),
    f.event({ ...f.event().data, duration: 10 }),
    f.event({ type: 'cinesrc:loadedmetadata' }),
    f.event({ type: 'cinesrc:response', command: 'getDuration', result: 0 }),
    f.event({ type: 'unknown:timeupdate', currentTime: 80, duration: 8700 }),
  ])
    assert.equal(readCineMessage(invalid, f.frame, 969681), null);
  assert.equal(readCineMessage(f.event(), { ...f.frame, isConnected: false }, 969681), null);
  assert.equal(
    readCineMessage(f.event(), { ...f.frame, src: 'https://cinesrc.st/embed/movie/42' }, 969681),
    null,
  );
  assert.equal(
    readCineMessage(
      f.event(),
      { ...f.frame, src: 'https://cinesrc.st/embed/movie/969681?id=42' },
      969681,
    ),
    null,
  );
});
test('CineSrc never synthesizes a clock or confirms seek from documentation/command alone', () => {
  const f = cineFixture();
  let state;
  const adapter = createCineSession(f.frame, 969681, (value) => {
    state = value;
  });
  adapter.reset();
  assert.equal(state.time, null);
  adapter.receive(f.event({ type: 'cinesrc:ready' }));
  assert.equal(state.capabilities.getCurrentTime, false);
  assert.equal(adapter.seek(80), false);
  assert.ok(f.sent.every(({ origin }) => origin === CINESRC_ORIGIN));
  adapter.receive(f.event());
  assert.equal(state.time, 72.3);
  assert.equal(state.contentVerified, false);
  assert.equal(adapter.seek(500), true);
  assert.equal(state.time, 72.3);
  assert.equal(state.capabilities.seek, false);
  assert.deepEqual(f.sent.at(-1), {
    message: { type: 'cinesrc:command', command: 'seek', args: [500] },
    origin: CINESRC_ORIGIN,
  });
  adapter.receive(f.event({ type: 'cinesrc:seeked', currentTime: 80, duration: 8700 }));
  assert.equal(state.capabilities.seek, false);
  adapter.receive(f.event({ type: 'cinesrc:seeked', currentTime: 500.1, duration: 8700 }));
  assert.equal(state.time, 500.1);
  assert.equal(state.capabilities.seek, true);
  const previous = state;
  adapter.dispose();
  adapter.receive(f.event());
  assert.equal(state, previous);
  assert.equal(adapter.seek(20), false);
});
test('CineSrc getter replies support paused media without inventing time zero', () => {
  const f = cineFixture();
  let state;
  const adapter = createCineSession(f.frame, 969681, (value) => {
    state = value;
  });
  adapter.reset();
  adapter.requestClock();
  assert.equal(state.time, null);
  adapter.receive(f.event({ type: 'cinesrc:response', command: 'getCurrentTime', result: 0 }));
  assert.equal(state.time, null);
  adapter.receive(f.event({ type: 'cinesrc:response', command: 'getDuration', result: 8700 }));
  assert.equal(state.time, 0);
  assert.equal(state.capabilities.getCurrentTime, true);
  adapter.receive(f.event());
  adapter.receive(f.event({ type: 'cinesrc:response', command: 'getDuration', result: 8700 }));
  assert.equal(state.time, 72.3);
  adapter.receive(f.event({ type: 'cinesrc:loadedmetadata', duration: 10 }));
  assert.equal(state.time, null);
  assert.equal(state.capabilities.getCurrentTime, false);
  adapter.dispose();
});
test('CineSrc seek timeout and source change revoke confirmation', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = cineFixture();
  let state;
  const adapter = createCineSession(f.frame, 969681, (value) => {
    state = value;
  });
  adapter.receive(f.event());
  adapter.seek(200);
  t.mock.timers.tick(5001);
  assert.equal(state.status, 'seek-unconfirmed');
  assert.equal(state.time, 72.3);
  adapter.receive(f.event({ type: 'cinesrc:sourceused' }));
  assert.equal(state.time, null);
  assert.equal(state.capabilities.getCurrentTime, false);
  adapter.dispose();
  t.mock.timers.reset();
});
test('movie captions remain MN-only until EN is imported; offsets do not create English', async () => {
  const mn = parseVtt(vtt(cue('Монгол өгүүлбэр')));
  const en = parseVtt(vtt(cue('Protocol fixture, not film dialogue')));
  assert.equal(movieCues(mn, [], 0, 0)[0].language, 'mn');
  assert.equal(movieCues(mn, [], 0, 0)[0].translation, '');
  assert.equal(movieCues(mn, en, 0, 0)[0].translation, 'Монгол өгүүлбэр');
  assert.equal(shiftCues(en, 2)[0].start, 3);
  assert.equal(shiftCues(en, -5).length, 0);
  assert.throws(() => shiftCues(en, NaN));
  assert.throws(() => shiftCues(en, 601));
  assert.equal(await transcriptFingerprint('en', 'mn'), await transcriptFingerprint('en', 'mn'));
  assert.notEqual(
    await transcriptFingerprint('en', 'mn'),
    await transcriptFingerprint('en2', 'mn'),
  );
  const old = card();
  assert.deepEqual(
    decodeProgress(JSON.stringify({ ...emptyProgress(), items: [old] })).items[0],
    old,
  );
  const annotated = card({
    tmdbId: 969681,
    grammar: 'User note',
    context: 'User context',
    provenance: 'user-note',
  });
  assert.deepEqual(
    decodeProgress(JSON.stringify({ ...emptyProgress(), items: [annotated] })).items[0],
    annotated,
  );
});

test('existing MN legacy separators yield 1753 individual cues without changing the asset', () => {
  const text = fs.readFileSync('data/subtitles/spider-man-brand-new-day.vtt', 'utf8');
  const cues = parseExistingVtt(text);
  assert.equal(cues.length, 1753);
  assert.equal(cues[0].start, 72.188);
  assert.equal(cues.at(-1).end, 8666.7);
  assert.ok(Math.max(...cues.map((cue) => cue.text.length)) < 4000);
  assert.equal(fs.readFileSync('data/subtitles/spider-man-brand-new-day.vtt', 'utf8'), text);
  assert.equal(
    parseExistingVtt(vtt('NOTE comment\n' + cue('not a cue') + '\n\n' + cue('valid'))).length,
    1,
  );
});

test('subtitle panel imports are restricted to exact same-origin source endpoints', () => {
  const path = '/api/subtitles/source/12345678-1234-1234-1234-123456789abc';
  assert.equal(
    internalEnglishSource(path, 'https://vxnta.example'),
    'https://vxnta.example' + path,
  );
  for (const input of [
    'https://evil.example' + path,
    '/api/checkout',
    path + '?token=foo',
    '/api/subtitles/source/../checkout',
  ])
    assert.equal(internalEnglishSource(input, 'https://vxnta.example'), null);
});
