'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
import { movies as fallbackMovies } from '@/lib/movies'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const WATCHLIST_KEY = 'moviez-watchlist'

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [removingSlug, setRemovingSlug] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const loadServerFavorites = useCallback(async () => {
    try {
      const res = await fetch('/api/favorites')
      const data = await res.json()
      if (data.favorites?.length) {
        const slugs = data.favorites.map(f => f.movieId)
        setWatchlist(fallbackMovies.filter(m => slugs.includes(m.slug) || slugs.includes(m.id)))
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.me) {
          setIsLoggedIn(true)
          loadServerFavorites()
        } else {
          const saved = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]')
          setWatchlist(fallbackMovies.filter((movie) => saved.includes(movie.slug)))
        }
        setIsLoaded(true)
      })
      .catch(() => {
        const saved = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]')
        setWatchlist(fallbackMovies.filter((movie) => saved.includes(movie.slug)))
        setIsLoaded(true)
      })
  }, [loadServerFavorites])

  const removeFromWatchlist = async (slug) => {
    setRemovingSlug(slug)
    if (isLoggedIn) {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
    } else {
      const saved = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]')
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(saved.filter((s) => s !== slug)))
    }
    setWatchlist((prev) => prev.filter((m) => m.slug !== slug))
    setTimeout(() => setRemovingSlug(null), 300)
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
        <Header />
        <div className="px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <div className="skeleton h-10 w-48 rounded mb-4" />
            <div className="skeleton h-6 w-full rounded mb-8" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="skeleton aspect-[2/3] w-full rounded-2xl" />
                  <div className="skeleton h-5 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/2 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (watchlist.length === 0) {
    return (
      <main className="min-h-screen bg-white dark:bg-slate-950">
        <Header />
        <div className="px-4 py-16 text-slate-900 dark:text-white">
          <div className="mx-auto max-w-4xl rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900 animate-fade-in-up">
            <svg className="mx-auto mb-4 h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h1 className="mb-3 text-3xl font-bold">Your watchlist is empty</h1>
            <p className="mb-6 text-slate-600 dark:text-slate-300">Add a few movies to keep track of what you want to watch next.</p>
            <Link href="/" className="relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-6 py-3 font-bold text-[#1a150b] transition-all duration-300 hover:brightness-110 shadow-[0_10px_28px_-10px_rgba(214,180,86,0.5)]">
              Browse movies
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <Header />
      <div className="px-4 py-12 text-slate-900 dark:text-white">
        <div className="mx-auto max-w-6xl">
        <div className={`mb-8 flex items-center justify-between gap-4 transition-all duration-700 animate-fade-in-down`}>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Saved</p>
            <h1 className="text-4xl font-black">Watchlist</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{watchlist.length} movies saved</p>
          </div>
          <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition-all hover:bg-slate-100 hover:shadow-md hover:-translate-y-0.5 dark:border-slate-700 dark:hover:bg-slate-800">
            Back to home
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {watchlist.map((movie, index) => (
            <div
              key={movie.slug}
              className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 ${
                removingSlug === movie.slug
                  ? 'scale-95 opacity-0 -translate-y-4'
                  : 'card-hover'
              }`}
              style={{
                animation: `fadeInUp 0.5s ease-out ${index * 0.03}s forwards`,
                opacity: 0
              }}
            >
              <Link href={`/movie/${movie.slug}`}>
                <div className="image-zoom relative h-72 w-full">
                  <Image src={movie.poster} alt={movie.title} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute bottom-0 left-0 right-0 translate-y-full p-3 transition-transform duration-300 group-hover:translate-y-0">
                    <div className="flex items-center gap-1 text-sm text-yellow-400">
                      <span>★</span>
                      <span className="font-medium">{movie.rating}/10</span>
                    </div>
                  </div>
                </div>
              </Link>
              <div className="space-y-2 p-4">
                <Link href={`/movie/${movie.slug}`}>
                  <h2 className="text-lg font-semibold transition-colors group-hover:text-[#8a6d1f] dark:group-hover:text-amber-200">{movie.title}</h2>
                </Link>
                <p className="text-sm text-slate-500 dark:text-slate-400">{movie.year} • {movie.genres.slice(0, 2).join(', ')}</p>
              </div>
              <button
                onClick={() => removeFromWatchlist(movie.slug)}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 backdrop-blur-sm transition-all duration-300 hover:bg-red-500 group-hover:opacity-100"
                aria-label={`Remove ${movie.title} from watchlist`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
      </div>
      <Footer />
    </main>
  )
}
