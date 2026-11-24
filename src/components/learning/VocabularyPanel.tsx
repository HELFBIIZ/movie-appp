'use client';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { isDue } from '@/lib/learning/srs';
import type { LearningItem } from '@/lib/learning/types';
import RecallPractice from './RecallPractice';

export default function VocabularyPanel({
  items,
  now,
  onReview,
  onRemove,
}: {
  items: LearningItem[];
  now: number;
  onReview: (id: string, correct: boolean) => boolean;
  onRemove: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LearningItem | null>(null);
  if (selected)
    return (
      <div>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="px-4 pt-4 text-xs text-amber-200"
        >
          ← Миний үг
        </button>
        <RecallPractice
          key={selected.id}
          items={[selected]}
          onReview={onReview}
          onDone={() => setSelected(null)}
        />
      </div>
    );
  const search = query.toLocaleLowerCase('mn-MN').trim();
  const words = items.filter((item) =>
    `${item.word} ${item.meaning}`.toLocaleLowerCase('mn-MN').includes(search),
  );
  if (!items.length)
    return (
      <p className="p-5 text-sm text-slate-400">
        Хадмалаас үг сонгоод «Энэ үгийг суръя» дарахад энд хадгалагдана.
      </p>
    );
  return (
    <div className="p-3">
      {items.length > 5 && (
        <input
          aria-label="Үг хайх"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Үгээ хайх…"
          className="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
        />
      )}
      <ul aria-label="Хадгалсан үгс" className="max-h-[28rem] space-y-2 overflow-y-auto">
        {words.map((item) => (
          <li key={item.id} className="rounded-xl bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-amber-200" lang="en">
                  {item.word}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-300" lang="mn">
                  {item.meaning}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`${item.word} — устгах`}
                className="rounded-lg p-2 text-slate-500 hover:text-rose-300"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
              <details>
                <summary className="w-fit cursor-pointer">Өгүүлбэрийг харах</summary>
                <p className="mt-2 leading-6 text-slate-400" lang="en">
                  {item.example}
                </p>
                {item.context && (
                  <p className="mt-1 leading-6" lang="mn">
                    {item.context}
                  </p>
                )}
              </details>
              {isDue(item, now) ? (
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="shrink-0 rounded-lg border border-amber-400/25 px-3 py-2 text-amber-200"
                >
                  Давтах
                </button>
              ) : (
                <span className="shrink-0">
                  {new Date(item.dueAt).toLocaleDateString('mn-MN', {
                    month: 'numeric',
                    day: 'numeric',
                  })}
                  -нд давтана
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!words.length && <p className="p-4 text-sm text-slate-400">Таарах үг олдсонгүй.</p>}
    </div>
  );
}
