'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, RefreshCw, Subtitles } from 'lucide-react'

// Client-side minimal WebVTT parser (sources: our own translated VTT files).
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
  mediaType = null,
  subtitleUrl = null,
  subtitleLabel = 'Subtitles',
  onKeyLoadError = null,
}) {
  const videoRef = useRef(null)
  const iframeRef = useRef(null)
  const hlsRef = useRef(null)
  const cuesRef = useRef([])
  const tickRef = useRef(null)

  const [stream, setStream] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [subsState, setSubsState] = useState('none') // none | loading | on | error
  const [cue, setCue] = useState('')
  const isIframe = stream?.type === 'iframe'

  const loadStream = useCallback(
    async (force = false) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ tmdbId: String(tmdbId), type: isTV ? 'tv' : 'movie', variant: String(variant) })
        if (mediaType) params.set('mediaType', mediaType)
        if (isTV) {
          params.set('season', String(season))
          params.set('episode', String(episode))
        }
        if (force) params.set('refresh', '1')
        const res = await fetch(`/api/stream/tmdb?${params}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Stream failed (${res.status})`)
        setStream(data)
      } catch (err) {
        setError(err.message || 'Failed to load stream')
      } finally {
        setLoading(false)
      }
    },
    [tmdbId, isTV, season, episode, variant]
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

  // (Re)load subtitle cues whenever the selected subtitle changes.
  useEffect(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    setCue('')
    cuesRef.current = []
    if (!subtitleUrl) { setSubsState('none'); return }
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
        if (parsed.length && videoRef.current) {
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
  }, [subtitleUrl])

  // Attach the HLS stream to the <video>.
  useEffect(() => {
    if (isIframe || !stream || !stream.url || !videoRef.current) return
    const video = videoRef.current
    let disposed = false

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
            setError('🔐 Энэ эх сурвалж шифрлэгдсэн тул тоглуулж чадахгүй байна. Одоо нөөц плеер рүү шилжиж байна…')
            try { hls.destroy() } catch {}
            setTimeout(() => onKeyLoadError(), 1200)
            return
          }
          setError(
            isKeyError
              ? '🔐 Шифрлэгдсэн видео (key error) — дээрээс Player 1 эсвэл Player 2-ийг сонгоно уу.'
              : data.details || 'Stream error'
          )
        })
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = stream.url
        video.addEventListener('loadedmetadata', play, { once: true })
      } else {
        setError('This browser cannot play HLS streams.')
      }
    }

    attach()
    return () => { disposed = true }
  }, [stream, isIframe])

  const cueBar =
    (subsState === 'on' || subsState === 'loading') && subtitleLabel
      ? `${subtitleLabel}${subsState === 'loading' ? ' (loading…)' : ''}`
      : 'Subtitles'

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-black">
      {isIframe ? (
        <iframe
          ref={iframeRef}
          src={stream?.url ?? ''}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <video
          ref={videoRef}
          className="h-full w-full"
          controls
          playsInline
          crossOrigin="anonymous"
        />
      )}

      {/* status chips */}
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

      {/* captions */}
      {cue && (
        <div className="pointer-events-none absolute bottom-12 left-6 right-6 z-10 flex justify-center">
          <span className="whitespace-pre-wrap rounded bg-black/70 px-3 py-1 text-center text-sm text-white shadow-lg backdrop-blur sm:bottom-16 sm:text-base">
            {cue}
          </span>
        </div>
      )}

      {/* loading / error overlays */}
      {loading && !stream && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur">
          <Loader2 className="h-8 w-8 animate-spin text-[#c9a227]" />
          <p className="text-sm text-slate-300">Resolving a playable stream…</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/85 p-6 text-center backdrop-blur">
          <p className="text-2xl">⚠️</p>
          <p className="max-w-md text-sm text-slate-300">{error}</p>
          <button
            onClick={() => { setError(null); loadStream(true) }}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-4 py-2 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      )}
    </div>
  )
}