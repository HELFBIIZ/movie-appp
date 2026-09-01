import { fallbackMovies, movies } from '@/lib/movies'
import { fetchTmdbMovies } from '@/lib/tmdb'

export async function GET() {
  const tmdbMovies = await fetchTmdbMovies()
  const payload = tmdbMovies?.length ? tmdbMovies : fallbackMovies || movies

  return Response.json({
    source: process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY ? 'tmdb' : 'fallback',
    movies: payload,
    count: payload.length,
  })
}
