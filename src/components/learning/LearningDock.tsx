'use client';
import { Settings2 } from 'lucide-react';
import Link from 'next/link';
import LocalMediaInput from './LocalMediaInput';
import LearningVideo from './LearningVideo';
import LearningPanels from './LearningPanels';
import { useLearningController, type LearningSource } from './useLearningController';
import type { MoviePlayerContext } from './useMoviePlayer';
import MovieLearningStatus from './MovieLearningStatus';
import WordDialog from './WordDialog';

type Props = {
  movieId: string;
  movieTitle: string;
  source: LearningSource;
  onSource: (source: LearningSource) => void;
  movieContext?: MoviePlayerContext;
};
export default function LearningDock({
  movieId,
  movieTitle,
  source,
  onSource,
  movieContext,
}: Props) {
  const controller = useLearningController(movieId, source, movieContext);
  const { lesson, videoRef, setTime, setReady } = controller;
  return (
    <section
      aria-label="SceneChain Learning Dock"
      className="my-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h2 className="font-semibold">Киногоор үг суръя</h2>
        <Link href="/learning" className="text-xs text-amber-200">
          Миний ахиц →
        </Link>
      </div>
      <div className="p-3 md:p-4">
        <details
          open={source === 'local' && !lesson.videoUrl ? true : undefined}
          className="mb-3 text-sm"
        >
          <summary className="flex w-fit cursor-pointer items-center gap-2 text-xs text-slate-400">
            <Settings2 size={14} />
            Хадмал, видео
          </summary>
          <p className="mt-3 text-xs text-slate-500">{movieTitle}</p>
          <div role="group" aria-label="Learning media source" className="mt-3 flex gap-2">
            {(
              [
                { value: 'movie', label: 'Кино' },
                { value: 'local', label: 'Өөрийн видео' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={source === value}
                onClick={() => onSource(value)}
                className={`rounded-lg border px-3 py-2 text-xs ${source === value ? 'border-amber-400/40 text-amber-200' : 'border-white/10 text-slate-400'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {source === 'local' && (
            <div className="mt-3">
              <LocalMediaInput onLoad={lesson.loadLocal} />
            </div>
          )}
        </details>
        {source === 'movie' && (
          <MovieLearningStatus controller={controller} context={movieContext} />
        )}
        {source === 'local' && lesson.videoUrl && (
          <div className="mb-4">
            <LearningVideo
              url={lesson.videoUrl}
              videoRef={videoRef}
              onTime={setTime}
              onReady={setReady}
            />
          </div>
        )}
        <LearningPanels controller={controller} source={source} />
        {controller.message && (
          <p role="status" className="mt-3 text-xs text-slate-400">
            {controller.message}
          </p>
        )}
        {controller.storageError && (
          <p role="alert" className="mt-3 text-sm text-rose-300">
            {controller.storageError}
          </p>
        )}
      </div>
      <WordDialog controller={controller} source={source} />
    </section>
  );
}
