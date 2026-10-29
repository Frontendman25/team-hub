import { cn } from '@/shared/lib/cn'
import type { TextareaHTMLAttributes } from 'react'

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none ring-accent/40 placeholder:text-muted-foreground focus:ring-2',
        className
      )}
      {...props}
    />
  )
}
