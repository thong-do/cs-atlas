import type { Session } from '@supabase/supabase-js'

export type AuthStatus = 'disabled' | 'loading' | 'signed-out' | 'signed-in'
export interface AuthUser { id: string; name: string; avatarUrl: string | null; provider: 'github' | 'google' | string }

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)

export function userFromSession(session: Session | null): AuthUser | null {
  if (!session) return null
  const u = session.user
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>
  const name = str(meta.name) ?? str(meta.full_name) ?? str(u.email?.split('@')[0]) ?? 'Learner'
  return {
    id: u.id,
    name,
    avatarUrl: str(meta.avatar_url) ?? str(meta.picture),
    provider: str((u.app_metadata as Record<string, unknown> | undefined)?.provider) ?? 'unknown',
  }
}

export function initialStatus(hasClient: boolean): AuthStatus {
  return hasClient ? 'loading' : 'disabled'
}

/** Only same-origin absolute paths are allowed as post-login redirects. */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/'
  return next
}
