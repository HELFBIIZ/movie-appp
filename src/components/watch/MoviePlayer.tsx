'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Movie } from '@/types/movie';
import type { WatchXp } from '@/types/api';
import type { PlayerTab } from '@/lib/watch/providers';
import SubtitledStreamPlayer from '@/components/SubtitledStreamPlayer';

type Props = {
  showMoviePlayer: boolean;
  movie: Movie;
  source: string;
  season: number;
  episode: number;
  isTV?: boolean;
  subtitleUrl?: string | null;
  subtitleLabel?: string;
  setSource: (value: string) => void;
  visibleTabs: PlayerTab[];
  activeEmbed: string | null;
  xp?: WatchXp;
  movieIframeRef: RefObject<HTMLIFrameElement | null>;
  onPlayerFailure?: () => void;
  onProgress?: (seconds: number) => void;
};

export default function MoviePlayer({
  showMoviePlayer,
  movie,
  source,
  season,
  episode,
  isTV = false,
  subtitleUrl = null,
  subtitleLabel = 'Mongolian',
  setSource,
  visibleTabs,
  activeEmbed,
  xp,
  movieIframeRef,
  onPlayerFailure,
  onProgress,
}: Props) {
  const [frameStatus, setFrameStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [hlsVariant, setHlsVariant] = useState(0);
  const [hlsTotal, setHlsTotal] = useState(1);
  const failedFor = useRef<string | null>(null);
  const isDirectHls = source === 'hls';
  const failureHandler = useRef(onPlayerFailure);
  useEffect(() => {
    failureHandler.current = onPlayerFailure;
  }, [onPlayerFailure]);

  const advance = useCallback(() => {
    failureHandler.current?.();
  }, []);

  useEffect(() => {
    if (!showMoviePlayer || isDirectHls || !activeEmbed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset per-source load state whenever the selected player changes.
    setFrameStatus('loading');
    failedFor.current = null;
    const timer = setTimeout(() => {
      setFrameStatus((current) => (current === 'loading' ? 'failed' : current));
    }, 12000);
    return () => clearTimeout(timer);
  }, [activeEmbed, showMoviePlayer, isDirectHls]);

  useEffect(() => {
    if (frameStatus !== 'failed' || !activeEmbed || failedFor.current === activeEmbed) return;
    failedFor.current = activeEmbed;
    advance();
  }, [frameStatus, activeEmbed, advance]);

  if (!showMoviePlayer) return null;

  if (!movie.tmdbId) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 animate-scale-in">
        <p className="px-6 text-center text-slate-400">No source available for this title yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-lg transition-all hover:shadow-xl animate-scale-in">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-2.5 animate-fade-in-down sm:px-4">
          <label className="flex min-w-0 items-center gap-2 text-sm text-slate-400 sm:gap-3">
            <span className="hidden sm:inline">Тоглуулагч</span>
            <select
              aria-label="Тоглуулагч"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="min-w-0 max-w-[11rem] rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-slate-100 sm:max-w-none sm:px-3 sm:text-sm"
            >
              {visibleTabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label.replace('Player ', '')}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={advance}
            className="rounded-lg border border-white/10 px-2.5 py-2 text-xs text-slate-300 transition-colors hover:border-amber-300/50 hover:text-amber-200"
          >
            Өөр плеер
          </button>
          {xp?.gained ? (
            <span className="ml-auto rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
              +{xp.gained} XP
            </span>
          ) : null}
        </div>

        <div className="aspect-video w-full">
          {isDirectHls ? (
            <SubtitledStreamPlayer
              tmdbId={movie.tmdbId}
              isTV={isTV}
              season={season}
              episode={episode}
              variant={hlsVariant}
              subtitleUrl={subtitleUrl ?? ''}
              subtitleLabel={subtitleLabel}
              isLastVariant={hlsVariant >= Math.max(0, hlsTotal - 1)}
              onStreamInfo={(info) => setHlsTotal(Math.max(1, info.total))}
              onProgress={onProgress}
              onKeyLoadError={() =>
                setHlsVariant((current) => (current + 1) % Math.max(1, hlsTotal))
              }
            />
          ) : (
            <iframe
              ref={movieIframeRef}
              key={`${movie.tmdbId}-${source}-${season}-${episode}`}
              src={activeEmbed ?? undefined}
              onLoad={() => setFrameStatus('ready')}
              onError={() => setFrameStatus('failed')}
              className="h-full w-full"
              frameBorder="0"
              allowFullScreen
              allow="autoplay *; fullscreen *; picture-in-picture *; encrypted-media *; clipboard-write *"
              title={`${movie.title} player`}
            />
          )}
        </div>

        {(source === 'vidsrc' || source === 'embedmaster') && (
          <div className="flex items-start gap-2 border-t border-slate-800 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">
            <span aria-hidden="true">💡</span>
            <span>Монгол хадмал тоглуулагч дотор CC товчоор сонгогдоно.</span>
          </div>
        )}
        {source === 'cine' && (
          <div className="border-t border-slate-800 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            CineSrc дотоод монгол хадмал киноны дуутай таарахгүй байж болно. Зөв монгол орчуулгад «1
            · Binge» сонгоно уу.
          </div>
        )}
        {frameStatus === 'failed' && !isDirectHls && (
          <p role="status" className="border-t border-slate-800 px-4 py-2 text-xs text-amber-300">
            Энэ плеер ачаалсангүй. Өөр плеер рүү шилжлээ — сонгож болно.
          </p>
        )}
      </div>
    </>
  );
}
