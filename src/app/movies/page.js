import Link from 'next/link'
import Image from 'next/image'
import { movies } from '@/lib/movies'

export default function MoviesPage({ searchParams }) {
  const category = (searchParams?.category || '').toLowerCase()

  const filtered = category
    ? movies.filter((m) => (m.category || '').toLowerCase() === category || m.genres.map(g=>g.toLowerCase()).includes(category))
    : movies

  return (
    <main className="min-h-screen bg-white px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-red-400">Movies</p>
            <h1 className="text-4xl font-black">{category ? `${category.charAt(0).toUpperCase()}${category.slice(1)}` : 'All Movies'}</h1>
          </div>
          <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            Back to home
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((movie) => (
            <Link key={movie.slug} href={`/movie/${movie.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="relative aspect-[2/3] w-full">
                <Image src={movie.poster} alt={movie.title} fill className="object-cover" />
              </div>
              <div className="space-y-2 p-4">
                <h2 className="text-lg font-semibold">{movie.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{movie.year} • {movie.rating}/10</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
