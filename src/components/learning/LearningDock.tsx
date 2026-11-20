'use client';
import { BookOpen } from 'lucide-react';
import LocalMediaInput from './LocalMediaInput';
import LearningVideo from './LearningVideo';
import LearningPanels from './LearningPanels';
import LearningProgress from './LearningProgress';
import { useLearningController, type LearningSource } from './useLearningController';
import type { MoviePlayerContext } from './useMoviePlayer';
import { SPIDER_MAN } from '@/lib/learning/movie';
import MovieLearningStatus from './MovieLearningStatus';
import WordDialog from './WordDialog';
import LearningGuide from './LearningGuide';
import LearningProfile from './LearningProfile';
type Props = {
  movieId: string;
  movieTitle: string;
  source: LearningSource;
  onSource: (source: LearningSource) => void;
  movieContext?: MoviePlayerContext;
  intro?: boolean;
};
export default function LearningDock({
  movieId,
  movieTitle,
  source,
  onSource,
  movieContext,
  intro = false,
}: Props) {
  const controller = useLearningController(movieId, source, movieContext);
  const movieSpecific = movieId === SPIDER_MAN.slug;
  const { lesson, videoRef, active, setTime, setReady, showTranslations, setShowTranslations } =
    controller;

  return (
    <section
      aria-label="SceneChain Learning Dock"
      className="my-6 rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
    >
      <div className="border-b border-white/10 p-4 md:p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BookOpen size={19} className="text-[#c9a227]" aria-hidden="true" /> Англи үг суръя
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Сонсоорой. Мэдэхгүй үгээ дараарай. Хадгалаад, утгыг нь санаж үзээрэй.
        </p>
        <LearningProfile showTranslations={showTranslations} onTranslations={setShowTranslations} />
        {!intro && (
          <details className="mt-3 text-sm">
            <summary className="w-fit cursor-pointer text-slate-400 hover:text-white">
              Тохиргоо
            </summary>
            <p className="mt-3 text-slate-400">{movieTitle} · Видеогоо сонгоно уу.</p>
            <div
              className="mt-3 flex flex-wrap gap-2"
              role="group"
              aria-label="Learning media source"
            >
              {[
                { value: 'sample', label: 'Сургалтын жишээ' },
                { value: 'movie', label: 'Кино' },
                { value: 'local', label: 'Өөрийн видео' },
              ]
                .filter(({ value }) => !movieSpecific || value !== 'sample')
                .map(({ value, label }) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={source === value}
                    onClick={() => onSource(value as LearningSource)}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${source === value ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : 'border-white/10 text-slate-400 hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
            </div>
          </details>
        )}
      </div>
      <div className="p-4 md:p-5">
        {(source !== 'movie' || lesson.cues.length > 0) && (
          <LearningGuide controller={controller} source={source} />
        )}
        {source === 'movie' && movieSpecific ? (
          <MovieLearningStatus controller={controller} context={movieContext} />
        ) : source === 'movie' ? (
          <div role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
            <p className="font-medium text-amber-200">Хадмал тоглуулагчтай холбогдоогүй байна.</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Тохиргооноос сургалтын жишээ эсвэл өөрийн видео сонгож болно.
            </p>
          </div>
        ) : (
          <p className="mb-4 text-sm leading-6 text-slate-400">
            {source === 'sample'
              ? '38 секундийн сургалтын жишээ · Киноны хэсэг биш.'
              : 'Өөрийн видео · Хуудсыг шинэчилбэл файлаа дахин сонгоно.'}
          </p>
        )}
        {source === 'local' && (
          <div className="mb-4">
            <LocalMediaInput onLoad={lesson.loadLocal} />
          </div>
        )}
        <div
          className={`grid gap-5 ${source !== 'movie' ? 'lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]' : ''}`}
        >
          {source !== 'movie' && (
            <div className="min-w-0">
              {lesson.videoUrl && (
                <LearningVideo
                  key={lesson.videoUrl}
                  url={lesson.videoUrl}
                  videoRef={videoRef}
                  active={active}
                  onTime={setTime}
                  onReady={setReady}
                  sample={source === 'sample'}
                  showTranslations={showTranslations}
                />
              )}
            </div>
          )}
          <LearningPanels controller={controller} source={source} />
        </div>
        <WordDialog controller={controller} source={source} />
        <LearningProgress controller={controller} />
      </div>
    </section>
  );
}
