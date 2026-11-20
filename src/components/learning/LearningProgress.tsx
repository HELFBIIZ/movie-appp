'use client';
import { Layers } from 'lucide-react';
import { isDue } from '@/lib/learning/srs';
import { formatTime } from '@/lib/learning/vtt';
import type { LearningController } from './useLearningController';
export default function LearningProgress({ controller }: { controller: LearningController }) {
  const { items, now, progress, time, message, storageError } = controller;
  return (
    <>
      {' '}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Learning progress">
        {[
          { label: 'Хадгалсан карт', value: items.length },
          { label: 'Давтах карт', value: items.filter((item) => isDue(item, now)).length },
          {
            label: 'Тогтсон карт · шат 4',
            value: items.filter((item) => item.stage === 4).length,
          },
          {
            label: 'Scene Quiz зөв / нийт',
            value: `${progress?.contextCorrect ?? 0}/${(progress?.contextCorrect ?? 0) + (progress?.contextIncorrect ?? 0)}`,
          },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-xl font-semibold text-amber-100">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <Layers size={15} aria-hidden="true" />
        {time === null ? 'Player clock: unavailable' : formatTime(time)} · SRS: 1 / 3 / 7 / 14
        хоног. Мартвал 10 минут.
      </p>
      <p role="status" className="mt-2 min-h-5 text-sm text-emerald-300">
        {message}
      </p>
      {storageError && (
        <p role="alert" className="mt-2 text-sm text-rose-300">
          {storageError}
        </p>
      )}
    </>
  );
}
