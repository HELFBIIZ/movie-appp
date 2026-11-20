'use client';

import { useState } from 'react';
import { isCorrect } from '@/lib/learning/quiz';
import type { Question } from '@/lib/learning/types';

export default function QuizPanel({
  questions,
  onAnswer,
}: {
  questions: Question[];
  onAnswer: (question: Question, correct: boolean) => boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answered = questions.filter((question) => answers[question.id] !== undefined);
  const score = answered.filter((question) => isCorrect(question, answers[question.id])).length;
  if (!questions.length)
    return (
      <p className="p-6 text-slate-400">Хадмалаас үг хадгалсны дараа энд өөрийгөө шалгаарай.</p>
    );
  return (
    <div className="max-h-[32rem] space-y-5 overflow-y-auto p-4">
      <p className="text-sm text-amber-200" role="status">
        Оноо: {score}/{questions.length} · Хариулсан: {answered.length}/{questions.length}
      </p>
      {questions.map((question) => {
        const selected = answers[question.id];
        return (
          <fieldset key={question.id} className="rounded-xl border border-white/10 p-4">
            <legend className="whitespace-pre-line px-1 text-base leading-7 text-slate-100">
              {question.prompt}
            </legend>
            <div className="mt-2 space-y-2">
              {question.choices.map((choice) => (
                <button
                  type="button"
                  key={choice}
                  disabled={selected !== undefined}
                  onClick={() => {
                    if (onAnswer(question, isCorrect(question, choice)))
                      setAnswers((previous) => ({ ...previous, [question.id]: choice }));
                  }}
                  className={`block w-full rounded-lg border px-3 py-3 text-left text-sm leading-6 transition disabled:cursor-default ${selected === choice ? (isCorrect(question, choice) ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200' : 'border-rose-400 bg-rose-400/10 text-rose-200') : 'border-white/10 text-slate-300 enabled:hover:border-amber-400/50'}`}
                >
                  {choice}
                </button>
              ))}
            </div>
            {selected !== undefined && (
              <p className="mt-3 text-sm leading-6 text-slate-300" role="status">
                {isCorrect(question, selected) ? 'Зөв.' : 'Буруу.'} {question.explanation}
              </p>
            )}
          </fieldset>
        );
      })}
      {answered.length === questions.length && (
        <button
          type="button"
          onClick={() => setAnswers({})}
          className="rounded-lg bg-amber-400/15 px-4 py-2 text-sm text-amber-200"
        >
          Дахин дасгал хийх
        </button>
      )}
    </div>
  );
}
