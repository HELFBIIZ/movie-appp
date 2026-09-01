import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

async function fetchFeaturedMovie() {
  try {
    const res = await fetch('/api/movies', { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data?.movies?.[0] ?? null
  } catch (e) {
    return null
  }
}

export default async function Hero({ movie }) {
  const fetched = movie ? null : await fetchFeaturedMovie()

  const item = movie || fetched || {
    title: 'Spider Man: Brand New Day',
    rating: '8.2',
    banner: '/hero-banner.jpg',
    slug: 'the-dark-knight',
    plot: 'Follow Peter Parker as he begins a new chapter in his life as Spider-Man, balancing heroism with personal growth and new challenges...',
  }

  return (
    <section
      className="relative h-[65vh] w-full overflow-hidden bg-black"
      role="region"
      aria-label={`Featured movie: ${item.title}`}
    >
      <div className="absolute inset-0">
        <Image
          src={item.banner}
          alt={item.title}
          fill
          sizes="(max-width: 768px) 100vw, 1400px"
          className="object-cover opacity-80"
          quality={75}
          priority
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
        <div className="container max-w-2xl space-y-3 text-white">
          <p className="text-sm font-medium uppercase tracking-wider text-gray-300">
            Now Playing
          </p>
          <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl">{item.title}</h1>
          <div className="flex items-center gap-2 text-yellow-400">
            <span aria-hidden>★</span>
            <span className="text-sm font-medium">{item.rating}/10</span>
          </div>
          <p id="hero-plot" className="line-clamp-3 max-w-xl text-sm text-gray-200 md:text-base">
            {item.plot}
          </p>
          <Link href={`/movie/${item.slug}`} aria-label={`Open ${item.title} details`}>
            <Button size="lg" className="mt-2 gap-2" aria-describedby="hero-plot">
              ▶ Watch Trailer
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}