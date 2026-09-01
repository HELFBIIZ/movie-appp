import Header from "@/components/Header"
import Hero from "@/components/Hero"
import Footer from "@/components/Footer"
import SearchAndFilters from "@/components/SearchAndFilters"
import { movies, topRatedMovies, upcomingMovies } from "@/lib/movies"

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <Header />
      <Hero />
      <SearchAndFilters movies={movies} upcomingMovies={upcomingMovies} topRatedMovies={topRatedMovies} />
      <Footer />
    </main>
  )
}