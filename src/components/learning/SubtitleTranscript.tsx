'use client';

import { Bookmark, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatTime } from '@/lib/learning/vtt';
import { lookupWord } from '@/lib/learning/sample';
import type { AlignedCue, WordNote } from '@/lib/learning/types';

type Props = {
  cues: AlignedCue[];
  activeIds: string[];
  canSeek: boolean;
  curated: boolean;
  canSave: boolean;
  savedSentences: Set<string>;
  onSeek: (seconds: number) => void;
  onWord: (note: WordNote, cue: AlignedCue) => void;
  onSave: (cue: AlignedCue) => void;
  emptyMessage?: string;
};

export default function SubtitleTranscript({
  cues,
  activeIds,
  canSeek,
  curated,
  canSave,
  savedSentences,
  onSeek,
  onWord,
  onSave,
  emptyMessage,
}: Props) {
  const [page, setPage] = useState(0);
  const activeIndex = cues.findIndex((cue) => activeIds.includes(cue.id));
  useEffect(() => {
    if (activeIndex >= 0) setPage(Math.floor(activeIndex / 50));
  }, [activeIndex]);
  const pageCount = Math.max(1, Math.ceil(cues.length / 50));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = cues.slice(currentPage * 50, (currentPage + 1) * 50);
  if (!cues.length)
    return (
      <p className="p-6 text-slate-400">
        {emptyMessage ||
          'Энэ тоглуулагчийн синхрон хадмал алга. Sample lesson эсвэл local video + EN/MN VTT сонгоно уу.'}
      </p>
    );
  return (
    <div>
      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-3 text-sm text-slate-400">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
            className="rounded border border-white/15 px-3 py-2 disabled:opacity-40"
          >
            Өмнөх 50
          </button>
          <span>
            {currentPage + 1} / {pageCount} · {cues.length} cue
          </span>
          <button
            type="button"
            disabled={currentPage + 1 >= pageCount}
            onClick={() => setPage(currentPage + 1)}
            className="rounded border border-white/15 px-3 py-2 disabled:opacity-40"
          >
            Дараах 50
          </button>
        </div>
      )}
      <ol className="max-h-[28rem] space-y-2 overflow-y-auto p-3" aria-label="Bilingual transcript">
        {visible.map((cue) => {
          const active = activeIds.includes(cue.id);
          const saved = savedSentences.has(cue.id);
          return (
            <li
              key={cue.id}
              aria-current={active ? 'true' : undefined}
              data-testid={active ? 'active-cue' : undefined}
              className={`rounded-xl border p-4 transition-colors ${active ? 'border-[#c9a227]/60 bg-[#c9a227]/10' : 'border-transparent bg-slate-900/60'}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={!canSeek}
                  onClick={() => onSeek(cue.start)}
                  aria-label={`Seek to ${formatTime(cue.start)}`}
                  className="rounded px-1 font-mono text-sm text-amber-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-500"
                >
                  {formatTime(cue.start)}
                </button>
                <button
                  type="button"
                  disabled={saved || !canSave}
                  onClick={() => onSave(cue)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-50"
                  aria-label={`${saved ? 'Saved sentence' : 'Save Sentence'} ${formatTime(cue.start)}`}
                >
                  {saved ? <Check size={14} /> : <Bookmark size={14} />}
                  {saved ? 'Saved' : 'Save Sentence'}
                </button>
              </div>
              <p className="leading-8 text-slate-100" lang={cue.language ?? 'en'}>
                {cue.text.split(/(\s+)/).map((token, index) => {
                  const word = token.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/)?.[0].toLowerCase();
                  const note = curated
                    ? lookupWord(token)
                    : cue.language !== 'mn' && word
                      ? {
                          word,
                          meaning: '',
                          context: cue.translation,
                          example: cue.text,
                          grammar: '',
                        }
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
              <p className="mt-2 text-sm leading-6 text-slate-400" lang="mn">
                {cue.language === 'mn'
                  ? 'EN хадмал импортлоогүй.'
                  : cue.translation || 'Монгол хадмал энэ хугацаанд алга.'}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
