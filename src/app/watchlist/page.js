'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { movies as fallbackMovies } from '@/lib/movies'

const WATCHLIST_KEY = 'moviez-watchlist'

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([])

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]')
    const items = fallbackMovies.filter((movie) => saved.includes(movie.slug))
    setWatchlist(items)
  }, [])

  if (watchlist.length === 0) {
    return (
      <main className="min-h-screen bg-white px-4 py-16 text-slate-900 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-4xl rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <h1 className="mb-3 text-3xl font-bold">Your watchlist is empty</h1>
          <p className="mb-6 text-slate-600 dark:text-slate-300">Add a few movies to keep track of what you want to watch next.</p>
          <Link href="/" className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white">
            Browse movies
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-red-400">Saved</p>
            <h1 className="text-4xl font-black">Watchlist</h1>
          </div>
          <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            Back to home
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {watchlist.map((movie) => (
            <Link key={movie.slug} href={`/movie/${movie.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="relative h-72 w-full">
                <Image src={movie.poster} alt={movie.title} fill className="object-cover" />
              </div>
              <div className="space-y-2 p-4">
                <h2 className="text-lg font-semibold">{movie.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{movie.year} • {movie.rating}/10</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
