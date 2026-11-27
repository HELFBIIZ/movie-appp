'use client';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import type { AlignedCue } from '@/lib/learning/types';
import { hasMongolianMeaning } from '@/lib/learning/sentence-text';
import { sentenceGuide } from '@/lib/learning/sentence-guide';

const key = 'vxnta.learning.sentence-corrections.v1';
const schema = z
  .array(
    z.object({
      media: z.string().max(250),
      text: z.string().max(1000),
      translation: z
        .string()
        .max(1000)
        .refine((text) => !text || hasMongolianMeaning(text)),
    }),
  )
  .max(200);
type Entries = z.infer<typeof schema>;

export function useSentenceCorrections(media: string, cues: AlignedCue[]) {
  const [entries, setEntries] = useState<Entries>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const saved = schema.parse(JSON.parse(raw));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Read this browser's optional correction cache after hydration.
      setEntries(saved);
    } catch {
      setError('Өмнөх орчуулгын засварыг уншиж чадсангүй. Өгөгдлийг устгаагүй.');
    }
  }, []);
  const corrected = useMemo(() => {
    const values = new Map(
      entries
        .filter((entry) => entry.media === media)
        .map((entry) => [entry.text, entry.translation]),
    );
    return cues.map((cue) => {
      const authored = sentenceGuide(cue.text);
      if (authored) return { ...cue, translation: authored, translationSource: 'curated' as const };
      if (!values.has(cue.text)) return cue;
      return {
        ...cue,
        translation: values.get(cue.text) ?? '',
        translationSource: 'mymemory' as const,
      };
    });
  }, [entries, media, cues]);
  function correct(text: string, translation: string) {
    const next = schema.safeParse([
      ...entries.filter((entry) => entry.media !== media || entry.text !== text).slice(-199),
      { media, text, translation },
    ]);
    if (!next.success) return;
    setEntries(next.data);
    try {
      localStorage.setItem(key, JSON.stringify(next.data));
      setError('');
    } catch {
      setError('Утгыг энэ удаад зассан ч хөтөчид хадгалагдсангүй.');
    }
  }
  return { cues: corrected, correct, error };
}
