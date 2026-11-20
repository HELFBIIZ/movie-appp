'use client'

import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { getMovieBySlug } from '@/lib/movies'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SubtitlePanel from '@/components/SubtitlePanel'
import LearningModeToggle from '@/components/learning/LearningModeToggle'
import { SPIDER_MAN } from '@/lib/learning/movie'

const LearningDock = dynamic(() => import('@/components/learning/LearningDock'), {
  ssr: false,
  loading: () => <p className="py-6 text-slate-400" role="status">SceneChain ачаалж байна…</p>,
})

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

function superEmbedUrl(movie, isTV, season, episode) {
  if (!movie?.tmdbId) return null
  return isTV
    ? `https://multiembed.mov/?video_id=${movie.tmdbId}&tmdb=1&s=${season || 1}&e=${episode || 1}`
    : `https://multiembed.mov/?video_id=${movie.tmdbId}&tmdb=1`
}

function embedMasterUrl(movie, isTV, season, episode, subSlug) {
  if (!movie?.tmdbId) return null
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const base = isTV
    ? `https://embedmaster.link/tv/${movie.tmdbId}/${season || 1}/${episode || 1}`
    : `https://embedmaster.link/movie/${movie.tmdbId}`
  const subUrl = subSlug && origin ? `${origin}/api/subtitles/mongolian/${encodeURIComponent(subSlug)}` : null
  const params = ['skin=onyx', 'welcome_page=off']
  if (subUrl) {
    params.push(`sub_url[]=${encodeURIComponent(subUrl)}`, `sub_label[]=${encodeURIComponent('Mongolian')}`)
  }
  return `${base}?${params.join('&')}`
}

function embedApiStreamUrl(movie, isTV, season, episode) {
  if (!movie?.tmdbId) return null
  return isTV
    ? `https://watch.embed-api.stream/embed/tv/${movie.tmdbId}/${season || 1}/${episode || 1}`
    : `https://watch.embed-api.stream/embed/movie/${movie.tmdbId}`
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

  const [subtitleUrl, setSubtitleUrl] = useState(null)
  const [subtitleLabel, setSubtitleLabel] = useState('Mongolian')
  const handleSubtitleChange = useCallback((url, label) => {
    setSubtitleUrl(url)
    if (label) setSubtitleLabel(label)
  }, [])
  const [source, setSource] = useState('vidsrc')
  const [learning, setLearning] = useState(false)
  const [learningSource, setLearningSource] = useState(() => slug === SPIDER_MAN.slug ? 'movie' : 'sample')
  const movieIframeRef = useRef(null)
  const showMoviePlayer = !learning || learningSource === 'movie'
  useEffect(() => {
    setLearningSource(slug === SPIDER_MAN.slug ? 'movie' : 'sample')
    setSubtitleUrl(null)
    setSubtitleLabel('Mongolian')
  }, [slug])

  const subSlug = isTV
    ? `${slug}-S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
    : slug
  // Five players: VidSrc (1, MN track), CineSrc (2), SuperEmbed (3),
  // EmbedMaster (4, MN track), Embed API Stream (5).
  const visibleTabs = movie?.tmdbId
    ? [
        { id: 'vidsrc', label: 'Player 1 · VidSrc', url: vidsrcUrl(movie, isTV, season, episode, subSlug) },
        { id: 'cine', label: 'Player 2 · CineSrc', url: cinesrcUrl(movie, isTV, season, episode) },
        { id: 'superembed', label: 'Player 3 · SuperEmbed', url: superEmbedUrl(movie, isTV, season, episode) },
        { id: 'embedmaster', label: 'Player 4 · EmbedMaster', url: embedMasterUrl(movie, isTV, season, episode, subSlug) },
        { id: 'embedapi', label: 'Player 5 · Embed API', url: embedApiStreamUrl(movie, isTV, season, episode) },
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

        <LearningModeToggle enabled={learning} onChange={setLearning} />

        {showMoviePlayer && gate.status === 'loading' && (
          <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 animate-scale-in">
            <p className="animate-pulse text-slate-400">Checking your access…</p>
          </div>
        )}

        {showMoviePlayer && gate.status === 'blocked' && (
          <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 px-6 text-center animate-scale-in">
            <p className="text-2xl">🔒</p>
            <h2 className="mt-2 text-xl font-semibold">{gate.statusCode === 401 ? 'Кино үзэхийн тулд нэвтэрнэ үү' : 'Кино үзэхэд VIP эрх хэрэгтэй'}</h2>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              {gate.statusCode === 401
                ? 'Sign in to your account to continue.'
                : 'You need an active subscription to watch this title.'}
            </p>
            <div className="mt-5 flex gap-3">
              {gate.statusCode === 401 ? (
                <Link href="/login" className="rounded-xl bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-5 py-2.5 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110">
                  Нэвтрэх
                </Link>
              ) : (
                <Link href="/pricing" className="rounded-xl bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-5 py-2.5 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110">
                  VIP эрх авах
                </Link>
              )}
            </div>
          </div>
        )}

        {gate.status === 'allowed' && (
          <>
            {showMoviePlayer && (movie.tmdbId ? (
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-lg transition-all hover:shadow-xl animate-scale-in">
                <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 bg-slate-900/60 px-4 py-2.5 animate-fade-in-down">
                  <label className="flex min-w-0 items-center gap-3 text-sm text-slate-400">
                    Тоглуулагч
                    <select
                      value={source}
                      onChange={(event) => setSource(event.target.value)}
                      className="min-w-0 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-slate-100"
                    >
                      {visibleTabs.map((tab) => (
                        <option key={tab.id} value={tab.id}>{tab.label.replace('Player ', '')}</option>
                      ))}
                    </select>
                  </label>
                  {gate.xp?.gained ? (
                    <span className="ml-auto rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-300">+{gate.xp.gained} XP</span>
                  ) : null}
                </div>
                <div className="aspect-video w-full">
<iframe
  ref={movieIframeRef}
  key={`${movie.tmdbId}-${source}-${season}-${episode}`}
  src={activeEmbed}
  className="h-full w-full"
  frameBorder="0"
  allowFullScreen
  allow="autoplay *; fullscreen *; picture-in-picture *; encrypted-media *; clipboard-write *"
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
            ))}

            {showMoviePlayer && <div id="watch-subtitle-panel" className="mt-4">
              <SubtitlePanel
                tmdbId={movie.tmdbId}
                isTV={isTV}
                season={season}
                episode={episode}
                title={movie.title}
                year={movie.year}
                slug={movie.slug}
                onSubtitleChange={handleSubtitleChange}
              />
            </div>}

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

            <details className="mt-6 text-sm text-slate-400">
              <summary className="w-fit cursor-pointer">{isTV ? 'Цувралын тухай' : 'Киноны тухай'}</summary>
              <p className="mt-3 leading-6">{movie.plot}</p>
            </details>
          </>
        )}
        {learning && <LearningDock key={slug} movieId={slug} movieTitle={movie.title} source={learningSource} onSource={setLearningSource} movieContext={{ tmdbId: movie.tmdbId, provider: source, allowed: gate.status === 'allowed' && showMoviePlayer, iframeRef: movieIframeRef, onSelectProvider: setSource, englishSubtitleUrl: subtitleLabel === 'English' ? subtitleUrl : undefined }} />}
      </div>

      <Footer />
    </main>
  )
}
