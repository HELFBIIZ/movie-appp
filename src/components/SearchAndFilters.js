'use client'

import { useMemo, useState } from 'react'
import MovieCarousel from '@/components/MovieCarousel'

export default function SearchAndFilters({ movies, upcomingMovies, topRatedMovies }) {
  const [query, setQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')

  const genres = useMemo(() => {
    const all = movies.flatMap((movie) => movie.genres || [])
    return ['All', ...new Set(all)]
  }, [movies])

  const filteredMovies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return movies.filter((movie) => {
      const titleMatch = !normalizedQuery || movie.title.toLowerCase().includes(normalizedQuery)
      const genreMatch = selectedGenre === 'All' || movie.genres.includes(selectedGenre)
      return titleMatch && genreMatch
    })
  }, [movies, query, selectedGenre])

  const filteredUpcoming = filteredMovies.filter((movie) => movie.category === 'upcoming')
  const filteredTopRated = filteredMovies.filter((movie) => movie.category === 'top-rated')
  const hasResults = filteredUpcoming.length > 0 || filteredTopRated.length > 0

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <label htmlFor="movie-search" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Search movies
              </label>
              <input
                id="movie-search"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="md:w-56">
              <label htmlFor="genre-filter" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Filter by genre
              </label>
              <select
                id="genre-filter"
                value={selectedGenre}
                onChange={(event) => setSelectedGenre(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {genres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(query || selectedGenre !== 'All') && (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              Showing {filteredMovies.length} movies matching your search.
            </p>
          )}
        </div>
      </section>

      {!hasResults ? (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            No movies match your search. Try another title or genre.
          </div>
        </section>
      ) : (
        <>
          <MovieCarousel title="Upcoming" movies={filteredUpcoming} />
          <MovieCarousel title="Popular" movies={filteredUpcoming} />
          <MovieCarousel title="Top Rated" movies={filteredTopRated} />
        </>
      )}
    </>
  )
}
