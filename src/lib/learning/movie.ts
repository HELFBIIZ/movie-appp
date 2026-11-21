import type { AlignedCue, Cue } from './types.ts';
import { alignCues, parseVtt } from './vtt.ts';

export const SPIDER_MAN = {
  slug: 'spider-man-brand-new-day',
  tmdbId: 969681,
  subtitleUrl: '/api/subtitles/mongolian/spider-man-brand-new-day',
  subtitleVerification: 'unverified',
} as const;

// The existing batch generator omitted blank separators between numbered cues.
// Repair delimiters in memory only. Do not rewrite the asset or alter timing/text.
// Comment/style/region blocks use the strict parser to avoid reinterpreting notes.
export function parseExistingVtt(text: string): Cue[] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (/^(NOTE|STYLE|REGION)(?:\s|$)/m.test(normalized)) return parseVtt(normalized);
  const separated = normalized.replace(
    /\n(\d+)\n(?=\d{2,}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2,}:\d{2}:\d{2}\.\d{3})/g,
    '\n\n$1\n',
  );
  return parseVtt(separated);
}

export function internalEnglishSource(input: string, origin: string): string | null {
  try {
    const url = new URL(input, origin);
    return url.origin === origin &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password &&
      /^\/api\/subtitles\/source\/[a-f0-9-]{36}$/i.test(url.pathname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function shiftCues(cues: Cue[], offset: number): Cue[] {
  if (!Number.isFinite(offset) || Math.abs(offset) > 600)
    throw new Error('Offset: −600…600 секунд.');
  return cues
    .filter((cue) => cue.end + offset > 0)
    .map((cue) => ({
      ...cue,
      start: Math.max(0, cue.start + offset),
      end: cue.end + offset,
    }));
}

export function movieCues(mn: Cue[], en: Cue[], enOffset: number, mnOffset: number): AlignedCue[] {
  const translated = shiftCues(mn, mnOffset);
  if (en.length) return alignCues(shiftCues(en, enOffset), translated);
  return translated.map((cue) => ({ ...cue, translation: '', language: 'mn' }));
}

export async function transcriptFingerprint(en: string, mn: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${en}\u0000${mn}`));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
