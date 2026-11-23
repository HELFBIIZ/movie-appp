'use client';
import { lookupWord } from '@/lib/learning/sample';
import type { AlignedCue, WordNote } from '@/lib/learning/types';

export default function CueWords({
  cue,
  curated,
  onWord,
}: {
  cue: AlignedCue;
  curated: boolean;
  onWord: (note: WordNote, cue: AlignedCue) => void;
}) {
  return (
    <p className="leading-8 text-slate-100" lang={cue.language ?? 'en'}>
      {cue.text.split(/(\s+)/).map((token, index) => {
        const word = token.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/)?.[0].toLowerCase();
        const note = curated
          ? lookupWord(token)
          : cue.language !== 'mn' && word
            ? { word, meaning: '', context: cue.translation, example: cue.text, grammar: '' }
            : undefined;
        return note ? (
          <button
            type="button"
            key={index}
            onClick={() => onWord(note, cue)}
            className="rounded-sm underline decoration-amber-400/50 decoration-dotted underline-offset-4 hover:bg-amber-400/20 hover:text-amber-200"
            aria-label={`${curated ? 'Explain' : 'Select word'} ${note.word}`}
          >
            {token}
          </button>
        ) : (
          <span key={index}>{token}</span>
        );
      })}
    </p>
  );
}
