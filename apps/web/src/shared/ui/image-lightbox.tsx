'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function ImageLightbox({
  src,
  alt,
  children
}: {
  src: string
  alt: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) {
      return
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        className="block w-full cursor-zoom-in text-left"
        onClick={() => setOpen(true)}
        aria-label={`View ${alt} larger`}
      >
        {children}
      </button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={() => setOpen(false)}
            >
              <p id={titleId} className="sr-only">
                {alt}
              </p>
              <button
                type="button"
                className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/90 text-foreground shadow-sm hover:bg-white"
                onClick={() => setOpen(false)}
                aria-label="Close image"
              >
                <X className="size-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-h-[90vh] max-w-[min(90vw,1200px)] rounded-lg object-contain shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              />
            </div>,
            document.body
          )
        : null}
    </>
  )
}
