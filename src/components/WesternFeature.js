'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Play, Mountain, Star, Layers3 } from 'lucide-react'

export default function WesternFeature({ movies }) {
  if (!movies || !movies.length) return null

  const withArt = movies.filter(
    (m) => m && m.poster && m.banner && (m.episodes ?? 0) > 1
  )
  const liveAction = withArt.filter((m) => !(m.genres || []).some((g) => g === 'Animation' || g === 'Animated'))
  const pool = liveAction.length ? liveAction : withArt
  const ranked = [...pool].sort(
    (a, b) => (b.rating || 0) - (a.rating || 0) || (b.year || 0) - (a.year || 0)
  )
  const featured = ranked[0] || movies[0]
  const strip = ranked.filter((m) => m.slug !== featured.slug).slice(0, 6)

  return (
    <section className="relative overflow-hidden border-y border-slate-200 dark:border-slate-800 animate-scale-in">
      {/* backdrop */}
      <div className="absolute inset-0">
        <Image
          src={featured.banner}
          alt=""
          fill
          priority={false}
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-slate-950/50" />
      </div>

      {/* cinematic letterbox bars */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-[6px] bg-black/60" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-[6px] bg-black/60" />
      {/* bronze accent line */}
      <div className="pointer-events-none absolute inset-x-0 top-[6px] z-10 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />

      <div className="relative z-20 mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-20">
        <div className="animate-fade-in-down">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
            <Mountain className="h-4 w-4" />
            <span>Western Spotlight</span>
          </div>
          <h2 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            {featured.title}
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-200">
            <span className="flex items-center gap-1 font-semibold text-amber-300">
              <Star className="h-4 w-4 fill-current" />
              {featured.rating || '—'}/10
            </span>
            <span>{featured.year || ''}</span>
            {(featured.episodes ?? 0) > 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                <Layers3 className="h-3 w-3" />
                {featured.episodes} Episodes
              </span>
            )}
            {featured.genres?.slice(0, 3).map((g) => (
              <span key={g} className="text-slate-400">
                {g}
              </span>
            ))}
          </div>

          {featured.plot && (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 line-clamp-2">
              {featured.plot}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/movie/${featured.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-5 py-2.5 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110 shadow-[0_10px_28px_-10px_rgba(214,180,86,0.45)] hover:-translate-y-0.5"
            >
              <Play className="h-4 w-4 fill-current" />
              Watch Now
            </Link>
            <Link
              href="/movies?category=western"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:border-amber-400/50 hover:bg-white/10"
            >
              Explore Western Series
            </Link>
          </div>
        </div>

        {/* strip */}
        <div className="animate-fade-in-up delay-150">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              More from the frontier
            </p>
            <Link
              href="/movies?category=western"
              className="text-xs font-semibold text-slate-300 transition-colors hover:text-amber-300"
            >
              View all →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] lg:justify-end">
            {(strip || []).map((m) => (
              <Link
                key={m.slug}
                href={`/movie/${m.slug}`}
                className="group relative w-24 shrink-0 sm:w-28"
              >
                <div className="image-zoom relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-white/10 shadow-lg shadow-black/40 transition-all duration-300 group-hover:border-amber-400/60 group-hover:-translate-y-1 group-hover:shadow-amber-500/10">
                  <Image src={m.poster} alt={m.title} fill sizes="112px" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 translate-y-1 p-1.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-white">
                      {m.title}
                    </p>
                  </div>
                </div>
                <span className="mt-1.5 block truncate text-[11px] text-slate-400">
                  {m.rating ? `★ ${m.rating}` : m.year || ''}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}