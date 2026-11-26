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
