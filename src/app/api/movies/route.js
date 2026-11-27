import { fallbackMovies, movies } from '@/lib/movies';
import { fetchTmdbMovies } from '@/lib/tmdb';

export async function GET() {
  const tmdbMovies = await fetchTmdbMovies();
  const payload = tmdbMovies?.length ? tmdbMovies : fallbackMovies || movies;

  return Response.json({
    source: tmdbMovies?.length ? 'tmdb' : 'fallback',
    movies: payload,
    count: payload.length,
  });
}
