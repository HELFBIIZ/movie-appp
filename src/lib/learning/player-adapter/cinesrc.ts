import { z } from 'zod';
import type { PlayerCapabilities } from './index.ts';

export const CINESRC_ORIGIN = 'https://cinesrc.st';
export const CINESRC_DOCS = 'https://cinesrc.st/docs';
const messageSchema = z.object({
  type: z.enum([
    'cinesrc:ready',
    'cinesrc:timeupdate',
    'cinesrc:loadedmetadata',
    'cinesrc:seeked',
    'cinesrc:play',
    'cinesrc:pause',
    'cinesrc:error',
    'cinesrc:sourceused',
    'cinesrc:response',
  ]),
  currentTime: z.number().finite().nonnegative().max(86400).optional(),
  duration: z.number().finite().positive().max(86400).optional(),
  tmdbId: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  movieId: z.number().int().positive().optional(),
  mediaType: z.literal('movie').optional(),
  command: z.enum(['getCurrentTime', 'getDuration']).optional(),
  result: z.number().finite().nonnegative().max(86400).optional(),
});
type Frame = Pick<HTMLIFrameElement, 'src' | 'contentWindow' | 'isConnected'>;
export type CineState = {
  time: number | null;
  duration: number | null;
  pendingSeek: number | null;
  status: 'waiting' | 'connected' | 'seek-pending' | 'seek-unconfirmed' | 'error';
  capabilities: PlayerCapabilities;
  // The provider protocol does not supply a signed content identity.
  contentVerified: false;
};
export const emptyCineState = (): CineState => ({
  time: null,
  duration: null,
  pendingSeek: null,
  status: 'waiting',
  contentVerified: false,
  capabilities: { getCurrentTime: false, play: false, pause: false, seek: false },
});

function isBoundFrame(frame: Frame, tmdbId: number): boolean {
  if (!frame.isConnected || !frame.contentWindow) return false;
  try {
    const url = new URL(frame.src);
    return (
      url.origin === CINESRC_ORIGIN &&
      url.pathname === `/embed/movie/${tmdbId}` &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function readCineMessage(
  event: Pick<MessageEvent, 'origin' | 'source' | 'data'>,
  frame: Frame,
  tmdbId: number,
) {
  if (
    !isBoundFrame(frame, tmdbId) ||
    event.source !== frame.contentWindow ||
    event.origin !== CINESRC_ORIGIN
  )
    return null;
  const parsed = messageSchema.safeParse(event.data);
  if (!parsed.success) return null;
  const data = parsed.data;
  if (data.type === 'cinesrc:loadedmetadata' && data.duration === undefined) return null;
  if (
    data.type === 'cinesrc:response' &&
    (data.command === undefined ||
      data.result === undefined ||
      (data.command === 'getDuration' && data.result === 0))
  )
    return null;
  if ([data.tmdbId, data.id, data.movieId].some((id) => id !== undefined && id !== tmdbId))
    return null;
  if (
    ['cinesrc:timeupdate', 'cinesrc:seeked'].includes(data.type) &&
    (data.currentTime === undefined ||
      data.duration === undefined ||
      data.currentTime > data.duration)
  )
    return null;
  return data;
}

// Uses only the provider's documented command/event envelope. No DOM access,
// stream extraction, wildcard target origin, optimistic clocks or guessed SDK.
export function createCineSession(frame: Frame, tmdbId: number, emit: (state: CineState) => void) {
  let state = emptyCineState();
  let disposed = false;
  let seekTimer: ReturnType<typeof setTimeout> | undefined;
  let reportedTime: number | null = null;
  const publish = () => {
    if (!disposed) emit({ ...state, capabilities: { ...state.capabilities } });
  };
  const reset = () => {
    clearTimeout(seekTimer);
    state = emptyCineState();
    reportedTime = null;
    publish();
  };
  function receive(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>) {
    if (disposed) return;
    const data = readCineMessage(event, frame, tmdbId);
    if (!data) return;
    if (data.type === 'cinesrc:ready') requestClock();
    if (data.type === 'cinesrc:sourceused') {
      reset();
      return;
    }
    if (data.type === 'cinesrc:error') {
      reset();
      state.status = 'error';
      publish();
      return;
    }
    if (data.type === 'cinesrc:play') state.capabilities.play = true;
    if (data.type === 'cinesrc:pause') state.capabilities.pause = true;
    if (data.type === 'cinesrc:loadedmetadata') state.duration = data.duration ?? null;
    if (data.type === 'cinesrc:response') {
      if (data.command === 'getDuration') state.duration = data.result!;
      if (data.command === 'getCurrentTime') reportedTime = data.result!;
      if (reportedTime !== null && state.duration !== null && reportedTime <= state.duration) {
        state.time = reportedTime;
        reportedTime = null;
        state.capabilities.getCurrentTime = true;
        if (state.pendingSeek === null) state.status = 'connected';
      }
    }
    if (data.type === 'cinesrc:timeupdate' || data.type === 'cinesrc:seeked') {
      state.time = data.currentTime!;
      state.duration = data.duration!;
      state.capabilities.getCurrentTime = true;
      if (state.pendingSeek === null) state.status = 'connected';
      if (
        data.type === 'cinesrc:seeked' &&
        state.pendingSeek !== null &&
        Math.abs(data.currentTime! - state.pendingSeek) <= 2
      ) {
        clearTimeout(seekTimer);
        state.capabilities.seek = true;
        state.pendingSeek = null;
        state.status = 'connected';
      }
    }
    if (state.time !== null && state.duration !== null && state.time > state.duration) {
      state.time = null;
      state.capabilities.getCurrentTime = false;
      state.capabilities.seek = false;
      state.status = 'waiting';
    }
    publish();
  }
  function send(
    command: 'seek' | 'pause' | 'play' | 'getCurrentTime' | 'getDuration',
    args: number[] = [],
  ) {
    if (disposed || !isBoundFrame(frame, tmdbId)) return false;
    if (!command.startsWith('get') && state.time === null) return false;
    frame.contentWindow!.postMessage({ type: 'cinesrc:command', command, args }, CINESRC_ORIGIN);
    return true;
  }
  function requestClock() {
    send('getDuration');
    send('getCurrentTime');
  }
  return {
    receive,
    reset,
    requestClock,
    play: () => send('play'),
    pause: () => send('pause'),
    seek(seconds: number) {
      if (
        !Number.isFinite(seconds) ||
        seconds < 0 ||
        state.duration === null ||
        seconds > state.duration
      )
        return false;
      if (!send('seek', [seconds])) return false;
      clearTimeout(seekTimer);
      state.pendingSeek = seconds;
      state.capabilities.seek = false;
      state.status = 'seek-pending';
      publish();
      seekTimer = setTimeout(() => {
        state.pendingSeek = null;
        state.status = 'seek-unconfirmed';
        publish();
      }, 5000);
      return true;
    },
    dispose() {
      disposed = true;
      clearTimeout(seekTimer);
    },
  };
}
