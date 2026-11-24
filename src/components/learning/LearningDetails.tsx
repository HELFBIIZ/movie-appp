'use client';
import { assessPlacement, placementBands } from '@/lib/learning/placement';
import type { learningMetrics } from '@/lib/learning/metrics';
import type { usePlacementProfile } from './usePlacementProfile';

export default function LearningDetails({
  stats,
  history,
}: {
  stats: ReturnType<typeof learningMetrics>;
  history: ReturnType<typeof usePlacementProfile>['history'];
}) {
  const change =
    stats.recentRate !== null &&
    stats.previousRate !== null &&
    stats.recentCount >= 5 &&
    stats.previousCount >= 5
      ? stats.recentRate - stats.previousRate
      : null;
  const max = Math.max(1, ...stats.days.map((day) => day.seconds));
  return (
    <details className="mt-5 rounded-2xl border border-white/10 p-5">
      <summary className="w-fit cursor-pointer text-sm text-slate-400">Дэлгэрэнгүй ахиц</summary>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white/5 p-4">
          <h3 className="text-sm text-slate-400">Давталтын зөв хариулт</h3>
          <p className="mt-2 text-2xl text-amber-200">
            {stats.recentRate === null ? '—' : `${stats.recentRate}%`}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Сүүлийн 7 хоног · {stats.recentCount} хариулт
          </p>
          <p className="mt-3 text-xs leading-6 text-slate-400">
            {change === null
              ? 'Хоёр долоо хоногт тус бүр 5 удаа давтвал ахицыг харьцуулна.'
              : `Өмнөх 7 хоногоос ${change > 0 ? '+' : ''}${change} хувийн пункт.`}
          </p>
        </div>
        <div className="rounded-xl bg-white/5 p-4">
          <h3 className="text-sm text-slate-400">Сонссон хугацаа</h3>
          <p className="mt-2 text-2xl text-amber-200">{Math.floor(stats.seconds / 60)} минут</p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            Зөвхөн киноны цаг бодитоор урагшилсан хугацааг тооцно.
          </p>
        </div>
      </div>
      <h3 className="mt-6 text-sm text-slate-300">Сүүлийн 14 өдөр</h3>
      <div
        className="mt-4 flex h-24 items-end gap-2"
        role="img"
        aria-label="Өдөр бүрийн сонссон хугацаа"
      >
        {stats.days.map((day) => (
          <div
            key={day.key}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            title={`${day.key}: ${(day.seconds / 60).toFixed(1)} минут`}
          >
            <div
              className="w-full rounded-t bg-[#c9a227]"
              style={{
                height: `${Math.max(2, (day.seconds / max) * 80)}%`,
                opacity: day.seconds ? 1 : 0.2,
              }}
            />
            <span className="mt-2 text-[10px] text-slate-500">{day.key.slice(-2)}</span>
          </div>
        ))}
      </div>
      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm text-slate-300">Тестийн түүх</h3>
          <ol className="mt-3 space-y-2 text-xs text-slate-400">
            {history.map((entry) => {
              const result = assessPlacement(entry.answers, entry.completedAt, entry.form);
              return (
                <li key={`${entry.completedAt}:${entry.form}`}>
                  {new Date(entry.completedAt).toLocaleDateString('mn-MN')} · {result.correct}/
                  {result.total} · {placementBands[result.band].label} · {entry.form.toUpperCase()}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs leading-6 text-slate-500">
            Богино тест нь эхлэх түвшний баримжаа. Албан ёсны хэлний түвшний үнэлгээ биш.
          </p>
        </div>
      )}
    </details>
  );
}
