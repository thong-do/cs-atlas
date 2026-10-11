'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { createRemoteApi } from '@/lib/supabase/remote-api'
import { initialStatus, safeNextPath, userFromSession, type AuthStatus, type AuthUser } from './auth-state'

interface AuthValue {
  status: AuthStatus
  user: AuthUser | null
  signIn(provider: 'github' | 'google'): Promise<void>
  signOut(): Promise<void>
  deleteAccount(): Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = getSupabase()
  const [status, setStatus] = useState<AuthStatus>(initialStatus(!!client))
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    if (!client) return
    let alive = true
    const apply = (session: Parameters<typeof userFromSession>[0]) => {
      if (!alive) return
      const u = userFromSession(session)
      // Keep the same object when the user is unchanged, so token refreshes don't churn consumers.
      setUser((prev) => (prev && u && prev.id === u.id && prev.name === u.name && prev.avatarUrl === u.avatarUrl ? prev : u))
      setStatus(u ? 'signed-in' : 'signed-out')
    }
    void client.auth.getSession().then(({ data }) => apply(data.session)).catch(() => apply(null))
    const { data } = client.auth.onAuthStateChange((_e, session) => apply(session))
    return () => { alive = false; data.subscription.unsubscribe() }
  }, [client])

  const signIn = useCallback(async (provider: 'github' | 'google') => {
    if (!client) return
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/auth/callback/?next=${encodeURIComponent(safeNextPath(location.pathname, process.env.NEXT_PUBLIC_BASE_PATH))}`,
      },
    })
    if (error) throw error
  }, [client])

  const signOut = useCallback(async () => {
    if (!client) return
    const { error } = await client.auth.signOut()
    if (error) throw error
  }, [client])

  const deleteAccount = useCallback(async () => {
    if (!client || !user) return
    await createRemoteApi(client, user.id).deleteAccount()
    // The account is gone either way: clear the local session even if the server sign-out call fails (e.g. offline).
    await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
  }, [client, user])

  const value = useMemo(() => ({ status, user, signIn, signOut, deleteAccount }), [status, user, signIn, signOut, deleteAccount])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}
