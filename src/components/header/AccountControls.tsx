import Link from 'next/link';
import { LogOut, User, BookOpen, Settings, Film } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
type Props = { isLoggedIn: boolean; isAdmin: boolean; handleLogout: () => Promise<void> };
export default function AccountControls({ isLoggedIn, isAdmin, handleLogout }: Props) {
  return (
    <>
      <Link
        href="/learning"
        aria-label="Миний сургалтын ахиц"
        title="Миний үг"
        className="hidden rounded-lg p-2 text-[#c9a227] hover:bg-white/5 lg:block"
      >
        <BookOpen className="h-5 w-5" />
      </Link>
      {isLoggedIn ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Миний бүртгэл"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-slate-500 dark:text-slate-400"
            >
              <User className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {isAdmin && (
              <>
                <DropdownMenuItem>
                  <Link href="/admin" className="flex w-full items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Удирдлага
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/admin/movie-requests" className="flex w-full items-center gap-2">
                    <Film className="h-4 w-4" />
                    Киноны хүсэлтүүд
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem>
              <Link href="/profile" className="flex items-center gap-2 w-full">
                <User className="h-4 w-4" /> Миний бүртгэл
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-red-400">
              <LogOut className="h-4 w-4 mr-2" /> Гарах
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link
          href="/login"
          className="rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-bold text-[#1a150b] hover:bg-[#d6b456] transition-colors"
        >
          Нэвтрэх
        </Link>
      )}
    </>
  );
}
