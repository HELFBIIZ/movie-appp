'use client';
import { isDue } from '@/lib/learning/srs';
import type { LearningController } from './useLearningController';
export default function LearningProgress({ controller }: { controller: LearningController }) {
  const { items, now, message, storageError } = controller;
  return (
    <div className="mt-4 border-t border-white/10 pt-4 text-sm">
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2 text-slate-400"
        aria-label="Learning progress"
      >
        <span>
          Хадгалсан: <strong className="text-slate-200">{items.length}</strong>
        </span>
        <span>
          Давтах:{' '}
          <strong className="text-amber-200">
            {items.filter((item) => isDue(item, now)).length}
          </strong>
        </span>
        <span className="text-xs text-slate-500">Энэ хөтөчид хадгалагдана.</span>
      </div>
      {message && (
        <p role="status" className="mt-2 text-emerald-300">
          {message}
        </p>
      )}
      {storageError && (
        <p role="alert" className="mt-2 text-rose-300">
          {storageError}
        </p>
      )}
    </div>
  );
}
