'use client';
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
  if (!context?.allowed)
    return (
      <p role="status" className="mb-4 rounded-xl bg-white/5 p-4 text-sm text-slate-400">
        Киноны эрхээ нээгээд хадмалаас нь үг сонгож сураарай.
      </p>
    );
  return (
    <div className="mb-3 text-xs text-slate-400">
      {!lesson.hasEnglish && !lesson.loading && (
        <p role="status" className="mb-3 text-amber-200">
          Англи хадмал олдсонгүй. Файлаар нэмж болно.
        </p>
      )}
      {lesson.hasEnglish && lesson.mnCount === 0 && (
        <p role="status" className="mb-3 text-amber-200">
          Монгол хадмал одоогоор алга. Үг дээр дараад утгыг нь үзэж болно.
        </p>
      )}
      {lesson.alignmentMissing ? (
        <p role="status" className="mb-3 text-amber-200">
          Зарим монгол мөрийн цаг таарахгүй байна. «Монгол утгыг үзэх» товчоор англи өгүүлбэрийн
          утгыг нээгээрэй.
        </p>
      ) : (
        lesson.hasEnglish &&
        lesson.mnCount > 0 &&
        /зарим мөр|дутуу|орчуулагдаагүй/i.test(lesson.warning) && (
          <p role="status" className="mb-3 text-amber-200">
            Монгол хадмалын зарим мөр дутуу байна.
          </p>
        )
      )}
      {player.status === 'error' && (
        <p role="status" className="mb-3 text-amber-200">
          Тоглуулагч холбогдсонгүй. Өөр тоглуулагч сонгоорой.
        </p>
      )}
      <details id="movie-caption-settings">
        <summary className="w-fit cursor-pointer">
          {lesson.hasEnglish ? 'Хадмал тааруулах' : 'Англи хадмал нэмэх'}
        </summary>
        <div className="mt-3 space-y-3 rounded-xl border border-white/10 p-4">
          {context.provider !== 'cine' && (
            <button
              type="button"
              onClick={() => context.onSelectProvider('cine')}
              className="rounded-lg border border-amber-400/30 px-3 py-2 text-amber-200"
            >
              Хадмалтай тоглуулагч сонгох
            </button>
          )}
          {player.time !== null && <p>Киноны хугацаа: {formatTime(player.time)}</p>}
          <button type="button" onClick={lesson.refresh} className="text-amber-200 underline">
            Сайтын хадмалыг дахин авах
          </button>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              Англи хадмал (.vtt)
              <input
                type="file"
                accept=".vtt"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void lesson.loadEnglish(file);
                }}
                className="mt-2 block w-full min-w-0 rounded-lg border border-white/15 p-2"
              />
            </label>
            <label className="block">
              Монгол хадмал (.vtt)
              <input
                type="file"
                accept=".vtt"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void lesson.loadMongolian(file);
                }}
                className="mt-2 block w-full min-w-0 rounded-lg border border-white/15 p-2"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['en', 'mn'] as const).map((language) => (
              <label key={language} className="block">
                {language === 'en' ? 'Англи' : 'Монгол'} хадмалын зөрүү (секунд)
                <input
                  type="number"
                  min={-120}
                  max={120}
                  step={0.25}
                  value={language === 'en' ? lesson.enOffset : lesson.mnOffset}
                  onChange={(event) => lesson.changeOffset(language, event.target.valueAsNumber)}
                  className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-white"
                />
              </label>
            ))}
          </div>
          <p>
            Англи: {lesson.enCount} өгүүлбэр · Монгол: {lesson.mnCount} өгүүлбэр
          </p>
        </div>
      </details>
    </div>
  );
}
