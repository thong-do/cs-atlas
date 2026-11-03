import { Analytics } from '@vercel/analytics/next'

type Env = Record<string, string | undefined>

/** Page views are counted on the production deployment only: never in dev, previews, CI or e2e. Read at build time. */
export function analyticsEnabled(env: Env = process.env): boolean {
  return env.NODE_ENV === 'production' && (env.VERCEL_ENV ?? env.NEXT_PUBLIC_VERCEL_ENV) === 'production'
}

export function SiteAnalytics() {
  return analyticsEnabled() ? <Analytics /> : null
}
