'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import WordPanel from './WordPanel';
import ManualWordPanel from './ManualWordPanel';
import type { LearningController, LearningSource } from './useLearningController';

export default function WordDialog({
  controller,
  source,
}: {
  controller: LearningController;
  source: LearningSource;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const {
    selection,
    setSelection,
    wordSaved,
    progress,
    lesson,
    save,
    setTab,
    storageError,
    videoRef,
    ready,
    setMessage,
    moviePlayer,
  } = controller;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (selection && !dialog.open) dialog.showModal();
    else if (!selection && dialog.open) dialog.close();
  }, [selection]);
  // Stop a sentence replay at its real end and remove the listener when the word closes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selection || source === 'movie') return;
    const end = selection.cue.end;
    const stop = () => {
      if (video.currentTime >= end) video.pause();
    };
    video.addEventListener('timeupdate', stop);
    return () => {
      video.removeEventListener('timeupdate', stop);
      video.pause();
    };
  }, [selection, source, videoRef]);
  async function replay() {
    if (source === 'movie' && selection) {
      if (!moviePlayer.replay(selection.cue.start, selection.cue.end))
        setMessage('Тоглуулагчийн цаг холбогдсоны дараа дахин сонсоорой.');
      return;
    }
    const video = videoRef.current;
    if (!video || !selection || !ready) return;
    try {
      video.currentTime = selection.cue.start;
      await video.play();
    } catch {
      setMessage('Дахин сонсохын тулд видео дээрх тоглуулах товчийг дарна уу.');
    }
  }
  return (
    <dialog
      ref={ref}
      aria-label="Үгийн тайлбар"
      onClose={() => setSelection(null)}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-amber-400/25 bg-slate-950 p-4 text-white shadow-2xl backdrop:bg-black/75 md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-amber-200">Нэг үг суръя</p>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Тайлбарыг хаах"
          className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>
      {selection &&
        (source === 'sample' ? (
          <WordPanel
            selection={selection}
            saved={wordSaved}
            canSave={!!progress}
            onSave={() => save('word', selection.cue, selection.note)}
          />
        ) : (
          <ManualWordPanel
            key={`${lesson.mediaId}:${selection.cue.id}:${selection.note.word}`}
            selection={selection}
            saved={wordSaved}
            canSave={!!progress && !lesson.loading}
            onSave={(note) => save('word', selection.cue, note)}
          />
        ))}
      {storageError && (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {storageError}
        </p>
      )}
      {selection && (
        <button
          type="button"
          disabled={source === 'movie' ? moviePlayer.time === null : !ready}
          onClick={() => void replay()}
          className="mt-3 rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 disabled:opacity-40"
        >
          Өгүүлбэрээ дахин сонсох
        </button>
      )}
      {wordSaved && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p role="status" className="text-sm text-emerald-300">
            Хадгаллаа. Одоо утгыг нь санаж үзье.
          </p>
          <button
            type="button"
            onClick={() => {
              setTab('quiz');
              ref.current?.close();
            }}
            className="mt-3 w-full rounded-lg bg-[#c9a227] px-4 py-3 font-semibold text-slate-950"
          >
            Энэ үгээ давтах
          </button>
        </div>
      )}
    </dialog>
  );
}
