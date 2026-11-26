'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const STATUSES = ['PENDING', 'APPROVED', 'ADDED', 'REJECTED'];
const labels = {
  PENDING: 'Хүлээгдэж байна',
  APPROVED: 'Хүлээн авсан',
  ADDED: 'Нэмэгдсэн',
  REJECTED: 'Татгалзсан',
};

export default function AdminMovieRequestsPage() {
  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState([]);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: '', body: '', link: '/movies' });

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(`/api/admin/movie-requests?status=${status}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error?.code || `HTTP ${response.status}`);
        setRequests([]);
        return;
      }
      setRequests(data.requests || []);
    } catch {
      setError('Сүлжээний алдаа');
    }
  }, [status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function review(id, nextStatus) {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/admin/movie-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus, adminNote: notes[id] || null }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error?.code || 'Шалгаж чадсангүй');
      else {
        setNotice('Хариу илгээгдлээ.');
        await load();
      }
    } catch {
      setError('Сүлжээний алдаа');
    } finally {
      setBusy(false);
    }
  }

  async function broadcast(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcement),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error?.code || 'Мэдэгдэл илгээж чадсангүй');
      else {
        setNotice(`${data.sent} хэрэглэгчид мэдэгдэл илгээгдлээ.`);
        setAnnouncement({ title: '', body: '', link: '/movies' });
      }
    } catch {
      setError('Сүлжээний алдаа');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white page-enter">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Admin</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl gradient-text">Киноны хүсэлтүүд</h1>
        <p className="mt-2 text-sm text-slate-400">
          Хэрэглэгчийн саналыг хянаж, шинэ кино нэмэгдсэний дараа мэдэгдэл илгээнэ үү.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-rose-700 bg-rose-950/40 p-3 text-sm text-rose-300"
          >
            {error}.{' '}
            <Link href="/login" className="underline">
              Нэвтрэх →
            </Link>
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 text-sm text-emerald-300">
            {notice}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {STATUSES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                status === item ? 'bg-amber-300 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {labels[item]}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {requests.length === 0 && (
            <p className="rounded-xl border border-white/10 p-5 text-sm text-slate-400">
              Энэ төлөвт хүсэлт байхгүй байна.
            </p>
          )}
          {requests.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold">{item.title}</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.type === 'series' ? 'Цуврал' : 'Кино'} · {item.year || '—'} ·{' '}
                    {item.username || item.email || 'Хэрэглэгч'} · {item.createdAt}
                  </p>
                </div>
                <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs text-amber-200">
                  {labels[item.status] || item.status}
                </span>
              </div>
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all text-xs text-amber-200 underline"
                >
                  {item.link}
                </a>
              )}
              {item.note && <p className="mt-2 text-sm text-slate-300">{item.note}</p>}
              {item.adminNote && (
                <p className="mt-2 text-xs text-slate-400">Тэмдэглэл: {item.adminNote}</p>
              )}
              {item.status === 'PENDING' && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={notes[item.id] || ''}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                    placeholder="Хариу тэмдэглэл"
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => review(item.id, 'APPROVED')}
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
                    >
                      Хүлээн авах
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => review(item.id, 'REJECTED')}
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs disabled:opacity-50"
                    >
                      Татгалзах
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => review(item.id, 'ADDED')}
                      className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
                    >
                      Нэмэгдсэн
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-white/10 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Шинэ киноны мэдэгдэл</h2>
          <p className="mt-1 text-xs text-slate-400">
            Бүх идэвхтэй хэрэглэгчид хүрнэ. Зөвхөн дотоод хаяг (/movies, /watch/…) зөвшөөрнө.
          </p>
          <form onSubmit={broadcast} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300 sm:col-span-2">
              Гарчиг *
              <input
                required
                value={announcement.title}
                onChange={(event) =>
                  setAnnouncement((current) => ({ ...current, title: event.target.value }))
                }
                maxLength={120}
                placeholder="Шинэ кино нэмэгдлээ!"
                className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="text-xs text-slate-300 sm:col-span-2">
              Тайлбар
              <textarea
                value={announcement.body}
                onChange={(event) =>
                  setAnnouncement((current) => ({ ...current, body: event.target.value }))
                }
                maxLength={500}
                rows={3}
                className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="text-xs text-slate-300 sm:col-span-2">
              Холбоос
              <input
                value={announcement.link}
                onChange={(event) =>
                  setAnnouncement((current) => ({ ...current, link: event.target.value }))
                }
                placeholder="/movies"
                className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 sm:w-fit"
            >
              Мэдэгдэл илгээх
            </button>
          </form>
        </section>
      </div>
      <Footer />
    </main>
  );
}
