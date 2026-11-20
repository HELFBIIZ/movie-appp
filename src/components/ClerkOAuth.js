'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'

// Google / Apple sign-in.
//
// Clerk only proves identity, so as soon as its session exists we call
// /api/auth/clerk to mint our own `mn_session` cookie. After that the whole
// app (VIP gate, XP, favorites, admin) works exactly as it does for the
// password flow - nothing downstream knows this button was ever pressed.
export default function ClerkOAuth(props) {
  // A keyless build has no ClerkProvider. Gate the component before its hooks mount.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null
  return <EnabledClerkOAuth {...props} />
}

function EnabledClerkOAuth({ className = '', label = 'Continue with' }) {
  const enabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const router = useRouter()
  const { openSignIn, loaded } = useClerk()
  const { isSignedIn, isLoaded } = useUser()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const bridged = useRef(false)

  useEffect(() => {
    if (!enabled || !isSignedIn || bridged.current) return
    bridged.current = true
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/clerk', { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error?.code || 'OAUTH_FAILED')
        if (cancelled) return
        router.push('/')
        router.refresh()
      } catch (e) {
        if (cancelled) return
        bridged.current = false
        setBusy(false)
        setError(e.message || 'OAUTH_FAILED')
      }
    })()
    return () => { cancelled = true }
  }, [enabled, isSignedIn, router])

  if (!enabled) return null

  const start = () => {
    if (!loaded || busy) return
    setError(null)
    setBusy(true)
    // Modal, not a redirect: no callback route to maintain, and the session
    // lands back on this page where the bridge effect above picks it up.
    openSignIn({
      afterSignInUrl: '/',
      afterSignUpUrl: '/',
      appearance: { variables: { colorPrimary: '#c9a227' } },
    })
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={start}
        disabled={busy || !isLoaded}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:border-amber-400/50 hover:bg-slate-800 disabled:opacity-60"
      >
        <GoogleMark />
        <span>{busy || isSignedIn ? 'Signing in…' : label} Google</span>
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-300">{error}</p>
      )}
    </div>
  )
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.4 0 20.1 0 24s1 7.6 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.4 0-11.7-3.7-13.6-8.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}
