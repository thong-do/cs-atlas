'use client'

import { useTheme } from 'next-themes'
import { useEffect } from 'react'
import { useLive, useStore, useStoreStatus } from '@/lib/store/context'

/**
 * Keeps next-themes in step with the theme saved in the active store: signing in on a new device,
 * signing out (back to the guest store's theme) and a failed save rolling back all re-apply it.
 */
export function ThemeSync() {
  const store = useStore()
  const { ready, available } = useStoreStatus()
  const { setTheme } = useTheme()
  const meta = useLive((s) => s.getMeta())
  const theme = meta?.settings.theme

  useEffect(() => {
    if (ready && available && theme) setTheme(theme)
  }, [store, ready, available, theme, setTheme])

  return null
}
