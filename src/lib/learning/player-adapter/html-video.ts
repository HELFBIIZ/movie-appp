import { emptyCineState, type CineState } from './cinesrc.ts';

// Read the browser's media clock. A source URL is not proof of film identity.
export function createHtmlVideoSession(
  video: HTMLVideoElement,
  publish: (state: CineState) => void,
) {
  let replay: { start: number; end: number; loop: boolean } | null = null;
  let disposed = false;
  function available() {
    return (
      video.isConnected &&
      video.readyState >= 1 &&
      Number.isFinite(video.duration) &&
      video.duration > 0 &&
      video.duration <= 86400
    );
  }
  function update() {
    if (disposed) return;
    if (
      !available() ||
      !Number.isFinite(video.currentTime) ||
      video.currentTime < 0 ||
      video.currentTime > video.duration + 1
    ) {
      publish(emptyCineState());
      return;
    }
    if (replay && video.currentTime >= replay.end && !video.seeking) {
      if (replay.loop) video.currentTime = replay.start;
      else {
        replay = null;
        video.pause();
      }
    }
    publish({
      ...emptyCineState(),
      time: video.currentTime,
      duration: video.duration,
      status: video.seeking ? 'seek-pending' : 'connected',
      pendingSeek: video.seeking ? video.currentTime : null,
      capabilities: { getCurrentTime: true, play: true, pause: true, seek: true },
    });
  }
  function failed() {
    if (!disposed) publish({ ...emptyCineState(), status: 'error' });
  }
  const events = [
    'loadedmetadata',
    'durationchange',
    'timeupdate',
    'seeked',
    'seeking',
    'play',
    'pause',
    'emptied',
  ];
  for (const event of events) video.addEventListener(event, update);
  video.addEventListener('error', failed);
  update();
  function seek(seconds: number) {
    if (
      disposed ||
      !available() ||
      !Number.isFinite(seconds) ||
      seconds < 0 ||
      seconds > video.duration
    )
      return false;
    video.currentTime = seconds;
    return true;
  }
  function play() {
    if (disposed || !available()) return false;
    void video.play().catch(() => {});
    return true;
  }
  return {
    seek,
    play,
    pause() {
      if (disposed || !available()) return false;
      video.pause();
      return true;
    },
    replay(start: number, end: number, loop = false) {
      if (!Number.isFinite(end) || end <= start || end > video.duration || !seek(start))
        return false;
      replay = { start, end, loop };
      return play();
    },
    cancelReplay() {
      replay = null;
    },
    dispose() {
      disposed = true;
      replay = null;
      for (const event of events) video.removeEventListener(event, update);
      video.removeEventListener('error', failed);
    },
  };
}
