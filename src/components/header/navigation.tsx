import Link from 'next/link';
import type { ReactNode } from 'react';

type NavLinkProps = { href: string; icon: ReactNode; children: ReactNode };

export const genres = [
  { label: 'Action', slug: 'action' },
  { label: 'Drama', slug: 'drama' },
  { label: 'Comedy', slug: 'comedy' },
  { label: 'Sci-Fi', slug: 'sci-fi' },
  { label: 'Horror', slug: 'horror' },
  { label: 'Romance', slug: 'romance' },
  { label: 'Thriller', slug: 'thriller' },
  { label: 'Adventure', slug: 'adventure' },
  { label: 'Fantasy', slug: 'fantasy' },
  { label: 'Crime', slug: 'crime' },
  { label: 'Animation', slug: 'animation' },
  { label: 'Mystery', slug: 'mystery' },
  { label: 'Documentary', slug: 'documentary' },
];

export function NavLink({ href, icon, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-all hover:bg-[#f0e8d4] hover:text-[#8a6d1f] dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-amber-200"
    >
      {icon}
      {children}
    </Link>
  );
}

export function MobileNavLink({
  href,
  icon,
  children,
  onClick,
}: NavLinkProps & { onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-[#f0e8d4] dark:hover:bg-white/5 dark:hover:text-amber-200 transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
