"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function useIntersectionObserver(options = {}) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.1, ...options })

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [options])

  return [ref, isVisible]
}

export default function MovieCarousel({ title, movies, categoryTag }) {
  const [ref, isVisible] = useIntersectionObserver()

  const seeMoreHref = categoryTag
    ? `/movies?category=${categoryTag}`
    : `/movies?category=${encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'))}`

  return (
    <section
      ref={ref}
      className={`py-8 transition-all duration-700 ${
        isVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="container px-4">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-3xl font-semibold text-[#3d341f] transition-colors hover:text-[#8a6d1f] cursor-default dark:text-[#e9e2d3] dark:hover:text-amber-200">
            {title}
          </h2>
          <Link
            href={seeMoreHref}
            className="text-sm font-medium text-[#8a7540] transition-all hover:text-[#5c4a12] hover:translate-x-1 dark:text-[#b9a468] dark:hover:text-amber-200"
          >
            See more →
          </Link>
        </div>
 
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-3 md:-ml-4">
            {movies.map((movie, index) => (
              <CarouselItem
                key={movie.slug || movie.id}
                className="basis-1/2 pl-3 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 md:pl-4"
                style={{
                  animationDelay: `${index * 0.05}s`,
                  opacity: isVisible ? 1 : 0,
                  animation: isVisible ? `fadeInUp 0.5s ease-out ${index * 0.05}s forwards` : 'none'
                }}
              >
                <Link href={`/movie/${movie.slug}`}>
                  <Card className="border-0 bg-transparent shadow-none group/movie">
                    <CardContent className="p-0">
                      <div className="image-zoom relative aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-black/10 transition-all duration-300 group-hover/movie:ring-1 dark:ring-white/10 dark:group-hover/movie:ring-[#d6b456]/50 dark:group-hover/movie:shadow-[0_16px_44px_-12px_rgba(0,0,0,0.7),0_0_26px_-8px_rgba(214,180,86,0.25)]">
                        <Image
                          src={movie.poster}
                          alt={movie.title}
                          fill
                          sizes="(max-width: 640px) 50vw, 200px"
                          className="object-cover transition-transform duration-500 hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/movie:opacity-100" />
                      </div>
                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-[#d6b456]">★</span>
                          <span className="font-medium text-[#6b5c33] dark:text-[#cdbf9c]">{movie.rating}/10</span>
                        </div>
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-[#3d341f] transition-colors hover:text-[#8a6d1f] dark:text-[#e9e2d3] dark:hover:text-amber-200">
                          {movie.title}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-3 hidden md:flex transition-all border-[#c9a227]/40 text-[#8a6d1f] hover:bg-[#c9a227] hover:border-[#c9a227] hover:text-[#1a150b] dark:text-amber-200 dark:hover:text-[#1a150b]" />
          <CarouselNext className="-right-3 hidden md:flex transition-all border-[#c9a227]/40 text-[#8a6d1f] hover:bg-[#c9a227] hover:border-[#c9a227] hover:text-[#1a150b] dark:text-amber-200 dark:hover:text-[#1a150b]" />
        </Carousel>
      </div>
    </section>
  )
}