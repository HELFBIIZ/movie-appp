'use client';
import { useState } from 'react';
import type { LearningItem } from '@/lib/learning/types';
import { htmlVideoAdapter } from '@/lib/learning/player-adapter';
import { recallQueue } from '@/lib/learning/recall';
import { isDue } from '@/lib/learning/srs';
import SubtitleTranscript from './SubtitleTranscript';
import SentencePractice from './SentencePractice';
import VocabularyPanel from './VocabularyPanel';
import RecallPractice from './RecallPractice';
import { usePlacementProfile } from './usePlacementProfile';
import { placementBands } from '@/lib/learning/placement';
import type { LearningController, LearningSource } from './useLearningController';

export default function LearningPanels({
  controller,
  source,
}: {
  controller: LearningController;
  source: LearningSource;
}) {
  const { profile } = usePlacementProfile();
  const [session, setSession] = useState<LearningItem[] | null>(null);
  const {
    tab,
    setTab,
    lesson,
    active,
    ready,
    progress,
    savedSentences,
    videoRef,
    setTime,
    setSelection,
    save,
    now,
    review,
    update,
    setMessage,
    scoped,
    moviePlayer,
  } = controller;
  const words = scoped.filter((item) => item.kind === 'word');
  const due = words.filter((item) => isDue(item, now));
  return (
    <div id="learning-panels" className="min-w-0 overflow-hidden rounded-xl border border-white/10">
      <div
        role="group"
        aria-label="Сурах хэсэг"
        className="flex border-b border-white/10 bg-white/5 p-1"
      >
        {(
          [
            { id: 'practice', label: 'Үг сурах' },
            { id: 'saved', label: `Миний үг (${words.length})` },
            { id: 'quiz', label: due.length ? `Давтах (${due.length})` : 'Давтах' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (id === 'quiz')
                setSession(recallQueue(due, now, profile ? placementBands[profile.band].words : 3));
              setTab(id);
            }}
            aria-pressed={tab === id || (id === 'practice' && tab === 'transcript')}
            className={`min-w-0 flex-1 rounded-lg px-2 py-2.5 text-sm ${tab === id || (id === 'practice' && tab === 'transcript') ? 'bg-white/10 text-amber-200' : 'text-slate-400'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {(tab === 'practice' || tab === 'transcript') &&
        (lesson.loading ? (
          <p role="status" className="p-5 text-sm text-slate-400">
            Хадмал бэлдэж байна…
          </p>
        ) : lesson.error ? (
          <div className="p-5">
            <p className="text-sm text-slate-400">Хадмалыг нээж чадсангүй.</p>
            <button type="button" onClick={lesson.retry} className="mt-3 text-sm text-amber-200">
              Дахин оролдох
            </button>
          </div>
        ) : tab === 'practice' ? (
          <SentencePractice key={lesson.mediaId} controller={controller} source={source} />
        ) : (
          <>
            <button
              type="button"
              onClick={() => setTab('practice')}
              className="px-4 pt-4 text-xs text-amber-200"
            >
              ← Нэг өгүүлбэрээр харах
            </button>
            <SubtitleTranscript
              cues={lesson.cues}
              activeIds={active.map((cue) => cue.id)}
              canSeek={source === 'movie' ? moviePlayer.time !== null : ready}
              canSave={!!progress}
              savedSentences={savedSentences}
              onSeek={(seconds) => {
                if (source === 'movie') moviePlayer.seek(seconds);
                else if (videoRef.current && htmlVideoAdapter(videoRef.current).seek(seconds))
                  setTime(seconds);
              }}
              onWord={(note, cue) => {
                if (source === 'movie') moviePlayer.pause();
                else videoRef.current?.pause();
                setSelection({ note, cue });
              }}
              onSave={(cue) => {
                save('sentence', cue);
              }}
            />
          </>
        ))}
      {tab === 'saved' && (
        <VocabularyPanel
          items={words}
          now={now}
          onReview={review}
          onRemove={(id) => {
            if (
              update((current) => ({
                ...current,
                items: current.items.filter((item) => item.id !== id),
              }))
            )
              setMessage('Үг устгагдлаа.');
          }}
        />
      )}
      {tab === 'quiz' &&
        (session?.length ? (
          <RecallPractice
            key={lesson.mediaId}
            items={session}
            onReview={review}
            onDone={() => {
              setSession(null);
              setTab('practice');
            }}
          />
        ) : (
          <div className="p-5">
            <p className="text-sm text-slate-300">
              {words.length
                ? 'Одоогоор давтах үг алга. Шинэ үгээ үргэлжлүүлэн сураарай.'
                : 'Эхлээд хадмалаас нэг үг сонгоорой.'}
            </p>
            <button
              type="button"
              onClick={() => setTab('practice')}
              className="mt-4 rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Үг сурах
            </button>
          </div>
        ))}
    </div>
  );
}
