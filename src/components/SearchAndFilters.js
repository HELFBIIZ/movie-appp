'use client'

import { useMemo, useState } from 'react'
import MovieCarousel from '@/components/MovieCarousel'

export default function SearchAndFilters({ movies, upcomingMovies, topRatedMovies }) {
  const [query, setQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [selectedYear, setSelectedYear] = useState('All')
  const [sortBy, setSortBy] = useState('rating')

  const genres = useMemo(() => {
    const all = movies.flatMap((movie) => movie.genres || [])
    return ['All', ...new Set(all)]
  }, [movies])

  const years = useMemo(() => {
    const allYears = movies.map((m) => m.year)
    return ['All', ...[...new Set(allYears)].sort((a, b) => b - a)]
  }, [movies])

  const filteredMovies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return movies.filter((movie) => {
      const titleMatch = !normalizedQuery || movie.title.toLowerCase().includes(normalizedQuery)
      const genreMatch = selectedGenre === 'All' || movie.genres.includes(selectedGenre)
      const yearMatch = selectedYear === 'All' || movie.year === Number(selectedYear)
      return titleMatch && genreMatch && yearMatch
    }).sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating
        case 'year':
          return b.year - a.year
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })
  }, [movies, query, selectedGenre, selectedYear, sortBy])

  const filteredUpcoming = filteredMovies.filter((movie) => movie.category === 'upcoming')
  const filteredTopRated = filteredMovies.filter((movie) => movie.category === 'top-rated')
  const filteredPopular = filteredMovies.filter((movie) => movie.category === 'popular')
  const filteredKdramas = filteredMovies.filter((movie) => movie.category === 'kdrama')
  const filteredWestern = filteredMovies.filter((movie) => movie.category === 'western')
  const filteredWesternModern = filteredWestern.filter((m) => m.year >= 2020 && m.year <= 2026)
  const hasResults = filteredUpcoming.length > 0 || filteredTopRated.length > 0 || filteredPopular.length > 0 || filteredKdramas.length > 0 || filteredWestern.length > 0

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-8 page-enter">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70">
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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 transition-all focus:border-[#d6b456] focus:ring-2 focus:ring-[#d6b456]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="md:w-40">
              <label htmlFor="genre-filter" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Genre
              </label>
              <select
                id="genre-filter"
                value={selectedGenre}
                onChange={(event) => setSelectedGenre(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-[#d6b456] focus:ring-2 focus:ring-[#d6b456]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {genres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:w-36">
              <label htmlFor="year-filter" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Year
              </label>
              <select
                id="year-filter"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-[#d6b456] focus:ring-2 focus:ring-[#d6b456]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:w-36">
              <label htmlFor="sort-by" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Sort by
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-[#d6b456] focus:ring-2 focus:ring-[#d6b456]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="rating">Rating</option>
                <option value="year">Year</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>

          {(query || selectedGenre !== 'All' || selectedYear !== 'All') && (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 animate-fade-in">
              Showing {filteredMovies.length} movies matching your search.
            </p>
          )}
        </div>
      </section>

      {!hasResults ? (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 animate-fade-in-up">
            <svg className="mx-auto mb-4 h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            <h3 className="mb-2 text-lg font-semibold">No movies found</h3>
            <p className="text-sm">Try adjusting your search or filters to find what you&apos;re looking for.</p>
          </div>
        </section>
      ) : (
        <>
          {filteredUpcoming.length > 0 && <MovieCarousel title="Upcoming" movies={filteredUpcoming} />}
          {filteredPopular.length > 0 && <MovieCarousel title="Popular" movies={filteredPopular} />}
          {filteredTopRated.length > 0 && <MovieCarousel title="Top Rated" movies={filteredTopRated} />}
          {filteredKdramas.length > 0 && <MovieCarousel title="K-Dramas" movies={filteredKdramas} categoryTag="kdrama" />}
          {filteredWestern.length > 0 && <MovieCarousel title="Western Series" movies={filteredWestern} categoryTag="western" />}
          {filteredWesternModern.length > 0 && <MovieCarousel title="Modern Westerns (2020–2026)" movies={filteredWesternModern} categoryTag="western-modern" />}
        </>
      )}
    </>
  )
}
