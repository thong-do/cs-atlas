import { Suspense } from 'react'
import { AuthCallback } from '@/components/auth/auth-callback'

export const metadata = { title: 'Signing in · CS Atlas' }

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallback />
    </Suspense>
  )
}
