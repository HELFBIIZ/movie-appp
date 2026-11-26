import type { AlignedCue, Cue } from './types.ts';
import { hasMongolianMeaning } from './sentence-text.ts';

export const MAX_VTT_BYTES = 1_000_000;

export function parseTimestamp(value: string): number | null {
  const match = /^(?:(\d{2,}):)?(\d{2}):(\d{2})\.(\d{3})$/.exec(value);
  if (!match) return null;
  const [, hours = '0', minutes, seconds, millis] = match;
  if (+minutes > 59 || +seconds > 59) return null;
  const result = +hours * 3600 + +minutes * 60 + +seconds + +millis / 1000;
  return Number.isFinite(result) ? result : null;
}

// Only plain text leaves this parser. React also escapes it when rendering.
export function plainText(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(
      /&(amp|lt|gt|quot|apos|nbsp);/g,
      (_, entity: string) =>
        ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[entity] ?? '',
    )
    .trim();
}

export function parseVtt(input: string): Cue[] {
  if (new TextEncoder().encode(input).length > MAX_VTT_BYTES) {
    throw new Error('VTT файл 1 MB-аас бага байх ёстой.');
  }
  const blocks = input
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split(/\n[\t ]*\n/);
  if (!/^WEBVTT(?:[\t ].*)?(?:\n|$)/.test(blocks[0] ?? '')) {
    throw new Error('WEBVTT header олдсонгүй.');
  }
  const cues: Cue[] = [];
  for (const block of blocks.slice(1)) {
    const lines = block.trim().split('\n');
    if (/^(NOTE|STYLE|REGION)(?:\s|$)/.test(lines[0] ?? '')) continue;
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0 || timingIndex > 1) continue;
    const timing = /^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/.exec(lines[timingIndex]);
    if (!timing) continue;
    const start = parseTimestamp(timing[1]);
    const end = parseTimestamp(timing[2]);
    const text = plainText(lines.slice(timingIndex + 1).join('\n'));
    if (start === null || end === null || end <= start || !text) continue;
    cues.push({ id: `cue-${cues.length}`, start, end, text });
    if (cues.length >= 10_000) break;
  }
  return cues.sort((a, b) => a.start - b.start || a.end - b.end);
}

function overlappingTranslations(cue: Cue, mongolian: Cue[]): Cue[] {
  return mongolian.filter(
    (translation) =>
      Math.min(cue.end, translation.end) > Math.max(cue.start, translation.start) &&
      hasMongolianMeaning(translation.text),
  );
}

export function alignCues(english: Cue[], mongolian: Cue[]): AlignedCue[] {
  const aligned = english.map((cue) => {
    const matches = overlappingTranslations(cue, mongolian);
    // A small incidental overlap is not evidence of the same sentence. Permit
    // split MN cues only when their combined interval also fits the EN cue.
    const start = matches[0]?.start ?? Infinity;
    const end = matches.reduce((latest, match) => Math.max(latest, match.end), -Infinity);
    let covered = 0;
    let previousEnd = cue.start;
    for (const match of matches) {
      const left = Math.max(cue.start, match.start, previousEnd);
      const right = Math.min(cue.end, match.end);
      covered += Math.max(0, right - left);
      previousEnd = Math.max(previousEnd, right);
    }
    const fits =
      Math.abs(start - cue.start) <= 0.55 &&
      Math.abs(end - cue.end) <= 0.55 &&
      covered / (cue.end - cue.start) >= 0.75;
    return { ...cue, translation: fits ? matches.map((match) => match.text).join(' ') : '' };
  });
  // Independent releases can have similar counts and coincidental overlaps.
  // Never infer sentence correspondence from ordinal position or silently
  // change user offsets. Incompatible tracks need matching VTTs or a lookup
  // of the actual selected English sentence.
  const available = mongolian.filter((cue) => hasMongolianMeaning(cue.text)).length;
  const translated = aligned.filter((cue) => cue.translation).length;
  if (
    Math.min(english.length, available) >= 6 &&
    translated / Math.min(english.length, available) < 0.5
  )
    return aligned.map((cue) => ({ ...cue, translation: '' }));
  return aligned;
}

// Half-open intervals: a cue ending at 3s is no longer active at 3s.
export function activeCues(cues: AlignedCue[], seconds: number): AlignedCue[] {
  if (!Number.isFinite(seconds) || seconds < 0) return [];
  return cues.filter((cue) => cue.start <= seconds && seconds < cue.end);
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`;
}
