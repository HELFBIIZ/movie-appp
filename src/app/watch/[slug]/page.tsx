'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { getMovieBySlug } from '@/lib/movies';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SubtitlePanel from '@/components/SubtitlePanel';
import LearningModeToggle from '@/components/learning/LearningModeToggle';
import { SPIDER_MAN } from '@/lib/learning/movie';
import WatchAccessGate from '@/components/watch/WatchAccessGate';
import MoviePlayer from '@/components/watch/MoviePlayer';
import EpisodeSelector from '@/components/watch/EpisodeSelector';
import { useWatchAccess } from '@/components/watch/useWatchAccess';
import { getPlayerTabs } from '@/lib/watch/providers';
import type { LearningSource } from '@/components/learning/useLearningController';

const LearningDock = dynamic(() => import('@/components/learning/LearningDock'), {
  ssr: false,
  loading: () => (
    <p className="py-6 text-slate-400" role="status">
      SceneChain ачаалж байна…
    </p>
  ),
});

const SERIES_CATEGORIES = new Set(['kdrama', 'western', 'tv', 'series']);

export default function WatchPage() {
  const { slug } = useParams<{ slug: string }>();
  const movie = getMovieBySlug(slug);

  const isTV = SERIES_CATEGORIES.has(movie?.category ?? '') && (movie?.episodes ?? 0) > 1;
  const totalEpisodes = isTV ? (movie?.episodes ?? 0) : 0;
  const totalSeasons = isTV ? movie?.seasons || Math.ceil(totalEpisodes / 16) || 1 : 1;
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const gate = useWatchAccess(slug);

  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [subtitleLabel, setSubtitleLabel] = useState('Mongolian');
  const handleSubtitleChange = useCallback((url: string | null, label?: string) => {
    setSubtitleUrl(url);
    if (label) setSubtitleLabel(label);
  }, []);
  const [source, setSource] = useState('vidsrc');
  const [learning, setLearning] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve production mount/source-reset timing; covered by browser regression.
    if (new URLSearchParams(window.location.search).get('learn') === '1') setLearning(true);
  }, [slug]);
  const [learningSource, setLearningSource] = useState<LearningSource>(() =>
    slug === SPIDER_MAN.slug ? 'movie' : 'sample',
  );
  const movieIframeRef = useRef<HTMLIFrameElement>(null);
  const showMoviePlayer = !learning || learningSource === 'movie';
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve production mount/source-reset timing; covered by browser regression.
    setLearningSource(slug === SPIDER_MAN.slug ? 'movie' : 'sample');
    setSubtitleUrl(null);
    setSubtitleLabel('Mongolian');
  }, [slug]);

  const subSlug = isTV
    ? `${slug}-S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
    : slug;
  // Five players: VidSrc (1, MN track), CineSrc (2), SuperEmbed (3),
  // EmbedMaster (4, MN track), Embed API Stream (5).
  const visibleTabs = getPlayerTabs(movie, isTV, season, episode, subSlug);
  const activeEmbed = visibleTabs.find((t) => t.id === source)?.url || null;

  const sourceAvailable = visibleTabs.some((tab) => tab.id === source);

  // If the available player list shrinks (or title/episode changes), fall back
  // to the first player instead of a stale tab.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve production mount/source-reset timing; covered by browser regression.
    if (!sourceAvailable) setSource('vidsrc');
  }, [sourceAvailable]);

  if (!movie) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white page-enter">
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link
          href={`/movie/${movie.slug}`}
          className="mb-6 inline-block text-sm text-[#c9a227] transition-all hover:text-amber-300 hover:-translate-x-1"
        >
          ← Back to movie details
        </Link>

        <div className="mb-6 flex items-center justify-between gap-4 animate-fade-in-down">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Now Watching</p>
            <h1 className="text-3xl font-bold md:text-4xl gradient-text">{movie.title}</h1>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200 animate-fade-in delay-100">
            ★ {movie.rating ?? '—'}
            {movie.rating ? '/10' : ''}
          </div>
        </div>

        <LearningModeToggle enabled={learning} onChange={setLearning} />

        <WatchAccessGate showMoviePlayer={showMoviePlayer} gate={gate} />

        {gate.status === 'allowed' && (
          <>
            <MoviePlayer
              showMoviePlayer={showMoviePlayer}
              movie={movie}
              source={source}
              season={season}
              episode={episode}
              setSource={setSource}
              visibleTabs={visibleTabs}
              activeEmbed={activeEmbed}
              xp={gate.xp}
              movieIframeRef={movieIframeRef}
            />

            {showMoviePlayer && (
              <div id="watch-subtitle-panel" className="mt-4">
                <SubtitlePanel
                  tmdbId={movie.tmdbId}
                  isTV={isTV}
                  season={season}
                  episode={episode}
                  title={movie.title}
                  year={movie.year}
                  slug={movie.slug}
                  onSubtitleChange={handleSubtitleChange}
                />
              </div>
            )}

            <EpisodeSelector
              isTV={isTV}
              totalEpisodes={totalEpisodes}
              totalSeasons={totalSeasons}
              season={season}
              episode={episode}
              setSeason={setSeason}
              setEpisode={setEpisode}
            />

            <details className="mt-6 text-sm text-slate-400">
              <summary className="w-fit cursor-pointer">
                {isTV ? 'Цувралын тухай' : 'Киноны тухай'}
              </summary>
              <p className="mt-3 leading-6">{movie.plot}</p>
            </details>
          </>
        )}
        {learning && (
          <LearningDock
            key={slug}
            movieId={slug}
            movieTitle={movie.title}
            source={learningSource}
            onSource={setLearningSource}
            movieContext={{
              tmdbId: movie.tmdbId,
              provider: source,
              allowed: gate.status === 'allowed' && showMoviePlayer,
              iframeRef: movieIframeRef,
              onSelectProvider: setSource,
              englishSubtitleUrl: subtitleLabel === 'English' ? subtitleUrl : undefined,
            }}
          />
        )}
      </div>

      <Footer />
    </main>
  );
}
