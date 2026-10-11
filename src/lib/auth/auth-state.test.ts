import type { Session } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { initialStatus, safeNextPath, stripBasePath, userFromSession } from './auth-state'

const session = (user: Record<string, unknown>) => ({ user: { id: 'u1', ...user } }) as unknown as Session

describe('initialStatus', () => {
  it('is disabled without a client and loading with one', () => {
    expect(initialStatus(false)).toBe('disabled')
    expect(initialStatus(true)).toBe('loading')
  })
})

describe('userFromSession', () => {
  it('null session -> null', () => expect(userFromSession(null)).toBeNull())
  it('maps a GitHub session', () => {
    const s = session({ user_metadata: { name: 'Ann', avatar_url: 'https://a/x.png' }, app_metadata: { provider: 'github' } })
    expect(userFromSession(s)).toEqual({ id: 'u1', name: 'Ann', avatarUrl: 'https://a/x.png', provider: 'github' })
  })
  it('maps a Google session', () => {
    const s = session({ user_metadata: { full_name: 'Bo', picture: 'https://g/p.png' }, app_metadata: { provider: 'google' } })
    expect(userFromSession(s)).toEqual({ id: 'u1', name: 'Bo', avatarUrl: 'https://g/p.png', provider: 'google' })
  })
  it('falls back to the email local part, then Learner', () => {
    expect(userFromSession(session({ email: 'cy@x.io', user_metadata: {}, app_metadata: {} }))?.name).toBe('cy')
    expect(userFromSession(session({ user_metadata: {}, app_metadata: {} }))).toMatchObject({ name: 'Learner', avatarUrl: null })
  })
})

describe('safeNextPath', () => {
  it('allows same-origin paths only', () => {
    expect(safeNextPath('/algorithms/')).toBe('/algorithms/')
    expect(safeNextPath(null)).toBe('/')
    expect(safeNextPath('https://evil.example')).toBe('/')
    expect(safeNextPath('//evil.example')).toBe('/')
    expect(safeNextPath('/\\evil')).toBe('/')
    for (const bad of ['/\t/evil.example', '/\n/evil.example', '/\r/evil.example', '/\\evil.example']) expect(safeNextPath(bad)).toBe('/')
    for (const bad of ['/..//evil.example', '/.//evil', '/a/..//evil', '/x/../..//evil']) expect(safeNextPath(bad)).toBe('/')
    expect(safeNextPath('/algorithms/../tracks/')).toBe('/tracks/')
    expect(safeNextPath('/algorithms/two-pointers/?x=1#h')).toBe('/algorithms/two-pointers/?x=1#h')
  })
})

describe('stripBasePath', () => {
  it('is a no-op for an empty or missing basePath', () => {
    expect(stripBasePath('/settings/', '')).toBe('/settings/')
    expect(stripBasePath('/settings/', undefined)).toBe('/settings/')
  })
  it('strips a matching prefix on a segment boundary', () => {
    expect(stripBasePath('/cs-atlas/settings/', '/cs-atlas')).toBe('/settings/')
    expect(stripBasePath('/cs-atlas', '/cs-atlas')).toBe('/')
    expect(stripBasePath('/cs-atlas/?a=1', '/cs-atlas')).toBe('/?a=1')
    expect(stripBasePath('/cs-atlas?a=1', '/cs-atlas')).toBe('/?a=1')
  })
  it('leaves non-matching paths alone', () => {
    expect(stripBasePath('/cs-atlasx/y/', '/cs-atlas')).toBe('/cs-atlasx/y/')
    expect(stripBasePath('/other/', '/cs-atlas')).toBe('/other/')
  })
})
