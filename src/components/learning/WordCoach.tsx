'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Check, Volume2 } from 'lucide-react';
import { meaningChoices } from '@/lib/learning/teaching';
import { isDue } from '@/lib/learning/srs';
import { hasMongolianMeaning } from '@/lib/learning/sentence-text';
import type { WordNote } from '@/lib/learning/types';
import { useWordLesson } from './useWordLesson';
import type { LearningController } from './useLearningController';

function subscribeVoices(refresh: () => void) {
  window.speechSynthesis?.addEventListener('voiceschanged', refresh);
  return () => window.speechSynthesis?.removeEventListener('voiceschanged', refresh);
}
function englishVoice() {
  return window.speechSynthesis?.getVoices().find((voice) => /^en(?:[-_]|$)/i.test(voice.lang));
}

export default function WordCoach({
  controller,
  replay,
  canReplay,
  onClose,
}: {
  controller: LearningController;
  replay: () => void;
  canReplay: boolean;
  onClose: () => void;
}) {
  const { selection, save, review, scoped, progress, storageError, now } = controller;
  const word = selection?.note.word ?? '';
  const cue = selection?.cue;
  const { lesson, loading, error, retry } = useWordLesson(
    word,
    cue?.text ?? '',
    selection?.note.offset,
  );
  const [step, setStep] = useState<'learn' | 'check' | 'done'>('learn');
  const [cardId, setCardId] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [scheduled, setScheduled] = useState(false);
  const [edited, setEdited] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const hasVoice = useSyncExternalStore(
    subscribeVoices,
    () => !!englishVoice(),
    () => false,
  );
  const displayedWord = word.replace(/\bi\b/g, 'I');
  const meaning = edited?.trim() || lesson?.meaning || '';
  const existing = scoped.find(
    (item) => item.kind === 'word' && item.word === word && item.meaning === meaning,
  );
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );
  function pronounce() {
    if (!hasVoice || !word) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    const voice = englishVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }
  function start() {
    if (!cue || !meaning || !lesson) return;
    const note: WordNote = {
      word,
      meaning,
      example: cue.text,
      context: cue.translation,
      grammar: '',
    };
    const id =
      existing?.id ??
      save(
        'word',
        cue,
        note,
        edited !== null
          ? 'user-note'
          : lesson.source === 'authored'
            ? 'curated'
            : 'unverified-subtitle',
      );
    if (id) {
      if (!existing) {
        void fetch('/api/actions/xp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activity: 'WORD_LEARNED', key: `word:${word}` }),
        }).catch(() => {});
      }
      setCardId(id);
      setStep('check');
    }
  }
  function answer(choice: string) {
    if (result !== null) return;
    const correct = choice === meaning;
    const card = scoped.find((item) => item.id === cardId);
    const due = card ? isDue(card, now) : false;
    if (card && (!due || review(card.id, correct))) {
      setScheduled(due);
      setResult(correct);
      setStep('done');
    }
  }
  if (!cue) return null;
  if (step === 'done')
    return (
      <div className="py-5 text-center" aria-label="Үг сурсан үр дүн">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15 text-amber-200">
          <Check size={24} />
        </div>
        <h3 className="mt-4 text-xl font-semibold">
          {result ? 'Зөв саналаа!' : 'Хамтдаа дахин харъя.'}
        </h3>
        <p className="mt-3 text-amber-200">
          {displayedWord} <span className="text-slate-500">—</span> {meaning}
        </p>
        <p className="mt-3 text-sm text-slate-400">
          {result
            ? 'Үг чинь хадгалагдсан. «Миний үг»-ээс дахин харж болно.'
            : scheduled
              ? 'Энэ үгээ 10 минутын дараа дахин давтаарай.'
              : 'Энэ утгыг дахин нэг хараад тогтоогоорой.'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-[#c9a227] py-3 font-semibold text-slate-950"
        >
          Киногоо үргэлжлүүлэх
        </button>
      </div>
    );
  if (step === 'check')
    return (
      <div className="py-4" aria-label="Шинэ үгээ шалгах">
        <p className="text-sm text-slate-400">Утгыг нь санаж үзье</p>
        <h3 className="mt-3 text-3xl font-semibold text-amber-200" lang="en">
          {displayedWord}
        </h3>
        <p className="mt-4 text-sm leading-7 text-slate-300" lang="en">
          {cue.text}
        </p>
        <div className="mt-5 space-y-2">
          {meaningChoices(word, meaning).map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => answer(choice)}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-slate-200 hover:border-amber-400/60"
            >
              {choice}
            </button>
          ))}
        </div>
        {storageError && (
          <p role="alert" className="mt-3 text-sm text-rose-300">
            {storageError}
          </p>
        )}
      </div>
    );
  return (
    <section className="pt-4" aria-label="Үгийн хичээл">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-3xl font-semibold text-amber-200" lang="en">
          {displayedWord}
        </h3>
        <button
          type="button"
          onClick={pronounce}
          disabled={!hasVoice}
          title={hasVoice ? 'Англи дуудлага' : 'Энэ хөтөч англи дуудлага дэмжихгүй байна.'}
          aria-label="Үгийн дуудлага сонсох"
          aria-pressed={speaking}
          className="rounded-full border border-white/15 p-3 text-amber-200 disabled:opacity-30"
        >
          <Volume2 size={20} />
        </button>
      </div>
      {loading ? (
        <p role="status" className="mt-4 text-slate-400">
          Утгыг хайж байна…
        </p>
      ) : error ? (
        <div className="mt-4">
          <p role="status" className="text-sm text-slate-400">
            {error}
          </p>
          <button type="button" onClick={retry} className="mt-3 text-sm text-amber-200 underline">
            Дахин хайх
          </button>
        </div>
      ) : (
        <>
          <p className="mt-3 text-2xl leading-9 text-white" lang="mn">
            {meaning}
          </p>
          {lesson?.tip && <p className="mt-3 text-sm leading-6 text-slate-300">{lesson.tip}</p>}
          <div className="mt-5 rounded-xl bg-white/5 p-4">
            <p className="text-base leading-7 text-slate-100" lang="en">
              {cue.text}
            </p>
            {hasMongolianMeaning(cue.translation) && (
              <p className="mt-2 text-sm leading-6 text-slate-400" lang="mn">
                {cue.translation}
              </p>
            )}
            {canReplay && (
              <button
                type="button"
                onClick={replay}
                className="mt-3 inline-flex items-center gap-2 text-xs text-amber-200"
              >
                <Volume2 size={14} />
                Киноноос дахин сонсох
              </button>
            )}
          </div>
          <details className="mt-4 text-sm text-slate-400">
            <summary className="w-fit cursor-pointer">Өөр жишээ · утга засах</summary>
            {lesson?.example && (
              <div className="mt-3 leading-6">
                <p lang="en">{lesson.example}</p>
                <p className="mt-1" lang="mn">
                  {lesson.translation}
                </p>
              </div>
            )}
            {lesson?.source === 'mymemory' && (
              <p className="mt-3 text-xs">Автомат орчуулга · MyMemory</p>
            )}
            <label className="mt-3 block text-xs">
              Миний тайлбар
              <input
                aria-label="Утга засах"
                value={edited ?? meaning}
                onChange={(event) => setEdited(event.target.value)}
                maxLength={1000}
                className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-900 p-3 text-sm text-white"
              />
            </label>
          </details>
          <button
            type="button"
            disabled={!progress || !meaning}
            onClick={start}
            className="mt-5 w-full rounded-xl bg-[#c9a227] px-4 py-3 font-semibold text-slate-950 disabled:opacity-40"
          >
            {existing ? 'Энэ үгээ давтах' : 'Энэ үгийг суръя'}
          </button>
        </>
      )}
      {storageError && (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {storageError}
        </p>
      )}
    </section>
  );
}
