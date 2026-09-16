'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED']

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState('PENDING')
  const [receipts, setReceipts] = useState([])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [notes, setNotes] = useState({})

  const load = useCallback(async (s = status) => {
    setError(null)
    const res = await fetch(`/api/admin/payments?status=${s}`)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error?.code ?? `HTTP ${res.status}`)
      setReceipts([])
      return false
    }
    const data = await res.json()
    setReceipts(data.receipts ?? [])
    return true
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  async function act(txnId, action) {
    setBusy(`${action}:${txnId}`)
    const res = await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, txnId, adminNote: notes[txnId] || null }),
    })
    setBusy(null)
    if (!res.ok) {
      setError((await res.json().catch(() => ({ error: { code: 'FAILED' } }))).error?.code ?? 'FAILED')
      return
    }
    setNotes((p) => ({ ...p, [txnId]: '' }))
    load()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white page-enter">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Admin</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl gradient-text">Manual payments review</h1>
        <p className="mt-2 text-sm text-slate-400">
          Khan Bank receipts. Approving a receipt activates the matching payment and stacks the VIP expiry automatically.
        </p>

        <div className="mt-6 flex items-center gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                status === s ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {s} {s === 'PENDING' ? receipts.filter((x) => x.status === 'PENDING').length : ''}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
            {error}. <Link href="/login" className="underline">Sign in</Link> as an admin to continue.
          </div>
        )}

        <div className="mt-6 space-y-4">
          {receipts.length === 0 && !error && (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center text-slate-400 animate-fade-in-up">
              No {status.toLowerCase()} receipts right now.
            </div>
          )}

          {receipts.map((r) => (
            <div key={r.txnId} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 animate-fade-in-up">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">@{r.username}</span>
                    <span className="text-xs text-slate-500">{r.email}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      r.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300'
                        : r.status === 'REJECTED' ? 'bg-red-500/20 text-red-300'
                          : 'bg-amber-500/20 text-amber-300'
                    }`}>{r.status} · pay {r.paymentStatus}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    {r.planName} ({r.planCode}) · ₮{Number(r.amountMnt).toLocaleString()} · +{r.durationDays} days
                  </div>
                  <div className="mt-1 text-sm text-slate-400">Phone: <span className="text-white">{r.phone}</span></div>
                  {r.note && <div className="mt-1 text-sm text-slate-400">Note: {r.note}</div>}
                  <div className="mt-1 text-xs text-slate-500">
                    {new Date(r.createdAt + 'Z').toLocaleString()} · txn {r.txnId}
                    {r.adminNote && <span className="ml-2 text-amber-300/80">Admin: {r.adminNote}</span>}
                  </div>
                </div>

                {r.imageData ? (
                  <img src={r.imageData} alt="receipt screenshot" className="h-40 w-28 rounded-lg border border-slate-700 object-cover" />
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-xs text-slate-500">
                    No screenshot — verified by transfer ID only.
                  </div>
                )}
              </div>

              {r.status === 'PENDING' && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
                  <input
                    value={notes[r.txnId] ?? ''}
                    onChange={(e) => setNotes((p) => ({ ...p, [r.txnId]: e.target.value }))}
                    placeholder="Admin note (optional)"
                    maxLength={280}
                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/60"
                  />
                  <button
                    disabled={busy === `approve:${r.txnId}`}
                    onClick={() => act(r.txnId, 'approve')}
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {busy === `approve:${r.txnId}` ? '…' : 'Approve ✓'}
                  </button>
                  <button
                    disabled={busy === `reject:${r.txnId}`}
                    onClick={() => act(r.txnId, 'reject')}
                    className="rounded-lg border border-red-700 px-4 py-2 text-sm font-bold text-red-300 transition-all hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {busy === `reject:${r.txnId}` ? '…' : 'Reject ✕'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-slate-600">Audit trail: every decision is written to security_logs (payment-verify) and stamped on the receipt row (reviewed_by / reviewed_at).</p>
      </div>
      <Footer />
    </main>
  )
}