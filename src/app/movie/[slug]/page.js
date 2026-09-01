import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMovieBySlug } from '@/lib/movies'
import WatchlistButton from '@/components/WatchlistButton'

export function generateStaticParams() {
  return [
    { slug: 'spider-man-brand-new-day' },
    { slug: 'dear-santa' },
    { slug: 'how-to-train-your-dragon' },
    { slug: 'alien-romulus' },
    { slug: 'from-the-ashes' },
    { slug: 'space-dogg' },
    { slug: 'the-order' },
    { slug: 'y2k' },
    { slug: 'the-shawshank-redemption' },
    { slug: 'the-godfather' },
    { slug: 'the-dark-knight' },
    { slug: 'interstellar' },
    { slug: 'forrest-gump' },
    { slug: 'fight-club' },
  ]
}

export default function MoviePage({ params }) {
  const movie = getMovieBySlug(params.slug)

  if (!movie) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="relative h-[32rem] overflow-hidden">
        <img src={movie.banner} alt={movie.title} className="h-full w-full object-cover brightness-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-end">
            <img src={movie.poster} alt={movie.title} className="h-72 w-52 rounded-xl border border-white/20 object-cover shadow-2xl" />
            <div className="max-w-3xl space-y-4">
              <p className="text-sm uppercase tracking-[0.25em] text-red-400">Now Streaming</p>
              <h1 className="text-4xl font-black md:text-6xl">{movie.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                <span>{movie.year}</span>
                <span>•</span>
                <span>{movie.runtime}</span>
                <span>•</span>
                <span>{movie.language}</span>
                <span>•</span>
                <span>{movie.rating}/10</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/watch/${movie.slug}`} className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500">
                  ▶ Watch now
                </Link>
                <WatchlistButton movie={movie} />
                <Link href="/" className="rounded-lg border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10">
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-2xl font-bold">Overview</h2>
              <p className="text-slate-600 dark:text-slate-300">{movie.plot}</p>
            </div>

            <div>
              <h3 className="mb-3 text-xl font-semibold">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((genre) => (
                  <Link key={genre} href={`/genre/${genre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-500/20 dark:text-red-200">
                    {genre}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-xl font-bold">Movie info</h3>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li><span className="font-semibold text-slate-900 dark:text-white">Director:</span> {movie.director}</li>
              <li><span className="font-semibold text-slate-900 dark:text-white">Cast:</span> {movie.cast.join(', ')}</li>
              <li><span className="font-semibold text-slate-900 dark:text-white">Rating:</span> {movie.rating}/10</li>
              <li><span className="font-semibold text-slate-900 dark:text-white">Runtime:</span> {movie.runtime}</li>
            </ul>
          </aside>
        </div>
      </div>
    </main>
  )
}
