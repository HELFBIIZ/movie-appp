'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, RefreshCw, Subtitles } from 'lucide-react'

// Client-side minimal WebVTT parser
function parseVtt(text) {
  const lines = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n')
  const cues = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    const m = line.match(
      /^(\d{1,2}):(\d{1,2}):(\d{1,2})[.,](\d{1,3})\s*-->\s*(\d{1,2}):(\d{1,2}):(\d{1,2})[.,](\d{1,3})/
    )
    if (m) {
      const start = +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000
      const end = +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000
      const textLines = []
      i++
      while (i < lines.length && lines[i].trim() !== '') {
        const t = lines[i].trim()
        const h = t.toUpperCase()
        if (!/^(WEBVTT|NOTE|STYLE|REGION)\b/.test(h) && !t.startsWith('-->')) {
          textLines.push(t.replace(/<[^>]+>/g, ''))
        }
        i++
      }
      const text = textLines.join('\n').trim()
      if (text) cues.push({ start, end, text })
      continue
    }
    i++
  }
  return cues
}

export default function SubtitledStreamPlayer({
  tmdbId,
  isTV = false,
  season = 1,
  episode = 1,
  title = '',
  variant = 0,
  subtitleUrl = null,
  subtitleLabel = 'Subtitles',
  onKeyLoadError = null,
  playerType = 'hls', // 'hls' | 'iframe' | 'embed'
  preserveState = null, // { currentTime, volume, ccEnabled }
}) {
  const videoRef = useRef(null)
  const iframeRef = useRef(null)
  const hlsRef = useRef(null)
  const cuesRef = useRef([])
  const tickRef = useRef(null)

  const [stream, setStream] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [subsState, setSubsState] = useState('none')
  const [cue, setCue] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  const MAX_RETRIES = 3

  // Build iframe URL for iframe-type players
  const getIframeUrl = useCallback(() => {
    if (!tmdbId) return null
    const base = playerType === 'iframe' ? getIframeBase(variant) : null
    if (!base) return null
    if (isTV) return `${base}/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`
    return `${base}/embed/movie/${tmdbId}`
  }, [tmdbId, isTV, season, episode, variant, playerType])

  const loadStream = useCallback(
    async (force = false) => {
      if (playerType === 'iframe') {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ tmdbId: String(tmdbId), type: isTV ? 'tv' : 'movie', variant: String(variant) })
        if (isTV) {
          params.set('season', String(season))
          params.set('episode', String(episode))
        }
        if (force) params.set('refresh', '1')
        const res = await fetch(`/api/stream/tmdb?${params}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Stream failed (${res.status})`)
        setStream(data)
        setRetryCount(0)
      } catch (err) {
        if (retryCount < MAX_RETRIES) {
          setRetryCount((c) => c + 1)
          setTimeout(() => loadStream(force), 1000 * (retryCount + 1))
        } else {
          setError(err.message || 'Failed to load stream')
        }
      } finally {
        setLoading(false)
      }
    },
    [tmdbId, isTV, season, episode, variant, playerType, retryCount]
  )

  useEffect(() => {
    loadStream()
    return () => {
      if (hlsRef.current) {
        try { hlsRef.current.destroy() } catch {}
        hlsRef.current = null
      }
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    }
  }, [loadStream])

  // Subtitle loading
  useEffect(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    setCue('')
    cuesRef.current = []
    if (!subtitleUrl || playerType === 'iframe') { setSubsState('none'); return }
    setSubsState('loading')
    let cancelled = false
    fetch(subtitleUrl)
      .then((r) => {
        if (!r.ok) throw new Error('VTT fetch failed')
        return r.text()
      })
      .then((text) => {
        if (cancelled) return
        const parsed = parseVtt(text)
        cuesRef.current = parsed
        setSubsState(parsed.length ? 'on' : 'error')
        if (parsed.length) {
          tickRef.current = setInterval(() => {
            const video = videoRef.current
            if (!video) { setCue(''); return }
            const ct = video.currentTime
            const active = cuesRef.current.find((c) => ct >= c.start && ct <= c.end)
            setCue(active ? active.text : '')
          }, 200)
        }
      })
      .catch(() => !cancelled && setSubsState('error'))
    return () => { cancelled = true }
  }, [subtitleUrl, playerType])

  // HLS stream attachment
  useEffect(() => {
    if (!stream || !stream.url || !videoRef.current || playerType === 'iframe') return
    const video = videoRef.current
    let disposed = false

    // Restore playback state if switching players
    if (preserveState?.currentTime > 0) {
      video.currentTime = preserveState.currentTime
    }
    if (preserveState?.volume !== undefined) {
      video.volume = preserveState.volume
    }

    async function attach() {
      let Hls = null
      try {
        const mod = await import('hls.js')
        Hls = mod.default ?? mod
      } catch {}
      if (disposed) return
      const play = () => { if (!disposed) video.play().catch(() => {}) }
      if (Hls?.isSupported?.()) {
        const hls = new Hls({ capLevelToPlayerSize: false })
        hlsRef.current = hls
        hls.loadSource(stream.url)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, play)
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data || !data.fatal) return
          const isKeyError = data.details === 'keyLoadError' || data.details === 'keyError'
          if (isKeyError && typeof onKeyLoadError === 'function') {
            setError('🔐 Энэ эх сурвалж шифрлэгдсэн тул тоглуулж чадахгүй байна. Дараагийн плеер рүү шилжиж байна…')
            try { hls.destroy() } catch {}
            setTimeout(() => onKeyLoadError(), 1200)
            return
          }
          setError(
            isKeyError
              ? '🔐 Шифрлэгдсэн видео — дээрээс өөр плеер сонгоно уу.'
              : data.details || 'Stream error'
          )
        })
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = stream.url
        video.addEventListener('loadedmetadata', play, { once: true })
      } else {
        setError('Энэ browser HLS видеог тоглуулж чадахгүй байна.')
      }
    }

    attach()
    return () => { disposed = true }
  }, [stream, playerType, preserveState, onKeyLoadError])

  const cueBar =
    (subsState === 'on' || subsState === 'loading') && subtitleLabel
      ? `${subtitleLabel}${subsState === 'loading' ? ' (ачаалж байна…)' : ''}`
      : 'Нэмэлт'

  // ── Iframe player ──
  if (playerType === 'iframe') {
    const iframeUrl = getIframeUrl()
    if (!iframeUrl) {
      return (
        <div className="flex aspect-video w-full items-center justify-center bg-slate-900 rounded-2xl">
          <p className="text-slate-400">Энэ видеог одоогоор тоглуулах боломжгүй байна.</p>
        </div>
      )
    }
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-black">
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          className="h-full w-full"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title={title || 'Video player'}
        />
        {subtitleUrl && (
          <div className="pointer-events-none absolute bottom-2 left-3 z-10 rounded-full bg-black/50 px-3 py-1 text-xs text-amber-300 backdrop-blur">
            💡 Iframe плеер дээр нэмэлт ажиллахгүй байж магадгүй
          </div>
        )}
      </div>
    )
  }

  // ── HLS / native player ──
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-black">
      <video
        ref={videoRef}
        className="h-full w-full"
        controls
        playsInline
        crossOrigin="anonymous"
      />

      {/* Status chips */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex gap-2">
        {stream && (
          <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur">
            {stream.provider} · {stream.label || stream.quality || 'HD'}
          </span>
        )}
        {(subsState === 'on' || subsState === 'loading') && (
          <span className="flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs text-green-300 backdrop-blur">
            <Subtitles className="h-3 w-3" />
            {cueBar}
          </span>
        )}
      </div>

      {/* Captions */}
      {cue && (
        <div className="pointer-events-none absolute bottom-12 left-6 right-6 z-10 flex justify-center">
          <span className="whitespace-pre-wrap rounded bg-black/70 px-3 py-1 text-center text-sm text-white shadow-lg backdrop-blur sm:bottom-16 sm:text-base">
            {cue}
          </span>
        </div>
      )}

      {/* Loading overlay */}
      {loading && !stream && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur">
          <Loader2 className="h-8 w-8 animate-spin text-[#c9a227]" />
          <p className="text-sm text-slate-300">Тоглуулах боломжтой эх сурвалжийг хайж байна…</p>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/85 p-6 text-center backdrop-blur">
          <p className="text-2xl">⚠️</p>
          <p className="max-w-md text-sm text-slate-300">{error}</p>
          <button
            onClick={() => { setError(null); setRetryCount(0); loadStream(true) }}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-4 py-2 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110"
          >
            <RefreshCw className="h-4 w-4" /> Дахин оролдох
          </button>
        </div>
      )}
    </div>
  )
}

// Helper to get iframe base URL by variant/index
function getIframeBase(variant) {
  const bases = [
    'https://vidsrc.buzz',
    'https://vidcore.org',
    'https://autoembed.cc',
    'https://multiembed.mov',
    'https://2embed.cc',
  ]
  return bases[variant % bases.length] || bases[0]
}
