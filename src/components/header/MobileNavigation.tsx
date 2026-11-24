'use client';
import { useEffect, useRef } from 'react';
import {
  Film,
  Bookmark,
  BookOpen,
  LifeBuoy,
  LogOut,
  Settings,
  User,
  ChevronDown,
} from 'lucide-react';
import { MobileNavLink } from './navigation';
import { BrowseLinks } from './BrowseMenu';

type Props = {
  isAdmin: boolean;
  isLoggedIn: boolean;
  onClose: () => void;
  onLogout: () => Promise<void>;
};
export default function MobileNavigation({ isAdmin, isLoggedIn, onClose, onLogout }: Props) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        document.getElementById('mobile-menu-toggle')?.focus();
      }
    }
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose]);
  return (
    <div
      ref={root}
      id="mobile-navigation"
      className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-[#c9a227]/15 bg-[#faf7f1] shadow-xl lg:hidden dark:bg-[#110e0a]"
    >
      <nav aria-label="Утасны цэс" className="container space-y-3 px-4 py-4">
        <div className="grid grid-cols-3 gap-2 [&_a]:flex-col [&_a]:justify-center [&_a]:gap-2 [&_a]:bg-[#c9a227]/10 [&_a]:py-4">
          <MobileNavLink href="/movies" icon={<Film size={21} />} onClick={onClose}>
            Кино
          </MobileNavLink>
          <MobileNavLink href="/learning" icon={<BookOpen size={21} />} onClick={onClose}>
            Миний үг
          </MobileNavLink>
          <MobileNavLink href="/watchlist" icon={<Bookmark size={21} />} onClick={onClose}>
            Жагсаалт
          </MobileNavLink>
        </div>
        <details className="rounded-xl border border-[#c9a227]/15">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
            Киноны ангилал <ChevronDown size={16} />
          </summary>
          <div className="px-2 pb-2">
            <BrowseLinks onSelect={onClose} />
          </div>
        </details>
        <div className="grid grid-cols-2 gap-1">
          <MobileNavLink href="/help" icon={<LifeBuoy size={17} />} onClick={onClose}>
            Тусламж
          </MobileNavLink>
          {isLoggedIn && (
            <MobileNavLink href="/profile" icon={<User size={17} />} onClick={onClose}>
              Миний бүртгэл
            </MobileNavLink>
          )}
          {isAdmin && (
            <MobileNavLink href="/admin" icon={<Settings size={17} />} onClick={onClose}>
              Удирдлага
            </MobileNavLink>
          )}
          {isLoggedIn && (
            <button
              type="button"
              onClick={() => {
                void onLogout();
                onClose();
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500"
            >
              <LogOut size={17} />
              Гарах
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
