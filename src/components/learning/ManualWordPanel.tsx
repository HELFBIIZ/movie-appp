'use client';
import { useState } from 'react';
import type { AlignedCue, WordNote } from '@/lib/learning/types';

export default function ManualWordPanel({
  selection,
  saved,
  canSave,
  onSave,
}: {
  selection: { note: WordNote; cue: AlignedCue };
  saved: boolean;
  canSave: boolean;
  onSave: (note: WordNote) => void;
}) {
  const [meaning, setMeaning] = useState('');
  const [grammar, setGrammar] = useState('');
  const { note, cue } = selection;
  return (
    <section
      aria-label="Transcript word notes"
      className="mt-4 rounded-xl border border-amber-400/30 p-5"
    >
      <h3 className="text-xl font-semibold text-amber-200">{note.word}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Энэ өгүүлбэр дэх утгыг өөрийн үгээр тэмдэглээрэй.
      </p>
      <blockquote lang="en" className="mt-3 border-l-2 border-amber-400/30 pl-3 text-sm leading-6">
        {cue.text}
      </blockquote>
      {cue.translation && (
        <p lang="mn" className="mt-2 text-sm text-slate-400">
          {cue.translation}
        </p>
      )}
      <label className="mt-3 block text-sm text-slate-300">
        Утга
        <input
          value={meaning}
          maxLength={1000}
          onChange={(event) => setMeaning(event.target.value)}
          className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 p-2"
        />
      </label>
      <details className="mt-3 text-sm">
        <summary className="w-fit cursor-pointer text-slate-400">Нэмэлт тэмдэглэл</summary>
        <label className="mt-3 block text-sm text-slate-300">
          Дүрмийн тэмдэглэл (сонголттой)
          <textarea
            value={grammar}
            maxLength={1000}
            onChange={(event) => setGrammar(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 p-2"
          />
        </label>
      </details>
      <button
        type="button"
        disabled={saved || !canSave || !meaning.trim()}
        onClick={() =>
          onSave({
            ...note,
            meaning: meaning.trim(),
            grammar: grammar.trim(),
            context: cue.translation,
            example: cue.text,
          })
        }
        className="mt-4 rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
      >
        {saved ? 'Хадгалсан' : 'Үг хадгалах'}
      </button>
    </section>
  );
}
