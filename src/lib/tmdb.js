import { movies as fallbackMovies } from './movies'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const imageBase = 'https://image.tmdb.org/t/p/w500'

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizeTmdbMovie(movie) {
  const genreNames = (movie.genre_ids || []).slice(0, 3).map((id) => ({
    id,
    name: id,
  }))

  return {
    id: movie.id,
    slug: slugify(movie.title || movie.name || 'movie'),
    title: movie.title || movie.name || 'Untitled movie',
    year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : new Date().getFullYear(),
    rating: Number((movie.vote_average || 0).toFixed(1)),
    genres: genreNames.length ? genreNames.map((genre) => genre.name || 'General') : ['General'],
    runtime: '2h 0m',
    language: 'English',
    director: 'Director TBD',
    cast: ['Cast TBD'],
    plot: movie.overview || 'No overview available yet.',
    poster: movie.poster_path ? `${imageBase}${movie.poster_path}` : fallbackMovies[0]?.poster,
    banner: movie.backdrop_path ? `${imageBase}${movie.backdrop_path}` : fallbackMovies[0]?.banner,
    trailerYouTubeId: 'aqz-KE-bpKQ',
    category: 'upcoming',
  }
}

export async function fetchTmdbMovies() {
  const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY

  if (!apiKey) {
    return fallbackMovies
  }

  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/popular?language=en-US&page=1`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return fallbackMovies
    }

    const data = await res.json()
    return (data.results || []).slice(0, 12).map(normalizeTmdbMovie)
  } catch (error) {
    console.error('TMDB fetch failed:', error)
    return fallbackMovies
  }
}
