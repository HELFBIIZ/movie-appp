import { movies as fallbackMovies } from './movies'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const imageBase = 'https://image.tmdb.org/t/p/w500'
const backdropBase = 'https://image.tmdb.org/t/p/original'

const genreMap = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function getApiKey() {
  return process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY
}

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options)
      if (res.ok) return res
    } catch (e) {
      if (i === retries - 1) throw e
    }
  }
}

async function fetchTrailerYouTubeId(movieId) {
  const apiKey = await getApiKey()
  if (!apiKey) return null

  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/videos?language=en-US`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null

    const data = await res.json()
    const videos = data.results || []
    const trailers = videos.filter(
      (video) => video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser')
    )
    const preferred =
      trailers.find((video) => video.official) || trailers[0] ||
      videos.find((video) => video.site === 'YouTube')

    return preferred?.key || null
  } catch {
    return null
  }
}

async function fetchCast(movieId, limit = 4) {
  const apiKey = await getApiKey()
  if (!apiKey) return []

  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/credits?language=en-US`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return []

    const data = await res.json()
    return (data.cast || []).slice(0, limit).map((c) => c.name)
  } catch {
    return []
  }
}

async function fetchDirector(movieId) {
  const apiKey = await getApiKey()
  if (!apiKey) return null

  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/credits?language=en-US`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null

    const data = await res.json()
    const directors = (data.crew || []).filter((c) => c.job === 'Director')
    return directors.length > 0 ? directors[0].name : null
  } catch {
    return null
  }
}

function formatRuntime(minutes) {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

const languageMap = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ru: 'Russian',
  pt: 'Portuguese',
  it: 'Italian',
  ar: 'Arabic',
  hi: 'Hindi',
}

function normalizeLanguage(code) {
  return languageMap[code] || (code ? code.charAt(0).toUpperCase() + code.slice(1) : 'English')
}

export async function normalizeTmdbMovie(movie) {
  const [trailerId, cast, director] = await Promise.all([
    fetchTrailerYouTubeId(movie.id),
    fetchCast(movie.id, 4),
    fetchDirector(movie.id),
  ])

  const genreNames = []
  if (movie.genres) {
    movie.genres.forEach((g) => {
      if (g.name) genreNames.push(g.name)
    })
  }

  return {
    slug: slugify(movie.title || movie.name || 'movie'),
    title: movie.title || movie.name || 'Untitled Movie',
    year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : 2024,
    rating: Number((movie.vote_average || 0).toFixed(1)),
    genres: genreNames.length > 0 ? genreNames.slice(0, 3) : ['General'],
    runtime: formatRuntime(movie.runtime),
    language: movie.original_language ? normalizeLanguage(movie.original_language) : 'English',
    director: director || 'TBD',
    cast: cast.length > 0 ? cast : ['TBD'],
    plot: movie.overview || 'No overview available.',
    poster: movie.poster_path ? `${imageBase}${movie.poster_path}` : null,
    banner: movie.backdrop_path ? `${imageBase}${movie.backdrop_path}` : null,
    trailerYouTubeId: trailerId || null,
    category: 'tmdb',
  }
}

export async function fetchTmdbMovies(page = 1) {
  const apiKey = await getApiKey()

  if (!apiKey) {
    return fallbackMovies
  }

  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/popular?language=en-US&page=${page}`, {
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
    const results = (data.results || []).slice(0, 20)

    const normalized = await Promise.all(
      results.map((movie) => normalizeTmdbMovie(movie))
    )

    return normalized
  } catch {
    console.error('TMDB fetch failed, using fallback movies')
    return fallbackMovies
  }
}

export async function searchTmdbMovies(query, page = 1) {
  const apiKey = await getApiKey()

  if (!apiKey || !query) {
    return fallbackMovies.filter((m) =>
      m.title.toLowerCase().includes(query?.toLowerCase() || '')
    )
  }

  try {
    const res = await fetch(`${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=${page}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return []
    }

    const data = await res.json()
    const results = (data.results || []).slice(0, 20)

    return Promise.all(
      results.map((movie) => normalizeTmdbMovie(movie))
    )
  } catch {
    return []
  }
}

export async function getTmdbMovieDetails(movieId) {
  const apiKey = await getApiKey()

  if (!apiKey) {
    return null
  }

  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?language=en-US`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    return normalizeTmdbMovie(data)
  } catch {
    return null
  }
}
