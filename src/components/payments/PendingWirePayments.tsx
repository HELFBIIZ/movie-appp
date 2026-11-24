'use client';
import { useEffect, useState } from 'react';
import { recoveryResponseSchema, type RecoveryPayment } from '@/lib/payments/recovery';

export default function PendingWirePayments({
  userId,
  activeTxn,
  onResume,
}: {
  userId?: string;
  activeTxn: string;
  onResume: (payment: RecoveryPayment) => void;
}) {
  const [result, setResult] = useState<{ userId: string; payments: RecoveryPayment[] } | null>(
    null,
  );
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch('/api/payments/wire/pending', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const { ownerId, payments } = recoveryResponseSchema.parse(await response.json());
        if (!controller.signal.aborted && ownerId === userId) setResult({ userId, payments });
      } catch {
        /* The normal checkout and explicit return/status flow remain available. */
      }
    })();
    return () => controller.abort();
  }, [userId]);
  const payments =
    result && result.userId === userId
      ? result.payments.filter((payment) => payment.txnId !== activeTxn)
      : [];
  if (!payments.length) return null;
  return (
    <section
      aria-label="Өмнөх Wire төлбөрүүд"
      className="mt-5 rounded-2xl border border-white/15 p-5"
    >
      <h2 className="font-semibold">Өмнөх төлбөрөө шалгах</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Төлбөрийн хуудас хаагдсан бол эндээс үргэлжлүүлээрэй. Дахин төлөхөөсөө өмнө өмнөх хүсэлтийн
        төлөвөө шалгаарай.
      </p>
      <ul className="mt-4 space-y-4">
        {payments.map((payment) => (
          <li key={payment.txnId} className="rounded-xl bg-white/5 p-4">
            <p className="text-sm text-slate-200">
              {payment.planName} · ₮{payment.amountMnt.toLocaleString('en-US')}
            </p>
            <p className="mt-2 break-all text-xs text-slate-500">{payment.txnId}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-amber-200">
              <button type="button" onClick={() => onResume(payment)} className="underline">
                Төлөв шалгах
              </button>
              {payment.checkoutUrl && payment.status !== 'SUCCESSFUL' && (
                <a href={payment.checkoutUrl} className="underline">
                  Өмнөх төлбөрийн хуудас
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
