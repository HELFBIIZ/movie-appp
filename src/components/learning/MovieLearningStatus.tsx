'use client';
import Link from 'next/link';
import { formatTime } from '@/lib/learning/vtt';
import type { MoviePlayerContext } from './useMoviePlayer';
import type { LearningController } from './useLearningController';

export default function MovieLearningStatus({
  controller,
  context,
}: {
  controller: LearningController;
  context?: MoviePlayerContext;
}) {
  const { movieLesson: lesson, moviePlayer: player } = controller;
  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/50 p-4 text-sm">
      {!context?.allowed ? (
        <div>
          <p role="status" className="leading-6 text-slate-300">
            Хадмалтай сурахын тулд нэвтэрч, VIP эрхээ баталгаажуулна уу.
          </p>
          <Link
            href="/learn"
            className="mt-3 inline-flex rounded-lg bg-[#c9a227] px-4 py-2 font-semibold text-slate-950"
          >
            Үнэгүй дасгалаар эхлэх
          </Link>
          <p className="mt-2 text-xs text-slate-400">
            Сургалтын богино жишээгээр эхлээд туршаарай.
          </p>
        </div>
      ) : (
        <>
          {context.provider !== 'cine' ? (
            <button
              type="button"
              onClick={() => context.onSelectProvider('cine')}
              className="rounded-lg bg-[#c9a227] px-4 py-2 font-semibold text-slate-950"
            >
              Хадмалтай тоглуулагч сонгох
            </button>
          ) : (
            <p role="status" className="text-slate-300">
              {player.time === null ? (
                'Киногоо тоглуулаарай. Хадмал холбогдохыг хүлээж байна.'
              ) : (
                <>Тоглуулагчийн цаг: {formatTime(player.time)}</>
              )}
            </p>
          )}
          {player.status === 'seek-pending' && (
            <p role="status" className="mt-2 text-amber-200">
              Хугацаа шилжүүлж байна…
            </p>
          )}
          {player.status === 'seek-unconfirmed' && (
            <p role="alert" className="mt-2 text-rose-300">
              Шилжилт баталгаажаагүй. Видеогоо шалгаарай.
            </p>
          )}
          {player.status === 'error' && (
            <p role="alert" className="mt-2 text-rose-300">
              Тоглуулагч холбогдсонгүй. Өөр тоглуулагч сонгоно уу.
            </p>
          )}
          {lesson.supported && (
            <details className="mt-3">
              <summary className="w-fit cursor-pointer text-amber-200">
                {lesson.hasEnglish ? 'Хадмалын тохиргоо' : 'Англи хадмал нэмэх'}
              </summary>
              <p className="mt-3 leading-6 text-slate-400">
                <a href="#watch-subtitle-panel" className="text-amber-200 underline">
                  Хадмалын хэсэг
                </a>
                -ээс English сонгох эсвэл өөрийн .vtt файл оруулна уу.
              </p>
              <label className="mt-3 block text-slate-300">
                Англи хадмал (.vtt)
                <input
                  type="file"
                  accept=".vtt"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void lesson.loadEnglish(file);
                  }}
                  className="mt-2 block w-full min-w-0 rounded-lg border border-white/10 p-2"
                />
              </label>
              <p className="mt-3 text-slate-400">
                Монгол: {lesson.mnCount} мөр · Англи: {lesson.enCount} мөр
              </p>
              <details className="mt-3">
                <summary className="w-fit cursor-pointer text-slate-400">
                  Хадмалын цаг тааруулах
                </summary>
                <div className="mt-3 flex flex-wrap gap-4">
                  {(['en', 'mn'] as const).map((language) => (
                    <label key={language} className="text-slate-400">
                      {language === 'en' ? 'Англи' : 'Монгол'} (сек)
                      <input
                        type="number"
                        min={-600}
                        max={600}
                        step={0.1}
                        value={language === 'en' ? lesson.enOffset : lesson.mnOffset}
                        onChange={(event) =>
                          lesson.changeOffset(language, event.target.valueAsNumber)
                        }
                        className="ml-2 w-24 rounded border border-white/15 bg-slate-950 p-2 text-white"
                      />
                    </label>
                  ))}
                </div>
              </details>
            </details>
          )}
        </>
      )}
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Хадмалын орчуулга, кинотой таарах эсэхийг шалгаагүй.
      </p>
    </div>
  );
}
