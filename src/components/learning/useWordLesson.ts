'use client';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { teachingLesson, type WordLesson } from '@/lib/learning/teaching';

const responseSchema = z.object({
  word: z.string(),
  meaning: z.string().min(1).max(1000),
  tip: z.string(),
  example: z.string(),
  translation: z.string(),
  contextual: z.boolean(),
  source: z.enum(['authored', 'mymemory']),
});
export function useWordLesson(word: string, context: string, offset?: number) {
  const local = teachingLesson(word, context, offset);
  const [remote, setRemote] = useState<{
    word: string;
    lesson: WordLesson | null;
    error: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (teachingLesson(word, context, offset)) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/learning/word?${new URLSearchParams({ word })}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          if (!controller.signal.aborted)
            setRemote({
              word,
              lesson: null,
              error:
                response.status === 401
                  ? 'Нэвтэрч ороод энэ үгийн тайлбарыг үзээрэй.'
                  : 'Тайлбар одоогоор олдсонгүй. Өөр үг сонгож болно.',
            });
          return;
        }
        const lesson = responseSchema.parse(await response.json());
        if (lesson.word !== word) throw new Error('Тайлбар таарсангүй.');
        if (!controller.signal.aborted) setRemote({ word, lesson, error: '' });
      } catch {
        if (!controller.signal.aborted)
          setRemote({
            word,
            lesson: null,
            error: 'Тайлбарыг нээж чадсангүй. Дахин оролдоно уу.',
          });
      }
    })();
    return () => controller.abort();
  }, [word, context, offset, retry]);
  return {
    lesson: local ?? (remote?.word === word ? remote.lesson : null),
    loading: !local && remote?.word !== word,
    error: !local && remote?.word === word ? remote.error : '',
    retry: () => {
      setRemote(null);
      setRetry((value) => value + 1);
    },
  };
}
