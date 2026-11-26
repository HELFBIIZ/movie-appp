'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const initial = { title: '', year: '', type: 'movie', link: '', note: '' };
const labels = {
  PENDING: 'Хүлээгдэж байна',
  APPROVED: 'Хүлээн авсан',
  ADDED: 'Нэмэгдсэн',
  REJECTED: 'Татгалзсан',
};

export default function MovieRequestPanel() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [form, setForm] = useState(initial);
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/movie-requests', { credentials: 'same-origin' });
      if (response.status === 401) {
        setSignedIn(false);
        return;
      }
      if (!response.ok) return;
      const data = await response.json();
      setSignedIn(true);
      setRequests(data.requests || []);
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/movie-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...form,
          year: form.year ? Number(form.year) : null,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        setMessage('Хүсэлт илгээхийн тулд нэвтрэх шаардлагатай.');
      } else if (!response.ok) {
        setMessage(data.error?.message || 'Хүсэлт илгээж чадсангүй.');
      } else {
        setForm(initial);
        setMessage('Хүсэлт амжилттай илгээгдлээ. Хариуг мэдэгдэлээр хүлээн авна уу.');
        await load();
      }
    } catch {
      setMessage('Сүлжээний алдаа. Дахин оролдоно уу.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Кино санал болгох</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Хайж байгаа киногоо бидэнд хэлээрэй. Шинээр нэмэгдсэн кинонуудыг мэдэгдлээр мэдээлнэ.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-semibold text-slate-950"
        >
          {open ? 'Хаах' : 'Хүсэлт илгээх'}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-600 dark:text-slate-300">
            Киноны нэр *
            <input
              required
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              maxLength={160}
              placeholder="Жишээ: Inception"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="text-xs text-slate-600 dark:text-slate-300">
            Төрөл
            <select
              value={form.type}
              onChange={(event) => update('type', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="movie">Кино</option>
              <option value="series">Цуврал</option>
            </select>
          </label>
          <label className="text-xs text-slate-600 dark:text-slate-300">
            Он
            <input
              inputMode="numeric"
              value={form.year}
              onChange={(event) =>
                update('year', event.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="2010"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="text-xs text-slate-600 dark:text-slate-300">
            Холбоос (сонголт)
            <input
              type="url"
              value={form.link}
              onChange={(event) => update('link', event.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="text-xs text-slate-600 dark:text-slate-300 sm:col-span-2">
            Тайлбар (сонголт)
            <textarea
              value={form.note}
              onChange={(event) => update('note', event.target.value)}
              maxLength={1000}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {busy ? 'Илгээж байна…' : 'Илгээх'}
            </button>
          </div>
        </form>
      )}

      {message && (
        <p role="status" className="mt-4 text-sm text-amber-700 dark:text-amber-300">
          {message}
          {!signedIn && (
            <>
              {' '}
              <Link href="/login?next=%2Fmovies" className="underline">
                Нэвтрэх →
              </Link>
            </>
          )}
        </p>
      )}

      {signedIn && requests.length > 0 && (
        <ul className="mt-5 space-y-2">
          {requests.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
            >
              <span className="min-w-0 truncate">{item.title}</span>
              <span className="shrink-0 text-xs text-amber-700 dark:text-amber-300">
                {labels[item.status] || item.status}
                {item.adminNote ? ` · ${item.adminNote}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
