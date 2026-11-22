import type { Movie } from '../../types/movie';
import { playerCaptionUrl, captionLanguage, type SelectedCaption } from './captions.ts';
type ProviderMovie = Pick<Movie, 'tmdbId'> | null | undefined;
export type PlayerTab = { id: string; label: string; url: string | null };
export function vidsrcUrl(
  movie: ProviderMovie,
  isTV: boolean,
  season: number,
  episode: number,
  subSlug?: string,
  selection?: SelectedCaption,
): string | null {
  if (!movie?.tmdbId) return null;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const subUrl = playerCaptionUrl(origin, subSlug, selection);
  const base = isTV
    ? `https://vidsrcme.ru/embed/tv/${movie.tmdbId}/${season || 1}/${episode || 1}`
    : `https://vidsrcme.ru/embed/movie/${movie.tmdbId}`;
  if (!subUrl) return base;
  const label = selection?.label || 'Mongolian';
  return `${base}?sub_url=${encodeURIComponent(subUrl)}&sub_label=${encodeURIComponent(label)}&sub_lang=${captionLanguage(label)}`;
}

export function cinesrcUrl(
  movie: ProviderMovie,
  isTV: boolean,
  season: number,
  episode: number,
): string | null {
  if (!movie?.tmdbId) return null;
  return isTV
    ? `https://cinesrc.st/embed/tv/${movie.tmdbId}?s=${season || 1}&e=${episode || 1}`
    : `https://cinesrc.st/embed/movie/${movie.tmdbId}`;
}

export function superEmbedUrl(
  movie: ProviderMovie,
  isTV: boolean,
  season: number,
  episode: number,
): string | null {
  if (!movie?.tmdbId) return null;
  return isTV
    ? `https://multiembed.mov/?video_id=${movie.tmdbId}&tmdb=1&s=${season || 1}&e=${episode || 1}`
    : `https://multiembed.mov/?video_id=${movie.tmdbId}&tmdb=1`;
}

export function embedMasterUrl(
  movie: ProviderMovie,
  isTV: boolean,
  season: number,
  episode: number,
  subSlug?: string,
  selection?: SelectedCaption,
): string | null {
  if (!movie?.tmdbId) return null;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = isTV
    ? `https://embedmaster.link/tv/${movie.tmdbId}/${season || 1}/${episode || 1}`
    : `https://embedmaster.link/movie/${movie.tmdbId}`;
  const subUrl = playerCaptionUrl(origin, subSlug, selection);
  const params = ['skin=onyx', 'welcome_page=off'];
  if (subUrl) {
    params.push(
      `sub_url[]=${encodeURIComponent(subUrl)}`,
      `sub_label[]=${encodeURIComponent(selection?.label || 'Mongolian')}`,
    );
  }
  return `${base}?${params.join('&')}`;
}

export function embedApiStreamUrl(
  movie: ProviderMovie,
  isTV: boolean,
  season: number,
  episode: number,
): string | null {
  if (!movie?.tmdbId) return null;
  return isTV
    ? `https://watch.embed-api.stream/embed/tv/${movie.tmdbId}/${season || 1}/${episode || 1}`
    : `https://watch.embed-api.stream/embed/movie/${movie.tmdbId}`;
}

export function getPlayerTabs(
  movie: ProviderMovie,
  isTV: boolean,
  season: number,
  episode: number,
  subSlug?: string,
  selection?: SelectedCaption,
): PlayerTab[] {
  return movie?.tmdbId
    ? [
        {
          id: 'vidsrc',
          label: 'Player 1 · VidSrc',
          url: vidsrcUrl(movie, isTV, season, episode, subSlug, selection),
        },
        {
          id: 'cine',
          label: 'Player 2 · CineSrc',
          url: cinesrcUrl(movie, isTV, season, episode),
        },
        {
          id: 'superembed',
          label: 'Player 3 · SuperEmbed',
          url: superEmbedUrl(movie, isTV, season, episode),
        },
        {
          id: 'embedmaster',
          label: 'Player 4 · EmbedMaster',
          url: embedMasterUrl(movie, isTV, season, episode, subSlug, selection),
        },
        {
          id: 'embedapi',
          label: 'Player 5 · Embed API',
          url: embedApiStreamUrl(movie, isTV, season, episode),
        },
      ].filter((t) => t.url)
    : [];
}
