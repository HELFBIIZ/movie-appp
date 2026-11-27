'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import WordCoach from './WordCoach';
import type { LearningController, LearningSource } from './useLearningController';

export default function WordDialog({
  controller,
  source,
}: {
  controller: LearningController;
  source: LearningSource;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const resume = useRef(false);
  const { selection, setSelection, lesson, videoRef, ready, setMessage, moviePlayer } = controller;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (selection && !dialog.open) dialog.showModal();
    else if (!selection && dialog.open) dialog.close();
  }, [selection]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selection || source === 'movie') return;
    const stop = () => {
      if (video.currentTime >= selection.cue.end) video.pause();
    };
    video.addEventListener('timeupdate', stop);
    return () => video.removeEventListener('timeupdate', stop);
  }, [selection, source, videoRef]);
  async function replay() {
    if (!selection) return;
    if (source === 'movie') {
      moviePlayer.replay(selection.cue.start, selection.cue.end);
      return;
    }
    const video = videoRef.current;
    if (!video || !ready) return;
    try {
      video.currentTime = selection.cue.start;
      await video.play();
    } catch {
      setMessage('Видео дээр тоглуулах товчийг дарна уу.');
    }
  }
  function continueMovie() {
    resume.current = true;
    moviePlayer.cancelReplay();
    if (source === 'movie') moviePlayer.play();
    else
      void videoRef.current
        ?.play()
        .catch(() => setMessage('Видео дээр тоглуулах товчийг дарна уу.'));
    ref.current?.close();
  }
  return (
    <dialog
      ref={ref}
      aria-label="Үгийн тайлбар"
      onClose={() => {
        if (!resume.current) {
          if (source === 'movie') {
            moviePlayer.cancelReplay();
            moviePlayer.pause();
          } else videoRef.current?.pause();
        }
        window.speechSynthesis?.cancel();
        resume.current = false;
        setSelection(null);
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-amber-400/20 bg-slate-950 p-5 text-white shadow-2xl backdrop:bg-black/75"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400">Нэг үг, нэг алхам</p>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Тайлбарыг хаах"
          className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
        >
          <X size={20} />
        </button>
      </div>
      {selection && (
        <WordCoach
          key={`${lesson.mediaId}:${selection.cue.id}:${selection.note.word}:${selection.note.offset}`}
          controller={controller}
          replay={() => void replay()}
          canReplay={source === 'movie' ? moviePlayer.time !== null : ready}
          onClose={continueMovie}
        />
      )}
    </dialog>
  );
}
