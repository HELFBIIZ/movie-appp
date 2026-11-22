'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { safeReturnTo } from '@/lib/safe-return';

const responseSchema = z.object({
  payment: z.object({ status: z.string() }),
  subscription: z.object({ expiresAt: z.string() }).nullable(),
  gatewayStatus: z.string().optional(),
});
export default function WirePaymentStatus({
  txn,
  returnTo,
  onNew,
}: {
  txn: string;
  returnTo: string;
  onNew?: () => void;
}) {
  const [state, setState] = useState({
    status: 'pending',
    message: 'Төлбөрийн баталгааг серверээс шалгаж байна…',
  });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    const check = async () => {
      try {
        const response = await fetch(`/api/payments/${encodeURIComponent(txn)}`, {
          cache: 'no-store',
        });
        if (stopped) return;
        if (response.status === 401) {
          setState({
            status: 'login',
            message: 'Төлбөр хийсэн бүртгэлээрээ нэвтэрч баталгааг харна уу.',
          });
          return;
        }
        if (response.status === 404) {
          setState({ status: 'error', message: 'Энэ бүртгэлд төлбөрийн хүсэлт олдсонгүй.' });
          return;
        }
        if (!response.ok) throw new Error();
        const data = responseSchema.parse(await response.json());
        if (stopped) return;
        if (data.payment.status === 'SUCCESSFUL' && data.subscription) {
          setState({
            status: 'paid',
            message: `Төлбөр баталгаажлаа. VIP эрх ${new Date(data.subscription.expiresAt).toLocaleDateString('mn-MN')} хүртэл идэвхтэй.`,
          });
          window.dispatchEvent(new Event('vxnta:session-change'));
          return;
        }
        if (
          ['FAILED', 'CANCELLED', 'REFUNDED'].includes(data.payment.status) ||
          ['canceled', 'cancelled', 'expired'].includes(data.gatewayStatus ?? '')
        ) {
          setState({
            status: 'closed',
            message:
              'Төлбөр амжилтгүй эсвэл хугацаа нь дууссан байна. Шинэ хүсэлт үүсгээд дахин оролдоно уу.',
          });
          return;
        }
        setState({
          status: 'pending',
          message: 'Төлбөр хүлээгдэж байна. Баталгаажмагц кино болон learning mode нээгдэнэ.',
        });
      } catch {
        if (!stopped)
          setState({
            status: 'error',
            message: 'Төлбөрийн баталгаа одоогоор ирсэнгүй. Дахин төлөхөөсөө өмнө шалгана уу.',
          });
      }
      if (!stopped && Date.now() - started < 300_000)
        timer = setTimeout(() => {
          void check();
        }, 5000);
    };
    void check();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [txn, retry]);
  const destination = safeReturnTo(returnTo);
  const signInReturn = `/pricing?${new URLSearchParams({ txn, returnTo: destination })}`;
  return (
    <section
      aria-label="Wire төлбөрийн төлөв"
      className="mt-5 rounded-2xl border border-amber-400/25 bg-white/5 p-5"
    >
      <h2 className="font-semibold">
        {state.status === 'paid' ? 'VIP эрх нээгдлээ' : 'Wire төлбөр'}
      </h2>
      <p role="status" className="mt-2 text-sm leading-6 text-slate-300">
        {state.message}
      </p>
      <p className="mt-2 break-all text-xs text-slate-500">Гүйлгээ: {txn}</p>
      {state.status === 'paid' ? (
        <Link
          href={destination}
          className="mt-4 inline-flex rounded-xl bg-[#c9a227] px-4 py-3 font-semibold text-slate-950"
        >
          Киногоо үзэж, суралцах →
        </Link>
      ) : state.status === 'login' ? (
        <Link
          href={`/login?next=${encodeURIComponent(signInReturn)}`}
          className="mt-4 inline-block text-amber-200 underline"
        >
          Нэвтрэх
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className="mt-4 text-amber-200 underline"
        >
          Төлбөрөө дахин шалгах
        </button>
      )}
      {state.status === 'closed' && onNew && (
        <button type="button" onClick={onNew} className="ml-4 mt-4 text-amber-200 underline">
          Шинэ төлбөрийн хүсэлт
        </button>
      )}
    </section>
  );
}
