'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { createCineSession, emptyCineState } from '@/lib/learning/player-adapter/cinesrc';

export type MoviePlayerContext = {
  tmdbId: number | string | null | undefined;
  provider: string;
  allowed: boolean;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  onSelectProvider: (provider: string) => void;
  englishSubtitleUrl?: string | null;
  mongolianSubtitleUrl?: string | null;
  mediaType?: 'movie' | 'tv';
  season?: number;
  episode?: number;
  subtitleKey?: string;
};
export function useMoviePlayer(enabled: boolean, context?: MoviePlayerContext) {
  const [observed, setObserved] = useState({ key: '', state: emptyCineState() });
  const session = useRef<ReturnType<typeof createCineSession> | null>(null);
  const frameRef = context?.iframeRef;
  const tmdbId = context?.tmdbId;
  const provider = context?.provider;
  const allowed = context?.allowed;
  const mediaType = context?.mediaType ?? 'movie';
  const season = context?.season ?? 1;
  const episode = context?.episode ?? 1;
  const key = `${enabled}:${allowed}:${provider}:${tmdbId}:${mediaType}:${season}:${episode}`;
  useEffect(() => {
    const publish = (state: ReturnType<typeof emptyCineState>) => setObserved({ key, state });
    publish(emptyCineState());
    const frame = frameRef?.current;
    if (!enabled || !allowed || provider !== 'cine' || !frame || !tmdbId) return;
    const adapter = createCineSession(frame, tmdbId, publish, { mediaType, season, episode });
    session.current = adapter;
    const onLoad = () => {
      adapter.reset();
      adapter.requestClock();
    };
    window.addEventListener('message', adapter.receive);
    frame.addEventListener('load', onLoad);
    adapter.requestClock();
    return () => {
      adapter.dispose();
      session.current = null;
      window.removeEventListener('message', adapter.receive);
      frame.removeEventListener('load', onLoad);
    };
  }, [enabled, allowed, provider, tmdbId, frameRef, key, mediaType, season, episode]);
  return {
    ...(observed.key === key ? observed.state : emptyCineState()),
    seek: (seconds: number) => session.current?.seek(seconds) ?? false,
    pause: () => session.current?.pause() ?? false,
  };
}
