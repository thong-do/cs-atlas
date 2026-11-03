import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyticsEnabled, SiteAnalytics } from './analytics'

describe('analytics gate', () => {
  afterEach(() => { vi.unstubAllEnvs() })

  it('is on only for production builds of the production deployment', () => {
    expect(analyticsEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'production' })).toBe(true)
    expect(analyticsEnabled({ NODE_ENV: 'production', NEXT_PUBLIC_VERCEL_ENV: 'production' })).toBe(true)
    expect(analyticsEnabled({ NODE_ENV: 'production' })).toBe(false)
    expect(analyticsEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'preview' })).toBe(false)
    expect(analyticsEnabled({ NODE_ENV: 'development', VERCEL_ENV: 'production' })).toBe(false)
  })

  it('renders nothing in a production build that is not the production deployment (e2e, CI, previews)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_ENV', undefined)
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', undefined)
    expect(SiteAnalytics()).toBeNull()
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect(SiteAnalytics()).toBeNull()
  })

  it('renders the Vercel component in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_ENV', 'production')
    expect(SiteAnalytics()).not.toBeNull()
  })
})
