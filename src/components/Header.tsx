'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <Film className="h-6 w-6 text-gold group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(214,180,86,0.5)]" />
            <span className="font-display text-2xl tracking-[0.16em] gradient-text group-hover:drop-shadow-[0_0_14px_rgba(231,199,121,0.35)] transition-[filter]">
              VXNTA
            </span>
          </Link>

          <DesktopNavigation isAdmin={isAdmin} />
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

          <AccountControls isLoggedIn={isLoggedIn} handleLogout={handleLogout} />

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-[#8a7540] dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <MobileNavigation
          isAdmin={isAdmin}
          isLoggedIn={isLoggedIn}
          onClose={() => setMobileOpen(false)}
          onLogout={handleLogout}
        />
      )}
    </header>
  );
}
