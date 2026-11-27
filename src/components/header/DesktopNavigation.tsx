import { Film, Bookmark, LifeBuoy } from 'lucide-react';
import Link from 'next/link';
import { NavLink } from './navigation';
import BrowseMenu from './BrowseMenu';

export default function DesktopNavigation() {
  return (
    <nav aria-label="Үндсэн цэс" className="hidden items-center gap-1 lg:flex">
      <NavLink href="/movies" icon={<Film size={17} aria-hidden="true" />}>
        Кино
      </NavLink>
      <BrowseMenu />
      <NavLink href="/watchlist" icon={<Bookmark size={17} aria-hidden="true" />}>
        Жагсаалт
      </NavLink>
      <Link
        href="/help"
        aria-label="Тусламж"
        title="Тусламж"
        className="ml-1 rounded-xl p-2.5 text-slate-500 hover:bg-[#c9a227]/10 dark:text-slate-400"
      >
        <LifeBuoy size={18} />
      </Link>
    </nav>
  );
}
