export type TmdbId = number | string;

export interface Movie {
  slug: string;
  title: string;
  year: number;
  rating: number | null;
  genres: string[];
  runtime: string;
  language: string;
  director: string;
  cast: string[];
  plot: string;
  category: string;
  poster: string;
  banner: string;
  tmdbId?: TmdbId | null;
  trailerYouTubeId?: string | null;
  trailerSource?: string;
  episodes?: number;
  seasons?: number;
  season?: number;
  episode?: number;
  mediaType?: 'movie' | 'tv';
  access?: 'FREE' | 'VIP';
}

export type MovieSeed = Omit<Movie, 'poster' | 'banner'> & {
  poster?: string | null;
  banner?: string | null;
};

export interface MovieArtwork {
  poster?: string | null;
  banner?: string | null;
  tmdbId?: TmdbId | null;
}
