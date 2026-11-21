import Link from 'next/link';
import {
  Film,
  Home,
  ListVideo,
  Calendar,
  Star,
  Tv2,
  Mountain,
  LifeBuoy,
  LogOut,
  User,
} from 'lucide-react';
import { genres, MobileNavLink } from './navigation';
type Props = {
  isAdmin: boolean;
  isLoggedIn: boolean;
  onClose: () => void;
  onLogout: () => Promise<void>;
};
export default function MobileNavigation({ isAdmin, isLoggedIn, onClose, onLogout }: Props) {
  return (
    <div className="lg:hidden border-t bg-[#faf7f1] dark:bg-[#0f0c09] dark:border-black/70 animate-fade-in-down">
      <nav className="container px-4 py-3 flex flex-col gap-1">
        <MobileNavLink href="/" icon={<Home className="h-4 w-4" />} onClick={() => onClose()}>
          Home
        </MobileNavLink>
        <MobileNavLink href="/movies" icon={<Film className="h-4 w-4" />} onClick={() => onClose()}>
          All Movies
        </MobileNavLink>
        <MobileNavLink
          href="/movies?category=upcoming"
          icon={<Calendar className="h-4 w-4" />}
          onClick={() => onClose()}
        >
          New Releases
        </MobileNavLink>
        <MobileNavLink
          href="/movies?category=top-rated"
          icon={<Star className="h-4 w-4" />}
          onClick={() => onClose()}
        >
          Top Rated
        </MobileNavLink>
        <MobileNavLink
          href="/movies?category=kdrama"
          icon={<Tv2 className="h-4 w-4" />}
          onClick={() => onClose()}
        >
          K-Dramas
        </MobileNavLink>
        <MobileNavLink
          href="/movies?category=western"
          icon={<Mountain className="h-4 w-4" />}
          onClick={() => onClose()}
        >
          Western
        </MobileNavLink>
        <MobileNavLink
          href="/watchlist"
          icon={<ListVideo className="h-4 w-4" />}
          onClick={() => onClose()}
        >
          Watchlist
        </MobileNavLink>
        <MobileNavLink
          href="/help"
          icon={<LifeBuoy className="h-4 w-4" />}
          onClick={() => onClose()}
        >
          Тусламж
        </MobileNavLink>
        {isAdmin && (
          <MobileNavLink
            href="/admin"
            icon={<Film className="h-4 w-4" />}
            onClick={() => onClose()}
          >
            Admin
          </MobileNavLink>
        )}
        {isLoggedIn ? (
          <>
            <MobileNavLink
              href="/profile"
              icon={<User className="h-4 w-4" />}
              onClick={() => onClose()}
            >
              Profile
            </MobileNavLink>
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors w-full text-left"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </>
        ) : (
          <MobileNavLink
            href="/login"
            icon={<LogOut className="h-4 w-4" />}
            onClick={() => onClose()}
          >
            Sign In
          </MobileNavLink>
        )}
        <div className="mt-2 pt-2 border-t border-[#e5dcc7] dark:border-black/60">
          <p className="px-3 py-1 text-xs font-medium text-[#8a7540] dark:text-[#cbb277]">Genres</p>
          <div className="grid grid-cols-3 gap-1 px-3">
            {genres.map((genre) => (
              <Link
                key={genre.slug}
                href={`/genre/${genre.slug}`}
                onClick={() => onClose()}
                className="rounded-lg px-2 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-[#f0e8d4] dark:hover:bg-white/5 dark:hover:text-amber-100 transition-colors"
              >
                {genre.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
