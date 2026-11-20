"use client"

import { useEffect, useState } from "react"

const TYPE_COLORS = {
  sub: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  flatrate: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  ads: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  free: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  rent: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  buy: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
}

function Badge({ type, label }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
        TYPE_COLORS[type] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {label}
    </span>
  )
}

export default function WhereToWatch({ tmdbId }) {
  const [state, setState] = useState({ loading: Boolean(tmdbId), sources: [] })
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!tmdbId) {
      setState({ loading: false, sources: [] })
      return
    }

    let cancelled = false
    setState({ loading: true, sources: [] })

    fetch(`/api/watchmode/sources?tmdbId=${encodeURIComponent(tmdbId)}`)
      .then((res) => (res.ok ? res.json() : { sources: [] }))
      .then((data) => {
        if (!cancelled) {
          setState({ loading: false, sources: data.sources || [] })
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ loading: false, sources: [] })
          setError(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [tmdbId])

  if (!tmdbId) return null

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-4 text-xl font-bold">Where to watch</h3>

      {state.loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      )}

      {!state.loading && state.sources.length === 0 && !error && (
        <p className="text-sm text-slate-500">No streaming options found yet.</p>
      )}

      {!state.loading && error && (
        <p className="text-sm text-slate-500">Unable to load streaming options.</p>
      )}

      {!state.loading && state.sources.length > 0 && (
        <div className="space-y-2">
          {state.sources.map((s) => {
            const row = (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="text-sm font-medium">{s.name}</span>
                <Badge type={s.type} label={s.label} />
              </div>
            )
            return s.url ? (
              <a
                key={`${s.name}-${s.type}`}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-slate-200 bg-white transition-all hover:border-[#d6b456]/60 hover:shadow-md dark:border-slate-700 dark:bg-slate-950 dark:hover:border-[#c9a227]/50"
              >
                {row}
              </a>
            ) : (
              <div
                key={`${s.name}-${s.type}`}
                className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
              >
                {row}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}