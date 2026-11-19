'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { activeCues } from '@/lib/learning/vtt';
import { addItem, itemId } from '@/lib/learning/storage';
import { reviewItem } from '@/lib/learning/srs';
import type { AlignedCue, LearningItem, Question, WordNote } from '@/lib/learning/types';
import { useLearningStorage } from './useLearningStorage';
import { useLesson } from './useLesson';
export type LearningSource = 'sample' | 'local' | 'movie';
export const tabs = [
  { id: 'transcript', label: 'Transcript' },
  { id: 'saved', label: 'Saved & Review' },
  { id: 'quiz', label: 'Word Quiz' },
  { id: 'context', label: 'Scene Quiz' },
] as const;

export function useLearningController(movieId: string, source: LearningSource) {
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('transcript');
  const [time, setTime] = useState(0);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState('');
  const [selection, setSelection] = useState<{ note: WordNote; cue: AlignedCue } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { progress, storageError, update } = useLearningStorage();
  const lesson = useLesson(source);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  // Reset before a cached video's metadata event enables seeking.
  useLayoutEffect(() => {
    setTime(0);
    setReady(false);
    setSelection(null);
    setMessage('');
  }, [lesson.mediaId]);
  const items = progress?.items ?? [];
  const scoped = items.filter(
    (item) => item.movieId === movieId && item.mediaId === lesson.mediaId,
  );
  const active = activeCues(lesson.cues, time);
  const savedSentences = new Set(
    lesson.cues
      .filter((cue) =>
        scoped.some(
          (item) =>
            item.kind === 'sentence' && item.cueStart === cue.start && item.word === cue.text,
        ),
      )
      .map((cue) => cue.id),
  );
  function save(kind: 'word' | 'sentence', cue: AlignedCue, note?: WordNote) {
    const savedAt = Date.now();
    const data = {
      kind,
      word: note?.word ?? cue.text,
      meaning: note?.meaning ?? cue.translation,
      example: cue.text,
      movieId,
      mediaId: lesson.mediaId,
      cueStart: cue.start,
      cueEnd: cue.end,
      stage: 0,
      correct: 0,
      incorrect: 0,
      dueAt: savedAt,
      savedAt,
    };
    const item: LearningItem = { ...data, id: itemId(data) };
    if (update((current) => addItem(current, item))) {
      setNow(savedAt);
      setMessage(`${kind === 'word' ? 'Үг' : 'Өгүүлбэр'} browser-local хадгалагдлаа.`);
    }
  }
  function review(id: string, remembered: boolean) {
    const timestamp = Date.now();
    const success = update((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? reviewItem(item, remembered, timestamp) : item,
      ),
    }));
    if (success) {
      setNow(timestamp);
      setMessage(
        remembered ? 'SRS: дараагийн давтлагыг товлолоо.' : 'SRS: 10 минутын дараа дахин давтана.',
      );
    }
    return success;
  }
  function answer(question: Question, correct: boolean) {
    if (question.itemId) return review(question.itemId, correct);
    return update((current) => ({
      ...current,
      contextCorrect: current.contextCorrect + (correct ? 1 : 0),
      contextIncorrect: current.contextIncorrect + (correct ? 0 : 1),
    }));
  }
  const wordSaved = selection
    ? scoped.some((item) => item.kind === 'word' && item.word === selection.note.word)
    : false;

  return {
    tab,
    setTab,
    time,
    setTime,
    ready,
    setReady,
    now,
    message,
    setMessage,
    selection,
    setSelection,
    videoRef,
    progress,
    storageError,
    update,
    lesson,
    items,
    scoped,
    active,
    savedSentences,
    save,
    review,
    answer,
    wordSaved,
  };
}
export type LearningController = ReturnType<typeof useLearningController>;
