'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WirePaymentStatus from '@/components/payments/WirePaymentStatus';
import QPayPaymentStatus from '@/components/payments/QPayPaymentStatus';
import PendingWirePayments from '@/components/payments/PendingWirePayments';
import ReferralGiftPanel from '@/components/payments/ReferralGiftPanel';
import { safeReturnTo } from '@/lib/safe-return';
import { checkoutKey } from '@/lib/checkout-key';
import { planLabel } from '@/lib/plan-label';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [plans, setPlans] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [myRewards, setMyRewards] = useState([]);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [bankPlan, setBankPlan] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [imageData, setImageData] = useState(null);
  const [imageName, setImageName] = useState('');
  const [options, setOptions] = useState({ bank: true, qpay: false, wire: false, demo: false });
  const [returnTo, setReturnTo] = useState('/learning');
  const [pendingTxn, setPendingTxn] = useState('');
  const [pendingProvider, setPendingProvider] = useState('');
  const wireKeys = useRef({});

  useEffect(() => {
    fetch('/api/payment-options')
      .then((response) => response.json())
      .then((data) => {
        setOptions(data);
        const query = new URLSearchParams(window.location.search);
        setReturnTo(safeReturnTo(query.get('returnTo')));
        const txn = query.get('txn') || '';
        if (/^tx_[a-f0-9-]{36}$/.test(txn)) {
          setPendingTxn(txn);
          void fetch(`/api/payments/${encodeURIComponent(txn)}`, { cache: 'no-store' })
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => setPendingProvider(data?.payment?.provider ?? ''))
            .catch(() => {});
        }
      })
      .catch(() => {});
    let authController;
    const refreshMe = () => {
      authController?.abort();
      const controller = new AbortController();
      authController = controller;
      void fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!controller.signal.aborted) setMe(data?.me ?? null);
        })
        .catch(() => {});
    };
    refreshMe();
    window.addEventListener('vxnta:session-change', refreshMe);
    fetch('/api/plans')
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() =>
        setNotice({ kind: 'error', text: 'Багцуудыг ачаалж чадсангүй. Хуудсаа дахин нээнэ үү.' }),
      );
    fetch('/api/rewards')
      .then((r) => r.json())
      .then((d) => {
        setRewards(d.rewards ?? []);
        setMyRewards(d.myRewards ?? []);
      })
      .catch(() => {});
    return () => {
      authController?.abort();
      window.removeEventListener('vxnta:session-change', refreshMe);
    };
  }, []);

  async function checkout(planCode, provider) {
    if (!me) {
      router.push(
        `/login?next=${encodeURIComponent('/pricing?returnTo=' + encodeURIComponent(returnTo))}`,
      );
      return;
    }
    setBusy(`${planCode}:${provider}`);
    setNotice(null);
    try {
      if (provider === 'wire' && !wireKeys.current[planCode]) {
        const keyName = `vxnta.wire.${me.id}.${planCode}`;
        wireKeys.current[planCode] = checkoutKey(keyName);
      }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(provider === 'wire' ? { 'Idempotency-Key': wireKeys.current[planCode] } : {}),
        },
        body: JSON.stringify({ planCode, provider, returnTo }),
      });
      const data = await res.json();
      setBusy(null);
      if (!res.ok) {
        if (data.payment?.txnId) {
          setPendingTxn(data.payment.txnId);
          setPendingProvider(data.payment.provider || provider);
        }
        setNotice({
          kind: 'error',
          text:
            provider === 'wire'
              ? 'Wire төлбөрийн хуудас нээгдсэнгүй. Төлбөрийн төлөвөө шалгаад дахин оролдоно уу.'
              : `${data.error?.code ?? 'CHECKOUT_FAILED'}`,
        });
        return;
      }
      if (data.payment?.txnId) {
        setPendingTxn(data.payment.txnId);
        setPendingProvider(data.payment.provider || provider);
      }
      if (data.subscription) {
        setNotice({
          kind: 'ok',
          text: `VIP active until ${new Date(data.subscription.expiresAt).toLocaleDateString()} · ${data.payment.txnId}`,
        });
        const fresh = await (await fetch('/api/auth/me')).json();
        setMe(fresh.me ?? null);
      } else if (data.wire?.checkoutUrl) {
        setPendingTxn(data.payment.txnId);
        window.location.assign(data.wire.checkoutUrl);
      } else if (data.payment?.status === 'SUCCESSFUL') {
        setPendingTxn(data.payment.txnId);
      } else if (data.qpay?.url) {
        setNotice({
          kind: 'ok',
          text: 'Invoice ready — open the QPay link to pay, then it activates automatically.',
        });
        window.open(data.qpay.url, '_blank');
      } else {
        setNotice({
          kind: 'ok',
          text: data.note || 'Payment recorded as PENDING (no gateway configured for sandbox).',
        });
      }
    } catch {
      setNotice({
        kind: 'error',
        text: 'Холболт тасарлаа. Төлбөрийн төлөвөө шалгаад дахин оролдоно уу.',
      });
    } finally {
      setBusy(null);
    }
  }

  async function redeem(code) {
    if (!me) {
      router.push('/login?next=%2Fpricing');
      return;
    }
    setBusy(`redeem:${code}`);
    setNotice(null);
    try {
      const res = await fetch('/api/actions/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({
          kind: 'error',
          text: data.error?.needed
            ? `${data.error.needed} XP хэрэгтэй байна.`
            : 'Урамшуулал авах боломжгүй байна. Дахин оролдоно уу.',
        });
        return;
      }
      setNotice({
        kind: 'ok',
        text: `${data.reward.name} авлаа. Үлдэгдэл: ${data.xpBalance} XP.`,
      });
      const fresh = await (await fetch('/api/auth/me')).json();
      setMe(fresh.me ?? null);
      const rw = await (await fetch('/api/rewards')).json();
      setMyRewards(rw.myRewards ?? []);
    } catch {
      setNotice({ kind: 'error', text: 'Холболт тасарлаа. Үлдэгдлээ шалгаад дахин оролдоно уу.' });
    } finally {
      setBusy(null);
    }
  }

  const bankPlans = plans.filter((p) => p.priceMnt > 0);
  const selectedBankPlan = bankPlans.find((p) => p.code === bankPlan);

  function onFile(e) {
    const file = e.target.files?.[0];
    setImageData(null);
    setImageName('');
    if (!file) return;
    if (file.size > 1_500_000) {
      setNotice({ kind: 'error', text: 'Баримтын зураг 1.5 MB-аас бага байх ёстой.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function submitBank() {
    if (!me) {
      router.push('/login?next=%2Fpricing');
      return;
    }
    if (!bankPlan || !phone.trim()) {
      setNotice({ kind: 'error', text: 'Багцаа сонгоод утасны дугаараа оруулна уу.' });
      return;
    }
    setBusy('bank');
    setNotice(null);
    try {
      const res = await fetch('/api/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCode: bankPlan,
          phone: phone.trim(),
          note: note.trim() || null,
          imageData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({
          kind: 'error',
          text: 'Баримт илгээгдсэнгүй. Мэдээллээ шалгаад дахин оролдоно уу.',
        });
        return;
      }
      setNotice({
        kind: 'ok',
        text: `Баримт илгээгдлээ (${data.receipt.txnId}). Админ шалгаж баталгаажуулсны дараа VIP эрх нээгдэнэ.`,
      });
      setImageData(null);
      setImageName('');
      setPhone('');
      setNote('');
    } catch {
      setNotice({ kind: 'error', text: 'Холболт тасарлаа. Баримтаа дахин илгээнэ үү.' });
    } finally {
      setBusy(null);
    }
  }

  const fmt = (mnt) => `₮${mnt.toLocaleString('en-US')}`;

  return (
    <main className="min-h-screen bg-slate-950 text-white page-enter">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold md:text-4xl gradient-text">VIP эрхээ нээх</h1>
        <p className="mt-3 text-sm text-slate-400">
          Багцаа сонгоод кино үзэж, хадмалаас нь үг сураарай.
        </p>
        <p className="mt-2 text-xs text-amber-200">
          Заргүй үзэх · өндөр чанартай дүрс · хадмалтай үг сурах · үзсэн киногоо коммент хийх
        </p>

        {me && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
            <span>@{me.username}</span>
            <span className="text-amber-300">
              ◆ {me.xp} XP · Lv {me.level} · {me.rank ?? 'Шинэ үзэгч'}
            </span>
            <span className={me.streakDays > 0 ? 'text-emerald-300' : 'text-slate-400'}>
              🔥 {me.streakDays}-day streak
            </span>
            <span>
              {me.subscription
                ? `✓ ${me.subscription.planName} until ${new Date(me.subscription.expiresAt).toLocaleDateString()}`
                : '— no active subscription'}
            </span>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className={`mt-4 rounded-2xl border p-3 text-sm ${notice.kind === 'ok' ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300' : 'border-red-700 bg-red-950/40 text-red-300'}`}
          >
            {notice.text}
          </div>
        )}
        <PendingWirePayments
          userId={me?.id}
          activeTxn={pendingTxn}
          onResume={(payment) => {
            setPendingTxn(payment.txnId);
            setPendingProvider('wire');
            setReturnTo(payment.returnTo);
            const query = new URLSearchParams({ txn: payment.txnId, returnTo: payment.returnTo });
            window.history.replaceState(null, '', `/pricing?${query}`);
          }}
        />
        {pendingTxn &&
          (pendingProvider === 'qpay' ? (
            <QPayPaymentStatus
              key={`${me?.id ?? 'guest'}:${pendingTxn}`}
              txn={pendingTxn}
              returnTo={returnTo}
              onNew={() => {
                setPendingTxn('');
                setPendingProvider('');
                setNotice(null);
              }}
            />
          ) : (
            <WirePaymentStatus
              key={`${me?.id ?? 'guest'}:${pendingTxn}`}
              txn={pendingTxn}
              returnTo={returnTo}
              onNew={() => {
                wireKeys.current = {};
                for (const plan of plans) {
                  try {
                    sessionStorage.removeItem(`vxnta.wire.${me?.id}.${plan.code}`);
                  } catch {
                    /* In-memory retries remain available. */
                  }
                }
                setPendingTxn('');
                setPendingProvider('');
                setNotice(null);
              }}
            />
          ))}
        {!options.wire && (
          <p className="mt-4 text-sm text-slate-400">
            Wire төлбөр одоогоор боломжгүй байна. Банкны шилжүүлгийн хэсгийг ашиглаж болно.
          </p>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">VIP эрхийн багцууд</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <div key={p.code} className="luxe-card rounded-2xl p-5">
                <div className="mt-1 text-lg font-semibold break-words">{planLabel(p)}</div>
                <div className="mt-2 text-2xl font-bold gradient-text inline-block">
                  {fmt(p.priceMnt)}
                </div>
                <div className="text-sm text-slate-400">
                  {p.durationDays} хоног · кино, хэл сурах
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {options.demo && (
                    <button
                      disabled={busy === `${p.code}:local_dev`}
                      onClick={() => checkout(p.code, 'local_dev')}
                      className="rounded-xl bg-gradient-to-r from-[#c9a227] via-[#e7c779] to-[#c9a227] px-4 py-2 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110 shadow-[0_8px_24px_-8px_rgba(214,180,86,0.45)] disabled:opacity-50 disabled:shadow-none"
                    >
                      {busy === `${p.code}:local_dev` ? 'Activating…' : 'Buy with card (demo)'}
                    </button>
                  )}
                  <button
                    disabled={Boolean(busy) || !options.wire}
                    onClick={() => checkout(p.code, 'wire')}
                    className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-300 transition-all hover:border-emerald-400 hover:bg-emerald-900/40 hover:text-white disabled:opacity-50"
                  >
                    {busy === `${p.code}:wire`
                      ? 'Төлбөр бэлдэж байна…'
                      : `Онлайнаар төлөх ${fmt(p.priceMnt)}`}
                  </button>
                  {options.qpay && (
                    <button
                      disabled={Boolean(busy) || !options.qpay}
                      onClick={() => checkout(p.code, 'qpay')}
                      className="rounded-xl border border-[#d6b456]/40 bg-black/20 px-4 py-2 text-sm font-medium text-gold-soft transition-all hover:border-[#e7c779] hover:bg-[#c9a227]/10 hover:text-white disabled:opacity-50"
                    >
                      {busy === `${p.code}:qpay` ? '…' : `QPay-ээр төлөх ${fmt(p.priceMnt)}`}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <details className="mt-10 rounded-2xl border border-white/10 p-5">
          <summary className="cursor-pointer text-lg font-semibold">Банкны шилжүүлэг</summary>
          <p className="mt-1 text-sm text-slate-400">
            Дансанд багцын төлбөрөө шилжүүлээд баримтаа илгээнэ. Админ шалгасны дараа эрх нээгдэнэ.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-slate-900 p-5">
              <div className="text-xs uppercase tracking-wider text-amber-400">Хаан банк</div>
              <div className="mt-3 text-sm text-slate-300">Хүлээн авагч</div>
              <div className="text-2xl font-black tracking-wide text-white">Taivanbaatar</div>
              <div className="mt-3 text-sm text-slate-300">Дансны дугаар</div>
              <div className="select-all rounded-lg bg-black/40 px-3 py-2 font-mono text-sm font-semibold text-amber-300">
                MN550005005771031864
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-slate-400">Багц</span>
                  <select
                    value={bankPlan}
                    onChange={(e) => setBankPlan(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/60"
                  >
                    <option value="">Багцаа сонгох</option>
                    {bankPlans.map((p) => (
                      <option key={p.code} value={p.code}>
                        {planLabel(p)} — {fmt(p.priceMnt)} / {p.durationDays} хоног
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-slate-400">Утасны дугаар</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9988 1234"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/60"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-slate-400">Гүйлгээний дугаар, тайлбар</span>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={280}
                    placeholder="Гүйлгээний дугаар эсвэл хэрэглэгчийн нэр"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/60"
                  />
                </label>
                <div className="sm:col-span-2">
                  <span className="text-sm text-slate-400">Баримтын зураг</span>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-amber-500/50 hover:text-white">
                      {imageName || 'Зураг сонгох'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={onFile}
                        className="hidden"
                      />
                    </label>
                    {imageData && (
                      // eslint-disable-next-line @next/next/no-img-element -- Preserve existing external/receipt image sizing and loading behavior.
                      <img
                        src={imageData}
                        alt="Баримтын зураг"
                        className="h-14 w-14 rounded-lg border border-slate-700 object-cover"
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-400">
                  {selectedBankPlan
                    ? `${fmt(selectedBankPlan.priceMnt)} · ${selectedBankPlan.durationDays} хоногийн VIP`
                    : 'Багцаа сонгоно уу.'}
                </div>
                <button
                  disabled={Boolean(busy)}
                  onClick={submitBank}
                  className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-300 disabled:opacity-50"
                >
                  {busy === 'bank' ? 'Илгээж байна…' : 'Баримт илгээх'}
                </button>
              </div>
            </div>
          </div>
        </details>

        <details className="mt-6 rounded-2xl border border-white/10 p-5">
          <summary className="cursor-pointer text-lg font-semibold">
            Оноогоор урамшуулал авах
          </summary>
          <p className="mt-1 text-sm text-slate-400">
            Кино үзэж, үнэлгээ өгч цуглуулсан XP оноогоо ашиглаарай.
          </p>
          {!me ? (
            <p className="mt-3 text-sm text-slate-400">
              <Link href="/login" className="text-[#c9a227] hover:underline dark:text-amber-200">
                Нэвтрэх
              </Link>{' '}
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((r) => {
              const owned = myRewards.some((m) => m.code === r.code);
              // VIP passes are consumable — re-buyable after expiry; cosmetics stay one-time.
              const reusable = r.type === 'feature' && (r.days || 0) > 0;
              const locked = owned && !reusable;
              const tooPoor = me && !locked && me.xp < r.xpPrice;
              return (
                <div
                  key={r.code}
                  className={`rounded-2xl border p-5 ${owned && !reusable ? 'border-emerald-700 bg-emerald-950/30' : 'border-slate-800 bg-slate-900'}`}
                >
                  <div className="text-xs uppercase tracking-wider text-amber-300">{r.type}</div>
                  <div className="mt-1 font-semibold">{r.name}</div>
                  <div className="mt-1 text-sm text-slate-400">{r.description}</div>
                  {r.days > 0 && (
                    <div className="mt-1 text-sm text-gold-soft">
                      VIP +{r.days} days{owned ? ' · дахин авч сунгаж болно' : ''}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-amber-300 font-semibold">◆ {r.xpPrice} XP</span>
                    <button
                      disabled={Boolean(busy) || locked || tooPoor}
                      onClick={() => redeem(r.code)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-40 ${locked ? 'bg-emerald-700 text-white' : 'bg-amber-400 text-slate-900 hover:bg-amber-300'}`}
                    >
                      {locked ? 'Авсан ✓' : owned ? 'Сунгах' : 'Авах'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </details>

        <ReferralGiftPanel xp={me?.xp ?? 0} />
      </div>
      <Footer />
    </main>
  );
}
