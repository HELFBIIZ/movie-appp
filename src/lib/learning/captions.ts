import { parseExistingVtt } from './movie.ts';
import { hasMongolianMeaning } from './sentence-text.ts';

export type CaptionCandidate = {
  fileId?: number;
  language?: string;
  tmdbId?: number;
  parentTmdbId?: number;
  season?: number;
  episode?: number;
};
export function captionMatches(
  candidate: CaptionCandidate,
  identity: { tmdbId: number; mediaType: 'movie' | 'tv'; season: number; episode: number },
  language: string,
) {
  if (!candidate.fileId || candidate.language !== language) return false;
  return identity.mediaType === 'movie'
    ? Number(candidate.tmdbId) === identity.tmdbId
    : Number(candidate.parentTmdbId) === identity.tmdbId &&
        Number(candidate.season) === identity.season &&
        Number(candidate.episode) === identity.episode;
}
export function usableMongolian(text: string): boolean {
  try {
    const cues = parseExistingVtt(text);
    const mongolian = cues.filter((cue) => hasMongolianMeaning(cue.text)).length;
    return cues.length > 0 && mongolian / cues.length >= 0.6;
  } catch {
    return false;
  }
}

function timestamp(seconds: number): string {
  const millis = Math.round(seconds * 1000);
  return `${String(Math.floor(millis / 3_600_000)).padStart(2, '0')}:${String(Math.floor(millis / 60_000) % 60).padStart(2, '0')}:${String(Math.floor(millis / 1000) % 60).padStart(2, '0')}.${String(millis % 1000).padStart(3, '0')}`;
}

// Retain available MN lines even in a mostly untranslated legacy file. Do not
// relabel its English lines as MN or move later translations into earlier gaps.
export function mongolianTrack(text: string) {
  try {
    const cues = parseExistingVtt(text);
    const translated = cues.filter((cue) => hasMongolianMeaning(cue.text));
    if (!translated.length) return null;
    const blocks = translated.map((cue) => {
      const plain = cue.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `${cue.id}\n${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${plain}`;
    });
    return {
      content: `WEBVTT\n\n${blocks.join('\n\n')}\n`,
      cueCount: translated.length,
      partial: translated.length / cues.length < 0.98,
    };
  } catch {
    return null;
  }
}
