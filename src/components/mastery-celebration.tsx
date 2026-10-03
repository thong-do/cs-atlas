'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useCatalog } from '@/lib/content/catalog-context'
import { useMasterySnapshot } from '@/lib/hooks/use-masteries'
import { newlyMastered } from '@/lib/logic/mastery'
import type { Store } from '@/lib/store'

export const IMPORT_STARTED_EVENT = 'leethub:import-started'
export const IMPORT_FINISHED_EVENT = 'leethub:import-finished'
/** Live-query snapshots can land shortly after an import resolves; keep absorbing them for a moment. */
const IMPORT_SETTLE_MS = 600

/** Toasts when a pattern crosses mastery 80 during this session (never on first load or store swap). */
export function MasteryCelebration() {
  const snapshot = useMasterySnapshot()
  const { patternBySlug } = useCatalog()
  const prev = useRef<{ store: Store; masteries: Map<string, number> } | null>(null)
  const suppress = useRef(false)

  // A backup import changes all data at once; its snapshots reset the baseline instead of toasting.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onStart = () => {
      clearTimeout(timer)
      suppress.current = true
    }
    const onFinish = () => {
      clearTimeout(timer)
      timer = setTimeout(() => { suppress.current = false }, IMPORT_SETTLE_MS)
    }
    window.addEventListener(IMPORT_STARTED_EVENT, onStart)
    window.addEventListener(IMPORT_FINISHED_EVENT, onFinish)
    return () => {
      clearTimeout(timer)
      window.removeEventListener(IMPORT_STARTED_EVENT, onStart)
      window.removeEventListener(IMPORT_FINISHED_EVENT, onFinish)
    }
  }, [])

  useEffect(() => {
    if (!snapshot) return
    if (!suppress.current && prev.current && prev.current.store === snapshot.store) {
      for (const slug of newlyMastered(prev.current.masteries, snapshot.masteries)) {
        toast.success(`🎉 You mastered ${patternBySlug.get(slug)?.title ?? slug}!`)
      }
    }
    prev.current = snapshot
  }, [snapshot, patternBySlug])

  return null
}
