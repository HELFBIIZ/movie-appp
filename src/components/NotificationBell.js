"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell, BellRing, CheckCheck } from "lucide-react"

const POLL_MS = 20000

function timeAgo(iso) {
  const then = new Date(iso + (iso.endsWith("Z") ? "" : "Z")).getTime()
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1) return "⌛"
  if (mins < 60) return `${mins} мин`
  const hrs = Math.floor(mins / 60)
  return hrs < 24 ? `${hrs} цаг` : `${Math.floor(hrs / 24)} өдөр`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [authed, setAuthed] = useState(null) // null=checking, true/false
  const timer = useRef(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" })
      if (res.status === 401) { setAuthed(false); return }
      if (!res.ok) return
      const data = await res.json()
      setAuthed(true)
      setItems(data.notifications || [])
      setUnread(data.unread || 0)
    } catch { /* offline — keep silent */ }
  }, [])

  useEffect(() => {
    load()
    timer.current = setInterval(load, POLL_MS)
    return () => clearInterval(timer.current)
  }, [load])

  const readAll = useCallback(async () => {
    await fetch("/api/notifications/read", { method: "POST", body: "{}" })
    setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })))
    setUnread(0)
  }, [])

  if (authed === false) return null
  if (authed === null) {
    return <span className="h-9 w-9" aria-hidden="true" />
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (!open && unread > 0) load()
          setOpen(!open)
        }}
        className="relative rounded-lg p-2 transition-colors hover:bg-[#f0e8d4] dark:hover:bg-white/5"
        aria-label={`Мэдэгдэл (${unread})`}
      >
        {unread > 0 ? (
          <BellRing className="h-5 w-5 text-gold-soft" />
        ) : (
          <Bell className="h-5 w-5 text-current" />
        )}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-[#c9a227] to-[#e7c779] px-1 text-[10px] font-bold text-[#1a150b] shadow-[0_0_8px_rgba(214,180,86,0.6)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#d6b456]/25 bg-[#16120c]/95 text-[#e9e2d3] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-[#d6b456]/20 px-4 py-3">
              <p className="font-display text-lg text-gold-soft">Мэдэгдэл</p>
              {unread > 0 && (
                <button
                  onClick={readAll}
                  className="flex items-center gap-1 rounded-lg border border-[#d6b456]/30 px-2 py-1 text-xs text-gold-soft transition-colors hover:bg-[#d6b456]/10"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Бүгдийг уншсан
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[#cdbf9c]">Мэдэгдэл байхгүй</p>
              ) : (
                items.map((n, i) => (
                  <Link
                    key={n.id || i}
                    href={n.link || "#"}
                    onClick={() => {
                      if (!n.readAt) {
                        fetch("/api/notifications/read", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ids: [n.id] }),
                        })
                        setUnread((u) => Math.max(0, u - 1))
                        setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
                      }
                      setOpen(false)
                    }}
                    className={`block border-b border-[#d6b456]/10 px-4 py-3 transition-colors last:border-0 hover:bg-[#d6b456]/8 ${n.readAt ? "" : "bg-[#c9a227]/6"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-snug ${n.readAt ? "text-[#cdbf9c]" : "text-[#f2e3b0]"}`}>{n.title}</p>
                      <span className="shrink-0 text-[11px] text-slate-500">{timeAgo(n.createdAt)}</span>
                    </div>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#a29578]">{n.body}</p>}
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}