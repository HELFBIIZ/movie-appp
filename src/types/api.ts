export interface ApiError {
  code: string;
  message?: string;
  status?: number;
}

export interface WatchXp {
  gained?: number;
  status?: string;
}

export type WatchGate =
  | { status: 'loading' }
  | {
      status: 'allowed';
      player?: { embedUrl?: string | null; altUrl?: string | null };
      xp?: WatchXp;
    }
  | { status: 'blocked'; code: string; statusCode?: number };
