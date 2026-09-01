import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMovieBySlug } from '@/lib/movies'

export function generateStaticParams() {
  return [
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

export default function WatchPage({ params }) {
  const movie = getMovieBySlug(params.slug)

  if (!movie) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link href={`/movie/${movie.slug}`} className="mb-6 inline-block text-sm text-red-400 hover:text-red-300">
          ← Back to movie details
        </Link>

        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-red-400">Now Watching</p>
            <h1 className="text-3xl font-bold md:text-4xl">{movie.title}</h1>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200">
            {movie.rating}/10
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black">
          <div className="aspect-video w-full">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${movie.trailerYouTubeId}?autoplay=1&rel=0`}
              title={`${movie.title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </main>
  )
}
