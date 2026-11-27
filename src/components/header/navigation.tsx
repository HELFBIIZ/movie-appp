import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type NavLinkProps = { href: string; icon: ReactNode; children: ReactNode };

export const genres = [
  { label: 'Адал явдалт', slug: 'action' },
  { label: 'Драм', slug: 'drama' },
  { label: 'Инээдмийн', slug: 'comedy' },
  { label: 'Шинжлэх ухааны', slug: 'sci-fi' },
  { label: 'Аймшгийн', slug: 'horror' },
  { label: 'Хайр дурлалын', slug: 'romance' },
  { label: 'Түгшүүрт', slug: 'thriller' },
  { label: 'Аялал, адал явдал', slug: 'adventure' },
  { label: 'Зөгнөлт', slug: 'fantasy' },
  { label: 'Гэмт хэргийн', slug: 'crime' },
  { label: 'Хүүхэлдэйн', slug: 'animation' },
  { label: 'Нууцлаг', slug: 'mystery' },
  { label: 'Баримтат', slug: 'documentary' },
];

export const collections = [
  { label: 'Шинээр гарах', href: '/movies?category=upcoming' },
  { label: 'Өндөр үнэлгээтэй', href: '/movies?category=top-rated' },
  { label: 'Солонгос цуврал', href: '/movies?category=kdrama' },
  { label: 'Өрнөдийн кино', href: '/movies?category=western' },
];

export function NavLink({ href, icon, children }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || (href === '/movies' && pathname.startsWith('/genre/'));
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-[#c9a227]/15 text-[#8a6d1f] dark:text-amber-200' : 'text-slate-600 hover:bg-[#c9a227]/10 dark:text-slate-300'}`}
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
