'use client'

import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getMovieBySlug } from '@/lib/movies'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SubtitlePanel from '@/components/SubtitlePanel'

const SERIES_CATEGORIES = new Set(['kdrama', 'western', 'tv', 'series'])

function vidsrcUrl(movie, isTV, season, episode, subSlug) {
  if (!movie?.tmdbId) return null
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const subUrl = subSlug && origin ? `${origin}/api/subtitles/mongolian/${encodeURIComponent(subSlug)}` : null
  const base = isTV
    ? `https://vidsrcme.ru/embed/tv/${movie.tmdbId}/${season || 1}/${episode || 1}`
    : `https://vidsrcme.ru/embed/movie/${movie.tmdbId}`
  if (!subUrl) return base
  return `${base}?sub_url=${encodeURIComponent(subUrl)}&sub_label=${encodeURIComponent('Mongolian')}&sub_lang=mn`
}

function cinesrcUrl(movie, isTV, season, episode) {
  if (!movie?.tmdbId) return null
  return isTV
    ? `https://cinesrc.st/embed/tv/${movie.tmdbId}?s=${season || 1}&e=${episode || 1}`
    : `https://cinesrc.st/embed/movie/${movie.tmdbId}`
}

export default function WatchPage() {
  const { slug } = useParams()
  const movie = getMovieBySlug(slug)

  const isTV = SERIES_CATEGORIES.has(movie?.category) && (movie?.episodes ?? 0) > 1
  const totalEpisodes = isTV ? movie.episodes : 0
  const totalSeasons = isTV ? (movie?.seasons || Math.ceil(totalEpisodes / 16) || 1) : 1
  const [season, setSeason] = useState(1)
  const [episode, setEpisode] = useState(1)
  const [gate, setGate] = useState({ status: 'loading' })

  const [, setSubtitleUrl] = useState(null)
  const [, setSubtitleLabel] = useState('Mongolian')
  const [source, setSource] = useState('vidsrc')

  const subSlug = isTV
    ? `${slug}-S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
    : slug
  // Only two players: VidSrc (Player 1, with Mongolian track) + CineSrc (Player 2).
  const visibleTabs = movie?.tmdbId
    ? [
        { id: 'vidsrc', label: 'Player 1 · VidSrc', url: vidsrcUrl(movie, isTV, season, episode, subSlug) },
        { id: 'cine', label: 'Player 2 · CineSrc', url: cinesrcUrl(movie, isTV, season, episode) },
      ].filter((t) => t.url)
    : []
  const activeEmbed = visibleTabs.find((t) => t.id === source)?.url || null

  // If the available player list shrinks (or title/episode changes), fall back
  // to the first player instead of a stale tab.
  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === source)) setSource('vidsrc')
  }, [visibleTabs, source])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/watch/${slug}`, { method: 'POST' })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (cancelled) return
        if (data.allowed) {
          setGate({ status: 'allowed', player: data.player, xp: data.xp })
        } else {
          setGate({ status: 'blocked', code: data.error?.code ?? 'BLOCKED', statusCode: res.status })
        }
      })
      .catch(() => !cancelled && setGate({ status: 'blocked', code: 'NETWORK' }))
    return () => { cancelled = true }
  }, [slug])

  if (!movie) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white page-enter">
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link
          href={`/movie/${movie.slug}`}
          className="mb-6 inline-block text-sm text-[#c9a227] transition-all hover:text-amber-300 hover:-translate-x-1"
        >
          ← Back to movie details
        </Link>

        <div className="mb-6 flex items-center justify-between gap-4 animate-fade-in-down">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Now Watching</p>
            <h1 className="text-3xl font-bold md:text-4xl gradient-text">{movie.title}</h1>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200 animate-fade-in delay-100">
            ★ {movie.rating ?? '—'}{movie.rating ? '/10' : ''}
          </div>
        </div>

        {gate.status === 'loading' && (
          <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 animate-scale-in">
            <p className="animate-pulse text-slate-400">Checking your access…</p>
          </div>
        )}

        {gate.status === 'blocked' && (
          <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 px-6 text-center animate-scale-in">
            <p className="text-2xl">🔒</p>
            <h2 className="mt-2 text-xl font-semibold">This title needs VIP</h2>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              {gate.statusCode === 401
                ? 'Sign in to your account to continue.'
                : 'You need an active subscription to watch this title.'}
            </p>
            <div className="mt-5 flex gap-3">
              {gate.statusCode === 401 ? (
                <Link href="/login" className="rounded-xl bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-5 py-2.5 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110">
                  Sign in
                </Link>
              ) : (
                <Link href="/pricing" className="rounded-xl bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-5 py-2.5 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110">
                  Get VIP
                </Link>
              )}
            </div>
            <p className="mt-4 text-xs text-slate-600">({gate.code})</p>
          </div>
        )}

        {gate.status === 'allowed' && (
          <>
            {movie.tmdbId ? (
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-lg transition-all hover:shadow-xl animate-scale-in">
                <div className="flex items-center gap-1 border-b border-slate-800 bg-slate-900/60 px-4 py-2.5 animate-fade-in-down">
                  <span className="mr-2 text-xs uppercase tracking-wider text-slate-500">Player</span>
                  {visibleTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSource(tab.id)}
                      aria-pressed={source === tab.id}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                        source === tab.id
                          ? 'bg-[#c9a227] text-[#1a150b] shadow-[0_6px_18px_-6px_rgba(214,180,86,0.5)]'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      ▶ {tab.label}
                    </button>
                  ))}
                  {gate.xp?.gained ? (
                    <span className="ml-auto rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-300">+{gate.xp.gained} XP</span>
                  ) : null}
                </div>
                <div className="aspect-video w-full">
<iframe
  key={`${source}-${season}-${episode}`}
  src={activeEmbed}
  className="h-full w-full"
  frameBorder="0"
  allowFullScreen
  allow="autoplay; fullscreen; picture-in-picture"
  referrerPolicy="no-referrer"
  title={`${movie.title} player`}
/>
                </div>
{source === 'vidsrc' && (
   <div className="flex items-center gap-2 border-t border-slate-800 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">
     <span>💡</span>
     <span>
       Монгол хадмал тоглуулагч дотор CC товчоор сонгогдоно (Mongolian track суулгасан).
     </span>
   </div>
)}
              </div>
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 animate-scale-in">
                <p className="px-6 text-center text-slate-400">
                  {movie.tmdbId
                    ? 'Streaming unavailable for this title.'
                    : 'No source available for this title yet.'}
                </p>
              </div>
            )}

            <div className="mt-4">
              <SubtitlePanel
                tmdbId={movie.tmdbId}
                isTV={isTV}
                season={season}
                episode={episode}
                title={movie.title}
                year={movie.year}
                slug={movie.slug}
onSubtitleChange={(url, label) => {
                   setSubtitleUrl(url)
                   if (label) setSubtitleLabel(label)
                 }}
              />
            </div>

            {isTV && totalEpisodes > 1 && (
              <div className="mt-6 flex flex-wrap items-center gap-3 animate-fade-in-up delay-100">
                <label className="text-sm text-slate-400">Season</label>
                <select
                  value={season}
                  onChange={(e) => {
                    setSeason(Number(e.target.value))
                    setEpisode(1)
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-[#d6b456] focus:outline-none"
                >
                  {Array.from({ length: totalSeasons }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>

                <label className="text-sm text-slate-400">Episode</label>
                <select
                  value={episode}
                  onChange={(e) => setEpisode(Number(e.target.value))}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-[#d6b456] focus:outline-none"
                >
                  {Array.from({ length: totalEpisodes }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-8 animate-fade-in-up delay-200">
              <h2 className="mb-2 text-xl font-semibold">About this {isTV ? 'series' : 'film'}</h2>
              <p className="text-slate-400">{movie.plot}</p>
            </div>
          </>
        )}
      </div>

      <Footer />
    </main>
  )
}