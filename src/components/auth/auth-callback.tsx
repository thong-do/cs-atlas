'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { safeNextPath, stripBasePath } from '@/lib/auth/auth-state'
import { getSupabase } from '@/lib/supabase/client'

const MISSING = 'The sign-in link is missing, expired or was cancelled.'

export function AuthCallback() {
  const params = useSearchParams()
  const router = useRouter()
  const code = params.get('code')
  const next = params.get('next')
  const errorDescription = params.get('error_description')
  useEffect(() => {
    // Shown as a fixed message: error_description is attacker-controllable text.
    if (errorDescription) console.warn('Sign-in failed:', errorDescription)
  }, [errorDescription])
  const [exchangeError, setExchangeError] = useState<string | null>(null)
  const started = useRef(false)

  const client = getSupabase()
  const invalid = !client || !code || !!errorDescription

  useEffect(() => {
    if (invalid || started.current) return
    started.current = true
    client!.auth.exchangeCodeForSession(code!).then(({ error }) => {
      if (error) setExchangeError(error.message)
      else router.replace(stripBasePath(safeNextPath(next, process.env.NEXT_PUBLIC_BASE_PATH), process.env.NEXT_PUBLIC_BASE_PATH))
    }).catch((err) => setExchangeError(err instanceof Error ? err.message : String(err)))
  }, [invalid, client, code, next, router])

  const message = exchangeError ?? (invalid ? MISSING : null)
  if (message !== null) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-8">
        <h1 className="text-2xl font-bold">Couldn&apos;t sign you in</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link href="/" className="text-sm underline">Back to Today</Link>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">Signing you in…</h1>
    </div>
  )
}
