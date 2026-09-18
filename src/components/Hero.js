'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { movies } from '@/lib/movies'

const resizeImage = (url) => {
  if (!url || url.startsWith('data:')) return url
  return url.replace(/\/p\/w\d+/, '/p/w1280')
}

export default function Hero() {
  const [activeMovie, setActiveMovie] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const featured = movies.filter((m) => m.category === 'top-rated' || m.category === 'popular').slice(0, 5)

  useEffect(() => {
    setActiveMovie(featured[0])

    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % featured.length
          setActiveMovie(featured[next])
          return next
        })
        setIsTransitioning(false)
      }, 500)
    }, 6000)

    return () => clearInterval(interval)
  }, [featured])

  if (!activeMovie) {
    return (
      <section className="relative h-[65vh] w-full overflow-hidden bg-black">
        <div className="skeleton absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </section>
    )
  }

  const item = {
    ...activeMovie,
    banner: resizeImage(activeMovie.banner),
    poster: resizeImage(activeMovie.poster),
  }

  return (
    <section
      className="relative h-[65vh] w-full overflow-hidden bg-[#0b0906]"
      role="region"
      aria-label={`Featured movie: ${item.title}`}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <Image
          src={item.banner}
          alt={item.title}
          fill
          sizes="(max-width: 768px) 100vw, 1400px"
          className="object-cover opacity-80 hero-animate"
          quality={75}
          priority
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0906] via-[#120d07]/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0906]/70 via-transparent to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
        <div
          className={`container max-w-2xl space-y-3 text-[#e9e2d3] transition-all duration-500 ${
            isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#d6b456]" aria-hidden="true" />
            <span className="rounded-full border border-[#c9a227]/40 bg-[#c9a227]/10 px-3 py-1 font-display text-xs font-semibold uppercase tracking-[0.22em] text-gold-soft">
              {item.category === 'top-rated' ? 'Hall of Fame' : 'Featured Premier'}
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.05] gradient-text">
            {item.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-[#cdbf9c]">
            <div className="flex items-center gap-2 text-gold-soft">
              <span aria-hidden="true">★</span>
              <span className="font-semibold">{item.rating}/10</span>
            </div>
            <span>•</span>
            <span>{item.year}</span>
            <span>•</span>
            <span>{item.runtime}</span>
            <span>•</span>
            <span className="hidden sm:inline">{item.genres.slice(0, 3).join(', ')}</span>
          </div>
          <p id="hero-plot" className="line-clamp-3 max-w-xl text-sm text-[#cdbf9c] md:text-base">
            {item.plot}
          </p>
          <div className="flex gap-3 pt-2">
            <Link href={`/movie/${item.slug}`} aria-label={`Open ${item.title} details`}>
              <Button
                size="lg"
                className="mt-2 gap-2 button-ripple relative transition-all overflow-hidden bg-gradient-to-r from-[#c9a227] via-[#e7c779] to-[#c9a227] text-[#1a150b] font-semibold hover:shadow-[0_10px_36px_-8px_rgba(214,180,86,0.55)] hover:brightness-110 shadow-[0_8px_28px_-10px_rgba(214,180,86,0.45)]"
                aria-describedby="hero-plot"
              >
                ▶ Watch Trailer
              </Button>
            </Link>
            <Link href={`/watch/${item.slug}`}>
              <Button
                size="lg"
                variant="ghost"
                className="mt-2 gap-2 border border-[#d6b456]/40 text-gold-soft hover:bg-[#d6b456]/10 bg-transparent transition-all hover:shadow-[0_8px_24px_-10px_rgba(214,180,86,0.4)] backdrop-blur-sm"
              >
                ▶ Now
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation dots */}
      <div className="absolute bottom-6 right-6 flex gap-2">
        {featured.map((m, idx) => (
          <button
            key={m.slug}
            onClick={() => {
              setCurrentIndex(idx)
              setActiveMovie(m)
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              m.slug === item.slug
                ? 'w-8 bg-gradient-to-r from-[#e7c779] to-[#c9a227] shadow-[0_0_10px_rgba(214,180,86,0.6)]'
                : 'w-2 bg-[#d6b456]/40 hover:bg-[#d6b456]/70'
            }`}
            aria-label={`Go to ${m.title}`}
          />
        ))}
      </div>
    </section>
  )
}