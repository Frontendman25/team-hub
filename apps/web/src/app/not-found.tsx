import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        That post or profile is not in TeamHub.
      </p>
      <Link href="/" className="mt-6 inline-block font-medium text-foreground underline">
        Back to Home
      </Link>
    </div>
  )
}
