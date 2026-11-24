'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Volume2 } from 'lucide-react';
import { studyCues } from '@/lib/learning/study-cues';
import CueWords from './CueWords';
import { useSentencePlayback } from './useSentencePlayback';
import type { LearningController, LearningSource } from './useLearningController';

export default function SentencePractice({
  controller,
  source,
}: {
  controller: LearningController;
  source: LearningSource;
}) {
  const { lesson, active, moviePlayer, ready, setSelection, setTab } = controller;
  const cues = studyCues(lesson.cues);
  const [selected, setSelected] = useState<string | null>(null);
  const playback = useSentencePlayback(controller, source);
  const current =
    selected === null
      ? cues.findLastIndex((cue) => cue.start <= (controller.time ?? -1))
      : cues.findIndex((cue) => cue.id === selected);
  const index = Math.max(0, current);
  const cue = cues[index];
  function change(next: number) {
    playback.stop();
    setSelected(cues[next].id);
  }
  if (!cue)
    return (
      <p className="p-5 text-sm text-slate-400">
        Англи хадмал бэлэн болоход эндээс үг сонгож сурна.
      </p>
    );
  return (
    <section aria-label="Өгүүлбэрээр үг сурах" className="p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-slate-400">Үг дээр дараад утгыг нь үзээрэй.</p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            aria-label="Өмнөх өгүүлбэр"
            disabled={!index}
            onClick={() => change(index - 1)}
            className="rounded-lg p-2 text-slate-300 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            {index + 1}/{cues.length}
          </span>
          <button
            type="button"
            aria-label="Дараагийн өгүүлбэр"
            disabled={index + 1 === cues.length}
            onClick={() => change(index + 1)}
            className="rounded-lg p-2 text-slate-300 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div
        data-testid={active.some((item) => item.id === cue.id) ? 'active-cue' : undefined}
        className="rounded-xl bg-white/5 p-4 text-lg"
      >
        <CueWords
          cue={cue}
          onWord={(note, selectedCue) => {
            playback.stop();
            setSelection({ note, cue: selectedCue });
          }}
        />
        {cue.translation && (
          <p lang="mn" className="mt-3 text-sm leading-6 text-slate-400">
            {cue.translation}
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <button
          type="button"
          disabled={source === 'movie' ? moviePlayer.time === null : !ready}
          onClick={() => {
            setSelected(cue.id);
            void playback.listen(cue);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-amber-200 disabled:opacity-40"
        >
          <Volume2 size={16} />
          Дахин сонсох
        </button>
        {selected !== null && (
          <button
            type="button"
            onClick={() => {
              playback.follow();
              setSelected(null);
            }}
            aria-label="Видеогоо дагах"
            className="text-slate-400"
          >
            <RotateCcw size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setTab('transcript')}
          className="ml-auto text-xs text-slate-400"
        >
          Бүх хадмал
        </button>
      </div>
      <details className="mt-3 text-xs text-slate-500">
        <summary className="w-fit cursor-pointer">Сонсох тохиргоо</summary>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={playback.loop}
              onChange={(event) => playback.changeLoop(event.target.checked)}
            />
            Давтаж сонсох
          </label>
          {source === 'local' && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={playback.slow}
                onChange={(event) => playback.changeSlow(event.target.checked)}
              />
              Удаанаар сонсох
            </label>
          )}
        </div>
      </details>
    </section>
  );
}
