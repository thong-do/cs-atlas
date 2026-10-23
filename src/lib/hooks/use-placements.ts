'use client'

import { useLive } from '@/lib/store/context'
import type { Placement } from '@/lib/types'

/** Saved placement results keyed by track slug; undefined while settings load. */
export function usePlacements(): Record<string, Placement> | undefined {
  const meta = useLive((s) => s.getMeta())
  return meta && (meta.settings.placements ?? {})
}
