import Link from 'next/link';
import { LogOut, User, BookOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
type Props = { isLoggedIn: boolean; handleLogout: () => Promise<void> };
export default function AccountControls({ isLoggedIn, handleLogout }: Props) {
  return (
    <>
      <Link
        href="/learning"
        aria-label="Миний сургалтын ахиц"
        className="rounded-lg p-2 text-[#c9a227] hover:bg-white/5"
      >
        <BookOpen className="h-5 w-5" />
      </Link>
      {isLoggedIn ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-slate-500 dark:text-slate-400">
              <User className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>
              <Link href="/profile" className="flex items-center gap-2 w-full">
                <User className="h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-red-400">
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link
          href="/login"
          className="rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-bold text-[#1a150b] hover:bg-[#d6b456] transition-colors"
        >
          Sign In
        </Link>
      )}
    </>
  );
}
