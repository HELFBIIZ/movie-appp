import React from 'react'

export function Button({ children, variant = 'default', size = 'md', className = '', ...props }) {
  const baseStyles = 'px-4 py-2 rounded font-medium transition-colors'
  
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
    link: 'text-blue-600 hover:underline p-0',
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
