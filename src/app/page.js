import Header from "@/components/Header"
import Hero from "@/components/Hero"
import Footer from "@/components/Footer"
import SearchAndFilters from "@/components/SearchAndFilters"
import WesternFeature from "@/components/WesternFeature"
import {
  movies,
  topRatedMovies,
  upcomingMovies,
  westernMovies,
  kdramas2026,
} from "@/lib/movies"

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <Header />
      <Hero />
      <WesternFeature movies={westernMovies} />
      <WesternFeature
        movies={kdramas2026}
        eyebrow="2026 K-Drama Spotlight"
        title="K-Drama"
        viewAllHref="/movies?category=kdrama"
        viewAllLabel="Explore K-Drama"
        stripTitle="New 2026 releases"
      />
      <SearchAndFilters movies={movies} upcomingMovies={upcomingMovies} topRatedMovies={topRatedMovies} />
      <Footer />
    </main>
  )
}