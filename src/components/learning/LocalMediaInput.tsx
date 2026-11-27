'use client';

import { useState } from 'react';
import { alignCues, MAX_VTT_BYTES } from '@/lib/learning/vtt';
import { parseExistingVtt } from '@/lib/learning/movie';
import type { AlignedCue } from '@/lib/learning/types';

export default function LocalMediaInput({
  onLoad,
}: {
  onLoad: (video: File, cues: AlignedCue[], fingerprint: string) => void;
}) {
  const [video, setVideo] = useState<File | null>(null);
  const [en, setEn] = useState<File | null>(null);
  const [mn, setMn] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function load() {
    if (!video || !en) return;
    setLoading(true);
    setError('');
    try {
      if (!video.type.startsWith('video/') || video.size > 2_000_000_000)
        throw new Error('2 GB хүртэлх video файл сонгоно уу.');
      if (
        [en, ...(mn ? [mn] : [])].some(
          (file) => file.size > MAX_VTT_BYTES || !/\.vtt$/i.test(file.name),
        )
      )
        throw new Error('EN/MN файл нь .vtt өргөтгөлтэй, тус бүр 1 MB хүртэл байх ёстой.');
      const [english, mongolian] = await Promise.all([
        en.text(),
        mn?.text() ?? Promise.resolve(''),
      ]);
      const aligned = alignCues(
        parseExistingVtt(english),
        mongolian ? parseExistingVtt(mongolian) : [],
      );
      if (!aligned.length) throw new Error('Англи хадмалын өгүүлбэр олдсонгүй.');
      const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(
          JSON.stringify([video.name, video.size, video.lastModified, english, mongolian]),
        ),
      );
      const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
      onLoad(video, aligned, `local-${fingerprint}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Файл уншиж чадсангүй.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-slate-900/60 p-4">
      <p className="text-sm leading-6 text-slate-400">
        Видео, англи хадмалаа сонгоорой. Файлууд энэ төхөөрөмжөөс илгээгдэхгүй.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: 'Видео файл', accept: 'video/*', set: setVideo },
          { label: 'Англи хадмал (.vtt)', accept: '.vtt', set: setEn },
          { label: 'Монгол хадмал (.vtt) — сонголттой', accept: '.vtt', set: setMn },
        ].map(({ label, accept, set }) => (
          <label key={label} className="min-w-0 text-sm text-slate-300">
            {label}
            <input
              type="file"
              accept={accept}
              onChange={(event) => set(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full rounded-lg border border-white/10 p-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-slate-700 file:px-2 file:py-1 file:text-white"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={!video || !en || loading}
        onClick={load}
        className="rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
      >
        {loading ? 'Уншиж байна…' : 'Видеогоо нээх'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
