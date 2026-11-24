'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Film, Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import NotificationBell from '@/components/NotificationBell';
import { sessionIndicatorSchema } from '@/lib/contracts';
import DesktopNavigation from './header/DesktopNavigation';
import MobileNavigation from './header/MobileNavigation';
import AccountControls from './header/AccountControls';

export default function Header() {
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const closeMenu = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((value: unknown) => {
        const d = sessionIndicatorSchema.parse(value);
        if (d.me) {
          setIsLoggedIn(true);
          const code = d.me.roleCode;
          if (code === 'ADMIN' || code === 'SUPER_ADMIN') setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsLoggedIn(false);
    setIsAdmin(false);
    window.dispatchEvent(new Event('vxnta:session-change'));
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur supports-[backdrop-filter]:bg-white/90 bg-[#faf7f1]/95 border-[#e5dcc7] dark:bg-[#110e0a]/92 dark:border-black/60 supports-[backdrop-filter]:dark:bg-[#110e0a]/80">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <Film className="hidden h-6 w-6 text-gold transition-transform group-hover:scale-110 sm:block" />
            <span className="font-display text-xl tracking-[0.12em] gradient-text lg:text-2xl">
              VXNTA
            </span>
          </Link>

          <DesktopNavigation />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
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

          <AccountControls isLoggedIn={isLoggedIn} isAdmin={isAdmin} handleLogout={handleLogout} />

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-[#8a7540] dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
            id="mobile-menu-toggle"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <MobileNavigation
          isAdmin={isAdmin}
          isLoggedIn={isLoggedIn}
          onClose={closeMenu}
          onLogout={handleLogout}
        />
      )}
    </header>
  );
}
