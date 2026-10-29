import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth/ui/login-form'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false }
}

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Use your TeamHub account, or try the public demo without registering.
      </p>
      <LoginForm />
    </>
  )
}
