'use client';
import { useState } from 'react';
import { recallContext, recallCorrect } from '@/lib/learning/recall';
import type { LearningItem } from '@/lib/learning/types';

export default function RecallPractice({
  items,
  onReview,
  onDone,
}: {
  items: LearningItem[];
  onReview: (id: string, correct: boolean) => boolean;
  onDone: () => void;
}) {
  // Keep this session stable when a successful answer changes the spaced review schedule.
  const [cards] = useState(items);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const item = cards[index];
  if (!item)
    return (
      <div className="space-y-3 p-5" role="status">
        <h3 className="text-lg font-semibold text-amber-200">
          {cards.length ? 'Өнөөдрийн давтлагаа хийлээ!' : 'Эхлээд нэг үг хадгалъя.'}
        </h3>
        <p className="text-sm text-slate-300">
          {cards.length
            ? `${cards.length} үгээ санаж үзлээ · ${score} зөв. Хэцүү үгсийг 10 минутын дараа дахин давтана.`
            : 'Кино эсвэл үнэгүй дасгалаас мэдэхгүй үгээ сонгоорой.'}
        </p>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm"
        >
          Дуусгах
        </button>
      </div>
    );
  function answer(reveal = false) {
    if (result !== null || !item) return;
    const correct = !reveal && recallCorrect(item, value);
    if (onReview(item.id, correct)) {
      setResult(correct);
      if (correct) setScore((previous) => previous + 1);
    }
  }
  return (
    <form
      className="space-y-4 p-4"
      aria-label="Санаж бичих дасгал"
      onSubmit={(event) => {
        event.preventDefault();
        answer();
      }}
    >
      <p className="text-xs text-slate-400">
        Үг {index + 1} / {cards.length} · Сонголт харалгүй санаж үзье
      </p>
      <p className="text-lg text-amber-200" lang="mn">
        {item.meaning}
      </p>
      <p className="text-sm leading-7 text-slate-300" lang="en">
        {recallContext(item)}
      </p>
      <label className="block text-sm text-slate-300">
        Англи үгээ бичээрэй
        <input
          key={item.id}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={result !== null}
          className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-3 text-white"
        />
      </label>
      {result === null ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!value.trim()}
            className="rounded-lg bg-[#c9a227] px-4 py-2 font-semibold text-slate-950 disabled:opacity-40"
          >
            Шалгах
          </button>
          <button
            type="button"
            onClick={() => answer(true)}
            className="text-sm text-slate-400 underline"
          >
            Санахгүй байна
          </button>
        </div>
      ) : (
        <>
          <p role="status" className={result ? 'text-emerald-300' : 'text-amber-200'}>
            {result ? 'Зөв саналаа!' : 'Дахиад давтъя.'} {item.word} — {item.meaning}
          </p>
          <button
            type="button"
            onClick={() => {
              setIndex(index + 1);
              setValue('');
              setResult(null);
            }}
            className="rounded-lg bg-[#c9a227] px-4 py-2 font-semibold text-slate-950"
          >
            {index + 1 === cards.length ? 'Үр дүнгээ харах' : 'Дараагийн үг'}
          </button>
        </>
      )}
    </form>
  );
}
