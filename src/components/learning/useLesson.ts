'use client';
import { useEffect, useState } from 'react';
import type { AlignedCue } from '@/lib/learning/types';

export function useLesson(source: 'local' | 'movie') {
  const [local, setLocal] = useState<{ file: File; cues: AlignedCue[]; id: string } | null>(null);
  const [localUrl, setLocalUrl] = useState('');
  useEffect(() => {
    if (!local) return;
    const url = URL.createObjectURL(local.file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The URL belongs to this file and is revoked on replacement.
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [local]);
  return {
    cues: source === 'local' ? (local?.cues ?? []) : [],
    videoUrl: source === 'local' ? localUrl : '',
    mediaId: source === 'local' ? (local?.id ?? 'local-unloaded') : 'movie-unsupported',
    loading: false,
    error: '',
    retry: () => {},
    loadLocal: (file: File, cues: AlignedCue[], id: string) => setLocal({ file, cues, id }),
  };
}
