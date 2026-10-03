import type { PatternMeta } from '@/lib/types'
import { MASTERED } from './mastery'

export const PREREQUISITE_READY = 50

export function recommendedPattern(order: string[], patterns: PatternMeta[], mastery: Map<string, number>): string | null {
  const bySlug = new Map(patterns.map((p) => [p.slug, p]))
  const m = (slug: string) => mastery.get(slug) ?? 0
  const ready = order.find(
    (slug) => m(slug) < MASTERED && (bySlug.get(slug)?.prerequisites ?? []).every((pre) => m(pre) >= PREREQUISITE_READY),
  )
  return ready ?? order.find((slug) => m(slug) < MASTERED) ?? null
}
