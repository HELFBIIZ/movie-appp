'use client';

import { useState, type RefObject } from 'react';
import type { AlignedCue } from '@/lib/learning/types';

export default function LearningVideo({
  url,
  videoRef,
  active,
  onTime,
  onReady,
  sample,
}: {
  url: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  active: AlignedCue[];
  onTime: (time: number) => void;
  onReady: () => void;
  sample: boolean;
}) {
  const [error, setError] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        preload="metadata"
        aria-label={sample ? 'The Last Train sample lesson video' : 'Local lesson video'}
        className="aspect-video w-full"
        onTimeUpdate={(event) => onTime(event.currentTarget.currentTime)}
        onSeeked={(event) => onTime(event.currentTarget.currentTime)}
        onLoadedMetadata={onReady}
        onCanPlay={onReady}
        onError={() => setError(true)}
      >
        {sample && (
          <track kind="captions" src="/learning/last-train.en.vtt" srcLang="en" label="English" />
        )}
        {sample && (
          <track kind="captions" src="/learning/last-train.mn.vtt" srcLang="mn" label="Монгол" />
        )}
      </video>
      {error && (
        <p role="alert" className="p-4 text-sm text-rose-300">
          Видео ачаалсангүй эсвэл browser codec дэмжихгүй байна. Өөрийн video + VTT файлыг сонгож
          болно.
        </p>
      )}
      <div
        className="min-h-24 border-t border-white/10 bg-slate-900 px-5 py-4"
        aria-label="Current bilingual subtitle"
      >
        {active.length ? (
          active.map((cue) => (
            <div key={cue.id}>
              <p className="text-base leading-7 text-amber-100" lang="en">
                {cue.text}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-400" lang="mn">
                {cue.translation || 'Энэ cue-д монгол орчуулга алга.'}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">
            Play дарж үзнэ үү. Идэвхтэй EN/MN хадмал энд гарна.
          </p>
        )}
      </div>
    </div>
  );
}
