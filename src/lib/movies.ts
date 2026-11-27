import tmdbArtData from './posters.json';
import kdramaArtData from './kdrama-posters.json';
import fetchedCatalog from './movies.generated.json';
import kdramaCatalog from './kdramas.json';
import westernCatalog from './western.json';

import type { Movie, MovieArtwork } from '../types/movie';
import { popularFallbackMovies } from './catalog/curated';
import { makePosterUrl, makeBannerUrl } from './catalog/art';
import { assignCatalogSlugs } from './catalog/identity';

const tmdbArt: Record<string, MovieArtwork | null> = tmdbArtData;
const kdramaArt: Record<string, MovieArtwork | null> = kdramaArtData;

const curatedSlugs = new Set(popularFallbackMovies.map((movie) => movie.slug));
const generatedMovies = (fetchedCatalog.movies || [])
  .filter((movie) => movie?.slug && !curatedSlugs.has(movie.slug))
  .map((movie) => ({
    ...movie,
    poster: movie.poster || makePosterUrl(movie.title),
    banner: movie.banner || makeBannerUrl(movie.title),
  }));

const kdramaCatalogMovies = (kdramaCatalog || [])
  .filter((movie) => movie?.slug)
  .map((movie) => ({
    ...movie,
    poster: kdramaArt[movie.slug]?.poster || makePosterUrl(movie.title),
    banner: kdramaArt[movie.slug]?.banner || makeBannerUrl(movie.title),
    tmdbId: kdramaArt[movie.slug]?.tmdbId || null,
  }));

const westernCatalogMovies = (westernCatalog || [])
  .filter((movie) => movie?.slug)
  .map((movie) => ({
    ...movie,
    poster: movie.poster || makePosterUrl(movie.title),
    banner: movie.banner || makeBannerUrl(movie.title),
  }));

export const movies: Movie[] = assignCatalogSlugs([
  ...popularFallbackMovies.map((movie) => {
    const art = tmdbArt[movie.slug];
    return {
      ...movie,
      poster: art?.poster || makePosterUrl(movie.title),
      banner: art?.banner || makeBannerUrl(movie.title),
      tmdbId: art?.tmdbId || null,
    };
  }),
  ...kdramaCatalogMovies,
  ...westernCatalogMovies,
  ...generatedMovies,
]);

export const fallbackMovies = movies;
export const featuredMovie = movies[0];
export const upcomingMovies = movies.filter((movie) => movie.category === 'upcoming');
export const topRatedMovies = movies.filter((movie) => movie.category === 'top-rated');
export const kdramaMovies = movies.filter((movie) => movie.category === 'kdrama');
export const popularMovies = movies.filter((movie) => movie.category === 'popular');
export const westernMovies = movies.filter((movie) => movie.category === 'western');
export const kdramas2026 = kdramaMovies
  .filter((movie) => movie.year === 2026 && movie.poster && movie.banner)
  .sort((a, b) => (b.rating || 0) - (a.rating || 0));

export function getMovieBySlug(slug: string | undefined) {
  return movies.find((movie) => movie.slug === slug);
}

export const allGenres = Array.from(new Set(movies.flatMap((movie) => movie.genres)));

export function getMoviesByGenre(genre: string) {
  return movies.filter((movie) => movie.genres.includes(genre));
}

export function getRecommendations(movie?: Movie | null, count = 6) {
  if (!movie) return movies.slice(0, count);
  const other = movies.filter((m) => m.slug !== movie.slug);
  const scored = other.map((m) => {
    let score = 0;
    score += m.genres.filter((g) => movie.genres.includes(g)).length * 10;
    score += Math.abs(m.year - movie.year) <= 3 ? 5 : 0;
    score += Math.abs(Number(m.rating) - Number(movie.rating)) <= 1 ? 3 : 0;
    score += Number(m.rating);
    return { movie: m, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.movie);
}

export function getTopRecentlyAdded(count = 10) {
  const near = new Date();
  return [...movies]
    .filter((m) => m.year >= near.getFullYear() - 3 && Number(m.rating) >= 6)
    .sort((a, b) => b.year - a.year || Number(b.rating) - Number(a.rating))
    .slice(0, count);
}

export function getTrendingMovies(count = 5) {
  return [...movies]
    .filter((m) => Number(m.rating) >= 7)
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, count);
}
