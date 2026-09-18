import React from 'react'

export function Button({ children, variant = 'default', size = 'md', className = '', ...props }) {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors'

const variants = {
    default: 'bg-[#c9a227] text-[#1a150b] font-semibold hover:bg-[#d9b943]',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
    ghost: 'hover:bg-gray-100 dark:hover:bg-white/5',
    link: 'text-[#8a6d1f] hover:underline dark:text-amber-200 p-0',
  }

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
