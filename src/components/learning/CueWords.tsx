'use client';
import { contextualWord, teachingLesson } from '@/lib/learning/teaching';
import type { AlignedCue, WordNote } from '@/lib/learning/types';

export default function CueWords({
  cue,
  onWord,
}: {
  cue: AlignedCue;
  onWord: (note: WordNote, cue: AlignedCue) => void;
}) {
  const tokens = cue.text.split(/(\s+)/);
  return (
    <p className="leading-8 text-slate-100" lang={cue.language ?? 'en'}>
      {tokens.map((token, index) => {
        const match = token.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/);
        const word = match?.[0].toLowerCase();
        const offset = tokens.slice(0, index).join('').length + (match?.index ?? 0);
        const selectedWord = word ? contextualWord(word, cue.text, offset) : '';
        const teaching = selectedWord ? teachingLesson(selectedWord, cue.text, offset) : null;
        const note =
          cue.language !== 'mn' && selectedWord
            ? {
                word: selectedWord,
                meaning: teaching?.meaning ?? '',
                context: cue.translation,
                example: cue.text,
                grammar: '',
                offset,
              }
            : undefined;
        return note ? (
          <button
            type="button"
            key={index}
            onClick={() => onWord(note, cue)}
            className="rounded-sm underline decoration-amber-400/50 decoration-dotted underline-offset-4 hover:bg-amber-400/20 hover:text-amber-200"
            aria-label={`${note.word} — утгыг харах`}
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
