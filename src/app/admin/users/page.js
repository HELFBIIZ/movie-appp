'use client'

import { useCallback, useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

const fmtDate = (value) => value ? new Date(value).toLocaleString() : '—'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [search, setSearch] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    const params = new URLSearchParams({ search, includeDeleted: includeDeleted ? '1' : '0' })
    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error?.code ?? `HTTP ${res.status}`)
      setUsers([])
      return
    }
    setUsers(data.users ?? [])
  }, [search, includeDeleted])

  useEffect(() => {
    const timer = setTimeout(load, search ? 250 : 0)
    return () => clearTimeout(timer)
  }, [load])

  async function act(userId, action) {
    setBusy(`${action}:${userId}`)
    setError(null)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    })
    setBusy(null)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error?.code ?? 'ACTION_FAILED')
      return
    }
    await load()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white page-enter">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Admin</p>
            <h1 className="mt-1 text-3xl font-bold md:text-4xl gradient-text">Users</h1>
            <p className="mt-2 text-sm text-slate-400">Хэрэглэгчдийг хайх, VIP эрх цуцлах, бүртгэлийг түр хугацаанд хаах.</p>
          </div>
          <Link href="/admin" className="rounded-lg border border-[#d6b456]/40 px-4 py-2 text-sm font-semibold text-gold-soft hover:bg-[#d6b456]/10">Dashboard →</Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Email эсвэл username хайх"
            className="min-w-[240px] rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none focus:border-[#d6b456]"
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={includeDeleted} onChange={(event) => setIncludeDeleted(event.target.checked)} />
            Хаасан бүртгэлүүдийг харуулах
          </label>
          <button onClick={load} className="rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-bold text-[#1a150b]">Refresh</button>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Хэрэглэгч</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">VIP</th>
                <th className="px-4 py-3">Баталгаатай төлбөр</th>
                <th className="px-4 py-3">Demo төлбөр</th>
                <th className="px-4 py-3">Бүртгүүлсэн</th>
                <th className="px-4 py-3 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !error && (
                <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">Хэрэглэгч олдсонгүй.</td></tr>
              )}
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-800/50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">@{user.username}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                    {user.deletedAt && <div className="mt-1 text-xs text-red-300">Хаасан: {fmtDate(user.deletedAt)}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${user.roleCode === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-300' : user.roleCode === 'ADMIN' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700/30 text-slate-300'}`}>{user.roleCode}</span>
                  </td>
                  <td className="px-4 py-3">
                    {user.subscriptionStatus === 'ACTIVE' ? (
                      <div><span className="text-emerald-300">ACTIVE</span><div className="text-xs text-slate-500">{user.planName} · {fmtDate(user.subscriptionExpiresAt)}</div></div>
                    ) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3 text-emerald-300">{user.verifiedPayments ?? 0}</td>
                  <td className="px-4 py-3 text-amber-300">{user.demoPayments ?? 0}</td>
                  <td className="px-4 py-3 text-slate-400">{fmtDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        disabled={busy === `approve_vip:${user.id}`}
                        title={user.pendingTxnId ? "Approve this user's pending payment" : "No pending payment to approve"}
                        onClick={user.pendingTxnId ? () => act(user.id, 'approve_vip') : undefined}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold ${user.pendingTxnId ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-slate-500 text-slate-400'}`}
                      >
                        Approve ✓
                      </button>
                      {user.subscriptionStatus === 'ACTIVE' && (
                        <button
                          disabled={busy === `revoke_vip:${user.id}`}
                          onClick={() => act(user.id, 'revoke_vip')}
                          className="rounded-lg border border-red-700 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          Revoke VIP
                        </button>
                      )}
                      <button
                        disabled={busy === `${user.deletedAt ? 'restore' : 'ban'}:${user.id}`}
                        onClick={() => act(user.id, user.deletedAt ? 'restore' : 'ban')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${user.deletedAt ? 'border border-emerald-700 text-emerald-300 hover:bg-emerald-500/10' : 'border border-slate-600 text-slate-300 hover:bg-white/5'}`}
                      >
                        {user.deletedAt ? 'Restore' : 'Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </main>
  )
}
