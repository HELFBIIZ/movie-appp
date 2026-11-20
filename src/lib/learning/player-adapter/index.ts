export type PlayerCapabilities = {
  getCurrentTime: boolean;
  play: boolean;
  pause: boolean;
  seek: boolean;
};

const unsupported: PlayerCapabilities = {
  getCurrentTime: false,
  play: false,
  pause: false,
  seek: false,
};

// Conservative static defaults. CineSrc's documented protocol is implemented in
// cinesrc.ts; capabilities are promoted only from observed, validated events.
// This registry does not assert that a particular film/stream was verified.
export const iframeProviders = [
  { id: 'vidsrc', origin: 'https://vidsrcme.ru', capabilities: unsupported },
  {
    id: 'cine',
    origin: 'https://cinesrc.st',
    capabilities: unsupported,
    documentation: 'https://cinesrc.st/docs',
    verification: 'runtime-events-required',
  },
  { id: 'superembed', origin: 'https://multiembed.mov', capabilities: unsupported },
  { id: 'embedmaster', origin: 'https://embedmaster.link', capabilities: unsupported },
  { id: 'embedapi', origin: 'https://watch.embed-api.stream', capabilities: unsupported },
];

// No postMessage listener is installed for unsupported providers. There is no
// inbound data to trust and no guessed commands sent into a cross-origin frame.
export function htmlVideoAdapter(video: HTMLVideoElement) {
  return {
    capabilities: { getCurrentTime: true, play: true, pause: true, seek: true },
    getCurrentTime: () => video.currentTime,
    play: () => video.play(),
    pause: () => video.pause(),
    seek(seconds: number) {
      if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(video.duration))
        return false;
      video.currentTime = Math.min(seconds, video.duration);
      return true;
    },
  };
}
