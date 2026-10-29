import { cn } from '@/shared/lib/cn'
import type { ButtonHTMLAttributes } from 'react'

const variants = {
  primary:
    'bg-accent text-accent-foreground hover:bg-accent-hover font-semibold',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  outline: 'border border-border bg-white hover:bg-muted',
  danger: 'text-red-600 hover:bg-red-50'
} as const

type Variant = keyof typeof variants

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'inline-flex h-10 cursor-pointer items-center justify-center rounded-lg px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
