'use client';
import { vocabularyQuestions } from '@/lib/learning/quiz';
import { contextQuestion } from '@/lib/learning/sample';
import { htmlVideoAdapter } from '@/lib/learning/player-adapter';
import SubtitleTranscript from './SubtitleTranscript';
import VocabularyPanel from './VocabularyPanel';
import QuizPanel from './QuizPanel';
import { tabs, type LearningController, type LearningSource } from './useLearningController';
export default function LearningPanels({
  controller,
  source,
}: {
  controller: LearningController;
  source: LearningSource;
}) {
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
  } = controller;
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-white/10">
      <div
        className="flex flex-wrap gap-1 border-b border-white/10 bg-slate-900/80 p-2"
        role="group"
        aria-label="Learning panels"
      >
        {tabs.map(({ id, label }) => (
          <button
            type="button"
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`rounded-lg px-3 py-2 text-sm ${tab === id ? 'bg-white/10 text-amber-200' : 'text-slate-400 hover:text-white'}`}
          >
            {label}
            {id === 'saved' ? ` (${items.length})` : ''}
          </button>
        ))}
      </div>
      {lesson.loading && tab === 'transcript' ? (
        <p role="status" className="p-6 text-slate-400">
          Хадмал ачаалж байна…
        </p>
      ) : lesson.error && tab === 'transcript' ? (
        <div className="p-6">
          <p role="alert" className="text-rose-300">
            {lesson.error}
          </p>
          <button type="button" onClick={lesson.retry} className="mt-3 text-amber-200">
            Дахин ачаалах
          </button>
        </div>
      ) : tab === 'transcript' ? (
        <SubtitleTranscript
          cues={lesson.cues}
          activeIds={active.map((cue) => cue.id)}
          canSeek={ready && source !== 'movie'}
          curated={source === 'sample'}
          canSave={!!progress}
          savedSentences={savedSentences}
          onSeek={(seconds) => {
            if (videoRef.current && htmlVideoAdapter(videoRef.current).seek(seconds))
              setTime(seconds);
          }}
          onWord={(note, cue) => {
            videoRef.current?.pause();
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
        <QuizPanel
          key={`word-${lesson.mediaId}`}
          questions={vocabularyQuestions(scoped)}
          onAnswer={answer}
        />
      )}
      {tab === 'context' &&
        (source === 'sample' ? (
          <QuizPanel key="sample-context" questions={[contextQuestion]} onAnswer={answer} />
        ) : (
          <p className="p-6 text-sm text-slate-400">
            Scene Quiz нь зөвхөн The Last Train sample-ийн бодит үйл явдалд зориулагдсан.
          </p>
        ))}
    </div>
  );
}
