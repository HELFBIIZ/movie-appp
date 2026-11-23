'use client';
import { useEffect, useRef, useState } from 'react';
import { formatTime } from '@/lib/learning/vtt';
import CueWords from './CueWords';
import type { LearningController, LearningSource } from './useLearningController';

export default function SentencePractice({
  controller,
  source,
  translations,
}: {
  controller: LearningController;
  source: LearningSource;
  translations: boolean;
}) {
  const {
    lesson,
    active,
    moviePlayer,
    videoRef,
    ready,
    progress,
    savedSentences,
    setSelection,
    save,
    setMessage,
    setTab,
  } = controller;
  const cues = lesson.cues.filter((cue) => cue.language !== 'mn');
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const playing = useRef<{ start: number; end: number; loop: boolean } | null>(null);
  const current =
    selected !== null
      ? cues.findIndex((cue) => cue.id === selected)
      : cues.findLastIndex((cue) => cue.start <= (controller.time ?? -1));
  const index = Math.max(0, current);
  const cue = cues[index];
  const isMovie = source === 'movie';
  const cancelReplay = moviePlayer.cancelReplay;
  useEffect(() => () => cancelReplay(), [cancelReplay]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isMovie) return;
    const stop = () => {
      const range = playing.current;
      if (!range || video.currentTime < range.end) return;
      if (range.loop) video.currentTime = range.start;
      else {
        video.pause();
        playing.current = null;
      }
    };
    const cancel = () => {
      playing.current = null;
    };
    video.addEventListener('timeupdate', stop);
    video.addEventListener('pause', cancel);
    return () => {
      video.removeEventListener('timeupdate', stop);
      video.removeEventListener('pause', cancel);
      if (playing.current) video.pause();
      playing.current = null;
      video.playbackRate = 1;
    };
  }, [videoRef, isMovie]);
  async function listen() {
    if (!cue) return;
    setSelected(cue.id);
    if (isMovie) {
      if (!moviePlayer.replay(cue.start, cue.end, loop))
        setMessage('Тоглуулагчийг эхлүүлээд цаг нь холбогдсоны дараа дахин сонсоорой.');
      return;
    }
    const video = videoRef.current;
    if (!video || !ready) return;
    try {
      video.currentTime = cue.start;
      video.playbackRate = speed;
      playing.current = { start: cue.start, end: cue.end, loop };
      await video.play();
    } catch {
      playing.current = null;
      setMessage('Видео дээрх тоглуулах товчийг дарна уу.');
    }
  }
  function change(next: number) {
    playing.current = null;
    if (isMovie) moviePlayer.pause();
    else videoRef.current?.pause();
    setSelected(cues[next].id);
  }
  if (!cue)
    return (
      <div className="p-5 text-sm leading-6 text-slate-400">
        Англи хадмал бэлэн болмогц нэг өгүүлбэрээр сурах дасгал энд гарна.
        <button
          type="button"
          onClick={() => setTab('saved')}
          className="mt-3 block text-amber-200 underline"
        >
          Хадгалсан үгээ давтах
        </button>
      </div>
    );
  const saved = savedSentences.has(cue.id);
  return (
    <section className="space-y-4 p-4 md:p-5" aria-label="Нэг өгүүлбэрээр сурах">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          Өгүүлбэр {index + 1} / {cues.length} · {formatTime(cue.start)}
        </span>
        <button
          type="button"
          aria-pressed={selected === null}
          onClick={() => {
            playing.current = null;
            cancelReplay();
            setSelected(null);
          }}
          className="text-amber-200"
        >
          Видеог дагах
        </button>
      </div>
      <p className="text-sm text-slate-400">
        Сонсоод утгыг нь таа. Дараа нь мэдэхгүй үгээ дараарай.
      </p>
      <div
        className="rounded-xl bg-slate-900 p-4"
        data-testid={active.some((item) => item.id === cue.id) ? 'active-cue' : undefined}
      >
        <CueWords
          cue={cue}
          curated={source === 'sample'}
          onWord={(note, selectedCue) => {
            if (isMovie) moviePlayer.pause();
            else videoRef.current?.pause();
            setSelection({ note, cue: selectedCue });
          }}
        />
        {translations && cue.translation ? (
          <>
            <button
              type="button"
              aria-expanded={revealed === cue.id}
              onClick={() => setRevealed(revealed === cue.id ? null : cue.id)}
              className="mt-3 text-sm text-amber-200 underline"
            >
              {revealed === cue.id ? 'Утгыг нуух' : 'Монгол утгыг нээх'}
            </button>
            {revealed === cue.id && (
              <p className="mt-3 text-sm leading-6 text-slate-300" lang="mn">
                {cue.translation}
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            {translations
              ? 'Энэ өгүүлбэрт таарсан Монгол хадмал одоогоор алга.'
              : 'Монгол тайлбарыг дээрээс нээж болно.'}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isMovie ? moviePlayer.time === null : !ready}
          onClick={() => void listen()}
          className="rounded-lg bg-[#c9a227] px-4 py-2 font-semibold text-slate-950 disabled:opacity-40"
        >
          Өгүүлбэрийг сонсох
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={loop}
            onChange={(event) => {
              setLoop(event.target.checked);
              if (playing.current) playing.current.loop = event.target.checked;
              if (isMovie) moviePlayer.pause();
            }}
          />
          Давтаж сонсох
        </label>
        {!isMovie && (
          <label className="flex items-center gap-2 text-sm text-slate-300">
            Хурд
            <select
              aria-label="Сонсох хурд"
              value={speed}
              onChange={(event) => {
                const value = Number(event.target.value);
                setSpeed(value);
                if (videoRef.current) videoRef.current.playbackRate = value;
              }}
              className="rounded border border-white/15 bg-slate-900 p-2"
            >
              <option value={0.75}>0.75×</option>
              <option value={1}>1×</option>
            </select>
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => change(index - 1)}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-40"
        >
          ← Өмнөх өгүүлбэр
        </button>
        <button
          type="button"
          disabled={saved || !progress}
          onClick={() => save('sentence', cue)}
          className="text-sm text-amber-200 disabled:opacity-40"
        >
          {saved ? 'Өгүүлбэр хадгалсан' : 'Өгүүлбэр хадгалах'}
        </button>
        <button
          type="button"
          disabled={index + 1 === cues.length}
          onClick={() => change(index + 1)}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-40"
        >
          Дараах өгүүлбэр →
        </button>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Утгыг ойлгосны дараа дагаж хэлээд дахин сонсоорой. Дуудлагыг автоматаар үнэлэхгүй.
      </p>
    </section>
  );
}
