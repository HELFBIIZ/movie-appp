import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { movies } from '@/lib/movies'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const normalizeSlug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-')

export default async function GenrePage({ params }) {
  const slug = (await params).slug
  const matchingMovies = movies.filter((movie) =>
    movie.genres.some((genre) => normalizeSlug(genre) === slug)
  )

  if (!matchingMovies.length) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <Header />

      <div className="min-h-screen px-4 py-12 text-slate-900 dark:text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Browse</p>
              <h1 className="text-4xl font-black capitalize">{slug.replace(/-/g, ' ')}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{matchingMovies.length} movies</p>
            </div>
            <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
              Back to home
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {matchingMovies.map((movie, index) => (
              <Link
                key={movie.slug}
                href={`/movie/${movie.slug}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.04}s forwards`, opacity: 0 }}
              >
                <div className="relative aspect-[2/3] w-full">
                  <Image src={movie.poster} alt={movie.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 300px" />
                </div>
                <div className="space-y-2 p-4">
                  <h2 className="text-lg font-semibold transition-colors group-hover:text-[#8a6d1f] dark:group-hover:text-amber-200">{movie.title}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{movie.year} • ★ {movie.rating}/10</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}