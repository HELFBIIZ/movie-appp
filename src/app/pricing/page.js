'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function PricingPage() {
  const [me, setMe] = useState(null)
  const [plans, setPlans] = useState([])
  const [rewards, setRewards] = useState([])
  const [myRewards, setMyRewards] = useState([])
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const [paymentOptions, setPaymentOptions] = useState(null)
  const [bankPlan, setBankPlan] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [imageData, setImageData] = useState(null)
  const [imageName, setImageName] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => setMe(d?.me ?? null))
    fetch('/api/plans').then((r) => r.json()).then((d) => setPlans(d.plans ?? []))
    fetch('/api/rewards').then((r) => r.json()).then((d) => {
      setRewards(d.rewards ?? [])
      setMyRewards(d.myRewards ?? [])
    })
    fetch('/api/payment-options').then((r) => (r.ok ? r.json() : {})).then(setPaymentOptions)
  }, [])

  async function checkout(planCode, provider) {
    setBusy(`${planCode}:${provider}`)
    setNotice(null)
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planCode, provider }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) {
      setNotice({ kind: 'error', text: `${data.error?.code ?? 'CHECKOUT_FAILED'}${data.error?.retryAfterSeconds ? ` (retry in ${data.error.retryAfterSeconds}s)` : ''}` })
      return
    }
    if (data.subscription) {
      setNotice({ kind: 'ok', text: `VIP active until ${new Date(data.subscription.expiresAt).toLocaleDateString()} · ${data.payment.txnId}` })
      const fresh = await (await fetch('/api/auth/me')).json()
      setMe(fresh.me ?? null)
    } else if (data.qpay?.url) {
      setNotice({ kind: 'ok', text: 'Invoice ready — open the QPay link to pay, then it activates automatically.' })
      window.open(data.qpay.url, '_blank')
    } else {
      setNotice({ kind: 'ok', text: data.note || 'Payment recorded as PENDING (no gateway configured for sandbox).' })
    }
  }

  async function redeem(code) {
    setBusy(`redeem:${code}`)
    setNotice(null)
    const res = await fetch('/api/actions/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardCode: code }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) {
      setNotice({ kind: 'error', text: `${data.error?.code ?? 'REDEEM_FAILED'}${data.error?.needed ? ` — need ${data.error.needed} XP` : ''}` })
      return
    }
    setNotice({ kind: 'ok', text: `Unlocked ${data.reward.name} (-${data.reward ? '' : ''}XP, balance ${data.xpBalance})` })
    const fresh = await (await fetch('/api/auth/me')).json()
    setMe(fresh.me ?? null)
    const rw = await (await fetch('/api/rewards')).json()
    setMyRewards(rw.myRewards ?? [])
  }

  const bankPlans = plans.filter((p) => p.code === 'WEEKLY' || /^MONTHLY_\d+$/.test(p.code))
  const selectedBankPlan = bankPlans.find((p) => p.code === bankPlan)

  function onFile(e) {
    const file = e.target.files?.[0]
    setImageData(null)
    setImageName('')
    if (!file) return
    if (file.size > 1_500_000) {
      setNotice({ kind: 'error', text: 'Receipt screenshot must be under 1.5 MB.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => { setImageData(reader.result); setImageName(file.name) }
    reader.readAsDataURL(file)
  }

  async function submitBank() {
    if (!bankPlan || !phone.trim()) {
      setNotice({ kind: 'error', text: 'Pick a plan and enter your phone number.' })
      return
    }
    setBusy('bank')
    setNotice(null)
    const res = await fetch('/api/payments/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planCode: bankPlan, phone: phone.trim(), note: note.trim() || null, imageData }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) {
      setNotice({ kind: 'error', text: data.error?.code ?? 'SUBMIT_FAILED' })
      return
    }
    setNotice({ kind: 'ok', text: `Receipt submitted (${data.receipt.txnId}). VIP activates once an admin approves.` })
    setImageData(null)
    setImageName('')
    setPhone('')
    setNote('')
  }

  const fmt = (mnt) => `₮${mnt.toLocaleString('en-US')}`

  return (
    <main className="min-h-screen bg-slate-950 text-white page-enter">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Membership</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl gradient-text">Plans &amp; XP shop</h1>

        {me && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
            <span>@{me.username}</span>
            <span className="text-amber-300">◆ {me.xp} XP · Lv {me.level}</span>
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
          <div className={`mt-4 rounded-2xl border p-3 text-sm ${notice.kind === 'ok' ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300' : 'border-red-700 bg-red-950/40 text-red-300'}`}>
            {notice.text}
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">VIP plans</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <div key={p.code} className="luxe-card rounded-2xl p-5">
                <div className="text-[#c9a227] text-xs uppercase tracking-wider">{p.code}</div>
                <div className="mt-1 text-lg font-semibold break-words">{p.name}</div>
                <div className="mt-2 text-2xl font-bold gradient-text inline-block">{fmt(p.priceMnt)}</div>
                <div className="text-sm text-slate-400">{p.durationDays} days</div>
                <div className="mt-4 flex flex-col gap-2">
                  {paymentOptions?.demo === true && (
                    <button
                      disabled={busy === `${p.code}:local_dev`}
                      onClick={() => checkout(p.code, 'local_dev')}
                      className="rounded-xl bg-gradient-to-r from-[#c9a227] via-[#e7c779] to-[#c9a227] px-4 py-2 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110 shadow-[0_8px_24px_-8px_rgba(214,180,86,0.45)] disabled:opacity-50 disabled:shadow-none"
                    >
                      {busy === `${p.code}:local_dev` ? 'Activating…' : 'Buy with card (demo)'}
                    </button>
                  )}
                  {paymentOptions?.qpay && (
                    <button
                      disabled={busy === `${p.code}:qpay`}
                      onClick={() => checkout(p.code, 'qpay')}
                      className="rounded-xl border border-[#d6b456]/40 bg-black/20 px-4 py-2 text-sm font-medium text-gold-soft transition-all hover:border-[#e7c779] hover:bg-[#c9a227]/10 hover:text-white disabled:opacity-50"
                    >
                      {busy === `${p.code}:qpay` ? '…' : 'QPay'} ₮
                    </button>
                  )}
                  {paymentOptions && !paymentOptions.qpay && p.code === 'WEEKLY' && (
                    <p className="text-xs text-slate-500">QPay is unavailable. Use Khan Bank transfer below.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Pay by Khan Bank transfer</h2>
          <p className="mt-1 text-sm text-slate-400">
            Send the plan amount to the account below, then upload your receipt screenshot (or note the transfer ID) and phone number. An operator approves it manually and your VIP is extended automatically.
          </p>

          <div className="mt-4 grid gap-3 rounded-2xl border border-[#d6b456]/20 bg-black/30 p-5 sm:grid-cols-3">
            <div>
              <div className="font-display text-2xl text-gold-soft">1.</div>
              <p className="mt-1 text-sm text-[#cdbf9c]">Хүссэн төлөвлөгөөгөө доор сонгоно уу (WEEKLY / MONTHLY / уян хатан сарууд).</p>
            </div>
            <div>
              <div className="font-display text-2xl text-gold-soft">2.</div>
              <p className="mt-1 text-sm text-[#cdbf9c]">Khan Bank-р төлөвлөгөөний дүнг данс руу шилжүүлнэ: <span className="font-semibold text-amber-200">Taivanbaatar — MN550005005771031864</span>.</p>
            </div>
            <div>
              <div className="font-display text-2xl text-gold-soft">3.</div>
              <p className="mt-1 text-sm text-[#cdbf9c]">Утасны дугаар, гүйлгээний мэдээлэл эсвэл чек-зураг оруулаад «Submit receipt» дарна. Администратор баталгаажуулсны дараа VIP сунгагдана.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-slate-900 p-5">
              <div className="text-xs uppercase tracking-wider text-amber-400">Khan Bank</div>
              <div className="mt-3 text-sm text-slate-300">Account name</div>
              <div className="text-2xl font-black tracking-wide text-white">Taivanbaatar</div>
              <div className="mt-3 text-sm text-slate-300">Account number</div>
              <div className="select-all rounded-lg bg-black/40 px-3 py-2 font-mono text-sm font-semibold text-amber-300">
                MN550005005771031864
              </div>
              <div className="mt-4 text-xs text-slate-500">No gateway fee — funds go straight to the merchant account; the app only records receipts for approval.</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-slate-400">Plan</span>
                  <select
                    value={bankPlan}
                    onChange={(e) => setBankPlan(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/60"
                  >
                    <option value="">Select plan…</option>
                    {bankPlans.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} — {fmt(p.priceMnt)} / {p.durationDays} days
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-slate-400">Phone number</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9988 1234"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/60"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-slate-400">Transfer reference / note (optional)</span>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={280}
                    placeholder="e.g. transfer ID or your username"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/60"
                  />
                </label>
                <div className="sm:col-span-2">
                  <span className="text-sm text-slate-400">Receipt screenshot (optional)</span>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-amber-500/50 hover:text-white">
                      {imageName || 'Choose image…'}
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} className="hidden" />
                    </label>
                    {imageData && (
                      <img src={imageData} alt="receipt preview" className="h-14 w-14 rounded-lg border border-slate-700 object-cover" />
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-400">
                  {selectedBankPlan
                    ? `Total due: ${fmt(selectedBankPlan.priceMnt)} → ${selectedBankPlan.durationDays} days of VIP`
                    : 'Select a plan to see the total.'}
                </div>
                <button
                  disabled={busy === 'bank'}
                  onClick={submitBank}
                  className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-300 disabled:opacity-50"
                >
                  {busy === 'bank' ? 'Submitting…' : 'Submit receipt'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">XP shop</h2>
          <p className="mt-1 text-sm text-slate-400">Earn XP by watching, rating, reviewing and logging in daily. Spend it here.</p>
          {!me ? (
            <p className="mt-3 text-sm text-slate-400"><Link href="/login" className="text-[#c9a227] hover:underline dark:text-amber-200">Sign in</Link> to redeem.</p>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((r) => {
              const owned = myRewards.some((m) => m.code === r.code)
              const tooPoor = me && !owned && me.xp < r.xpPrice
              return (
                <div key={r.code} className={`rounded-2xl border p-5 ${owned ? 'border-emerald-700 bg-emerald-950/30' : 'border-slate-800 bg-slate-900'}`}>
                  <div className="text-xs uppercase tracking-wider text-amber-300">{r.type}</div>
                  <div className="mt-1 font-semibold">{r.name}</div>
                  <div className="mt-1 text-sm text-slate-400">{r.description}</div>
                  {r.days > 0 && <div className="mt-1 text-sm text-gold-soft">VIP +{r.days} days</div>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-amber-300 font-semibold">◆ {r.xpPrice} XP</span>
                    <button
                      disabled={busy === `redeem:${r.code}` || owned || tooPoor}
                      onClick={() => redeem(r.code)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-40 ${owned ? 'bg-emerald-700 text-white' : 'bg-amber-400 text-slate-900 hover:bg-amber-300'}`}
                    >
                      {owned ? 'Owned ✓' : 'Redeem'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <p className="mt-10 text-xs text-slate-500">
          Payments MNT (₮). local_dev/* is a sandbox auto-approve; QPay/bank rows require a real gateway or admin confirmation (Khan Bank receipts on the <Link href="/admin/payments" className="text-amber-400 hover:underline">admin review page</Link>).
        </p>
      </div>
      <Footer />
    </main>
  )
}