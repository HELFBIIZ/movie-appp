import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  Film,
  ListVideo,
  Calendar,
  Star,
  Tv2,
  Mountain,
  LifeBuoy,
} from 'lucide-react';
import { genres, NavLink } from './navigation';
export default function DesktopNavigation({ isAdmin }: { isAdmin: boolean }) {
  return (
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

      <NavLink href="/movies" icon={<Film className="h-4 w-4" />}>
        Movies
      </NavLink>
      <NavLink href="/movies?category=upcoming" icon={<Calendar className="h-4 w-4" />}>
        New Releases
      </NavLink>
      <NavLink href="/movies?category=top-rated" icon={<Star className="h-4 w-4" />}>
        Top Rated
      </NavLink>
      <NavLink href="/movies?category=kdrama" icon={<Tv2 className="h-4 w-4" />}>
        K-Dramas
      </NavLink>
      <NavLink href="/movies?category=western" icon={<Mountain className="h-4 w-4" />}>
        Western
      </NavLink>
      <NavLink href="/watchlist" icon={<ListVideo className="h-4 w-4" />}>
        Watchlist
      </NavLink>
      <NavLink href="/help" icon={<LifeBuoy className="h-4 w-4" />}>
        Тусламж
      </NavLink>
      {isAdmin && (
        <NavLink href="/admin" icon={<Film className="h-4 w-4" />}>
          Admin
        </NavLink>
      )}
    </nav>
  );
}
