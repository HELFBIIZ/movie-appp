'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { safeReturnTo } from '@/lib/safe-return';
import { authMessage } from '@/lib/auth-messages';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('signin');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'register') {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), username: username.trim(), password }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(authMessage(data.error?.code ?? 'REGISTER_FAILED'));
          return;
        }
      }
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: mode === 'signin' ? identifier.trim() : email.trim(),
          password,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(authMessage(data.error?.code ?? 'INVALID_CREDENTIALS'));
        return;
      }
      window.dispatchEvent(new Event('vxnta:session-change'));
      router.push(safeReturnTo(new URLSearchParams(window.location.search).get('next'), '/'));
      router.refresh();
    } catch {
      setError(authMessage('NETWORK_ERROR'));
    } finally {
      setBusy(false);
    }
  }
  const inputClass =
    'mt-2 w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400/60';
  return (
    <main className="min-h-screen bg-slate-950 text-white page-enter">
      <Header />
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
        <p className="text-sm tracking-widest text-[#c9a227]">VXNTA</p>
        <h1 className="mt-2 text-3xl font-bold">
          {mode === 'signin' ? 'Тавтай морил' : 'Бүртгэл үүсгэх'}
        </h1>
        <div className="mt-6 flex rounded-xl border border-white/10 bg-white/5 p-1">
          {[
            { id: 'signin', label: 'Нэвтрэх' },
            { id: 'register', label: 'Бүртгүүлэх' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              disabled={busy}
              aria-pressed={mode === id}
              onClick={() => {
                setMode(id);
                setError('');
              }}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${mode === id ? 'bg-[#c9a227] text-slate-950' : 'text-slate-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/5 p-3 text-sm leading-6 text-rose-200"
          >
            {error}
          </p>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'register' ? (
            <>
              <label className="block text-sm text-slate-300">
                Хэрэглэгчийн нэр
                <input
                  name="username"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={24}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Имэйл
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                />
              </label>
            </>
          ) : (
            <label className="block text-sm text-slate-300">
              Имэйл эсвэл хэрэглэгчийн нэр
              <input
                name="identifier"
                autoComplete="username"
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className={inputClass}
              />
            </label>
          )}
          <label className="block text-sm text-slate-300">
            Нууц үг
            <input
              name="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'register' ? 8 : 1}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#c9a227] px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
          >
            {busy ? 'Түр хүлээнэ үү…' : mode === 'signin' ? 'Нэвтрэх' : 'Бүртгэл үүсгэх'}
          </button>
        </form>
      </div>
      <Footer />
    </main>
  );
}
