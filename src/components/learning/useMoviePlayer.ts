'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { createCineSession, emptyCineState } from '@/lib/learning/player-adapter/cinesrc';

export type MoviePlayerContext = {
  tmdbId: number;
  provider: string;
  allowed: boolean;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  onSelectProvider: (provider: string) => void;
  englishSubtitleUrl?: string;
};
export function useMoviePlayer(enabled: boolean, context?: MoviePlayerContext) {
  const [observed, setObserved] = useState({ key: '', state: emptyCineState() });
  const session = useRef<ReturnType<typeof createCineSession> | null>(null);
  const frameRef = context?.iframeRef;
  const tmdbId = context?.tmdbId;
  const provider = context?.provider;
  const allowed = context?.allowed;
  const key = `${enabled}:${allowed}:${provider}:${tmdbId}`;
  useEffect(() => {
    const publish = (state: ReturnType<typeof emptyCineState>) => setObserved({ key, state });
    publish(emptyCineState());
    const frame = frameRef?.current;
    if (!enabled || !allowed || provider !== 'cine' || !frame || !tmdbId) return;
    const adapter = createCineSession(frame, tmdbId, publish);
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
  }, [enabled, allowed, provider, tmdbId, frameRef, key]);
  return {
    ...(observed.key === key ? observed.state : emptyCineState()),
    seek: (seconds: number) => session.current?.seek(seconds) ?? false,
    pause: () => session.current?.pause() ?? false,
  };
}
