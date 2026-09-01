"use client"

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
 
export default function MovieCarousel({ title, movies }) {
  return (
    <section className="py-8">
      <div className="container px-4">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          <Link
            href={`/movies?category=${encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'))}`}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300"
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
            {movies.map((movie) => (
              <CarouselItem
                key={movie.slug || movie.id}
                className="basis-1/2 pl-3 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 md:pl-4"
              >
                <Link href={`/movie/${movie.slug}`}>
                  <Card className="border-0 bg-transparent shadow-none">
                    <CardContent className="p-0">
                      <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
                        <Image
                          src={movie.poster}
                          alt={movie.title}
                          fill
                          sizes="(max-width: 640px) 50vw, 200px"
                          className="object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-yellow-500">★</span>
                          <span className="font-medium">{movie.rating}/10</span>
                        </div>
                        <p className="line-clamp-2 text-sm font-medium leading-snug">
                          {movie.title}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-3 hidden md:flex" />
          <CarouselNext className="-right-3 hidden md:flex" />
        </Carousel>
      </div>
    </section>
  )
}