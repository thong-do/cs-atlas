'use client'

import { useMemo } from 'react'
import { useCatalog } from '@/lib/content/catalog-context'
import { computeMasteries, type MasteryBaseline } from '@/lib/logic/mastery'
import { useNow } from './use-now'
import { useLive } from '@/lib/store/context'
import type { Store } from '@/lib/store'

export type MasterySnapshot = MasteryBaseline & { store: Store }

export function useMasterySnapshot(): MasterySnapshot | undefined {
  const { patterns, problems } = useCatalog()
  const now = useNow()
  const data = useLive(async (store) => ({ store, ...(await store.getMasteryInputs()) }))
  return useMemo(
    () => data && {
      store: data.store,
      importId: data.importId,
      masteries: computeMasteries(patterns, { problems, progress: data.progress, cards: data.cards, attempts: data.attempts, now }),
    },
    [data, patterns, problems, now],
  )
}

export function useMasteries(): Map<string, number> | undefined {
  return useMasterySnapshot()?.masteries
}
