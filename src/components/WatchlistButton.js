'use client'

import { useEffect, useState, useCallback } from 'react'

const WATCHLIST_KEY = 'moviez-watchlist'

export default function WatchlistButton({ movie }) {
  const [isSaved, setIsSaved] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]')
    setIsSaved(stored.includes(movie.slug))
  }, [movie.slug])

  const toggleWatchlist = useCallback(() => {
    setIsAnimating(true)
    const stored = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]')
    const next = stored.includes(movie.slug)
      ? stored.filter((slug) => slug !== movie.slug)
      : [...stored, movie.slug]

    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next))
    setIsSaved(!isSaved)
    
    setTimeout(() => setIsAnimating(false), 600)
  }, [movie.slug, isSaved])

  return (
    <button
      onClick={toggleWatchlist}
      className={`relative overflow-hidden rounded-lg px-5 py-3 font-semibold transition-all duration-300 transform ${
        isAnimating ? 'scale-95' : 'scale-100'
      } ${
        isSaved
          ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 hover:from-yellow-300 hover:to-orange-300 shadow-lg shadow-yellow-500/20'
          : 'bg-gradient-to-r from-[#c9a227] to-[#e7c779] text-[#1a150b] hover:brightness-110 shadow-[0_8px_22px_-8px_rgba(214,180,86,0.45)]'
      }`}
      style={{
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <span className="relative z-10 flex items-center gap-2">
        <span
          className={`inline-block transition-all duration-300 ${
            isAnimating ? 'scale-125 rotate-12' : 'scale-100'
          }`}
        >
          {isSaved ? '★' : '+'}
        </span>
        {isSaved ? 'In watchlist' : 'Add to watchlist'}
      </span>
    </button>
  )
}
