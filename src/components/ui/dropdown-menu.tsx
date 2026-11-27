'use client';

import React, {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type Dispatch,
  type SetStateAction,
} from 'react';
type DropdownState = { open: boolean; setOpen: Dispatch<SetStateAction<boolean>>; side: string };
type MenuProps = { children: ReactNode; defaultOpen?: boolean; side?: string };
type ContentProps = { children: ReactNode; align?: string; side?: string; className?: string };
type TriggerProps = {
  children: ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
  asChild?: boolean;
};

const DropdownContext = React.createContext<DropdownState>({
  open: false,
  setOpen: () => {},
  side: 'bottom',
});

export function DropdownMenu({ children, defaultOpen = false, side = 'bottom' }: MenuProps) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && event.target instanceof Node && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <DropdownContext.Provider value={{ open, setOpen, side }}>
      <div ref={ref} className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild = false }: TriggerProps) {
  const { open, setOpen } = React.useContext(DropdownContext);

  const triggerProps: ButtonHTMLAttributes<HTMLButtonElement> = {
    type: 'button',
    onClick: () => setOpen((value) => !value),
    'aria-expanded': open,
    'aria-haspopup': 'menu',
    className: `${children.props?.className || ''} dropdown-trigger`,
  };

  if (asChild) {
    return React.cloneElement(children, triggerProps);
  }

  return (
    <button {...triggerProps} className={`dropdown-trigger ${children.props?.className || ''}`}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  align = 'start',
  side = 'bottom',
  className = '',
}: ContentProps) {
  const { open, side: parentSide } = React.useContext(DropdownContext);
  const actualSide = side || parentSide;

  if (!open) return null;

  const sideClass = actualSide === 'top' ? 'bottom-full' : 'top-full';
  const alignClass = align === 'end' ? 'right-0' : 'left-0';

  return (
    <div
      className={`absolute ${sideClass} ${alignClass} mt-1 mb-1 bg-white border rounded shadow-lg dark:bg-slate-800 dark:border-slate-700 ${className}`}
      role="menu"
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, onClick, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { setOpen } = React.useContext(DropdownContext);
  return (
    <div
      role="menuitem"
      className="px-4 py-2 hover:bg-gray-100 cursor-pointer dark:hover:bg-slate-700 dark:text-slate-200"
      onClick={(event) => {
        onClick?.(event);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </div>
  );
}
