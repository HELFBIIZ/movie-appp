'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  isDark: false,
  toggleTheme: () => {},
})

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let saved = null
    try { saved = localStorage.getItem('theme') } catch { /* Use this visit's preference when storage is blocked. */ }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const nextTheme = saved ? saved === 'dark' : prefersDark

    setIsDark(nextTheme)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light') } catch { /* Theme switching still works without persistence. */ }
  }, [isDark, mounted])

  const toggleTheme = () => setIsDark((current) => !current)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
