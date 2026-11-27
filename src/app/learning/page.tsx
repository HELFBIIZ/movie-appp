'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VocabularyPanel from '@/components/learning/VocabularyPanel';
import RecallPractice from '@/components/learning/RecallPractice';
import GuestProgressImport from '@/components/learning/GuestProgressImport';
import LearningDetails from '@/components/learning/LearningDetails';
import LearningMoviePicker from '@/components/learning/LearningMoviePicker';
import { useLearningAccount } from '@/components/learning/LearningAccount';
import { usePlacementProfile } from '@/components/learning/usePlacementProfile';
import { OPEN_PLACEMENT_EVENT, placementBands } from '@/lib/learning/placement';
import { learningMetrics } from '@/lib/learning/metrics';
import { recallQueue } from '@/lib/learning/recall';
import { isDue, reviewItem } from '@/lib/learning/srs';
import type { LearningItem } from '@/lib/learning/types';

export default function LearningDashboard() {
  const account = useLearningAccount();
  const { profile, history } = usePlacementProfile();
  const [now, setNow] = useState(() => Date.now());
  const [cards, setCards] = useState<LearningItem[] | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const stats = useMemo(() => learningMetrics(account.snapshot, now), [account.snapshot, now]);
  const goal = profile ? placementBands[profile.band].words : 3;
  const words = account.snapshot.progress.items.filter((item) => item.kind === 'word');
  function review(id: string, correct: boolean) {
    const item = account.snapshot.progress.items.find((entry) => entry.id === id);
    if (!item) return false;
    if (!isDue(item, Date.now())) return true;
    const at = Date.now();
    return account.update((snapshot) => ({
      ...snapshot,
      progress: {
        ...snapshot.progress,
        items: snapshot.progress.items.map((entry) =>
          entry.id === id ? reviewItem(entry, correct, at) : entry,
        ),
      },
      activity: [
        ...snapshot.activity,
        { id: crypto.randomUUID(), kind: 'review' as const, at, movieId: item.movieId, correct },
      ].slice(-5000),
    }));
  }
  const test = () => window.dispatchEvent(new Event(OPEN_PLACEMENT_EVENT));
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Миний англи хэл</h1>
          <button
            type="button"
            onClick={test}
            className="rounded-full border border-white/15 px-3 py-2 text-xs text-amber-200"
          >
            {profile ? `${placementBands[profile.band].label} · Тест дахин өгөх` : 'Түвшнээ шалгах'}
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Киноноос өдөрт {goal} үг. Утгыг нь ойлгоод, санаж давтаарай.
        </p>
        {account.scope === 'guest' && (
          <p className="mt-2 text-xs text-slate-500">
            Ахиц энэ төхөөрөмжид хадгалагдана.{' '}
            <Link href="/login?next=%2Flearning" className="text-amber-200">
              Нэвтэрч хадгалах →
            </Link>
          </p>
        )}
        {account.error && (
          <p role="alert" className="mt-4 text-sm text-rose-300">
            {account.error}
          </p>
        )}
        {account.sync.includes('Өөр төхөөрөмж') && (
          <button
            type="button"
            onClick={() => void account.merge()}
            className="mt-4 text-sm text-amber-200 underline"
          >
            Хоёр төхөөрөмжийн үгсийг нэгтгэх
          </button>
        )}
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            [stats.words, 'Хадгалсан үг'],
            [stats.due.length, 'Одоо давтах'],
            [stats.streak, 'Дараалсан өдөр'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-2 sm:p-4">
              <p className="text-xl font-semibold text-amber-200 sm:text-2xl">{value}</p>
              <p className="mt-1 text-[10px] text-slate-400 sm:mt-2 sm:text-xs">{label}</p>
            </div>
          ))}
        </div>
        <section
          className="mt-5 rounded-2xl border border-white/10 p-5"
          aria-label="Өнөөдрийн зорилго"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Өнөөдөр</h2>
            <span className="text-sm text-amber-200">
              {Math.min(stats.todayWords, goal)} / {goal} үг
            </span>
          </div>
          <progress
            aria-label="Өнөөдрийн үгийн зорилго"
            value={Math.min(stats.todayWords, goal)}
            max={goal}
            className="mt-4 h-2 w-full accent-amber-400"
          />
          <div className="mt-5 flex flex-wrap gap-3">
            {stats.due.length > 0 && (
              <button
                type="button"
                onClick={() => setCards(recallQueue(stats.due, now, goal))}
                className="rounded-xl border border-white/15 px-4 py-3 text-sm"
              >
                {stats.due.length} үгээ давтах
              </button>
            )}
          </div>
          {stats.todayReviews > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              Өнөөдөр {stats.todayReviews} удаа үгээ санаж шалгасан.
            </p>
          )}
          {cards && (
            <RecallPractice
              key={cards.map((item) => item.id).join('|')}
              items={cards}
              onReview={review}
              onDone={() => setCards(null)}
            />
          )}
        </section>
        <LearningMoviePicker />
        <section className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <h2 className="px-5 pt-5 font-semibold">Миний үгс</h2>
          <VocabularyPanel
            items={words}
            now={now}
            onReview={review}
            onRemove={(id) =>
              account.update((snapshot) => ({
                ...snapshot,
                progress: {
                  ...snapshot.progress,
                  items: snapshot.progress.items.filter((item) => item.id !== id),
                },
              }))
            }
          />
        </section>
        <LearningDetails stats={stats} history={history} />
        <GuestProgressImport />
      </div>
      <Footer />
    </main>
  );
}
