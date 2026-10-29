import type { Metadata } from 'next'
import { RegisterForm } from '@/features/auth/ui/register-form'

export const metadata: Metadata = {
  title: 'Create account',
  robots: { index: false, follow: false }
}

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Create account</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Then create a private workspace. Or try the public demo first.
      </p>
      <RegisterForm />
    </>
  )
}
