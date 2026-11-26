'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Subtitles, Search, Loader2, Check, X, Languages, Zap } from 'lucide-react';

const LANGUAGES = [
  { code: 'mon', label: 'Mongolian', flag: '🇲🇳' },
  { code: 'eng', label: 'English', flag: '🇺🇸' },
  { code: 'kor', label: 'Korean', flag: '🇰🇷' },
  { code: 'jpn', label: 'Japanese', flag: '🇯🇵' },
  { code: 'zho', label: 'Chinese', flag: '🇨🇳' },
  { code: 'rus', label: 'Russian', flag: '🇷🇺' },
  { code: 'spa', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fre', label: 'French', flag: '🇫🇷' },
  { code: 'ger', label: 'German', flag: '🇩🇪' },
  { code: 'ara', label: 'Arabic', flag: '🇸🇦' },
  { code: 'hin', label: 'Hindi', flag: '🇮🇳' },
  { code: 'tur', label: 'Turkish', flag: '🇹🇷' },
];

const OS_TO_LABEL = {
  mn: 'Mongolian',
  en: 'English',
  ko: 'Korean',
  ja: 'Japanese',
  zh: 'Chinese',
  ru: 'Russian',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ar: 'Arabic',
  hi: 'Hindi',
  tr: 'Turkish',
  it: 'Italian',
  pt: 'Portuguese',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
};

function labelFor(sub) {
  const code = sub?.language || sub?.languageLabel;
  const known = LANGUAGES.find((l) => l.code === code);
  if (known) return known.label;
  if (code && OS_TO_LABEL[code]) return OS_TO_LABEL[code];
  if (sub?.languageLabel && sub.languageLabel !== 'Detected') return sub.languageLabel;
  return 'Subtitles';
}

export default function SubtitlePanel({
  tmdbId,
  isTV = false,
  season,
  episode,
  title,
  year,
  slug,
  onSubtitleChange,
}) {
  const [subtitleOpen, setSubtitleOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('mon');
  const [subtitleUrl, setSubtitleUrl] = useState(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);
  const [searchNotice, setSearchNotice] = useState(null);
  const [, setHasSearched] = useState(false);
  const [translating, setTranslating] = useState(false);
  const translationRequest = useRef(null);
  useEffect(() => () => translationRequest.current?.abort(), [slug, season, episode]);
  const [translateError, setTranslateError] = useState(null);
  const [translateWarning, setTranslateWarning] = useState(null);
  const [translateInfo, setTranslateInfo] = useState(null);
  const [isMongolian, setIsMongolian] = useState(false);
  const [loadedLabel, setLoadedLabel] = useState(null);
  const [instantReady, setInstantReady] = useState(false);
  const [, setInstantChecked] = useState(false);

  const applyInstantMongolian = useCallback(
    (path, source = 'manual') => {
      if (!slug) return;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = path
        ? `${origin}${path}`
        : `${origin}/api/subtitles/mongolian/${encodeURIComponent(slug)}`;
      setSubtitleUrl(url);
      setSubtitlesEnabled(true);
      setIsMongolian(true);
      setLoadedLabel('Mongolian');
      setTranslateError(null);
      setTranslateWarning(null);
      onSubtitleChange?.(url, 'Mongolian', true, source);
    },
    [slug, onSubtitleChange],
  );

  const loadInstantMongolian = applyInstantMongolian;

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function checkInstant() {
      setTranslating(false);
      setIsMongolian(false);
      setTranslateInfo(null);
      setTranslateError(null);
      setTranslateWarning(null);
      setInstantReady(false);
      setSubtitleUrl(null);
      setLoadedLabel(null);
      onSubtitleChange?.(null, 'Mongolian');
      const candidates = [];
      if (isTV) {
        candidates.push(
          `/api/subtitles/mongolian/${encodeURIComponent(`${slug}-S${String(season ?? 1).padStart(2, '0')}E${String(episode).padStart(2, '0')}`)}`,
        );
      } else {
        candidates.push(`/api/subtitles/mongolian/${encodeURIComponent(slug)}`);
      }

      let okPath = null;
      let partial = false;
      for (const path of candidates) {
        if (cancelled) return;
        try {
          const res = await fetch(path);
          if (res.ok) {
            partial = res.headers.get('x-subtitle-partial') === 'true';
            okPath = path;
            break;
          }
        } catch {}
      }
      if (cancelled) return;
      if (okPath) {
        setInstantReady(true);
        applyInstantMongolian(okPath, 'automatic');
        if (partial) setTranslateWarning('Монгол хадмалын зарим мөр орчуулагдаагүй байна.');
      }
      setInstantChecked(true);
    }

    checkInstant();
    return () => {
      cancelled = true;
    };
  }, [slug, applyInstantMongolian, isTV, season, episode, onSubtitleChange]);

  const searchSubtitles = useCallback(async () => {
    if (!tmdbId) return;
    setSearching(true);
    setSearchError(null);
    setSearchNotice(null);
    setHasSearched(true);
    setSearchResults([]);

    try {
      const type = isTV ? 'episode' : 'movie';
      const params = new URLSearchParams({
        tmdb_id: tmdbId,
        lang: selectedLang,
        type,
      });
      if (title) params.set('title', title);
      if (year) params.set('year', year);
      if (isTV) {
        params.set(
          'query',
          `S${String(season ?? 1).padStart(2, '0')}E${String(episode ?? 1).padStart(2, '0')}`,
        );
        params.set('season', String(season ?? 1));
        params.set('episode', String(episode ?? 1));
      }

      const res = await fetch(`/api/subtitles?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error || 'Failed to search subtitles');
        return;
      }

      setSearchResults(data.results || []);
      if (data.message) {
        setSearchNotice(data.message);
      }
      if (!data.results?.length) {
        setSearchError('No subtitles found for this language');
      }
    } catch {
      setSearchError('Network error. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [tmdbId, selectedLang, isTV, season, episode, title, year]);

  const downloadSubtitle = useCallback(
    async (sub) => {
      const isObj = sub && typeof sub === 'object';
      const fileId = isObj ? sub.fileId : sub;
      const subId = isObj ? sub.subId : null;
      setSearching(true);
      try {
        const res = await fetch('/api/subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subId && !fileId ? { subId } : { fileId }),
        });
        const data = await res.json();

        if (!res.ok) {
          setSearchError(data.error || 'Failed to download subtitle');
          return;
        }

        setSubtitleUrl(data.link);
        setSubtitlesEnabled(true);
        setSearchResults([]);
        const found =
          typeof sub === 'object'
            ? sub
            : searchResults.find((r) => (r.fileId ?? r.subId) === fileId);
        const label = labelFor(found);
        setIsMongolian(label === 'Mongolian');
        setLoadedLabel(label);
        onSubtitleChange?.(data.link, label);
      } catch {
        setSearchError('Download failed. Please try again.');
      } finally {
        setSearching(false);
      }
    },
    [onSubtitleChange, searchResults],
  );

  const translateToMongolian = useCallback(async () => {
    if (translating) return;
    setTranslating(true);
    setTranslateError(null);
    setTranslateWarning(null);
    setTranslateInfo(null);
    const controller = new AbortController();
    translationRequest.current?.abort();
    translationRequest.current = controller;
    const pendingKey = `vxnta.subtitle-job:${slug}:${season || 0}:${episode || 0}`;
    try {
      const payload = subtitleUrl
        ? { subFileUrl: subtitleUrl, slug, title, year }
        : { tmdbId, title, year, type: isTV ? 'episode' : 'movie', season, episode, slug };
      let pending;
      try {
        pending = sessionStorage.getItem(pendingKey);
      } catch {
        /* Optional resume storage. */
      }
      if (pending && !/^\/api\/subtitles\/jobs\/[a-f0-9-]{36}$/i.test(pending)) pending = null;
      let res = await fetch(
        pending || '/api/subtitles/translate',
        pending
          ? { signal: controller.signal }
          : {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal,
            },
      );
      let data = await res.json();
      if (controller.signal.aborted) return;
      for (let poll = 0; res.ok && data.status === 'pending' && poll < 150; poll++) {
        if (!/^\/api\/subtitles\/jobs\/[a-f0-9-]{36}$/i.test(data.jobUrl))
          throw new Error('Invalid translation job');
        try {
          sessionStorage.setItem(pendingKey, data.jobUrl);
        } catch {
          /* Resume is optional. */
        }
        setTranslateInfo(
          'Монгол хадмал бэлтгэж байна. Энэ хуудсыг хаасан ч дараа дахин шалгаж болно.',
        );
        await new Promise((resolve) => setTimeout(resolve, 4000));
        if (controller.signal.aborted) return;
        res = await fetch(data.jobUrl, { signal: controller.signal, cache: 'no-store' });
        data = await res.json();
        if (controller.signal.aborted) return;
      }
      if (data.status === 'pending') {
        setTranslateInfo('Хадмал бэлтгэгдэж байна. Дараа энэ товчоор дахин шалгаарай.');
        return;
      }

      if (!res.ok) {
        if ([401, 403, 404, 409].includes(res.status)) {
          try {
            sessionStorage.removeItem(pendingKey);
          } catch {
            /* Optional storage. */
          }
        }
        setTranslateError(data.error || 'Translation failed');
        return;
      }
      try {
        sessionStorage.removeItem(pendingKey);
      } catch {
        /* Optional storage. */
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const absUrl = data.translatedUrl.startsWith('http')
        ? data.translatedUrl
        : `${origin}${data.translatedUrl}`;
      setSubtitleUrl(absUrl);
      setSubtitlesEnabled(true);
      setIsMongolian(true);
      setLoadedLabel('Mongolian');
      if (data.sourceDetail) {
        setTranslateInfo(data.sourceDetail);
      }
      if (data.partial) {
        setTranslateWarning(
          'Монгол орчуулга дутуу байна. Зарим мөр эх хэлээрээ үлдсэн тул өөр хадмал сонгох эсвэл дараа дахин оролдоно уу.',
        );
      }
      onSubtitleChange?.(absUrl, 'Mongolian');
    } catch {
      if (controller.signal.aborted) return;
      setTranslateError('Translation request failed. Please try again.');
    } finally {
      if (!controller.signal.aborted) setTranslating(false);
    }
  }, [
    subtitleUrl,
    title,
    year,
    isTV,
    season,
    episode,
    slug,
    tmdbId,
    translating,
    onSubtitleChange,
  ]);

  const clearSubtitles = useCallback(() => {
    setSubtitleUrl(null);
    setSearchResults([]);
    setHasSearched(false);
    setSearchError(null);
    setIsMongolian(false);
    setLoadedLabel(null);
    setTranslateError(null);
    setTranslateWarning(null);
    setTranslateInfo(null);
    setSearchNotice(null);
    onSubtitleChange?.(null, undefined, false);
  }, [onSubtitleChange]);

  const selectLanguage = useCallback(
    (code) => {
      setSelectedLang(code);
      setSubtitleUrl(null);
      setSearchResults([]);
      setHasSearched(false);
      setSearchError(null);
      setIsMongolian(false);
      setLoadedLabel(null);
      setTranslateError(null);
      setTranslateWarning(null);
      setTranslateInfo(null);
      setSearchNotice(null);
      onSubtitleChange?.(null, undefined, false);
    },
    [onSubtitleChange],
  );

  const activeLang = LANGUAGES.find((l) => l.code === selectedLang);
  const hasSubtitles = !!subtitleUrl;
  const displayLabel = loadedLabel ?? (isMongolian ? 'Mongolian' : activeLang?.label);
  const displayFlag = isMongolian ? '🇲🇳' : activeLang?.flag;

  return (
    <div className="animate-fade-in-up delay-100">
      <button
        onClick={() => setSubtitleOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-5 py-3 text-left transition-all hover:bg-slate-800/80"
      >
        <Subtitles className="h-5 w-5 text-[#c9a227]" />
        <span className="font-semibold">Subtitles</span>
        {hasSubtitles && (
          <span className="ml-2 flex items-center gap-1 text-xs text-green-400">
            <Check className="h-3 w-3" /> {displayFlag} {displayLabel}
          </span>
        )}
        <span className="ml-auto text-sm text-slate-400">
          {hasSubtitles && subtitlesEnabled
            ? translateWarning
              ? 'Дутуу'
              : 'Active'
            : hasSubtitles
              ? 'Paused'
              : 'No subtitles'}
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${subtitleOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {subtitleOpen && (
        <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          {/* Ready-to-load pre-generated Mongolian subtitle */}
          {instantReady && !hasSubtitles && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => loadInstantMongolian()}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-green-500"
                >
                  <Zap className="h-4 w-4" />
                  Load Mongolian Subtitles 🇲🇳
                </button>
                <p className="max-w-[280px] text-xs text-slate-400">
                  Mongolian subtitles are pre-loaded for this title — instant, no waiting.
                </p>
              </div>
            </div>
          )}

          {/* Language selector */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">Select subtitle language</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => selectLanguage(lang.code)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                    selectedLang === lang.code
                      ? 'border-[#c9a227] bg-[#c9a227]/20 text-amber-200'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span className="truncate">{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search button */}
          <div className="flex items-center gap-3">
            <button
              onClick={searchSubtitles}
              disabled={searching || !tmdbId}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-4 py-2.5 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {searching ? 'Searching...' : `Find ${activeLang?.label} Subtitles`}
            </button>
            {hasSubtitles && (
              <button
                onClick={clearSubtitles}
                className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>

          {/* Get / Translate to Mongolian */}
          {!isMongolian && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={translateToMongolian}
                  disabled={translating || (!hasSubtitles && !title)}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-4 py-2.5 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {translating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="h-4 w-4" />
                  )}
                  {translating
                    ? 'Монгол хадмал бэлтгэж байна…'
                    : hasSubtitles
                      ? 'Монгол орчуулга бэлтгэх 🇲🇳'
                      : 'Монгол хадмал авах 🇲🇳'}
                </button>
                <p className="max-w-[280px] text-xs text-slate-400">
                  {translating
                    ? 'Хадмал хайж эсвэл орчуулж байна. Хэсэг хүлээгээрэй.'
                    : hasSubtitles
                      ? 'Сонгосон хадмалаа Монгол хэл рүү орчуулна.'
                      : 'Энэ киноны Монгол хадмал хайна. Байхгүй бол орчуулах боломжийг шалгана.'}
                </p>
              </div>
            </div>
          )}

          {translateError && <p className="text-sm text-yellow-400">{translateError}</p>}

          {translateWarning && !translateError && (
            <p className="text-sm text-amber-300">{translateWarning}</p>
          )}

          {translateInfo && !translateError && (
            <p className="text-xs text-slate-500">{translateInfo}</p>
          )}

          {/* Active subtitle status */}
          {hasSubtitles && (
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                  subtitlesEnabled
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-yellow-500/20 text-yellow-300'
                }`}
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    subtitlesEnabled ? 'bg-green-400' : 'bg-yellow-400'
                  }`}
                />
                {displayFlag} {displayLabel} subtitles: {subtitlesEnabled ? 'Active' : 'Paused'}
              </span>

              <button
                onClick={() => {
                  const next = !subtitlesEnabled;
                  setSubtitlesEnabled(next);
                  onSubtitleChange?.(next ? subtitleUrl : null, displayLabel, next);
                }}
                aria-label={subtitlesEnabled ? 'Хадмал унтраах' : 'Хадмал асаах'}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                style={{ backgroundColor: subtitlesEnabled ? '#22c55e' : '#475569' }}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    subtitlesEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Search results */}
          {searchNotice && <p className="text-xs text-slate-400 leading-relaxed">{searchNotice}</p>}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-400">
                Found {searchResults.length} subtitle(s). Click to load:
              </p>
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {searchResults.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => downloadSubtitle(sub)}
                    disabled={searching}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-left text-sm transition-all hover:border-[#d6b456]/50 hover:bg-slate-800 disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-slate-200">{sub.fileName}</p>
                      <p className="text-xs text-slate-500">
                        {sub.language} · ⭐ {sub.rating ?? '—'} · ⬇ {sub.downloadCount ?? 0}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[#c9a227]">Load</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {searchError && <p className="text-sm text-yellow-400">{searchError}</p>}

          {/* No TMDB ID warning */}
          {!tmdbId && (
            <p className="text-sm text-slate-500">
              Subtitles are not available for this title (no TMDB ID).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
