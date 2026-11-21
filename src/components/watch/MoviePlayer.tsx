import type { RefObject } from 'react';
import type { Movie } from '@/types/movie';
import type { WatchXp } from '@/types/api';
import type { PlayerTab } from '@/lib/watch/providers';
type Props = {
  showMoviePlayer: boolean;
  movie: Movie;
  source: string;
  season: number;
  episode: number;
  setSource: (value: string) => void;
  visibleTabs: PlayerTab[];
  activeEmbed: string | null;
  xp?: WatchXp;
  movieIframeRef: RefObject<HTMLIFrameElement | null>;
};
export default function MoviePlayer({
  showMoviePlayer,
  movie,
  source,
  season,
  episode,
  setSource,
  visibleTabs,
  activeEmbed,
  xp,
  movieIframeRef,
}: Props) {
  return (
    <>
      {showMoviePlayer &&
        (movie.tmdbId ? (
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
                    <option key={tab.id} value={tab.id}>
                      {tab.label.replace('Player ', '')}
                    </option>
                  ))}
                </select>
              </label>
              {xp?.gained ? (
                <span className="ml-auto rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
                  +{xp.gained} XP
                </span>
              ) : null}
            </div>
            <div className="aspect-video w-full">
              <iframe
                ref={movieIframeRef}
                key={`${movie.tmdbId}-${source}-${season}-${episode}`}
                src={activeEmbed ?? undefined}
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
    </>
  );
}
