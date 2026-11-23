'use client';
import { vocabularyQuestions } from '@/lib/learning/quiz';
import { contextQuestion } from '@/lib/learning/sample';
import { htmlVideoAdapter } from '@/lib/learning/player-adapter';
import SubtitleTranscript from './SubtitleTranscript';
import SentencePractice from './SentencePractice';
import RecallPractice from './RecallPractice';
import { recallQueue } from '@/lib/learning/recall';
import VocabularyPanel from './VocabularyPanel';
import QuizPanel from './QuizPanel';
import { tabs, type LearningController, type LearningSource } from './useLearningController';
import { useState } from 'react';
import { usePlacementProfile } from './usePlacementProfile';
import { OPEN_PLACEMENT_EVENT, placementBands } from '@/lib/learning/placement';
export default function LearningPanels({
  controller,
  source,
}: {
  controller: LearningController;
  source: LearningSource;
}) {
  const { profile } = usePlacementProfile();
  const [translationOverride, setTranslationOverride] = useState<boolean | null>(null);
  const [recalling, setRecalling] = useState(false);
  const translations =
    translationOverride ?? (profile ? placementBands[profile.band].showTranslations : true);
  const {
    tab,
    setTab,
    items,
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
    answer,
    moviePlayer,
    movieLesson,
  } = controller;
  const guestMovie =
    source === 'movie' &&
    movieLesson.supported &&
    !lesson.cues.length &&
    !lesson.loading &&
    !lesson.error;
  return (
    <div id="learning-panels" className="min-w-0 overflow-hidden rounded-xl border border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-3 text-xs text-slate-400">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_PLACEMENT_EVENT))}
          className="text-amber-200"
        >
          {profile
            ? `${placementBands[profile.band].label} · ${placementBands[profile.band].words} үгийн зорилго`
            : 'Түвшнээ шалгах · 2 минут'}
        </button>
        <button
          type="button"
          aria-pressed={translations}
          onClick={() => setTranslationOverride(!translations)}
        >
          Монгол тайлбар: {translations ? 'харагдана' : 'нуусан'}
        </button>
      </div>
      <div
        className="flex gap-1 border-b border-white/10 bg-slate-900/80 p-2"
        role="group"
        aria-label="Learning panels"
      >
        {tabs.map(({ id, label }) => (
          <button
            type="button"
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`flex-1 rounded-lg px-3 py-2 text-sm ${tab === id ? 'bg-white/10 text-amber-200' : 'text-slate-400 hover:text-white'}`}
          >
            {label}
            {id === 'saved' ? ` (${items.length})` : ''}
          </button>
        ))}
      </div>
      {lesson.loading && (tab === 'transcript' || tab === 'practice') ? (
        <p role="status" className="p-6 text-slate-400">
          Хадмал ачаалж байна…
        </p>
      ) : lesson.error && (tab === 'transcript' || tab === 'practice') ? (
        <div className="p-6">
          <p role="alert" className="text-rose-300">
            {lesson.error}
          </p>
          <button type="button" onClick={lesson.retry} className="mt-3 text-amber-200">
            Дахин ачаалах
          </button>
        </div>
      ) : tab === 'practice' && !guestMovie ? (
        <SentencePractice
          key={lesson.mediaId}
          controller={controller}
          source={source}
          translations={translations}
        />
      ) : tab === 'transcript' && !guestMovie ? (
        <SubtitleTranscript
          cues={lesson.cues}
          activeIds={active.map((cue) => cue.id)}
          canSeek={source === 'movie' ? moviePlayer.time !== null : ready}
          curated={source === 'sample'}
          translations={translations}
          canSave={!!progress && !lesson.loading}
          savedSentences={savedSentences}
          onSeek={(seconds) => {
            if (source === 'movie') {
              if (moviePlayer.seek(seconds)) setMessage('Хугацаа шилжүүлэх хүсэлт илгээлээ.');
              return;
            }
            if (videoRef.current && htmlVideoAdapter(videoRef.current).seek(seconds))
              setTime(seconds);
          }}
          onWord={(note, cue) => {
            if (source === 'movie') moviePlayer.pause();
            else videoRef.current?.pause();
            setSelection({ note, cue });
          }}
          onSave={(cue) => save('sentence', cue)}
        />
      ) : null}
      {tab === 'saved' && (
        <VocabularyPanel
          items={items}
          now={now}
          onReview={review}
          onRemove={(id) => {
            if (
              update((current) => ({
                ...current,
                items: current.items.filter((item) => item.id !== id),
              }))
            )
              setMessage('Карт устгагдлаа.');
          }}
        />
      )}
      {tab === 'quiz' && (
        <>
          <div className="flex flex-wrap gap-3 border-b border-white/10 p-3 text-sm">
            <button
              type="button"
              aria-pressed={!recalling}
              onClick={() => setRecalling(false)}
              className={!recalling ? 'text-amber-200' : 'text-slate-400'}
            >
              Утгыг сонгох
            </button>
            <button
              type="button"
              aria-pressed={recalling}
              onClick={() => setRecalling(true)}
              className={recalling ? 'text-amber-200' : 'text-slate-400'}
            >
              Санаж бичих
            </button>
          </div>
          {recalling ? (
            <RecallPractice
              key={lesson.mediaId}
              items={recallQueue(scoped, now, profile ? placementBands[profile.band].words : 3)}
              onReview={review}
              onDone={() => {
                setRecalling(false);
                setTab('practice');
              }}
            />
          ) : (
            <>
              <QuizPanel
                key={lesson.mediaId}
                questions={vocabularyQuestions(scoped)}
                onAnswer={answer}
                onBack={() => setTab('practice')}
              />
              {source === 'sample' && (
                <details className="border-t border-white/10 p-4">
                  <summary className="w-fit cursor-pointer text-sm text-slate-400">
                    Үзэгдлийн асуулт
                  </summary>
                  <QuizPanel key="sample-context" questions={[contextQuestion]} onAnswer={answer} />
                </details>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
