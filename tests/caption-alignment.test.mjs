import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alignCues, parseVtt } from '../src/lib/learning/vtt.ts';
import { mongolianTrack } from '../src/lib/learning/captions.ts';
import { movieCues } from '../src/lib/learning/movie.ts';
import {
  captionSettingsSchema,
  initialCaptionSettings,
  mergeAutomaticCaptions,
} from '../src/lib/learning/caption-settings.ts';
import { sentenceGuide } from '../src/lib/learning/sentence-guide.ts';

const en = Array.from({ length: 40 }, (_, index) => ({
  id: `en-${index}`,
  start: index * 5 + 1,
  end: index * 5 + 3,
  text: `Sentence ${index}`,
}));
const mn = en.map((cue, index) => ({ ...cue, id: `mn-${index}`, text: `Монгол утга ${index}` }));

test('missing and extra translated cues never shift later meanings by their ordinal position', () => {
  const partial = mn.filter((_, index) => index !== 2);
  partial.push({ id: 'extra', start: 3.1, end: 4.1, text: 'Нэмэлт мөр' });
  partial.sort((a, b) => a.start - b.start);
  const aligned = alignCues(en, partial);
  assert.equal(aligned[2].translation, '');
  assert.equal(aligned[3].translation, 'Монгол утга 3');
  assert.equal(aligned.at(-1).translation, 'Монгол утга 39');
});

test('partial overlap and a merged multi-sentence translation are not a sentence meaning', () => {
  assert.equal(alignCues([en[0]], [{ ...mn[0], start: 2.9, end: 5 }])[0].translation, '');
  assert.equal(alignCues(en.slice(0, 2), [{ ...mn[0], end: en[1].end }])[0].translation, '');
  const split = [
    { ...mn[0], end: 2 },
    { ...mn[0], id: 'second-half', start: 2, text: 'Үргэлжлэл' },
  ];
  assert.equal(alignCues([en[0]], split)[0].translation, 'Монгол утга 0 Үргэлжлэл');
});

test('incompatible tracks suppress coincidental matches instead of claiming a translation', () => {
  const unrelated = mn.map((cue, index) =>
    index ? { ...cue, start: cue.start + 1, end: cue.end + 1 } : cue,
  );
  assert.ok(alignCues(en, unrelated).every((cue) => !cue.translation));
  const shifted = mn.map((cue) => ({ ...cue, start: cue.start + 0.8, end: cue.end + 0.8 }));
  assert.ok(alignCues(en, shifted).every((cue) => !cue.translation));
  assert.deepEqual(
    movieCues(shifted, en, 0, -0.8).map((cue) => cue.translation),
    mn.map((cue) => cue.text),
  );
});

test('a sparse translation keeps its exact timestamps without moving into untranslated gaps', () => {
  const aligned = alignCues(en, [mn[0], mn[10], mn[39]]);
  assert.equal(aligned.filter((cue) => cue.translation).length, 3);
  assert.equal(aligned[1].translation, '');
  assert.equal(aligned[10].translation, 'Монгол утга 10');
});

test('automatic captions refresh while user-selected tracks and offsets survive', () => {
  const received = { english: 'new EN', mongolian: 'new MN' };
  const automatic = {
    ...initialCaptionSettings,
    english: 'old EN',
    mongolian: 'old MN',
    mnOffset: 2,
  };
  assert.deepEqual(mergeAutomaticCaptions(automatic, received), { ...automatic, ...received });
  const manual = { ...automatic, englishSource: 'manual', mongolianSource: 'manual' };
  assert.deepEqual(mergeAutomaticCaptions(manual, received), manual);
  const legacy = captionSettingsSchema.parse({
    english: 'old EN',
    mongolian: 'old MN',
    enOffset: 1,
    mnOffset: 2,
  });
  assert.equal(legacy.englishSource, 'legacy');
  assert.deepEqual(mergeAutomaticCaptions(legacy, received), legacy);
  assert.equal(
    mergeAutomaticCaptions(legacy, { english: 'old EN', mongolian: '' }).englishSource,
    'automatic',
  );
});

test('the reported conversational phrase has a natural, local meaning in every movie', () => {
  assert.equal(sentenceGuide("that's gonna sound crazy."), 'Сонсвол итгэмээргүй санагдах байх.');
  assert.equal(
    sentenceGuide('  THAT’S   GONNA SOUND CRAZY… '),
    'Сонсвол итгэмээргүй санагдах байх.',
  );
  assert.equal(sentenceGuide("that's gonna sound crazy, but listen to me."), '');
  assert.equal(sentenceGuide('unlisted sentence'), '');
});

test('partial legacy files expose only translated lines in strict VTT with original timestamps', () => {
  const mixed =
    'WEBVTT\n\n1\n00:00:01.188 --> 00:00:03.771\nEnglish only\n2\n00:01:12.188 --> 00:01:14.771\nМонгол утга &amp; &lt;текст&gt;\n3\n00:01:16.000 --> 00:01:19.000\nUntranslated line\n';
  const track = mongolianTrack(mixed);
  assert.ok(track);
  assert.equal(track.partial, true);
  assert.equal(track.cueCount, 1);
  assert.deepEqual(
    parseVtt(track.content).map(({ start, end, text }) => ({ start, end, text })),
    [{ start: 72.188, end: 74.771, text: 'Монгол утга & <текст>' }],
  );
  assert.equal(mongolianTrack('WEBVTT\n\n00:01.000 --> 00:03.000\nEnglish only\n'), null);
});
