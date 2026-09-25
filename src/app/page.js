import Header from "@/components/Header"
import Hero from "@/components/Hero"
import Footer from "@/components/Footer"
import SearchAndFilters from "@/components/SearchAndFilters"
import WesternFeature from "@/components/WesternFeature"
import { movies, topRatedMovies, upcomingMovies, westernMovies } from "@/lib/movies"

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <Header />
      <Hero />
      <WesternFeature movies={westernMovies} />
      <SearchAndFilters movies={movies} upcomingMovies={upcomingMovies} topRatedMovies={topRatedMovies} />
      <Footer />
    </main>
  )
}