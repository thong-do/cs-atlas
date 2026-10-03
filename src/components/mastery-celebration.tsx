'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useCatalog } from '@/lib/content/catalog-context'
import { useMasterySnapshot } from '@/lib/hooks/use-masteries'
import { newlyMastered } from '@/lib/logic/mastery'
import type { Store } from '@/lib/store'

/** Toasts when a pattern crosses mastery 80 during this session (never on first load or store swap). */
export function MasteryCelebration() {
  const snapshot = useMasterySnapshot()
  const { patternBySlug } = useCatalog()
  const prev = useRef<{ store: Store; masteries: Map<string, number> } | null>(null)

  useEffect(() => {
    if (!snapshot) return
    if (prev.current && prev.current.store === snapshot.store) {
      for (const slug of newlyMastered(prev.current.masteries, snapshot.masteries)) {
        toast.success(`🎉 You mastered ${patternBySlug.get(slug)?.title ?? slug}!`)
      }
    }
    prev.current = snapshot
  }, [snapshot, patternBySlug])

  return null
}
