import { cn } from '@/shared/lib/cn'

export function Avatar({
  name,
  src,
  size = 40,
  className
}: {
  name: string
  src?: string | null
  size?: number
  className?: string
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn('rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-accent/40 text-xs font-semibold text-foreground',
        className
      )}
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  )
}
