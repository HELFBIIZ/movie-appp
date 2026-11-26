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

export function alignCues(english: Cue[], mongolian: Cue[]): AlignedCue[] {
  return english.map((cue) => ({
    ...cue,
    translation: mongolian
      .filter(
        (translation) =>
          Math.min(cue.end, translation.end) > Math.max(cue.start, translation.start) &&
          hasMongolianMeaning(translation.text),
      )
      .map((translation) => translation.text)
      .join(' '),
  }));
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
