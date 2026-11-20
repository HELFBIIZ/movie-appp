'use client';
import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { isCorrect } from '@/lib/learning/quiz';
import type { Question } from '@/lib/learning/types';

export default function QuizPanel({
  questions,
  onAnswer,
  onBack,
}: {
  questions: Question[];
  onAnswer: (question: Question, correct: boolean) => boolean;
  onBack?: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState(0);
  const answered = questions.filter((question) => answers[question.id] !== undefined);
  const score = answered.filter((question) => isCorrect(question, answers[question.id])).length;
  if (!questions.length)
    return (
      <div className="p-6">
        <p className="font-medium text-slate-200">Эхлээд нэг үг хадгалъя.</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Хадмалаас үг хадгалсны дараа энд өөрийгөө шалгаарай.
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Хадмал руу очих
          </button>
        )}
      </div>
    );
  const index = Math.min(cursor, questions.length - 1);
  const question = questions[index];
  const selected = answers[question.id];
  const complete = answered.length === questions.length;
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-slate-400">
          Үг {index + 1} / {questions.length}
        </p>
        <p className="text-amber-200" role="status">
          Оноо: {score}/{questions.length} · Хариулсан: {answered.length}/{questions.length}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Давталтын явц"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={answered.length}
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-[#c9a227] transition-all"
          style={{ width: `${(answered.length / questions.length) * 100}%` }}
        />
      </div>
      <fieldset className="rounded-xl border border-white/10 p-4">
        <legend className="whitespace-pre-line px-1 text-base leading-7 text-slate-100">
          {question.prompt}
        </legend>
        <div className="mt-2 space-y-2">
          {question.choices.map((choice) => {
            const revealCorrect = selected !== undefined && choice === question.answer;
            return (
              <button
                type="button"
                key={choice}
                disabled={selected !== undefined}
                onClick={() => {
                  if (onAnswer(question, isCorrect(question, choice)))
                    setAnswers((previous) => ({ ...previous, [question.id]: choice }));
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left text-sm leading-6 disabled:cursor-default ${revealCorrect ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200' : selected === choice ? 'border-rose-400 bg-rose-400/10 text-rose-200' : 'border-white/10 text-slate-300 enabled:hover:border-amber-400/50'}`}
              >
                {choice}
                {revealCorrect && <Check size={17} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {selected !== undefined && (
          <p className="mt-4 text-sm leading-6 text-slate-300" role="status">
            {isCorrect(question, selected) ? 'Зөв! Сайн тогтоожээ.' : 'Дахиад тогтооё.'}{' '}
            {question.explanation}
          </p>
        )}
      </fieldset>
      <div className="flex items-center justify-between gap-3">
        {index > 0 ? (
          <button
            type="button"
            onClick={() => setCursor(index - 1)}
            className="rounded-lg px-3 py-2 text-sm text-slate-400"
          >
            Өмнөх үг
          </button>
        ) : (
          <span />
        )}
        {selected !== undefined && index + 1 < questions.length && (
          <button
            type="button"
            onClick={() => setCursor(index + 1)}
            className="rounded-lg bg-[#c9a227] px-4 py-2 font-semibold text-slate-950"
          >
            Дараагийн үг →
          </button>
        )}
      </div>
      {complete && (
        <div className="rounded-xl bg-emerald-400/5 p-4">
          <p className="font-semibold text-emerald-300">Дасгал дууслаа!</p>
          <p className="mt-2 text-sm text-slate-400">
            {questions.length} үгээ давтлаа. Мартсан үгсээ дараа дахин давтана.
          </p>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setCursor(0);
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200"
          >
            <RotateCcw size={15} aria-hidden="true" />
            Дахин дасгал хийх
          </button>
        </div>
      )}
    </div>
  );
}
