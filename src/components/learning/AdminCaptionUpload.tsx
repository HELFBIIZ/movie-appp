'use client';
import { useState, type FormEvent } from 'react';
export default function AdminCaptionUpload() {
  const [slug, setSlug] = useState('');
  const [language, setLanguage] = useState('mn');
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || file.size > 1_000_000) {
      setMessage('1 MB хүртэлх .vtt файл сонгоно уу.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/admin/learning-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, language, season, episode, content: await file.text() }),
      });
      const data: { cues?: number } = await response.json();
      setMessage(
        response.ok
          ? `${data.cues} мөр хадгаллаа. Киноны хуудсаа дахин нээж шалгаарай.`
          : 'Хадгалсангүй. Киноны slug, хэл болон VTT файлаа шалгана уу.',
      );
    } catch {
      setMessage('Холболт тасарсан тул хадгалсан гэж тооцоогүй.');
    } finally {
      setBusy(false);
    }
  }
  const inputClass = 'mt-2 w-full rounded-lg border border-white/15 bg-slate-950 p-2';
  return (
    <details className="mt-6 rounded-2xl border border-white/10 p-5">
      <summary className="cursor-pointer font-semibold">Кинонд EN/MN хадмал нэмэх</summary>
      <p className="mt-3 text-sm text-slate-400">
        Ашиглах эрхтэй, тухайн кино эсвэл ангитай таарах .vtt файл нэмнэ. Нэмсэн хадмал
        хэрэглэгчдийн learning mode-д нээгдэнэ.
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Киноны slug
          <input
            required
            pattern="[a-z0-9-]+"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="spider-man-brand-new-day"
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          Хэл
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className={inputClass}
          >
            <option value="mn">Монгол</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="text-sm">
          Улирал
          <input
            type="number"
            min={1}
            max={100}
            required
            value={season}
            onChange={(event) => setSeason(event.target.valueAsNumber)}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          Анги
          <input
            type="number"
            min={1}
            max={1000}
            required
            value={episode}
            onChange={(event) => setEpisode(event.target.valueAsNumber)}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          Хадмалын файл
          <input
            type="file"
            accept=".vtt"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="self-end rounded-lg bg-[#c9a227] px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
        >
          {busy ? 'Хадгалж байна…' : 'Хадмал хадгалах'}
        </button>
      </form>
      {message && (
        <p role="status" className="mt-4 text-sm text-amber-200">
          {message}
        </p>
      )}
    </details>
  );
}
