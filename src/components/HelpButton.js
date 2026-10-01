"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LifeBuoy } from "lucide-react"

export default function HelpButton() {
  const pathname = usePathname()
  if (pathname?.startsWith("/watch")) return null

  return (
    <Link
      href="/help"
      aria-label="Хэрэглэгчийн гарын авлага"
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#c9a227] to-[#e7c779] text-[#1a150b] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5),0_0_22px_-6px_rgba(214,180,86,0.55)] transition-all hover:scale-110 hover:brightness-110 hover:shadow-[0_14px_38px_-8px_rgba(0,0,0,0.6),0_0_30px_-4px_rgba(214,180,86,0.7)]"
    >
      <LifeBuoy className="h-6 w-6" />
    </Link>
  )
}