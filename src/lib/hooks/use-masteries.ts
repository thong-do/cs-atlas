'use client'

import { useMemo } from 'react'
import { useCatalog } from '@/lib/content/catalog-context'
import { computeMasteries } from '@/lib/logic/mastery'
import { useNow } from './use-now'
import { useLive } from '@/lib/store/context'
import type { Store } from '@/lib/store'

export function useMasterySnapshot(): { store: Store; masteries: Map<string, number> } | undefined {
  const { patterns, problems } = useCatalog()
  const now = useNow()
  const data = useLive(async (store) => ({
    store,
    progress: await store.listProgress(),
    cards: await store.listCards(),
    attempts: await store.listTrainAttempts(),
  }))
  return useMemo(
    () => data && {
      store: data.store,
      masteries: computeMasteries(patterns, { problems, progress: data.progress, cards: data.cards, attempts: data.attempts, now }),
    },
    [data, patterns, problems, now],
  )
}

export function useMasteries(): Map<string, number> | undefined {
  return useMasterySnapshot()?.masteries
}
