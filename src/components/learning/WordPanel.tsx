'use client';

import type { AlignedCue, WordNote } from '@/lib/learning/types';

export default function WordPanel({
  selection,
  saved,
  canSave,
  onSave,
}: {
  selection: { note: WordNote; cue: AlignedCue };
  saved: boolean;
  canSave: boolean;
  onSave: () => void;
}) {
  const { note, cue } = selection;
  return (
    <section
      aria-label="Word explanation"
      className="mt-4 rounded-xl border border-[#c9a227]/30 bg-[#c9a227]/5 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-amber-200">{note.word}</h3>
        <span className="text-sm text-slate-500">Curated · AI үүсгээгүй</span>
      </div>
      <p className="mt-2 text-base text-white">{note.meaning}</p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{note.context}</p>
      <blockquote className="mt-3 border-l-2 border-amber-400/40 pl-3 text-sm leading-6 text-slate-400">
        {cue.text}
      </blockquote>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        <span className="text-slate-500">Жишээ: </span>
        {note.example}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        <span className="text-slate-500">Дүрэм: </span>
        {note.grammar}
      </p>
      <button
        type="button"
        disabled={saved || !canSave}
        onClick={onSave}
        className="mt-4 rounded-lg bg-[#c9a227] px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-40"
      >
        {saved ? 'Saved Word' : 'Save Word'}
      </button>
    </section>
  );
}
