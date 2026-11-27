'use client';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { collections, genres } from './navigation';

export function BrowseLinks({ onSelect }: { onSelect: () => void }) {
  const linkClass =
    'rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-[#c9a227]/10 hover:text-[#8a6d1f] focus-visible:outline-amber-500 dark:text-slate-300 dark:hover:text-amber-200';
  return (
    <>
      <div className="grid grid-cols-2 gap-1 border-b border-[#c9a227]/15 pb-3">
        {collections.map((item) => (
          <Link key={item.href} href={item.href} onClick={onSelect} className={linkClass}>
            {item.label}
          </Link>
        ))}
      </div>
      <p className="px-3 pb-1 pt-4 text-xs text-slate-500">Төрлөөр үзэх</p>
      <div className="grid grid-cols-2 gap-1">
        {genres.map((genre) => (
          <Link
            key={genre.slug}
            href={`/genre/${genre.slug}`}
            onClick={onSelect}
            className={linkClass}
          >
            {genre.label}
          </Link>
        ))}
      </div>
    </>
  );
}

export default function BrowseMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-[#c9a227]/10 dark:text-slate-300"
      >
        Ангилал{' '}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
        />
      </button>
      {open && (
        <div
          id={id}
          aria-label="Киноны ангилал"
          className="absolute left-0 top-full z-50 mt-3 max-h-[calc(100dvh-6rem)] w-96 overflow-y-auto rounded-2xl border border-[#c9a227]/20 bg-[#faf7f1] p-3 shadow-2xl dark:bg-[#17130e]"
        >
          <BrowseLinks onSelect={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
