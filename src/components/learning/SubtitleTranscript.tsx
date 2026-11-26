'use client';
import { useEffect, useState } from 'react';
import { formatTime } from '@/lib/learning/vtt';
import { hasMongolianMeaning } from '@/lib/learning/sentence-text';
import type { AlignedCue, WordNote } from '@/lib/learning/types';
import CueWords from './CueWords';
const PAGE_SIZE = 20;

export default function SubtitleTranscript({
  cues,
  activeIds,
  canSeek,
  canSave,
  savedSentences,
  onSeek,
  onWord,
  onSave,
  translations = true,
}: {
  cues: AlignedCue[];
  activeIds: string[];
  canSeek: boolean;
  canSave: boolean;
  savedSentences: Set<string>;
  onSeek: (time: number) => void;
  onWord: (note: WordNote, cue: AlignedCue) => void;
  onSave: (cue: AlignedCue) => void;
  translations?: boolean;
}) {
  const [page, setPage] = useState(0);
  const activeIndex = cues.findIndex((cue) => activeIds.includes(cue.id));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Follow the actual playing caption when its page changes.
    if (activeIndex >= 0) setPage(Math.floor(activeIndex / PAGE_SIZE));
  }, [activeIndex]);
  const pages = Math.max(1, Math.ceil(cues.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  return (
    <div>
      {pages > 1 && (
        <div className="flex items-center justify-between p-3 text-xs text-slate-400">
          <button
            type="button"
            disabled={!current}
            onClick={() => setPage(current - 1)}
            className="rounded border border-white/15 px-3 py-2 disabled:opacity-40"
          >
            Өмнөх
          </button>
          <span>
            {current + 1} / {pages}
          </span>
          <button
            type="button"
            disabled={current + 1 === pages}
            onClick={() => setPage(current + 1)}
            className="rounded border border-white/15 px-3 py-2 disabled:opacity-40"
          >
            Дараах
          </button>
        </div>
      )}
      <ol aria-label="Хадмалын жагсаалт" className="max-h-[28rem] space-y-2 overflow-y-auto p-3">
        {cues.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((cue) => (
          <li
            key={cue.id}
            data-testid={activeIds.includes(cue.id) ? 'active-cue' : undefined}
            aria-current={activeIds.includes(cue.id) ? 'true' : undefined}
            className={`rounded-xl border p-4 ${activeIds.includes(cue.id) ? 'border-amber-400/40 bg-amber-400/5' : 'border-transparent bg-white/5'}`}
          >
            <div className="mb-2 flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={!canSeek}
                onClick={() => onSeek(cue.start)}
                aria-label={`${formatTime(cue.start)} руу очих`}
                className="text-amber-200 disabled:text-slate-500"
              >
                {formatTime(cue.start)}
              </button>
              <button
                type="button"
                disabled={savedSentences.has(cue.id) || !canSave}
                onClick={() => onSave(cue)}
                aria-label={`Өгүүлбэр хадгалах ${formatTime(cue.start)}`}
                className="text-slate-400 disabled:opacity-40"
              >
                {savedSentences.has(cue.id) ? 'Хадгалсан' : 'Хадгалах'}
              </button>
            </div>
            <CueWords cue={cue} onWord={onWord} />
            {translations && hasMongolianMeaning(cue.translation) && (
              <p lang="mn" className="mt-2 text-sm leading-6 text-slate-400">
                {cue.translation}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
