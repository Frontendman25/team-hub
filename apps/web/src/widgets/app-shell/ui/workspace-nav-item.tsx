'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/shared/lib/cn'

export function WorkspaceNavItem({
  label,
  href,
  locked,
  active,
  mobile,
  children
}: {
  label: string
  href: string
  locked?: boolean
  active?: boolean
  mobile?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const reasonId = useId()
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  const style = mobile
    ? 'flex w-full min-w-0 flex-col items-center gap-1 py-2 text-xs'
    : 'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium'

  if (!locked)
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          style,
          active
            ? 'bg-accent/70 text-foreground'
            : 'text-muted-foreground hover:bg-muted'
        )}
      >
        {children}
      </Link>
    )

  return (
    <div
      ref={container}
      className="relative min-w-0"
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') setOpen(true)
      }}
      onPointerLeave={() => {
        if (!container.current?.contains(document.activeElement)) setOpen(false)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setOpen(false)
          event.stopPropagation()
        }
      }}
    >
      <button
        type="button"
        aria-disabled="true"
        aria-describedby={reasonId}
        className={cn(
          style,
          'cursor-help text-muted-foreground/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
        )}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <span
        id={reasonId}
        role="tooltip"
        hidden={!open}
        className={cn(
          'z-50 rounded-lg bg-foreground px-3 py-2 text-sm font-normal text-white shadow-md',
          mobile
            ? 'fixed inset-x-4 bottom-[calc(8rem+env(safe-area-inset-bottom))]'
            : 'absolute left-full top-0 ml-2 w-64'
        )}
      >
        Create or join a workspace to use {label}.
      </span>
    </div>
  )
}
