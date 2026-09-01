'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

const CarouselContext = React.createContext(null)

export function Carousel({ children, opts = {}, className = '' }) {
  const trackRef = useRef(null)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(true)

  const scrollAmount = useMemo(() => {
    return opts?.slideSize || 320
  }, [opts])

  const updateButtons = () => {
    const el = trackRef.current
    if (!el) return

    const nearStart = el.scrollLeft <= 2
    const nearEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2

    setCanScrollPrev(!nearStart)
    setCanScrollNext(!nearEnd)
  }

  useEffect(() => {
    updateButtons()

    const el = trackRef.current
    if (!el) return

    const handleScroll = () => updateButtons()
    const handleResize = () => updateButtons()

    el.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleResize)

    return () => {
      el.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const scrollByAmount = (direction) => {
    const el = trackRef.current
    if (!el) return

    el.scrollBy({
      left: direction * scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <CarouselContext.Provider value={{ trackRef, scrollByAmount, canScrollPrev, canScrollNext }}>
      <div className={`relative ${className}`}>{children}</div>
    </CarouselContext.Provider>
  )
}

export function CarouselContent({ children, className = '' }) {
  const { trackRef } = React.useContext(CarouselContext)

  return (
    <div
      ref={trackRef}
      className={`flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide ${className}`}
    >
      {children}
    </div>
  )
}

export function CarouselItem({ children, className = '' }) {
  return <div className={`flex-shrink-0 snap-start ${className}`}>{children}</div>
}

export function CarouselNext({ className = '' }) {
  const { scrollByAmount, canScrollNext } = React.useContext(CarouselContext)

  return (
    <button
      type="button"
      onClick={() => scrollByAmount(1)}
      disabled={!canScrollNext}
      className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full border border-gray-200 bg-white p-2 text-lg shadow-md transition-opacity hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      aria-label="Scroll next"
    >
      →
    </button>
  )
}

export function CarouselPrevious({ className = '' }) {
  const { scrollByAmount, canScrollPrev } = React.useContext(CarouselContext)

  return (
    <button
      type="button"
      onClick={() => scrollByAmount(-1)}
      disabled={!canScrollPrev}
      className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full border border-gray-200 bg-white p-2 text-lg shadow-md transition-opacity hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      aria-label="Scroll previous"
    >
      ←
    </button>
  )
}
