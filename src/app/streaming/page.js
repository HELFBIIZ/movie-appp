"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { movies } from "@/lib/movies"
import streamingMap from "@/lib/streaming.json"

function brand(name) {
  return name
    .replace(/\s*\(via [^)]*\)/i, "")
    .replace(/\s*\(on [^)]*\)/i, "")
    .replace(/\s+amazon channel$/i, "")
    .replace(/^fandango at home free$/i, "Fandango at Home")
    .replace(/^peacock premium$/i, "Peacock")
    .replace(/^hbo max$/i, "Max")
    .replace(/^max$/i, "Max")
    .replace(/^appletv\+$/i, "Apple TV+")
    .replace(/^appletv$/i, "Apple TV")
    .replace(/^prime video$/i, "Prime Video")
    .trim()
}

function availableOn(services) {
  const seen = new Set()
  return (services || [])
    .map((name) => {
      const b = brand(name)
      return { name: b, key: b.toLowerCase() }
    })
    .filter(({ key }) => {
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export default function StreamingPage() {
  const [selected, setSelected] = useState("all")

  const allServices = useMemo(() => {
    const map = new Map()
    for (const services of Object.values(streamingMap)) {
      for (const { key, name } of availableOn(services)) {
        if (!map.has(key)) map.set(key, name)
      }
    }
    return [...new Map([...map.entries()].sort((a, b) => a[1].localeCompare(b[1])))].map(
      ([key, name]) => ({ key, name })
    )
  }, [])

  const filtered = useMemo(() => {
    const withServices = movies.filter((m) => (streamingMap[m.slug] || []).length > 0)
    if (selected === "all") return withServices
    return withServices.filter((m) =>
      availableOn(streamingMap[m.slug]).some((s) => s.key === selected)
    )
  }, [selected])

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      <Header />

      <div className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 animate-fade-in-down">
            <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Streaming guide</p>
            <h1 className="text-4xl font-black">Where to watch legally</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Browse the catalog by streaming platform. VXNTA never hosts or streams content
              itself — every title links to its official, licensed provider.
            </p>
          </div>

          <div className="mb-8 flex flex-wrap gap-2 animate-fade-in-up">
            <button
              onClick={() => setSelected("all")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                selected === "all"
                  ? "bg-[#c9a227] text-[#1a150b] shadow-[0_8px_20px_-8px_rgba(214,180,86,0.5)]"
                  : "border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              All platforms
            </button>
            {allServices.map((s) => (
              <button
                key={s.key}
                onClick={() => setSelected(s.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  selected === s.key
                    ? "bg-[#c9a227] text-[#1a150b] shadow-[0_8px_20px_-8px_rgba(214,180,86,0.5)]"
                    : "border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} {filtered.length === 1 ? "title" : "titles"} available
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((movie) => {
              const services = availableOn(streamingMap[movie.slug])
              return (
                <Link
                  key={movie.slug}
                  href={`/movie/${movie.slug}`}
                  className="group card-hover overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="image-zoom relative aspect-[2/3] w-full">
                    <Image
                      src={movie.poster}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 300px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute bottom-0 left-0 right-0 translate-y-full p-3 transition-transform duration-300 group-hover:translate-y-0">
                      <span className="text-sm font-medium text-white">
                        {services.length} {services.length === 1 ? "platform" : "platforms"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 p-4">
                    <h2 className="text-lg font-semibold transition-colors group-hover:text-red-500">
                      {movie.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {movie.year} • {services.slice(0, 3).map((s) => s.name).join(", ")}
                      {services.length > 3 ? ` +${services.length - 3} more` : ""}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}