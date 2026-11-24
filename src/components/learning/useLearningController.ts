'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { activeCues } from '@/lib/learning/vtt';
import { addItem, itemId } from '@/lib/learning/storage';
import { reviewItem } from '@/lib/learning/srs';
import type { AlignedCue, LearningItem, Question, WordNote } from '@/lib/learning/types';
import { useLearningStorage } from './useLearningStorage';
import { useLesson } from './useLesson';
import { useMovieLesson } from './useMovieLesson';
import { useMoviePlayer, type MoviePlayerContext } from './useMoviePlayer';
import { useLearningAccount } from './LearningAccount';
import { listenedSeconds } from '@/lib/learning/snapshot';
export type LearningSource = 'local' | 'movie';
export const tabs = [
  { id: 'practice', label: 'Өгүүлбэр' },
  { id: 'saved', label: 'Миний үг' },
  { id: 'quiz', label: 'Давтах' },
  { id: 'transcript', label: 'Бүх хадмал' },
] as const;

export function useLearningController(
  movieId: string,
  source: LearningSource,
  context?: MoviePlayerContext,
) {
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('practice');
  const [time, setTime] = useState(0);
  const [readyMedia, setReadyMedia] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState('');
  const [selection, setSelection] = useState<{ note: WordNote; cue: AlignedCue } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { progress, storageError, update } = useLearningStorage();
  const account = useLearningAccount();
  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);
  const baseLesson = useLesson(source);
  const movieLesson = useMovieLesson(source === 'movie', !!context?.allowed, movieId, context);
  const isMovie = source === 'movie';
  const moviePlayer = useMoviePlayer(isMovie, context);
  const movieTime = useRef<number | null>(null);
  useEffect(() => {
    movieTime.current = moviePlayer.time;
  }, [moviePlayer.time]);
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
  const setReady = useCallback(() => setReadyMedia(mediaKey), [mediaKey]);
  useEffect(() => {
    let previous: { media: number; wall: number } | null = null;
    let seconds = 0;
    const flush = () => {
      if (seconds < 1) return;
      const value = Math.min(30, seconds);
      if (
        accountRef.current.update((snapshot) => ({
          ...snapshot,
          activity: [
            ...snapshot.activity,
            {
              id: crypto.randomUUID(),
              kind: 'listen' as const,
              at: Date.now(),
              movieId,
              seconds: value,
            },
          ].slice(-5000),
        }))
      )
        seconds = 0;
    };
    const timer = setInterval(() => {
      const media =
        source === 'movie'
          ? movieTime.current
          : videoRef.current && !videoRef.current.paused && !videoRef.current.seeking
            ? videoRef.current.currentTime
            : null;
      const wall = Date.now();
      if (document.visibilityState !== 'visible' || media === null) {
        previous = null;
        flush();
        return;
      }
      seconds += listenedSeconds(previous, media, wall);
      previous = { media, wall };
      if (seconds >= 15) flush();
    }, 1000);
    window.addEventListener('pagehide', flush);
    return () => {
      clearInterval(timer);
      flush();
      window.removeEventListener('pagehide', flush);
    };
  }, [movieId, lesson.mediaId, source]);
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
  const items = useMemo(() => progress?.items ?? [], [progress?.items]);
  const scoped = items.filter(
    (item) =>
      item.movieId === movieId &&
      (isMovie
        ? item.mediaId.startsWith(`${movieLesson.prefix}:`)
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
  const save = useCallback(
    (
      kind: 'word' | 'sentence',
      cue: AlignedCue,
      note?: WordNote,
      provenance: LearningItem['provenance'] = 'unverified-subtitle',
    ) => {
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
        tmdbId:
          isMovie && Number.isSafeInteger(Number(context?.tmdbId)) && Number(context?.tmdbId) > 0
            ? Number(context?.tmdbId)
            : undefined,
        grammar: note?.grammar,
        context: note?.context,
        provenance,
      };
      const baseId = itemId(data);
      const duplicate = scoped.find(
        (item) => item.kind === kind && item.word === data.word && item.meaning === data.meaning,
      );
      if (kind === 'word' && duplicate) return duplicate.id;
      const id = items.some((item) => item.id === baseId && item.meaning !== data.meaning)
        ? JSON.stringify([baseId, data.meaning])
        : baseId;
      const item: LearningItem = { ...data, id };
      if (update((current) => addItem(current, item))) {
        setNow(savedAt);
        setMessage(`${kind === 'word' ? 'Үг' : 'Өгүүлбэр'} хадгалагдлаа.`);
        return item.id;
      }
      return false;
    },
    [movieId, lesson.mediaId, isMovie, context?.tmdbId, scoped, items, update],
  );
  function review(id: string, remembered: boolean) {
    const card = account.snapshot.progress.items.find((item) => item.id === id);
    if (!card) return false;
    const timestamp = Date.now();
    const success = account.update((snapshot) => ({
      ...snapshot,
      progress: {
        ...snapshot.progress,
        items: snapshot.progress.items.map((item) =>
          item.id === id ? reviewItem(item, remembered, timestamp) : item,
        ),
      },
      activity: [
        ...snapshot.activity,
        {
          id: crypto.randomUUID(),
          kind: 'review' as const,
          at: timestamp,
          movieId: card.movieId,
          correct: remembered,
        },
      ].slice(-5000),
    }));
    if (success) {
      setNow(timestamp);
      setMessage(remembered ? 'Дараагийн давтлагыг товлолоо.' : '10 минутын дараа дахин давтана.');
    }
    return success;
  }
  function answer(question: Question, correct: boolean) {
    if (question.itemId) return review(question.itemId, correct);
    return account.update((snapshot) => ({
      ...snapshot,
      progress: {
        ...snapshot.progress,
        contextCorrect: snapshot.progress.contextCorrect + (correct ? 1 : 0),
        contextIncorrect: snapshot.progress.contextIncorrect + (correct ? 0 : 1),
      },
      activity: [
        ...snapshot.activity,
        { id: crypto.randomUUID(), kind: 'context' as const, at: Date.now(), movieId, correct },
      ].slice(-5000),
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
