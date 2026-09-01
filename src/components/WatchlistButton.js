'use client'

import { useEffect, useState } from 'react'

const WATCHLIST_KEY = 'moviez-watchlist'

export default function WatchlistButton({ movie }) {
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]')
    setIsSaved(stored.includes(movie.slug))
  }, [movie.slug])

  const toggleWatchlist = () => {
    const stored = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]')
    const next = stored.includes(movie.slug)
      ? stored.filter((slug) => slug !== movie.slug)
      : [...stored, movie.slug]

    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next))
    setIsSaved(!isSaved)
  }

  return (
    <button
      onClick={toggleWatchlist}
      className={`rounded-lg px-5 py-3 font-semibold transition ${
        isSaved
          ? 'bg-white text-slate-900 hover:bg-slate-100'
          : 'bg-red-600 text-white hover:bg-red-500'
      }`}
    >
      {isSaved ? '★ In watchlist' : '+ Add to watchlist'}
    </button>
  )
}
