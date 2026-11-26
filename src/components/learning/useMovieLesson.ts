'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { MAX_VTT_BYTES } from '@/lib/learning/vtt';
import {
  captionSettingsSchema,
  initialCaptionSettings,
  mergeAutomaticCaptions,
} from '@/lib/learning/caption-settings';
import {
  movieCues,
  internalEnglishSource,
  internalMongolianSource,
  parseExistingVtt,
  transcriptFingerprint,
} from '@/lib/learning/movie';
import type { MoviePlayerContext } from './useMoviePlayer';

const settingsSchema = captionSettingsSchema;
const initial = initialCaptionSettings;
export function useMovieLesson(
  enabled: boolean,
  allowed: boolean,
  movieId: string,
  context?: MoviePlayerContext,
) {
  const subtitleKey = context?.subtitleKey ?? movieId;
  const prefix =
    context?.mediaType === 'tv'
      ? `tv:${context.tmdbId}:${context.season}:${context.episode}`
      : `movie:${context?.tmdbId ?? movieId}`;
  const settingsKey = `vxnta.scenechain.captions.${subtitleKey}.v2`;
  const [settings, setSettings] = useState(initial);
  const settingsRef = useRef(initial);
  const [fingerprintState, setFingerprint] = useState({ english: '', mongolian: '', hash: '' });
  const fingerprint =
    fingerprintState.english === settings.english &&
    fingerprintState.mongolian === settings.mongolian
      ? fingerprintState.hash
      : '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const change = useCallback(
    (next: typeof initial) => {
      const valid = settingsSchema.parse(next);
      settingsRef.current = valid;
      setSettings(valid);
      try {
        localStorage.setItem(settingsKey, JSON.stringify(valid));
        setError('');
      } catch {
        setError('Хадмал энэ удаад нээгдсэн ч хөтөчид хадгалагдсангүй.');
      }
    },
    [settingsKey],
  );
  const season = context?.season ?? 1;
  const episode = context?.episode ?? 1;
  const mediaType = context?.mediaType ?? 'movie';
  useEffect(() => {
    if (!enabled || !allowed) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError('');
      setNotice('');
      try {
        const raw =
          localStorage.getItem(settingsKey) ??
          (movieId === 'spider-man-brand-new-day'
            ? localStorage.getItem('vxnta.scenechain.movie.969681.v1')
            : null);
        const saved = raw ? settingsSchema.parse(JSON.parse(raw)) : initial;
        if (saved.english) parseExistingVtt(saved.english);
        if (saved.mongolian) parseExistingVtt(saved.mongolian);
        settingsRef.current = saved;
        setSettings(saved);
      } catch {
        setError('Өмнөх хадмалын тохиргоог уншиж чадсангүй. Хуучин өгөгдлийг устгаагүй.');
      }
      try {
        const query = new URLSearchParams({
          slug: movieId,
          season: String(season),
          episode: String(episode),
          type: mediaType,
        });
        const response = await fetch(`/api/learning/subtitles?${query}`, {
          signal: controller.signal,
        });
        const data = z
          .object({ english: z.string(), mongolian: z.string(), notice: z.string() })
          .parse(await response.json());
        if (!response.ok) throw new Error('Хадмал ачаалсангүй.');
        if (controller.signal.aborted) return;
        if (data.english) parseExistingVtt(data.english);
        if (data.mongolian) parseExistingVtt(data.mongolian);
        const next = mergeAutomaticCaptions(settingsRef.current, data);
        change(next);
        setNotice(data.notice);
      } catch {
        if (!controller.signal.aborted)
          setNotice('Автомат хадмал олдсонгүй. Хадмалын хэсгээс сонгох эсвэл EN/MN .vtt нэмээрэй.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [enabled, allowed, movieId, settingsKey, season, episode, mediaType, change, retry]);
  const englishSelection = context?.englishSubtitleUrl;
  const mongolianSelection = context?.mongolianSubtitleUrl;
  useEffect(() => {
    if (!enabled || !allowed) return;
    const controller = new AbortController();
    const selections = [
      ['english', englishSelection],
      ['mongolian', mongolianSelection],
    ] as const;
    for (const [language, selection] of selections) {
      if (!selection) continue;
      const url =
        language === 'mongolian'
          ? internalMongolianSource(selection, window.location.origin, subtitleKey)
          : internalEnglishSource(selection, window.location.origin);
      if (!url) continue;
      void fetch(url, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error();
          const text = await response.text();
          if (!parseExistingVtt(text).length) throw new Error();
          if (!controller.signal.aborted)
            change({
              ...settingsRef.current,
              [language]: text,
              [language === 'english' ? 'englishSource' : 'mongolianSource']: 'manual',
            });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setError('Сонгосон хадмал нээгдсэнгүй. .vtt файл сонгож болно.');
        });
    }
    return () => controller.abort();
  }, [enabled, allowed, englishSelection, mongolianSelection, subtitleKey, change]);
  useEffect(() => {
    let cancelled = false;
    void transcriptFingerprint(settings.english, settings.mongolian)
      .then((value) => {
        if (!cancelled)
          setFingerprint({ english: settings.english, mongolian: settings.mongolian, hash: value });
      })
      .catch(() => {
        if (!cancelled) setError('Хадмалын таних дугаар үүссэнгүй.');
      });
    return () => {
      cancelled = true;
    };
  }, [settings.english, settings.mongolian]);
  const mn = useMemo(
    () => (settings.mongolian ? parseExistingVtt(settings.mongolian) : []),
    [settings.mongolian],
  );
  const en = useMemo(
    () => (settings.english ? parseExistingVtt(settings.english) : []),
    [settings.english],
  );
  const cues = useMemo(
    () => movieCues(mn, en, settings.enOffset, settings.mnOffset),
    [mn, en, settings.enOffset, settings.mnOffset],
  );
  async function loadFile(file: File, language: 'english' | 'mongolian') {
    try {
      if (file.size > MAX_VTT_BYTES || !/\.vtt$/i.test(file.name))
        throw new Error('1 MB хүртэлх .vtt сонгоно уу.');
      const text = await file.text();
      if (!parseExistingVtt(text).length) throw new Error('Хадмалын мөр олдсонгүй.');
      change({
        ...settingsRef.current,
        [language]: text,
        [language === 'english' ? 'englishSource' : 'mongolianSource']: 'manual',
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'VTT уншиж чадсангүй.');
    }
  }
  return {
    cues: enabled && allowed ? cues : [],
    mediaId: `${prefix}:${fingerprint || 'pending'}:${settings.enOffset}:${settings.mnOffset}`,
    prefix,
    loading:
      enabled &&
      allowed &&
      (loading || (!!(settings.english || settings.mongolian) && !fingerprint)),
    error: '',
    warning: error || notice,
    supported: true,
    hasEnglish: en.length > 0,
    mnCount: mn.length,
    enCount: en.length,
    alignmentMissing: en.length > 0 && mn.length > 0 && cues.some((cue) => !cue.translation),
    enOffset: settings.enOffset,
    mnOffset: settings.mnOffset,
    changeOffset: (language: 'en' | 'mn', offset: number) => {
      if (Number.isFinite(offset) && Math.abs(offset) <= 600)
        change({ ...settingsRef.current, [language === 'en' ? 'enOffset' : 'mnOffset']: offset });
    },
    loadEnglish: (file: File) => loadFile(file, 'english'),
    loadMongolian: (file: File) => loadFile(file, 'mongolian'),
    retry: () => setRetry((value) => value + 1),
    refresh: () => {
      try {
        // Retain legacy/manual tracks before the user's explicit replacement.
        if (
          settingsRef.current.englishSource !== 'automatic' ||
          settingsRef.current.mongolianSource !== 'automatic'
        )
          localStorage.setItem(
            `${settingsKey}.backup.${Date.now()}`,
            JSON.stringify(settingsRef.current),
          );
        change({
          ...initial,
          enOffset: settingsRef.current.enOffset,
          mnOffset: settingsRef.current.mnOffset,
        });
        setRetry((value) => value + 1);
      } catch {
        setError('Хуучин хадмалыг хадгалж чадсангүй. Одоогийн файлыг солиогүй.');
      }
    },
  };
}
