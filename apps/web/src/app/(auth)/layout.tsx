import Link from 'next/link'

export default function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm">
        <Link href="/" className="mb-6 flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm">
            TH
          </span>
          TeamHub
        </Link>
        {children}
      </div>
    </div>
  )
}
