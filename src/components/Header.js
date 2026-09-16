"use client"

import Link from "next/link"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, Moon, Sun, Film, Menu, X, Home, ListVideo, TrendingUp, Calendar, Star, Tv2, Mountain, LifeBuoy } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"
import NotificationBell from "@/components/NotificationBell"

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
  { label: "Animation", slug: "animation" },
  { label: "Mystery", slug: "mystery" },
  { label: "Documentary", slug: "documentary" },
]

export default function Header() {
  const { isDark, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur supports-[backdrop-filter]:bg-white/90 bg-[#faf7f1]/95 border-[#e5dcc7] dark:bg-[#110e0a]/92 dark:border-black/60 supports-[backdrop-filter]:dark:bg-[#110e0a]/80">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <Film className="h-6 w-6 text-gold group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(214,180,86,0.5)]" />
            <span className="font-display text-2xl tracking-[0.16em] gradient-text group-hover:drop-shadow-[0_0_14px_rgba(231,199,121,0.35)] transition-[filter]">
              VXNTA
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1">
                  Genre
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 max-h-80 overflow-y-auto">
                {genres.map((genre) => (
                  <DropdownMenuItem key={genre.slug}>
                    <Link href={`/genre/${genre.slug}`} className="block w-full">
                      {genre.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <NavLink href="/movies" icon={<Film className="h-4 w-4" />}>Movies</NavLink>
            <NavLink href="/movies?category=upcoming" icon={<Calendar className="h-4 w-4" />}>New Releases</NavLink>
            <NavLink href="/movies?category=top-rated" icon={<Star className="h-4 w-4" />}>Top Rated</NavLink>
            <NavLink href="/movies?category=kdrama" icon={<Tv2 className="h-4 w-4" />}>K-Dramas</NavLink>
            <NavLink href="/movies?category=western" icon={<Mountain className="h-4 w-4" />}>Western</NavLink>
            <NavLink href="/watchlist" icon={<ListVideo className="h-4 w-4" />}>Watchlist</NavLink>
            <NavLink href="/help" icon={<LifeBuoy className="h-4 w-4" />}>Тусламж</NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-gold-soft" />
            ) : (
              <Moon className="h-5 w-5 text-[#8a7540]" />
            )}
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t bg-[#faf7f1] dark:bg-[#0f0c09] dark:border-black/70 animate-fade-in-down">
          <nav className="container px-4 py-3 flex flex-col gap-1">
            <MobileNavLink href="/" icon={<Home className="h-4 w-4" />} onClick={() => setMobileOpen(false)}>Home</MobileNavLink>
            <MobileNavLink href="/movies" icon={<Film className="h-4 w-4" />} onClick={() => setMobileOpen(false)}>All Movies</MobileNavLink>
            <MobileNavLink href="/movies?category=upcoming" icon={<Calendar className="h-4 w-4" />} onClick={() => setMobileOpen(false)}>New Releases</MobileNavLink>
            <MobileNavLink href="/movies?category=top-rated" icon={<Star className="h-4 w-4" />} onClick={() => setMobileOpen(false)}>Top Rated</MobileNavLink>
            <MobileNavLink href="/movies?category=kdrama" icon={<Tv2 className="h-4 w-4" />} onClick={() => setMobileOpen(false)}>K-Dramas</MobileNavLink>
            <MobileNavLink href="/movies?category=western" icon={<Mountain className="h-4 w-4" />} onClick={() => setMobileOpen(false)}>Western</MobileNavLink>
            <MobileNavLink href="/watchlist" icon={<ListVideo className="h-4 w-4" />} onClick={() => setMobileOpen(false)}>Watchlist</MobileNavLink>
            <MobileNavLink href="/help" icon={<LifeBuoy className="h-4 w-4" />} onClick={() => setMobileOpen(false)}>Тусламж</MobileNavLink>
            <div className="mt-2 pt-2 border-t border-[#e5dcc7] dark:border-black/60">
              <p className="px-3 py-1 text-xs font-medium text-[#8a7540] dark:text-[#cbb277]">Genres</p>
              <div className="grid grid-cols-3 gap-1 px-3">
                {genres.map((genre) => (
                  <Link
                    key={genre.slug}
                    href={`/genre/${genre.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-2 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-[#f0e8d4] dark:hover:bg-white/5 dark:hover:text-amber-100 transition-colors"
                  >
                    {genre.label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

function NavLink({ href, icon, children }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-all hover:bg-[#f0e8d4] hover:text-[#8a6d1f] dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-amber-200">
      {icon}
      {children}
    </Link>
  )
}

function MobileNavLink({ href, icon, children, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-[#f0e8d4] dark:hover:bg-white/5 dark:hover:text-amber-200 transition-colors"
    >
      {icon}
      {children}
    </Link>
  )
}