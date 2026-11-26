'use client';

import { useCallback, useEffect, useState } from 'react';

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  username: string;
  displayName: string;
};

type Props = {
  slug: string;
  title: string;
};

export default function MovieComments({ slug, title }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [verified, setVerified] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/movie-comments?slug=${encodeURIComponent(slug)}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) return;
      setComments(data.comments ?? []);
      setVerified(Boolean(data.verified));
      setCanComment(Boolean(data.canComment));
    } catch {
      setNotice('Коммент ачаалж чадсангүй.');
    }
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/movie-comments?slug=${encodeURIComponent(slug)}`, {
      credentials: 'include',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setComments(data.comments ?? []);
        setVerified(Boolean(data.verified));
        setCanComment(Boolean(data.canComment));
      })
      .catch(() => !cancelled && setNotice('Коммент ачаалж чадсангүй.'));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/movie-comments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, body }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error?.message ?? 'Коммент илгээгдсэнгүй.');
        return;
      }
      setBody('');
      setVerified(true);
      await load();
    } catch {
      setNotice('Холболт тасарлаа.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">«{title}» киноны яриа</h2>
        <span className="text-xs text-slate-500">{comments.length} коммент</span>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Зөвхөн энэ киноо үзсэн хэрэглэгчид коммент бичих боломжтой.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-2">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value.slice(0, 500))}
          rows={3}
          maxLength={500}
          placeholder={
            verified ? 'Киноны талаар бодлоо хуваалцаарай…' : 'Киноо үзсэний дараа бичнэ үү.'
          }
          disabled={!canComment || !verified || busy}
          className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-white outline-none focus:border-amber-400 disabled:opacity-50"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {!canComment
              ? 'Коммент бичихэд нэвтрэх шаардлагатай.'
              : verified
                ? `${body.length}/500`
                : 'Үзсэн киногоо коммент хийх эрх нээгдэнэ.'}
          </span>
          <button
            type="submit"
            disabled={!canComment || !verified || body.trim().length < 2 || busy}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-40"
          >
            {busy ? 'Илгээж байна…' : 'Коммент хийх'}
          </button>
        </div>
        {notice && <p className="text-xs text-amber-300">{notice}</p>}
      </form>

      <ol className="mt-5 space-y-3">
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-amber-200">@{comment.username}</span>
              <span>{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
              {comment.body}
            </p>
          </li>
        ))}
        {!comments.length && (
          <li className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-sm text-slate-500">
            Эхний комментыг бичээрэй.
          </li>
        )}
      </ol>
    </section>
  );
}
