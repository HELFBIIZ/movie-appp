'use client';
import { useEffect, useRef, useState } from 'react';
import { hasMongolianMeaning } from '@/lib/learning/sentence-text';

export function useSentenceMeaning(text: string, provided: string) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState({ text: '', loading: false, error: '' });
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), [text]);
  const existing = hasMongolianMeaning(provided) ? provided : '';
  const translation = existing || values[text] || '';
  async function translate() {
    if (!text || translation) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState({ text, loading: true, error: '' });
    try {
      const response = await fetch('/api/learning/sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const code =
          data &&
          typeof data === 'object' &&
          'error' in data &&
          data.error &&
          typeof data.error === 'object' &&
          'code' in data.error
            ? data.error.code
            : '';
        const error =
          response.status === 401
            ? 'Нэвтэрч ороод өгүүлбэрийн утгыг үзээрэй.'
            : code === 'FREE_LIMIT_REACHED'
              ? 'Өнөөдрийн үнэгүй хязгаарт хүрлээ. Үг дээр дараад утгыг нь үзэж болно.'
              : 'Утгыг одоогоор нээж чадсангүй. Дахин оролдоно уу.';
        if (!controller.signal.aborted) setState({ text, loading: false, error });
        return;
      }
      if (
        !data ||
        typeof data !== 'object' ||
        !('translation' in data) ||
        typeof data.translation !== 'string' ||
        data.translation.length > 1000 ||
        !hasMongolianMeaning(data.translation)
      )
        throw new Error('Invalid translation');
      if (!controller.signal.aborted) {
        const value = data.translation;
        setValues((previous) => ({ ...previous, [text]: value }));
        setState({ text, loading: false, error: '' });
      }
    } catch {
      if (!controller.signal.aborted)
        setState({ text, loading: false, error: 'Холболт тасарлаа. Дахин оролдоно уу.' });
    }
  }
  return {
    translation,
    automatic: !existing && !!translation,
    translate,
    loading: state.text === text && state.loading,
    error: state.text === text ? state.error : '',
  };
}
