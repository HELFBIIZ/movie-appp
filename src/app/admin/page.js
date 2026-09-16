'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const fmtMnt = (mnt) => `₮${Number(mnt || 0).toLocaleString()}`
const fmtDate = (iso) => new Date((iso ?? '') + (iso?.includes('T') ? '' : 'Z')).toLocaleString()

function Card({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ?? 'border-slate-800 bg-slate-900'}`}>
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}

function Table({ title, cols, rows }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
              {cols.map((c) => (
                <th key={c.key} className="px-4 py-2 font-medium whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={cols.length} className="px-4 py-6 text-center text-slate-500">Nothing yet.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.key ?? i} className="border-b border-slate-800/50 last:border-0">
                {cols.map((c) => (
                  <td key={c.key} className="px-4 py-2 whitespace-nowrap">{r[c.key] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/admin/overview')
      .then(async (res) => {
        if (!res.ok) throw Object.assign(new Error((await res.json().catch(() => ({ error: { code: `HTTP ${res.status}` } }))).error?.code ?? `HTTP ${res.status}`), { isAuth: res.status === 401 || res.status === 403 })
        return res.json()
      })
      .then(setData)
      .catch((e) => setError({ message: e.message, isAuth: e.isAuth }))
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-white page-enter">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Admin</p>
            <h1 className="mt-1 text-3xl font-bold md:text-4xl gradient-text">Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/users" className="rounded-lg border border-[#d6b456]/40 px-4 py-2 text-sm font-semibold text-amber-300 transition-all hover:bg-[#d6b456]/10">
              Manage users
            </Link>
            <Link href="/admin/payments" className="rounded-lg border border-amber-500/40 px-4 py-2 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-500/10">
              Review manual payments →
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-700 bg-red-950/40 p-4 text-sm text-red-300">
            {error.message}. {error.isAuth && <Link href="/login" className="underline">Sign in</Link>} as an admin to continue.
          </div>
        )}

        {data && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
              <Card label="Users" value={data.stats.users} />
              <Card label="Active subs" value={data.stats.activeSubscriptions} accent="border-emerald-700 bg-emerald-950/30" />
              <Card label="Revenue" value={fmtMnt(data.stats.revenueMnt)} accent="border-amber-700 bg-amber-950/30" />
              <Card label="Payments ok" value={data.stats.successfulPayments} />
              <Card label="Pending receipts" value={data.stats.pendingReceipts} accent="border-red-700 bg-red-950/30" />
              <Card label="Total XP" value={data.stats.totalXp.toLocaleString()} />
              <Card label="Reviews" value={data.stats.reviews} />
              <Card label="Watch events" value={data.stats.watchHistory} />
            </div>

            {(data.stats.demoPayments > 0 || data.stats.unverifiedActiveSubscriptions > 0) && (
              <div className="rounded-2xl border border-red-700 bg-red-950/30 p-4 text-sm text-red-200">
                <b>Баталгаа шаардлагатай:</b> demo төлбөр {data.stats.demoPayments} ширхэг, баталгаажаагүй идэвхтэй VIP {data.stats.unverifiedActiveSubscriptions} ширхэг байна. /admin/users хуудсаас VIP эрхийг цуцална уу.
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
              <span className="text-slate-400">Catalog:</span> <span className="text-white">{data.catalog.movies} movies</span> ·
              <span className="text-white"> {data.catalog.kdramas} K-Dramas</span> · <span className="text-white">{data.catalog.western} Western series</span>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <Table
                title="Latest receipts"
                cols={[
                  { key: 'username', label: 'User' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'status', label: 'Status' },
                  { key: 'created', label: 'Submitted' },
                ]}
                rows={data.recent.receipts.map((r) => ({
                  key: r.txnId, username: '@' + r.username, amount: fmtMnt(r.amountMnt),
                  status: r.status, created: fmtDate(r.createdAt),
                }))}
              />
              <Table
                title="Latest payments"
                cols={[
                  { key: 'txn', label: 'Txn' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'provider', label: 'Provider' },
                  { key: 'status', label: 'Status' },
                  { key: 'created', label: 'When' },
                ]}
                rows={data.recent.payments.map((p) => ({
                  key: p.txnId, txn: p.txnId.slice(0, 12) + '…', amount: fmtMnt(p.amountMnt),
                  provider: p.provider, status: p.status, created: fmtDate(p.createdAt),
                }))}
              />
              <Table
                title="Top XP"
                cols={[
                  { key: 'username', label: 'User' },
                  { key: 'xp', label: 'XP' },
                  { key: 'level', label: 'Level' },
                ]}
                rows={data.recent.topXp.map((x) => ({ key: x.username, username: '@' + x.username, xp: x.xp.toLocaleString(), level: x.level }))}
              />
              <Table
                title="Latest users"
                cols={[
                  { key: 'username', label: 'User' },
                  { key: 'email', label: 'Email' },
                  { key: 'created', label: 'Joined' },
                ]}
                rows={data.recent.users.map((u) => ({ key: u.id, username: '@' + u.username, email: u.email, created: fmtDate(u.createdAt) }))}
              />
            </div>
          </>
        )}
      </div>
      <Footer />
    </main>
  )
}