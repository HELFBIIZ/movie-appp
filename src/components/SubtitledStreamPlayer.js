'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, RefreshCw, Subtitles } from 'lucide-react';
import { captionLanguage } from '@/lib/watch/captions';

/** @param {{ tmdbId: number|string, isTV?: boolean, season?: number, episode?: number, variant?: number, subtitleUrl?: string, subtitleLabel?: string, externalVideoRef?: (node: HTMLVideoElement|null) => void, onKeyLoadError?: () => void, onStreamInfo?: (info: {total:number,provider?:string,quality?:string}) => void, onProgress?: (seconds:number) => void, isLastVariant?:boolean }} props */
export default function SubtitledStreamPlayer({
  tmdbId,
  isTV = false,
  season = 1,
  episode = 1,
  variant = 0,
  subtitleUrl = '',
  subtitleLabel = 'Mongolian',
  externalVideoRef,
  onKeyLoadError,
  onStreamInfo,
  onProgress,
  isLastVariant = false,
}) {
  const internalVideoRef = useRef(null);
  const videoRef = internalVideoRef;
  const setVideoRef = useCallback(
    (node) => {
      internalVideoRef.current = node;
      externalVideoRef?.(node);
    },
    [externalVideoRef],
  );
  const controllerRef = useRef(null);
  const callbacks = useRef({ onKeyLoadError, onStreamInfo, onProgress, isLastVariant });
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subtitleState, setSubtitleState] = useState({ url: '', status: 'loading' });
  useEffect(() => {
    callbacks.current = { onKeyLoadError, onStreamInfo, onProgress, isLastVariant };
  }, [onKeyLoadError, onStreamInfo, onProgress, isLastVariant]);

  const loadStream = useCallback(
    async (force = false) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError('');
      setStream(null);
      try {
        const params = new URLSearchParams({
          tmdbId: String(tmdbId),
          type: isTV ? 'tv' : 'movie',
          variant: String(variant),
        });
        if (isTV) {
          params.set('season', String(season));
          params.set('episode', String(episode));
        }
        if (force) params.set('refresh', '1');
        const response = await fetch('/api/stream/tmdb?' + params, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            typeof data.error === 'string' ? data.error : 'Тоглуулах эх сурвалж нээгдсэнгүй.',
          );
        if (typeof data.url !== 'string' || !data.url.trim())
          throw new Error('Тоглуулах холбоос олдсонгүй.');
        const url = new URL(data.url, window.location.origin);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
          throw new Error('Тоглуулах холбоос буруу байна.');
        if (controller.signal.aborted) return;
        setStream({ ...data, url: url.href });
        callbacks.current.onStreamInfo?.({
          total: Array.isArray(data.candidates) ? Math.max(1, data.candidates.length) : 1,
          provider: data.provider,
          quality: data.quality,
        });
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(failure.message || 'Тоглуулах эх сурвалж нээгдсэнгүй.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [tmdbId, isTV, season, episode, variant],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Resolve this media identity after mount and cancel its request on replacement.
    void loadStream();
    return () => controllerRef.current?.abort();
  }, [loadStream]);

  useEffect(() => {
    const timer = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && Number.isFinite(video.currentTime) && video.currentTime > 0)
        callbacks.current.onProgress?.(video.currentTime);
    }, 15000);
    return () => clearInterval(timer);
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream?.url) return;
    let disposed = false;
    let hls = null;
    let retryTimer;
    const play = () => {
      if (!disposed) void video.play().catch(() => {});
    };
    const fail = () => {
      if (disposed) return;
      setError('Видео ачаалсангүй. Өөр эх сурвалж сонгох эсвэл дахин оролдоорой.');
      if (!callbacks.current.isLastVariant && callbacks.current.onKeyLoadError && !retryTimer)
        retryTimer = setTimeout(() => {
          if (!disposed) callbacks.current.onKeyLoadError?.();
        }, 1200);
    };
    async function attach() {
      // An authorized HTML5 file is also supported; tests use original local media.
      if (/\.(?:mp4|webm|ogg)(?:[?#]|$)/i.test(stream.url)) {
        video.addEventListener('loadedmetadata', play, { once: true });
        video.src = stream.url;
        return;
      }
      let Hls;
      try {
        Hls = (await import('hls.js')).default;
      } catch {
        /* Native HLS remains available. */
      }
      if (disposed) return;
      if (Hls?.isSupported()) {
        hls = new Hls({ capLevelToPlayerSize: false });
        hls.on(Hls.Events.MANIFEST_PARSED, play);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data?.fatal) fail();
        });
        hls.loadSource(stream.url);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.addEventListener('loadedmetadata', play, { once: true });
        video.src = stream.url;
      } else fail();
    }
    video.addEventListener('error', fail);
    void attach();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      video.removeEventListener('loadedmetadata', play);
      video.removeEventListener('error', fail);
      hls?.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [stream, videoRef]);

  const showTrack = useCallback((node) => {
    if (node) node.track.mode = 'showing';
  }, []);
  const subtitleStatus = subtitleState.url === subtitleUrl ? subtitleState.status : 'loading';
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-black">
      <video
        ref={setVideoRef}
        aria-label="Шууд видео тоглуулагч"
        className="h-full w-full"
        controls
        playsInline
        crossOrigin="anonymous"
      >
        {subtitleUrl && (
          <track
            key={subtitleUrl}
            ref={showTrack}
            kind="subtitles"
            src={subtitleUrl}
            srcLang={captionLanguage(subtitleLabel) || 'mn'}
            label={subtitleLabel}
            default
            onLoad={() => setSubtitleState({ url: subtitleUrl, status: 'on' })}
            onError={() => setSubtitleState({ url: subtitleUrl, status: 'error' })}
          />
        )}
      </video>
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex gap-2">
        {stream && (
          <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur">
            {stream.provider} · {stream.label || stream.quality || 'HD'}
          </span>
        )}
        {subtitleUrl && (
          <span
            role="status"
            className="flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs text-green-300 backdrop-blur"
          >
            <Subtitles className="h-3 w-3" />
            {subtitleStatus === 'error'
              ? 'Хадмал ачаалсангүй'
              : subtitleStatus === 'loading'
                ? 'Хадмал ачаалж байна…'
                : subtitleLabel}
          </span>
        )}
      </div>
      {loading && !stream && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur">
          <Loader2 className="h-8 w-8 animate-spin text-[#c9a227]" />
          <p className="text-sm text-slate-300">Видеог нээж байна…</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/85 p-6 text-center backdrop-blur">
          <p className="max-w-md text-sm text-slate-300">{error}</p>
          <button
            onClick={() => void loadStream(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-4 py-2 text-sm font-bold text-[#1a150b]"
          >
            <RefreshCw className="h-4 w-4" />
            Дахин оролдох
          </button>
        </div>
      )}
    </div>
  );
}
