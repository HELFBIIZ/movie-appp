"use client"
 
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"
 
const genres = [
  { label: "Action", slug: "action" },
  { label: "Drama", slug: "drama" },
  { label: "Comedy", slug: "comedy" },
  { label: "Sci-Fi", slug: "sci-fi" },
  { label: "Horror", slug: "horror" },
  { label: "Romance", slug: "romance" },
  { label: "Thriller", slug: "thriller" },
  { label: "Adventure", slug: "adventure" },
  { label: "Fantasy", slug: "fantasy" },
  { label: "Crime", slug: "crime" },
]
 
export default function Header() {
  const { isDark, toggleTheme } = useTheme()
  
  return (
    <header className="sticky top-0 z-50 border-b bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800 backdrop-blur supports-[backdrop-filter]:bg-white/95 dark:supports-[backdrop-filter]:bg-slate-900/95">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tight">Movie Z</Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1">
                Genre
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {genres.map((genre) => (
                <DropdownMenuItem key={genre.slug}>
                  <Link href={`/genre/${genre.slug}`} className="block w-full">
                    {genre.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/watchlist" className="text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            Watchlist
          </Link>
        </div>
 
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-yellow-400" />
          ) : (
            <Moon className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>
    </header>
  )
}