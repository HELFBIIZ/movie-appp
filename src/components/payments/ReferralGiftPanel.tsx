'use client';

import { useCallback, useEffect, useState } from 'react';

type Referral = {
  code: string;
  count: number;
  invited: { username: string; createdAt: string }[];
};

const GIFTS = [
  { days: 7, xp: 2000 },
  { days: 30, xp: 5000 },
  { days: 90, xp: 12000 },
  { days: 365, xp: 40000 },
];

export default function ReferralGiftPanel({ xp }: { xp: number }) {
  const [referral, setReferral] = useState<Referral | null>(null);
  const [claimCode, setClaimCode] = useState('');
  const [recipient, setRecipient] = useState('');
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/referrals', { credentials: 'include' });
      const data = await response.json();
      if (response.ok) setReferral(data.referral);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/referrals', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.referral) setReferral(data.referral);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function claim(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!claimCode.trim() || busy) return;
    setBusy('claim');
    setNotice(null);
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: claimCode }),
      });
      const data = await response.json();
      setNotice({
        ok: response.ok,
        text: response.ok
          ? `Код идэвхжлээ. +${data.xp} XP олгогдлоо.`
          : data.error?.code === 'REFERRAL_ALREADY_CLAIMED'
            ? 'Та урьдчилсан код аль хэдийн идэвхжүүлсэн.'
            : 'Код буруу эсвэл хүчингүй.',
      });
      if (response.ok) {
        setClaimCode('');
        await load();
      }
    } catch {
      setNotice({ ok: false, text: 'Холболт тасарлаа.' });
    } finally {
      setBusy(null);
    }
  }

  async function gift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipient.trim() || busy) return;
    setBusy('gift');
    setNotice(null);
    try {
      const response = await fetch('/api/vip/gift', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, days }),
      });
      const data = await response.json();
      setNotice({
        ok: response.ok,
        text: response.ok
          ? `@${data.recipient} хэрэглэгчид ${data.days} хоногийн VIP бэлэглэлээ.`
          : data.error?.code === 'XP_INSUFFICIENT'
            ? 'XP үлдэгдэл хүрэлцэхгүй.'
            : 'Бэлэг илгээгдсэнгүй. Хэрэглэгчийн нэр шалгана уу.',
      });
      if (response.ok) setRecipient('');
    } catch {
      setNotice({ ok: false, text: 'Холболт тасарлаа.' });
    } finally {
      setBusy(null);
    }
  }

  const giftCost = GIFTS.find((item) => item.days === days)?.xp ?? 2000;

  return (
    <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6">
      <h2 className="text-xl font-semibold text-white">Найзаа урьж, VIP бэлэглээрэй</h2>
      <p className="mt-2 text-sm text-slate-400">
        Найзаа урьсан хэрэглэгч бүрт та болон таны найз 500 XP авна. XP-ээр бусдад VIP хоног
        бэлэглэх боломжтой.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="font-semibold text-amber-200">Миний урилгын код</h3>
          {referral ? (
            <>
              <code className="mt-2 inline-block rounded-lg bg-slate-800 px-3 py-2 text-lg tracking-wider text-white">
                {referral.code}
              </code>
              <p className="mt-2 text-xs text-slate-400">
                {referral.count} найз нэгдсэн
                {referral.invited.length ? ` · сүүлийнх: @${referral.invited[0].username}` : ''}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Нэвтэрсний дараа код харагдана.</p>
          )}
          <form onSubmit={claim} className="mt-4 flex flex-wrap gap-2">
            <input
              value={claimCode}
              onChange={(event) => setClaimCode(event.target.value.toUpperCase())}
              maxLength={16}
              placeholder="VX-XXXXXXXX"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={busy === 'claim' || !claimCode.trim()}
              className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-40"
            >
              {busy === 'claim' ? 'Идэвхжүүлж байна…' : 'Код ашиглах'}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="font-semibold text-amber-200">VIP бэлэг</h3>
          <form onSubmit={gift} className="mt-3 space-y-3">
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              maxLength={100}
              placeholder="Хүлээн авагчийн хэрэглэгчийн нэр эсвэл имэйл"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
            />
            <div className="flex flex-wrap gap-2">
              {GIFTS.map((item) => (
                <button
                  key={item.days}
                  type="button"
                  onClick={() => setDays(item.days)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    days === item.days
                      ? 'bg-amber-400 text-slate-900'
                      : 'border border-slate-700 text-slate-300'
                  }`}
                >
                  {item.days} хоног · {item.xp.toLocaleString('en-US')} XP
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={busy === 'gift' || !recipient.trim() || xp < giftCost}
              className="w-full rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-40"
            >
              {xp < giftCost
                ? `${giftCost.toLocaleString('en-US')} XP хэрэгтэй`
                : busy === 'gift'
                  ? 'Илгээж байна…'
                  : 'Бэлэг илгээх'}
            </button>
          </form>
        </div>
      </div>

      {notice && (
        <p className={`mt-4 text-sm ${notice.ok ? 'text-emerald-300' : 'text-amber-300'}`}>
          {notice.text}
        </p>
      )}
    </section>
  );
}
