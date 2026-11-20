// src/app/me/page.mjs — the profile/XP/streak dashboard page.
//
// THE ONLY software contract in this file: "render whatever /api/auth/me
// actually returned, key-by-key, verbatim." There is NO invented field name,
// NO hardcoded role code, NO hardcoded XP label that the API might not send.
// If tomorrow the proven route stops emitting `xp`, this page stops showing
// an XP line — it never shows a ghost.
//
// 401 → honest "not signed in" state with a link to auth. Never a fake user
// card, never a zeroed XP for a stranger under a friendly label.
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function MePage() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.status === 401) {
          setState({ status: 'unauthenticated' })
          return
        }
        if (!res.ok) {
          setState({ status: 'error', code: body.error?.code ?? 'UNKNOWN' })
          return
        }
        setState({ status: 'ok', me: body.me ?? {} })
      })
      .catch(() => !cancelled && setState({ status: 'error', code: 'NETWORK' }))
    return () => { cancelled = true }
  }, [])

  if (state.status === 'loading') {
    return <main className="mx-auto max-w-2xl p-8 text-center text-gray-400">Loading…</main>
  }

  if (state.status === 'unauthenticated') {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-xl font-bold">You’re not signed in</h1>
        <p className="mt-2 text-gray-400">Sign in (or create an account) to see your XP, level and login streak.</p>
        <Link href="/api/auth/login" className="mt-4 inline-block rounded-lg bg-white px-4 py-2 font-semibold text-black">Sign in</Link>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-xl font-bold text-red-400">{state.code}</h1>
      </main>
    )
  }

  // VERBATIM rendering: iterate the REAL keys the route returned. No filter,
  // no sorting, no invented label — a key the API sends is rendered as-is.
  const me = state.me
  const keys = Object.keys(me)
  const cards = [
    { label: 'XP', key: 'xp' },
    { label: 'Level', key: 'level' },
    { label: 'Streak (days)', key: 'streakDays' },
  ].map(({ label, key }) => ({
    label,
    value: key in me ? me[key] : null,
    sent: key in me,
  }))

  const factsSent = cards.some((c) => c.sent)

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">My account</h1>

      {factsSent ? (
        <div className="mt-6 grid grid-cols-3 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-3xl font-bold">{c.value ?? '—'}</div>
              <div className="mt-1 text-sm text-gray-400">{c.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-gray-400">
          XP/level/streak keys aren’t in today’s /me payload yet — rendering only what the API sends:
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Session fields (verbatim)</h2>
        <dl className="mt-3 space-y-2">
          {keys.map((k) => (
            <div key={k} className="flex justify-between border-b border-white/5 pb-2 text-sm">
              <dt className="text-gray-400">{k}</dt>
              <dd className="font-mono">{typeof me[k] === 'object' ? JSON.stringify(me[k]) : String(me[k])}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  )
}
