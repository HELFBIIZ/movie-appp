import Link from 'next/link';
import type { WatchGate } from '@/types/api';
type Props = { showMoviePlayer: boolean; gate: WatchGate };
export default function WatchAccessGate({ showMoviePlayer, gate }: Props) {
  return (
    <>
      {showMoviePlayer && gate.status === 'loading' && (
        <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 animate-scale-in">
          <p className="animate-pulse text-slate-400">Checking your access…</p>
        </div>
      )}
      {showMoviePlayer && gate.status === 'blocked' && (
        <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 px-6 text-center animate-scale-in">
          <p className="text-2xl">🔒</p>
          <h2 className="mt-2 text-xl font-semibold">
            {gate.statusCode === 401
              ? 'Кино үзэхийн тулд нэвтэрнэ үү'
              : 'Кино үзэхэд VIP эрх хэрэгтэй'}
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            {gate.statusCode === 401
              ? 'Sign in to your account to continue.'
              : 'You need an active subscription to watch this title.'}
          </p>
          <div className="mt-5 flex gap-3">
            {gate.statusCode === 401 ? (
              <Link
                href="/login"
                className="rounded-xl bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-5 py-2.5 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110"
              >
                Нэвтрэх
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="rounded-xl bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-5 py-2.5 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110"
              >
                VIP эрх авах
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
