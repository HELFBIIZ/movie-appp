'use client'

import React, { useEffect, useRef, useState } from 'react'

const DropdownContext = React.createContext({
  open: false,
  setOpen: () => {},
  side: 'bottom',
})

export function DropdownMenu({ children, defaultOpen = false, side = 'bottom' }) {
  const [open, setOpen] = useState(defaultOpen)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <DropdownContext.Provider value={{ open, setOpen, side }}>
      <div ref={ref} className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  )
}

export function DropdownMenuTrigger({ children, asChild = false }) {
  const { open, setOpen } = React.useContext(DropdownContext)

  const triggerProps = {
    type: 'button',
    onClick: () => setOpen((value) => !value),
    'aria-expanded': open,
    'aria-haspopup': 'menu',
    className: `${children.props?.className || ''} dropdown-trigger`,
  }

  if (asChild) {
    return React.cloneElement(children, triggerProps)
  }

  return (
    <button {...triggerProps} className={`dropdown-trigger ${children.props?.className || ''}`}>
      {children}
    </button>
  )
}

export function DropdownMenuContent({ children, align = 'start', side = 'bottom', className = '' }) {
  const { open, side: parentSide } = React.useContext(DropdownContext)
  const actualSide = side || parentSide

  if (!open) return null

  const sideClass = actualSide === 'top' ? 'bottom-full' : 'top-full'
  const alignClass = align === 'end' ? 'right-0' : 'left-0'

  return (
    <div
      className={`absolute ${sideClass} ${alignClass} mt-1 mb-1 bg-white border rounded shadow-lg ${className}`}
      role="menu"
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({ children, onClick, ...props }) {
  return (
    <div
      role="menuitem"
      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
      onClick={(event) => {
        onClick?.(event)
      }}
      {...props}
    >
      {children}
    </div>
  )
}
