'use client';

import { useState } from 'react';
import { formatTime } from '@/lib/learning/vtt';
import { isDue } from '@/lib/learning/srs';
import type { LearningItem } from '@/lib/learning/types';

type Props = {
  items: LearningItem[];
  now: number;
  onReview: (id: string, remembered: boolean) => boolean;
  onRemove: (id: string) => void;
};

export default function VocabularyPanel({ items, now, onReview, onRemove }: Props) {
  const [revealed, setRevealed] = useState<string | null>(null);
  if (!items.length)
    return (
      <p className="p-6 text-slate-400">
        Хадмалын доогуур зураастай үг дээр дарж Save Word хийнэ үү. Эсвэл өгүүлбэр хадгалж болно.
      </p>
    );
  return (
    <ul className="max-h-[28rem] space-y-3 overflow-y-auto p-4" aria-label="Saved vocabulary">
      {items.map((item) => {
        const due = isDue(item, now);
        const show = revealed === item.id;
        return (
          <li key={item.id} className="rounded-xl border border-white/10 bg-slate-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <h4 className="break-words font-semibold text-amber-200">{item.word}</h4>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.word}`}
                className="shrink-0 rounded px-2 py-1 text-sm text-slate-400 hover:text-rose-300"
              >
                Устгах
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-300">{item.example}</p>
            {item.provenance === 'user-note' && (
              <p className="mt-2 text-sm text-slate-500">Өөрийн тэмдэглэл · баталгаажаагүй</p>
            )}
            {item.grammar && <p className="mt-2 text-sm text-slate-400">Дүрэм: {item.grammar}</p>}
            <p className="mt-2 text-sm text-slate-500">
              {item.kind === 'word' ? 'Үг' : 'Өгүүлбэр'} · {formatTime(item.cueStart)} ·{' '}
              {item.movieId}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {due
                ? 'Давтах цаг болсон'
                : `Дараагийн давтлага: ${new Date(item.dueAt).toLocaleString('mn-MN')}`}{' '}
              · Шат {item.stage}/4
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Зөв {item.correct} · Буруу {item.incorrect}
            </p>
            {due && !show && (
              <button
                type="button"
                onClick={() => setRevealed(item.id)}
                className="mt-3 rounded-lg border border-amber-400/30 px-3 py-2 text-sm text-amber-200"
              >
                Утгыг харах / Review
              </button>
            )}
            {(!due || show) && (
              <p className="mt-3 text-slate-100">{item.meaning || 'Орчуулгагүй өгүүлбэр'}</p>
            )}
            {due && show && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onReview(item.id, true)) setRevealed(null);
                  }}
                  className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300"
                >
                  Саналаа
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onReview(item.id, false)) setRevealed(null);
                  }}
                  className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300"
                >
                  Мартсан
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
