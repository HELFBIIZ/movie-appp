'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState('signin')
  const [identifier, setIdentifier] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    if (mode === 'register') {
      const reg = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      })
      const rd = await reg.json().catch(() => ({}))
      if (!reg.ok) {
        setBusy(false)
        setError(rd.error?.code ?? 'REGISTER_FAILED')
        return
      }
    }

    const login = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: mode === 'signin' ? identifier : email, password }),
    })
    const ld = await login.json().catch(() => ({}))
    if (!login.ok) {
      setBusy(false)
      setError(ld.error?.code ?? 'INVALID_CREDENTIALS')
      return
    }

    setBusy(false)
    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white page-enter">
      <Header />
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
        <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">VXNTA</p>
        <h1 className="mt-1 text-3xl font-bold gradient-text">{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>

        <div className="mt-6 flex rounded-xl border border-slate-800 bg-slate-900/60 p-1">
          {['signin', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                mode === m ? 'bg-[#c9a227] text-[#1a150b]' : 'text-slate-400 hover:text-amber-200'
              }`}
            >
              {m === 'signin' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
            {error === 'UNAUTHENTICATED' ? ' Sign up first, then sign in.' : ''}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <>
              <label className="block text-sm">
                <span className="text-slate-400">Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-red-500/60"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-red-500/60"
                />
              </label>
            </>
          )}

          <label className="block text-sm">
            <span className="text-slate-400">{mode === 'signin' ? 'Email or username' : 'Email'}</span>
            <input
              value={mode === 'signin' ? identifier : email}
              onChange={(e) => (mode === 'signin' ? setIdentifier(e.target.value) : setEmail(e.target.value))}
              required
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-red-500/60"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-400">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-red-500/60"
            />
          </label>

          <button
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-[#c9a227] via-[#e7c779] to-[#c9a227] px-4 py-3 text-sm font-bold text-[#1a150b] shadow-[0_10px_28px_-10px_rgba(214,180,86,0.5)] transition-all hover:brightness-110 disabled:opacity-50"
          >
            {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account & sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          <Link href="/" className="hover:text-amber-500 dark:hover:text-amber-200">← Back to home</Link>
        </p>
      </div>
      <Footer />
    </main>
  )
}