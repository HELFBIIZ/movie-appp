import React from 'react'

export function SkeletonPoster({ count = 6, className = '' }) {
  return (
    <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3">
          <div className="skeleton aspect-[2/3] w-full rounded-xl" />
          <div className="space-y-2 p-2">
            <div className="skeleton h-5 w-3/4 rounded" />
            <div className="skeleton h-4 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard({ count = 3, className = '' }) {
  return (
    <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="skeleton aspect-video w-full rounded-xl" />
          <div className="mt-4 space-y-3">
            <div className="skeleton h-6 w-3/4 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="skeleton rounded"
          style={{
            height: '1rem',
            width: `${85 - (index % 3) * 15}%`
          }}
        />
      ))}
    </div>
  )
}

export function SkeletonHero({ className = '' }) {
  return (
    <div className={`relative h-[65vh] w-full overflow-hidden bg-black ${className}`}>
      <div className="skeleton absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
        <div className="container max-w-2xl space-y-4 text-white">
          <div className="skeleton h-6 w-24 rounded" />
          <div className="skeleton h-12 w-2/3 rounded" />
          <div className="skeleton h-5 w-1/4 rounded" />
          <div className="space-y-2">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-4/5 rounded" />
          </div>
          <div className="skeleton h-12 w-40 rounded" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonCarousel({ count = 6, className = '' }) {
  return (
    <div className={`flex gap-4 overflow-hidden ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex-none w-40 space-y-2">
          <div className="skeleton aspect-[2/3] rounded-lg" />
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonButton({ className = '' }) {
  return (
    <div className={`skeleton h-12 w-40 rounded ${className}`} />
  )
}

export function SkeletonProfile({ className = '' }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="skeleton h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <div className="skeleton h-5 w-32 rounded" />
        <div className="skeleton h-4 w-24 rounded" />
      </div>
    </div>
  )
}

export function SkeletonPage({ className = '' }) {
  return (
    <div className={`space-y-8 ${className}`}>
      <SkeletonHero />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <div className="skeleton h-8 w-48 rounded" />
        </div>
        <SkeletonPoster count={12} />
      </div>
    </div>
  )
}
