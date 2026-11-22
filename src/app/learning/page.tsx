'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import QuizPanel from '@/components/learning/QuizPanel';
import { useLearningAccount } from '@/components/learning/LearningAccount';
import { usePlacementProfile } from '@/components/learning/usePlacementProfile';
import { OPEN_PLACEMENT_EVENT, assessPlacement, placementBands } from '@/lib/learning/placement';
import { learningMetrics } from '@/lib/learning/metrics';
import { vocabularyQuestions } from '@/lib/learning/quiz';
import { reviewItem } from '@/lib/learning/srs';
import type { Question } from '@/lib/learning/types';

export default function LearningDashboard() {
  const account = useLearningAccount();
  const { profile, history } = usePlacementProfile();
  const [now, setNow] = useState(() => Date.now());
  const [practicing, setPracticing] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const stats = useMemo(() => learningMetrics(account.snapshot, now), [account.snapshot, now]);
  const baseline =
    history.length > 1 ? assessPlacement(history[0].answers, history[0].completedAt) : null;
  const change =
    stats.recentRate !== null &&
    stats.previousRate !== null &&
    stats.recentCount >= 5 &&
    stats.previousCount >= 5
      ? stats.recentRate - stats.previousRate
      : null;
  const test = () => window.dispatchEvent(new Event(OPEN_PLACEMENT_EVENT));
  const maxMinutes = Math.max(1, ...stats.days.map((day) => day.seconds / 60));
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm uppercase tracking-widest text-[#c9a227]">
          SceneChain · Миний сургалт
        </p>
        <h1 className="mt-2 text-3xl font-bold">Англи хэлний минь ахиц</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Өнөөдөр 5 үг хадгалаад, давтах үгсээ санаж үзээрэй.
        </p>
        <p role="status" className="mt-3 text-xs text-slate-400">
          {account.sync || (!account.loaded ? 'Ахиц ачаалж байна…' : '')}
        </p>
        {account.error && (
          <p role="alert" className="mt-3 text-rose-300">
            {account.error}
          </p>
        )}
        {account.sync.includes('Өөр төхөөрөмж') && (
          <button
            type="button"
            onClick={() => void account.merge()}
            className="mt-3 text-sm text-amber-200 underline"
          >
            Хоёр төхөөрөмжийн хадгалсан үг, тестийг нэгтгэх
          </button>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/movies"
            className="rounded-xl bg-[#c9a227] px-4 py-3 font-semibold text-slate-950"
          >
            Киногоор сурах
          </Link>
          <Link href="/learn" className="rounded-xl border border-white/15 px-4 py-3">
            Үнэгүй дасгал
          </Link>
          <button
            type="button"
            onClick={test}
            className="rounded-xl border border-white/15 px-4 py-3"
          >
            {profile ? 'Түвшнээ дахин шалгах' : '2 минутын түвшний тест'}
          </button>
        </div>
        {account.loaded && (
          <>
            <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                [stats.words, 'Хадгалсан үг'],
                [stats.retained, '2+ удаа зөв санасан'],
                [stats.due.length, 'Одоо давтах үг'],
                [Math.floor(stats.seconds / 60), 'Сонссон минут'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-3xl font-semibold text-amber-200">{value}</p>
                  <p className="mt-2 text-sm text-slate-400">{label}</p>
                </div>
              ))}
            </div>
            <section className="mt-5 rounded-2xl border border-white/10 p-5">
              <h2 className="text-lg font-semibold">Өнөөдрийн жижиг зорилго</h2>
              <p className="mt-2 text-sm text-slate-300">
                {Math.min(stats.todayWords, 5)} / 5 үг хадгалсан
              </p>
              <progress
                aria-label="Өнөөдрийн үгийн зорилго"
                value={Math.min(stats.todayWords, 5)}
                max={5}
                className="mt-3 h-3 w-full accent-amber-400"
              />
              <button
                type="button"
                disabled={!stats.due.length}
                onClick={() => {
                  setQuestions(vocabularyQuestions(stats.due).slice(0, 10));
                  setPracticing(true);
                }}
                className="mt-4 rounded-xl bg-[#c9a227] px-4 py-2 font-semibold text-slate-950 disabled:opacity-40"
              >
                Давтах үгсээ шалгах
              </button>
              {practicing && (
                <QuizPanel
                  questions={questions}
                  onAnswer={(question, correct) =>
                    account.update((snapshot) => ({
                      ...snapshot,
                      progress: {
                        ...snapshot.progress,
                        items: snapshot.progress.items.map((item) =>
                          item.id === question.itemId
                            ? reviewItem(item, correct, Date.now())
                            : item,
                        ),
                      },
                      activity: [
                        ...snapshot.activity,
                        {
                          id: crypto.randomUUID(),
                          kind: 'review' as const,
                          at: Date.now(),
                          movieId: 'dashboard',
                          correct,
                        },
                      ].slice(-5000),
                    }))
                  }
                />
              )}
            </section>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <section className="rounded-2xl border border-white/10 p-5">
                <h2 className="text-lg font-semibold">Санах чадвар сайжирч байна уу?</h2>
                <p className="mt-3 text-3xl text-amber-200">
                  {stats.recentRate === null ? '—' : `${stats.recentRate}%`}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Сүүлийн 7 хоног · {stats.recentCount} давталтын зөв хариулт
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {change === null
                    ? 'Хоёр долоо хоногт тус бүр 5-аас олон давталт хийвэл өмнөх долоо хоногтой харьцуулна.'
                    : `Өмнөх 7 хоногоос ${change > 0 ? '+' : ''}${change} хувийн пункт. ${change > 0 ? 'Хадгалсан үгээ илүү сайн санаж байна.' : 'Хэцүү үгсээ дахин давтаарай.'}`}
                </p>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Энэ нь хадгалсан үгийн давталтын үзүүлэлт. Кино үзсэн хугацаа дангаараа хэлний
                  түвшин ахисны баталгаа болохгүй.
                </p>
              </section>
              <section className="rounded-2xl border border-white/10 p-5">
                <h2 className="text-lg font-semibold">Миний эхлэх түвшин</h2>
                {profile ? (
                  <>
                    <p className="mt-3 text-2xl text-amber-200">
                      {placementBands[profile.band].label} · {profile.correct}/{profile.total}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {placementBands[profile.band].plan}
                    </p>
                    {baseline && (
                      <p className="mt-3 text-sm text-slate-400">
                        Эхний тест: {baseline.correct}/{baseline.total} → Сүүлийн тест:{' '}
                        {profile.correct}/{profile.total}
                      </p>
                    )}
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Үг, дүрэм, уншлагын богино баримжаа. Давтан танил асуултад хариулах нь оноонд
                      нөлөөлнө. Албан ёсны CEFR үнэлгээ биш.
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    Богино тестээ өгөөд өөрт тохирох хичээлээс эхлээрэй.
                  </p>
                )}
                <button
                  type="button"
                  onClick={test}
                  className="mt-4 text-sm text-amber-200 underline"
                >
                  Тест нээх
                </button>
              </section>
            </div>
            <section className="mt-5 rounded-2xl border border-white/10 p-5">
              <h2 className="text-lg font-semibold">Сүүлийн 14 өдрийн сонсголын дасгал</h2>
              <div
                className="mt-5 flex h-32 items-end gap-1.5"
                role="img"
                aria-label="Өдөр бүрийн сонссон минут"
              >
                {stats.days.map((day) => (
                  <div
                    key={day.key}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                    title={`${day.key}: ${(day.seconds / 60).toFixed(1)} минут, ${day.reviews} давталт`}
                  >
                    <div
                      className="w-full rounded-t bg-[#c9a227]"
                      style={{
                        height: `${Math.max(2, (day.seconds / 60 / maxMinutes) * 90)}%`,
                        opacity: day.seconds ? 1 : 0.2,
                      }}
                    />
                    <span className="mt-2 text-[10px] text-slate-500">{day.key.slice(-2)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Зөвхөн нээлттэй хуудсан дээр тоглуулагчийн цаг бодитоор урагшилсан хугацааг тооцно.
                Урагш үсрэх, гацах, өөр таб руу шилжих хугацааг нэмэхгүй.
              </p>
            </section>
            {history.length > 0 && (
              <details className="mt-5 rounded-2xl border border-white/10 p-5">
                <summary className="cursor-pointer text-slate-300">
                  Түвшний тестийн түүх ({history.length})
                </summary>
                <ol className="mt-3 space-y-2 text-sm text-slate-400">
                  {history.map((entry) => {
                    const result = assessPlacement(entry.answers, entry.completedAt);
                    return (
                      <li key={entry.completedAt}>
                        {new Date(entry.completedAt).toLocaleDateString('mn-MN')} · {result.correct}
                        /{result.total} · {placementBands[result.band].label}
                      </li>
                    );
                  })}
                </ol>
              </details>
            )}
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
