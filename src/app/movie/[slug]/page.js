'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useParams, notFound } from 'next/navigation'
import { getMovieBySlug, movies } from '@/lib/movies'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WatchlistButton from '@/components/WatchlistButton'
import UserReviews from '@/components/UserReviews'
import WhereToWatch from '@/components/WhereToWatch'
import { Subtitles } from 'lucide-react'

export default function MoviePage() {
  const { slug } = useParams()
  const movie = getMovieBySlug(slug)

  if (!movie) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white page-enter">
      <Header />

      <div className="relative h-[32rem] overflow-hidden">
        <Image
          src={movie.banner}
          alt={movie.title}
          fill
          priority
          sizes="100vw"
          className="object-cover brightness-50 hero-animate"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-end">
            <div className="animate-fade-in-left">
              <Image
                src={movie.poster}
                alt={movie.title}
                width={208}
                height={288}
                className="h-72 w-52 rounded-xl border border-white/20 object-cover shadow-2xl transition-transform duration-500 hover:scale-105"
              />
            </div>
            <div className="max-w-3xl space-y-4 animate-fade-in-right">
              <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Now Streaming</p>
              <h1 className="text-4xl font-black md:text-6xl gradient-text">{movie.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                <span>{movie.year}</span>
                <span>•</span>
                <span>{movie.runtime}</span>
                <span>•</span>
                <span>{movie.language}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-gold-soft">
                  <span>★</span> {movie.rating}/10
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {movie.tmdbId ? (
                  <Link
                    href={`/watch/${movie.slug}`}
                    className="relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-[#c9a227] via-[#e7c779] to-[#c9a227] px-5 py-3 font-bold text-[#1a150b] transition-all duration-300 hover:brightness-110 hover:shadow-[0_10px_32px_-8px_rgba(214,180,86,0.5)]"
                  >
                    ▶ Watch now
                  </Link>
                ) : (
                  <span className="rounded-lg bg-slate-800 px-5 py-3 font-semibold text-slate-400">
                    Streaming unavailable
                  </span>
                )}
                <WatchlistButton movie={movie} />
                {movie.tmdbId && (
                  <Link
                    href={`/watch/${movie.slug}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#d6b456]/50 bg-[#d6b456]/10 px-5 py-3 font-semibold text-gold-soft transition-all duration-300 hover:bg-[#d6b456]/20 hover:border-[#e7c779] hover:shadow-[0_8px_24px_-8px_rgba(214,180,86,0.4)]"
                  >
                    <Subtitles className="h-4 w-4" />
                    Mongolian Subtitles
                  </Link>
                )}
                <Link
                  href="/"
                  className="rounded-lg border border-white/30 px-5 py-3 font-semibold text-white transition-all duration-300 hover:bg-white/10"
                >
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-6 animate-fade-in-up">
            <div>
              <h2 className="mb-3 text-2xl font-bold">Trailer</h2>
              {movie.trailerYouTubeId ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg transition-all hover:shadow-xl dark:border-slate-800">
                  <div className="aspect-video w-full">
                    <iframe
                      className="h-full w-full"
                      src={`https://www.youtube.com/embed/${movie.trailerYouTubeId}?rel=0`}
                      title={`${movie.title} trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  Trailer coming soon
                </div>
              )}
            </div>

            <div className="animate-fade-in-up delay-100">
              <h2 className="mb-3 text-2xl font-bold">Overview</h2>
              <p className="text-slate-600 dark:text-slate-300">{movie.plot}</p>
            </div>

            <div className="animate-fade-in-up delay-200">
              <h3 className="mb-3 text-xl font-semibold">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((genre) => (
                  <Link
                    key={genre}
                    href={`/genre/${genre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    className="rounded-full bg-[#e7dcb8] px-3 py-1 text-sm font-medium text-[#7a6118] transition-all hover:bg-[#dfd19e] hover:shadow-[0_4px_14px_-4px_rgba(214,180,86,0.5)] dark:bg-[#c9a227]/15 dark:text-[#eeddae] dark:hover:bg-[#c9a227]/25"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="animate-fade-in-up delay-300">
              <h2 className="mb-4 text-2xl font-bold">You Might Also Like</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {(() => {
                  const recommended = movies
                    .filter(m => m.slug !== movie.slug && m.genres.some(g => movie.genres.includes(g)))
                    .sort((a, b) => b.rating - a.rating)
                    .slice(0, 6);
                  return recommended.map(m => (
                    <Link key={m.slug} href={`/movie/${m.slug}`} className="group">
                      <div className="image-zoom relative aspect-[2/3] overflow-hidden rounded-xl">
                        <img src={m.poster} alt={m.title} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div className="mt-2 space-y-0.5">
                        <p className="text-sm font-medium leading-tight line-clamp-1 group-hover:text-[#8a6d1f] dark:group-hover:text-amber-200 transition-colors">{m.title}</p>
                        <p className="flex items-center gap-1 text-xs text-yellow-400">★ {m.rating} · {m.year}</p>
                      </div>
                    </Link>
                  ));
                })()}
              </div>
            </div>
          </div>

          <aside className="animate-fade-in-right delay-300">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-xl font-bold">Movie info</h3>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {movie.director && (
                  <li className="flex justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">Director:</span>
                    <span className="text-right">{movie.director}</span>
                  </li>
                )}
                {movie.cast?.length > 0 && (
                  <li className="flex justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">Cast:</span>
                    <span className="text-right max-w-[180px]">{movie.cast.join(', ')}</span>
                  </li>
                )}
                {typeof movie.episodes === 'number' && (
                  <li className="flex justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">Episodes:</span>
                    <span>{movie.episodes}</span>
                  </li>
                )}
                <li className="flex justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Rating:</span>
                  <span className="text-yellow-400">★ {movie.rating ?? '—'}{movie.rating ? '/10' : ''}</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Runtime:</span>
                  <span>{movie.runtime}</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Language:</span>
                  <span>{movie.language}</span>
                </li>
              </ul>
            </div>

            {movie.tmdbId && <WhereToWatch tmdbId={movie.tmdbId} />}
          </aside>
        </div>

        <div className="mt-12">
          <UserReviews movieSlug={movie.slug} />
        </div>
      </div>

      <Footer />
    </main>
  )
}