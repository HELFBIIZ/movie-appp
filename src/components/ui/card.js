import React from 'react'

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-lg border bg-white shadow-sm card-hover transition-all ${className}`}>
      {children}
    </div>
  )
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`p-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`border-b px-6 py-4 dark:border-slate-800 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-xl font-semibold ${className}`}>
      {children}
    </h3>
  )
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`border-t px-6 py-4 dark:border-slate-800 ${className}`}>
      {children}
    </div>
  )
}
