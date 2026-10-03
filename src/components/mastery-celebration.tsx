'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useCatalog } from '@/lib/content/catalog-context'
import { useMasterySnapshot, type MasterySnapshot } from '@/lib/hooks/use-masteries'
import { shouldCelebrate } from '@/lib/logic/mastery'

/** Toasts when a pattern crosses mastery 80 during this session (never on first load, store swap or backup import). */
export function MasteryCelebration() {
  const snapshot = useMasterySnapshot()
  const { patternBySlug } = useCatalog()
  const prev = useRef<MasterySnapshot | null>(null)

  useEffect(() => {
    if (!snapshot) return
    for (const slug of shouldCelebrate(prev.current, snapshot)) {
      toast.success(`🎉 You mastered ${patternBySlug.get(slug)?.title ?? slug}!`)
    }
    prev.current = snapshot
  }, [snapshot, patternBySlug])

  return null
}
