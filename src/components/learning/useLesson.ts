'use client';

import { useEffect, useState } from 'react';
import { alignCues, parseVtt } from '@/lib/learning/vtt';
import { SAMPLE_ID } from '@/lib/learning/sample';
import type { AlignedCue } from '@/lib/learning/types';

export function useLesson(source: 'sample' | 'local' | 'movie') {
  const [sample, setSample] = useState<AlignedCue[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState<{ file: File; cues: AlignedCue[]; id: string } | null>(null);
  const [localUrl, setLocalUrl] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    Promise.all(
      ['/learning/last-train.en.vtt', '/learning/last-train.mn.vtt'].map(async (url) => {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Subtitle load failed');
        return parseVtt(await response.text());
      }),
    )
      .then(([en, mn]) => {
        const aligned = alignCues(en, mn);
        if (!aligned.length) throw new Error('Empty sample');
        setSample(aligned);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Sample хадмал ачаалсангүй. Дахин оролдоно уу.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (!local) return;
    const url = URL.createObjectURL(local.file);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [local]);
  return {
    cues: source === 'sample' ? sample : source === 'local' ? (local?.cues ?? []) : [],
    videoUrl:
      source === 'sample' ? '/learning/last-train.webm' : source === 'local' ? localUrl : '',
    mediaId:
      source === 'sample'
        ? SAMPLE_ID
        : source === 'local'
          ? (local?.id ?? 'local-unloaded')
          : 'movie-unsupported',
    loading: source === 'sample' && loading,
    error: source === 'sample' ? error : '',
    retry: () => setRetry((value) => value + 1),
    loadLocal: (file: File, cues: AlignedCue[], id: string) => setLocal({ file, cues, id }),
  };
}
