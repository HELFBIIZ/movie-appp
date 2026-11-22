'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import {
  placementQuestions,
  placementBands,
  PLACEMENT_DISMISSED_KEY,
  OPEN_PLACEMENT_EVENT,
  type PlacementAnswers,
  type PlacementProfile,
} from '@/lib/learning/placement';
import { usePlacementProfile } from './usePlacementProfile';
import { useLearningAccount } from './LearningAccount';

let shownInMemory = false;
export default function LevelCheck() {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { loaded, profile, error, save } = usePlacementProfile();
  const { scope, sync } = useLearningAccount();
  const [stage, setStage] = useState<'welcome' | 'quiz' | 'result'>('welcome');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<PlacementAnswers>({});
  const [result, setResult] = useState<PlacementProfile | null>(null);
  const markSeen = () => {
    shownInMemory = true;
    try {
      sessionStorage.setItem(PLACEMENT_DISMISSED_KEY, '1');
    } catch {
      /* This tab still remembers the dismissal. */
    }
  };
  const open = useCallback(() => {
    setStage('welcome');
    setIndex(0);
    setAnswers({});
    setResult(null);
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);
  useEffect(() => {
    window.addEventListener(OPEN_PLACEMENT_EVENT, open);
    return () => window.removeEventListener(OPEN_PLACEMENT_EVENT, open);
  }, [open]);
  useEffect(() => {
    if (
      !loaded ||
      (scope !== 'guest' && !sync) ||
      profile ||
      shownInMemory ||
      !/^\/(?:$|movies$|movie\/|watch\/|learn$|learning$)/.test(pathname ?? '')
    )
      return;
    try {
      if (sessionStorage.getItem(PLACEMENT_DISMISSED_KEY) === '1') return;
    } catch {
      /* A first-visit quiz can work without storage. */
    }
    shownInMemory = true;
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [loaded, profile, pathname, scope, sync]);
  useEffect(() => {
    if (stage !== 'welcome') heading.current?.focus();
  }, [stage, index]);
  const close = () => {
    markSeen();
    dialog.current?.close();
  };
  const question = placementQuestions[index];
  const selected = answers[question.id];
  const answered = Object.hasOwn(answers, question.id);
  function next() {
    if (!answered) return;
    if (index + 1 < placementQuestions.length) setIndex(index + 1);
    else {
      const completed = save(answers);
      setResult(completed.profile);
      setStage('result');
      markSeen();
    }
  }
  function continueLearning() {
    close();
    if (pathname?.startsWith('/movie/'))
      router.push(`/watch/${pathname.slice('/movie/'.length)}?learn=1`);
    else if (pathname?.startsWith('/watch/')) router.push(`${pathname}?learn=1`);
    else if (pathname !== '/learn') router.push('/learn');
  }
  const recommendation = result ? placementBands[result.band] : null;
  return (
    <dialog
      ref={dialog}
      aria-label="Эхлэх түвшний тест"
      onClose={markSeen}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-amber-400/25 bg-slate-950 p-5 text-slate-100 shadow-2xl backdrop:bg-black/80 md:p-7"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#c9a227]">
          <Sparkles size={17} aria-hidden="true" /> VXNTA · Танд тохируулъя
        </p>
        <button
          type="button"
          onClick={close}
          aria-label="Түвшний тестийг хаах"
          className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
        >
          <X size={20} />
        </button>
      </div>
      {stage === 'welcome' ? (
        <>
          <p className="text-4xl" aria-hidden="true">
            🍿
          </p>
          <h2 className="mt-4 text-2xl font-semibold leading-tight">Та аль түвшнээс эхлэх вэ?</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            Киноны орой, найзын зурвас, нэг сонирхолтой хэллэг. 8 жижиг асуултаар эхлэх түвшнээ
            баримжаалъя.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full bg-white/5 px-3 py-2">2–3 минут</span>
            <span className="rounded-full bg-white/5 px-3 py-2">Бүртгэл хэрэггүй</span>
            <span className="rounded-full bg-white/5 px-3 py-2">Мэдэхгүйг алгасаж болно</span>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-amber-200">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => setStage('quiz')}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#c9a227] px-4 py-3 font-semibold text-slate-950"
          >
            Тестээ эхлэх <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={close}
            className="mt-2 w-full rounded-lg px-4 py-3 text-sm text-slate-400"
          >
            Дараа үзье
          </button>
        </>
      ) : stage === 'quiz' ? (
        <>
          <p role="status" className="text-sm text-slate-400">
            Асуулт {index + 1} / {placementQuestions.length}
          </p>
          <div
            role="progressbar"
            aria-label="Түвшний тестийн явц"
            aria-valuemin={0}
            aria-valuemax={placementQuestions.length}
            aria-valuenow={index}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full rounded-full bg-[#c9a227] transition-all"
              style={{ width: `${(index / placementQuestions.length) * 100}%` }}
            />
          </div>
          <p className="mt-6 text-sm text-amber-200">{question.scene}</p>
          {question.context && (
            <blockquote
              lang="en"
              className="mt-3 rounded-xl bg-white/5 p-4 text-lg leading-8 text-slate-100"
            >
              {question.context}
            </blockquote>
          )}
          <h2
            ref={heading}
            tabIndex={-1}
            id="placement-question"
            className="mt-5 text-lg font-semibold outline-none"
          >
            {question.prompt}
          </h2>
          <div role="group" aria-labelledby="placement-question" className="mt-4 space-y-2">
            {question.choices.map((choice) => (
              <button
                key={choice}
                type="button"
                aria-pressed={selected === choice}
                onClick={() => setAnswers((current) => ({ ...current, [question.id]: choice }))}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm leading-6 ${selected === choice ? 'border-amber-400 bg-amber-400/10 text-amber-100' : 'border-white/10 text-slate-300 hover:border-white/30'}`}
              >
                {choice}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={answered && selected === null}
              onClick={() => setAnswers((current) => ({ ...current, [question.id]: null }))}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${answered && selected === null ? 'border-amber-400 text-amber-200' : 'border-transparent text-slate-500'}`}
            >
              Мэдэхгүй · Алгасах
            </button>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
              className="rounded-lg px-3 py-2 text-sm text-slate-400 disabled:opacity-30"
            >
              Буцах
            </button>
            <button
              type="button"
              disabled={!answered}
              onClick={next}
              className="rounded-xl bg-[#c9a227] px-5 py-3 font-semibold text-slate-950 disabled:opacity-35"
            >
              {index + 1 === placementQuestions.length ? 'Үр дүнгээ харах' : 'Дараагийн асуулт'}
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-500">Сургалтын шинэ жишээнүүд · Киноны яриа биш.</p>
        </>
      ) : result && recommendation ? (
        <>
          <p className="text-sm text-slate-400">Танд санал болгох эхлэл</p>
          <h2
            ref={heading}
            tabIndex={-1}
            className="mt-2 text-3xl font-semibold text-amber-200 outline-none"
          >
            {recommendation.label}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{recommendation.plan}</p>
          <p className="mt-4 text-sm text-slate-400">
            Зөв хариулт: {result.correct} / {result.total}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(
              [
                ['vocabulary', 'Үгийн утга'],
                ['grammar', 'Дүрэм'],
                ['reading', 'Унших'],
              ] as const
            ).map(([skill, label]) => (
              <div key={skill} className="rounded-xl bg-white/5 p-3 text-center">
                <p className="font-semibold text-slate-100">
                  {result.skills[skill].correct}/{result.skills[skill].total}
                </p>
                <p className="mt-1 text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-500">
            Энэ нь эхлэх түвшний баримжаа. Сонсох, ярих, бичих чадварыг шалгаагүй; албан ёсны
            түвшний үнэлгээ биш.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-amber-200">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={continueLearning}
            className="mt-5 w-full rounded-xl bg-[#c9a227] px-4 py-3 font-semibold text-slate-950"
          >
            {pathname?.startsWith('/movie/') || pathname?.startsWith('/watch/')
              ? 'Энэ киногоор сурах'
              : 'Миний хичээлийг эхлэх'}
          </button>
          <button
            type="button"
            onClick={open}
            className="mt-2 w-full rounded-lg px-4 py-2 text-sm text-slate-400"
          >
            Дахин шалгах
          </button>
        </>
      ) : null}
    </dialog>
  );
}
