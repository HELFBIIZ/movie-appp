'use client';
import { Check, Headphones, MousePointer2, Repeat2 } from 'lucide-react';
import { lookupWord } from '@/lib/learning/sample';
import { placementBands } from '@/lib/learning/placement';
import type { LearningController, LearningSource } from './useLearningController';

export default function LearningGuide({
  controller,
  source,
}: {
  controller: LearningController;
  source: LearningSource;
}) {
  const { scoped, lesson, time, ready, videoRef, setMessage, setTab, setSelection } = controller;
  const words = scoped.filter((item) => item.kind === 'word');
  const goal = controller.placement.profile
    ? placementBands[controller.placement.profile.band].words
    : 3;
  const reviewed = words.filter((item) => item.correct + item.incorrect > 0).length;
  const cue = lesson.cues.find((item) => item.language !== 'mn');
  const example =
    source === 'sample' && cue ? cue.text.split(/\s+/).map(lookupWord).find(Boolean) : undefined;
  const step = words.length ? 2 : cue && time !== null && time >= cue.start ? 1 : 0;
  const steps = [
    { label: 'Сонс', Icon: Headphones },
    { label: 'Үг сонго', Icon: MousePointer2 },
    { label: 'Давт', Icon: Repeat2 },
  ];
  async function start() {
    const video = videoRef.current;
    if (!video || !cue || !ready) return;
    try {
      video.currentTime = cue.start;
      await video.play();
    } catch {
      setMessage('Видео дээрх тоглуулах товчийг дарна уу.');
    }
  }
  return (
    <div
      className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"
      aria-label="Learning steps"
    >
      <ol className="flex items-center gap-2 text-sm">
        {steps.map(({ label, Icon }, index) => (
          <li
            key={label}
            aria-current={index === step ? 'step' : undefined}
            className={`flex flex-1 items-center gap-2 ${index === step ? 'font-semibold text-amber-200' : 'text-slate-400'}`}
          >
            {index < step || (index === 2 && words.length > 0 && reviewed === words.length) ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Icon size={16} aria-hidden="true" />
            )}
            <span>
              {index + 1}. {label}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-6 text-slate-300">
          <span className="mb-1 block text-xs text-amber-200">
            Энэ хичээлийн зорилго: {Math.min(words.length, goal)}/{goal} үг
          </span>
          {words.length
            ? `${words.length} үг хадгалсан · ${reviewed} үгээ давтсан. Одоо утгыг нь санаж үзээрэй.`
            : step === 1
              ? source === 'sample'
                ? 'Доогуур зураастай үг дээр дараарай. Утгыг нь хамт харна.'
                : 'Үг дээр дараад энэ өгүүлбэр дэх утгыг тэмдэглээрэй.'
              : 'Эхлээд нэг өгүүлбэр сонсоорой. Дараа нь мэдэхгүй үгээ сонгоно.'}
        </p>
        {words.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setTab('quiz');
              document
                .getElementById('learning-panels')
                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }}
            className="rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Хадгалсан үгээ давтах
          </button>
        ) : step === 1 && example && cue ? (
          <button
            type="button"
            onClick={() => {
              videoRef.current?.pause();
              setSelection({ note: example, cue });
            }}
            className="rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-semibold text-slate-950"
          >
            «{example.word}» үгийг туршъя
          </button>
        ) : source !== 'movie' && cue ? (
          <button
            type="button"
            disabled={!ready}
            onClick={() => void start()}
            className="rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
          >
            Сонсоод эхлэх
          </button>
        ) : null}
      </div>
    </div>
  );
}
