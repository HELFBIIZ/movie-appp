'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        if (d.error) { router.push('/login'); return }
        setUser(d.me)
        setDisplayName(d.me.profile?.displayName || d.me.username)
        setBio(d.me.profile?.bio || '')
        setAvatarUrl(d.me.profile?.avatarUrl || '')
        setLoading(false)
      })
      .catch(() => { router.push('/login') })
  }, [router])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, bio, avatarUrl }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error?.code || 'SAVE_FAILED')
      else { setSuccess(true); setTimeout(() => setSuccess(false), 3000) }
    } catch { setError('NETWORK_ERROR') }
    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white page-enter">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="skeleton h-10 w-48 rounded mb-4" />
          <div className="skeleton h-64 w-full rounded-2xl" />
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white page-enter">
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Account</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl gradient-text">Profile</h1>
        <p className="mt-2 text-sm text-slate-400">Manage your public display name and bio.</p>

        {error && <div className="mt-4 rounded-xl border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}
        {success && <div className="mt-4 rounded-xl border border-emerald-700 bg-emerald-950/40 p-3 text-sm text-emerald-300">Profile saved!</div>}

        <form onSubmit={handleSave} className="mt-8 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Username</label>
              <input value={user?.username || ''} disabled className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-500 cursor-not-allowed" />
              <p className="mt-1 text-xs text-slate-600">Username cannot be changed.</p>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <input value={user?.email || ''} disabled className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Display Name</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-[#d6b456]"
                placeholder="How others see you" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-[#d6b456] resize-none"
                placeholder="Tell us about yourself (optional)" />
              <p className="mt-1 text-xs text-slate-600">{bio.length}/280</p>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Avatar URL</label>
              <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} maxLength={500}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-[#d6b456]"
                placeholder="https://example.com/avatar.jpg" />
            </div>
          </div>

          {avatarUrl && (
            <div className="flex items-center gap-4">
              <img src={avatarUrl} alt="Avatar preview" className="h-16 w-16 rounded-full border border-slate-700 object-cover"
                onError={(e) => { e.target.style.display = 'none' }} />
              <div className="text-sm text-slate-400">
                <p className="font-medium text-white">{displayName || user?.username}</p>
                <p>@{user?.username}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button disabled={saving}
              className="rounded-xl bg-gradient-to-r from-[#c9a227] via-[#e7c779] to-[#c9a227] px-6 py-3 text-sm font-bold text-[#1a150b] shadow-[0_10px_28px_-10px_rgba(214,180,86,0.5)] transition-all hover:brightness-110 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            <button type="button" onClick={() => router.back()}
              className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Account Info</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-400">
            <p>Role: <span className="text-white font-medium">{user?.roleCode}</span></p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
