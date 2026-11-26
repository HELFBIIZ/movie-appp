'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { movies } from '@/lib/movies';

const GENRES = ['Бүгд', 'Action', 'Drama', 'Comedy', 'Thriller', 'Animation', 'Sci-Fi'];

export default function LearningMoviePicker() {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('Бүгд');
  const [limit, setLimit] = useState(8);

  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return movies
      .filter((movie) => {
        const matchesGenre = genre === 'Бүгд' || movie.genres.includes(genre);
        const matchesTerm =
          !term ||
          movie.title.toLocaleLowerCase().includes(term) ||
          movie.year === Number(term) ||
          movie.genres.some((item) => item.toLocaleLowerCase().includes(term));
        return matchesGenre && matchesTerm;
      })
      .slice(0, limit);
  }, [query, genre, limit]);

  return (
    <section
      aria-label="Сурах киногоо хайх"
      className="mt-6 rounded-2xl border border-white/10 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Кино сонгож англи хэл сурах</h2>
        <span className="text-xs text-slate-500">Нэр, жил эсвэл төрлөөр хайна уу</span>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          aria-label="Кино хайх"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setLimit(8);
          }}
          placeholder="Киноны нэр жишээ нь: Inception"
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60"
        />
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <span className="shrink-0">Төрөл</span>
          <select
            aria-label="Төрлөөр шүүх"
            value={genre}
            onChange={(event) => {
              setGenre(event.target.value);
              setLimit(8);
            }}
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-sm text-white sm:w-40 sm:flex-none"
          >
            {GENRES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {results.length === 0 ? (
        <p role="status" className="mt-4 text-sm text-slate-400">
          Тохирох кино олдсонгүй. Өөр нэр эсвэл төрөл оролдоно уу.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((movie) => (
            <li key={movie.slug} className="min-w-0">
              <Link
                href={`/watch/${movie.slug}?learn=1${movie.tmdbId ? '' : '&media=local'}`}
                className="flex h-full min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2 transition-colors hover:border-amber-300/50 hover:bg-amber-300/5"
              >
                <Image
                  src={movie.poster}
                  alt=""
                  width={36}
                  height={54}
                  unoptimized
                  className="h-14 w-9 shrink-0 rounded object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-white sm:text-sm">
                    {movie.title}
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-400">
                    {movie.year || '—'} · {movie.genres[0] || 'Кино'}
                  </span>
                  <span className="mt-1 block text-[11px] text-amber-200">Сурах →</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {results.length === limit && (
        <button
          type="button"
          onClick={() => setLimit((current) => current + 8)}
          className="mt-4 rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:border-amber-300/50 hover:text-amber-200"
        >
          Илүү олон кино харуулах
        </button>
      )}
      <Link href="/movies" className="mt-4 inline-block text-xs text-amber-200 underline sm:ml-4">
        Бүх киногоо харах →
      </Link>
    </section>
  );
}
