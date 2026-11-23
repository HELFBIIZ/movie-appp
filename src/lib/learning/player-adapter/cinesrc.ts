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
    'cinesrc:nextepisode',
  ]),
  currentTime: z.number().finite().nonnegative().max(86400).optional(),
  duration: z.number().finite().positive().max(86400).optional(),
  tmdbId: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  movieId: z.number().int().positive().optional(),
  mediaType: z.enum(['movie', 'tv']).optional(),
  season: z.number().int().positive().optional(),
  episode: z.number().int().positive().optional(),
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

type EpisodeIdentity = { mediaType: 'movie' | 'tv'; season: number; episode: number };
const movieIdentity: EpisodeIdentity = { mediaType: 'movie', season: 1, episode: 1 };
function isBoundFrame(frame: Frame, tmdbId: number | string, identity: EpisodeIdentity): boolean {
  if (!frame.isConnected || !frame.contentWindow) return false;
  try {
    const url = new URL(frame.src);
    return (
      url.origin === CINESRC_ORIGIN &&
      Number.isSafeInteger(Number(tmdbId)) &&
      Number(tmdbId) > 0 &&
      url.pathname === `/embed/${identity.mediaType}/${tmdbId}` &&
      (identity.mediaType === 'movie'
        ? !url.search
        : url.searchParams.get('s') === String(identity.season) &&
          url.searchParams.get('e') === String(identity.episode) &&
          [...url.searchParams.keys()].length === 2) &&
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
  tmdbId: number | string,
  identity: EpisodeIdentity = movieIdentity,
) {
  if (
    !isBoundFrame(frame, tmdbId, identity) ||
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
  if ([data.tmdbId, data.id, data.movieId].some((id) => id !== undefined && id !== Number(tmdbId)))
    return null;
  if (data.mediaType && data.mediaType !== identity.mediaType) return null;
  if (
    data.type !== 'cinesrc:nextepisode' &&
    identity.mediaType === 'tv' &&
    ((data.season !== undefined && data.season !== identity.season) ||
      (data.episode !== undefined && data.episode !== identity.episode))
  )
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
export function createCineSession(
  frame: Frame,
  tmdbId: number | string,
  emit: (state: CineState) => void,
  identity: EpisodeIdentity = movieIdentity,
) {
  let state = emptyCineState();
  let disposed = false;
  let seekTimer: ReturnType<typeof setTimeout> | undefined;
  let reportedTime: number | null = null;
  let range: { start: number; end: number; loop: boolean; waiting: boolean } | null = null;
  let episodeChanged = false;
  const publish = () => {
    if (!disposed) emit({ ...state, capabilities: { ...state.capabilities } });
  };
  const reset = () => {
    clearTimeout(seekTimer);
    range = null;
    state = emptyCineState();
    reportedTime = null;
    publish();
  };
  function receive(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>) {
    if (disposed || episodeChanged) return;
    const data = readCineMessage(event, frame, tmdbId, identity);
    if (!data) return;
    if (data.type === 'cinesrc:nextepisode') {
      episodeChanged = true;
      reset();
      state.status = 'error';
      publish();
      return;
    }
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
    if (data.type === 'cinesrc:pause') range = null;
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
        if (range?.waiting && Math.abs(data.currentTime! - range.start) <= 0.75) {
          range.waiting = false;
          send('play');
        } else if (range?.waiting) {
          range = null;
        }
      }
      if (range && !range.waiting && data.currentTime! >= range.end) {
        if (range.loop) {
          range.waiting = true;
          seek(range.start);
        } else {
          range = null;
          send('pause');
        }
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
    if (disposed || episodeChanged || !isBoundFrame(frame, tmdbId, identity)) return false;
    if (!command.startsWith('get') && state.time === null) return false;
    frame.contentWindow!.postMessage({ type: 'cinesrc:command', command, args }, CINESRC_ORIGIN);
    return true;
  }
  function requestClock() {
    send('getDuration');
    send('getCurrentTime');
  }
  function seek(seconds: number) {
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
      range = null;
      state.pendingSeek = null;
      state.status = 'seek-unconfirmed';
      publish();
    }, 5000);
    return true;
  }
  return {
    receive,
    reset,
    requestClock,
    cancelReplay: () => {
      range = null;
    },
    play: () => send('play'),
    pause: () => {
      range = null;
      return send('pause');
    },
    seek(seconds: number) {
      range = null;
      return seek(seconds);
    },
    replay(start: number, end: number, loop = false) {
      if (!Number.isFinite(end) || end <= start || state.duration === null || end > state.duration)
        return false;
      range = { start, end, loop, waiting: true };
      if (seek(start)) return true;
      range = null;
      return false;
    },
    dispose() {
      disposed = true;
      range = null;
      clearTimeout(seekTimer);
    },
  };
}
