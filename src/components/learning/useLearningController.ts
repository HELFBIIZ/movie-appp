'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { activeCues } from '@/lib/learning/vtt';
import { addItem, itemId } from '@/lib/learning/storage';
import { reviewItem } from '@/lib/learning/srs';
import type { AlignedCue, LearningItem, Question, WordNote } from '@/lib/learning/types';
import { useLearningStorage } from './useLearningStorage';
import { useLesson } from './useLesson';
import { useMovieLesson } from './useMovieLesson';
import { useMoviePlayer, type MoviePlayerContext } from './useMoviePlayer';
import { SPIDER_MAN } from '@/lib/learning/movie';
export type LearningSource = 'sample' | 'local' | 'movie';
export const tabs = [
  { id: 'transcript', label: 'Хадмал' },
  { id: 'saved', label: 'Хадгалсан' },
  { id: 'quiz', label: 'Давтах' },
] as const;

export function useLearningController(
  movieId: string,
  source: LearningSource,
  context?: MoviePlayerContext,
) {
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('transcript');
  const [time, setTime] = useState(0);
  const [readyMedia, setReadyMedia] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState('');
  const [selection, setSelection] = useState<{ note: WordNote; cue: AlignedCue } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { progress, storageError, update } = useLearningStorage();
  const baseLesson = useLesson(source);
  const movieLesson = useMovieLesson(
    source === 'movie',
    !!context?.allowed,
    movieId,
    context?.englishSubtitleUrl,
  );
  const isMovie = source === 'movie' && movieId === SPIDER_MAN.slug;
  const moviePlayer = useMoviePlayer(isMovie, context);
  const lesson = isMovie
    ? {
        ...baseLesson,
        cues: movieLesson.cues,
        mediaId: movieLesson.mediaId,
        loading: movieLesson.loading,
        error: movieLesson.error,
        retry: movieLesson.retry,
      }
    : baseLesson;
  const displayTime = source === 'movie' ? moviePlayer.time : time;
  const mediaKey = `${lesson.mediaId}:${lesson.videoUrl}`;
  const ready = readyMedia === mediaKey;
  const setReady = () => setReadyMedia(mediaKey);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  // Readiness belongs to a media key; never reset it after a native event.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve production mount/source-reset timing; covered by browser regression.
    setTime(0);
    setSelection(null);
    setMessage('');
  }, [lesson.mediaId]);
  const items = progress?.items ?? [];
  const scoped = items.filter(
    (item) =>
      item.movieId === movieId &&
      (isMovie
        ? item.mediaId.startsWith(`movie:${SPIDER_MAN.tmdbId}:`)
        : item.mediaId === lesson.mediaId),
  );
  const active = displayTime === null ? [] : activeCues(lesson.cues, displayTime);
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
      tmdbId: isMovie ? SPIDER_MAN.tmdbId : undefined,
      grammar: note?.grammar,
      context: note?.context,
      provenance:
        source === 'sample'
          ? ('curated' as const)
          : note
            ? ('user-note' as const)
            : ('unverified-subtitle' as const),
    };
    const item: LearningItem = { ...data, id: itemId(data) };
    if (update((current) => addItem(current, item))) {
      setNow(savedAt);
      setMessage(`${kind === 'word' ? 'Үг' : 'Өгүүлбэр'} хадгалагдлаа.`);
      return true;
    }
    return false;
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
      setMessage(remembered ? 'Дараагийн давтлагыг товлолоо.' : '10 минутын дараа дахин давтана.');
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
    time: displayTime,
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
    movieLesson,
    moviePlayer,
  };
}
export type LearningController = ReturnType<typeof useLearningController>;
