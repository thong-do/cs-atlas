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
  if (!next || !next.startsWith('/')) return '/'
  try {
    // Parse like a browser (which strips tabs/newlines) and accept only results that stay on our origin.
    const base = 'https://cs-atlas.invalid'
    const url = new URL(next, base)
    // Dot-segment normalisation can yield a protocol-relative '//host' path; reject it.
    if (url.origin !== base || url.pathname.startsWith('//')) return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}

/** Drop a leading deploy basePath (Next's router adds it back). No-op when basePath is empty. */
export function stripBasePath(path: string, basePath: string | undefined): string {
  if (!basePath || !path.startsWith(basePath)) return path
  const rest = path.slice(basePath.length)
  if (rest === '') return '/'
  if (rest.startsWith('/')) return rest
  return rest.startsWith('?') || rest.startsWith('#') ? `/${rest}` : path
}
