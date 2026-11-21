'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { MAX_VTT_BYTES } from '@/lib/learning/vtt';
import {
  movieCues,
  internalEnglishSource,
  parseExistingVtt,
  SPIDER_MAN,
  transcriptFingerprint,
} from '@/lib/learning/movie';

const settingsSchema = z.object({
  english: z.string().max(MAX_VTT_BYTES),
  enOffset: z.number().finite().min(-600).max(600),
  mnOffset: z.number().finite().min(-600).max(600),
});
const settingsKey = 'vxnta.scenechain.movie.969681.v1';
const initialSettings = { english: '', enOffset: 0, mnOffset: 0 };
export function useMovieLesson(
  enabled: boolean,
  allowed: boolean,
  movieId: string,
  englishSelection?: string | null,
) {
  const [settings, setSettings] = useState(initialSettings);
  const settingsRef = useRef(initialSettings);
  const [mongolian, setMongolian] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const supported = movieId === SPIDER_MAN.slug;
  useEffect(() => {
    if (!enabled || !allowed || !supported) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve production mount/source-reset timing; covered by browser regression.
    setLoading(true);
    setError('');
    try {
      const raw = localStorage.getItem(settingsKey);
      if (raw) {
        if (raw.length > 1_100_000) throw new Error('Too large');
        const saved = settingsSchema.parse(JSON.parse(raw));
        if (saved.english) parseExistingVtt(saved.english);
        settingsRef.current = saved;
        setSettings(saved);
      }
    } catch {
      setError('Өмнөх EN/offset тохиргоог уншиж чадсангүй. Хуучин өгөгдлийг устгаагүй.');
    }
    fetch(SPIDER_MAN.subtitleUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('MN subtitle unavailable');
        const text = await response.text();
        if (!parseExistingVtt(text).length) throw new Error('Empty subtitles');
        if (!controller.signal.aborted) setMongolian(text);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Одоогийн MN VTT ачаалсангүй.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, allowed, supported, retry]);
  useEffect(() => {
    if (!mongolian) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve production mount/source-reset timing; covered by browser regression.
    setFingerprint('');
    transcriptFingerprint(settings.english, mongolian)
      .then((hash) => {
        if (!cancelled) setFingerprint(hash);
      })
      .catch(() => {
        if (!cancelled) setError('Transcript fingerprint үүсгэж чадсангүй.');
      });
    return () => {
      cancelled = true;
    };
  }, [settings.english, mongolian]);
  const mn = useMemo(() => (mongolian ? parseExistingVtt(mongolian) : []), [mongolian]);
  const en = useMemo(
    () => (settings.english ? parseExistingVtt(settings.english) : []),
    [settings.english],
  );
  const cues = useMemo(
    () => movieCues(mn, en, settings.enOffset, settings.mnOffset),
    [mn, en, settings.enOffset, settings.mnOffset],
  );
  const change = useCallback((next: typeof initialSettings) => {
    const valid = settingsSchema.parse(next);
    settingsRef.current = valid;
    setSettings(valid);
    try {
      localStorage.setItem(settingsKey, JSON.stringify(valid));
      setError('');
    } catch {
      setError(
        'EN/offset энэ удаа нээгдсэн ч browser-д хадгалагдсангүй. Refresh хийвэл дахин сонгоно.',
      );
    }
  }, []);
  useEffect(() => {
    if (!enabled || !allowed || !supported || !englishSelection) return;
    const url = internalEnglishSource(englishSelection, window.location.origin);
    if (!url) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve production mount/source-reset timing; covered by browser regression.
      setError('English source нь same-origin subtitle URL биш байна. Local EN VTT сонгоно уу.');
      return;
    }
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('EN source unavailable');
        const text = await response.text();
        if (!parseExistingVtt(text).length) throw new Error('EN source empty');
        if (!controller.signal.aborted) change({ ...settingsRef.current, english: text });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Subtitle panel-ийн EN source нээгдсэнгүй. Таарах local EN VTT сонгоно уу.');
      });
    return () => controller.abort();
  }, [enabled, allowed, supported, englishSelection, change]);
  async function loadEnglish(file: File) {
    try {
      if (file.size > MAX_VTT_BYTES || !/\.vtt$/i.test(file.name))
        throw new Error('1 MB хүртэлх English .vtt сонгоно уу.');
      const text = await file.text();
      if (!parseExistingVtt(text).length) throw new Error('English cue олдсонгүй.');
      change({ ...settings, english: text });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'EN VTT уншиж чадсангүй.');
    }
  }
  return {
    cues: enabled && allowed && supported ? cues : [],
    mediaId: `movie:969681:${fingerprint || 'pending'}:${settings.enOffset}:${settings.mnOffset}`,
    loading: enabled && allowed && supported && (loading || (!!mongolian && !fingerprint)),
    error,
    supported,
    hasEnglish: en.length > 0,
    mnCount: mn.length,
    enCount: en.length,
    enOffset: settings.enOffset,
    mnOffset: settings.mnOffset,
    changeOffset: (language: 'en' | 'mn', offset: number) => {
      if (Number.isFinite(offset) && Math.abs(offset) <= 600)
        change({ ...settings, [language === 'en' ? 'enOffset' : 'mnOffset']: offset });
    },
    loadEnglish,
    retry: () => setRetry((value) => value + 1),
  };
}
