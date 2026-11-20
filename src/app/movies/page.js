'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { movies } from '@/lib/movies'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function MoviesPage() {
  return (
    <Suspense fallback={null}>
      <MoviesContent />
    </Suspense>
  )
}

function MoviesContent() {
  const searchParams = useSearchParams()
  const [category, setCategory] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setCategory((searchParams?.get('category') || '').toLowerCase())
    setIsLoaded(true)
  }, [searchParams])

  const filtered = useMemo(() => {
    if (!category) return movies

    if (category === 'western-modern') {
      return movies.filter(
        (m) => (m.category || '').toLowerCase() === 'western' && m.year >= 2020 && m.year <= 2026
      )
    }

    const normalized = category
    return movies.filter(
      (m) =>
        (m.category || '').toLowerCase() === normalized ||
        m.genres.map((g) => g.toLowerCase()).includes(normalized)
    )
  }, [category])

  const heading = !category
    ? 'All Movies'
    : category === 'kdrama'
      ? 'K-Dramas'
      : category === 'western-modern'
        ? 'Modern Westerns (2020–2026)'
        : category
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <Header />

      <div className="min-h-screen px-4 py-12 text-slate-900 dark:text-white">
        <div className="mx-auto max-w-6xl">
          <div className={`mb-8 flex items-center justify-between gap-4 transition-all duration-700 ${
            isLoaded ? 'animate-fade-in-down opacity-100' : 'opacity-0 -translate-y-4'
          }`}>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Movies</p>
              <h1 className="text-4xl font-black">{heading}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{filtered.length} movies available</p>
            </div>
            <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition-all hover:bg-slate-100 hover:shadow-md hover:-translate-y-0.5 dark:border-slate-700 dark:hover:bg-slate-800">
              Back to home
            </Link>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 animate-fade-in-up">
              <h3 className="mb-2 text-lg font-semibold">No movies in this category yet</h3>
              <p className="text-sm">Try browsing all movies instead.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((movie, index) => (
                <Link
                  key={movie.slug}
                  href={`/movie/${movie.slug}`}
                  className="group card-hover overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                  style={{
                    opacity: isLoaded ? 1 : 0,
                    animation: isLoaded ? `fadeInUp 0.5s ease-out ${index * 0.03}s forwards` : 'none'
                  }}
                >
                  <div className="image-zoom relative aspect-[2/3] w-full">
                    <Image src={movie.poster} alt={movie.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 300px" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute bottom-0 left-0 right-0 translate-y-full p-3 transition-transform duration-300 group-hover:translate-y-0">
                      <div className="flex items-center gap-1 text-sm text-yellow-400">
                        <span>★</span>
                        <span className="font-medium">{movie.rating}/10</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 p-4">
                    <h2 className="text-lg font-semibold transition-colors group-hover:text-[#8a6d1f] dark:group-hover:text-amber-200">{movie.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{movie.year} • {movie.genres.slice(0, 2).join(', ')}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}