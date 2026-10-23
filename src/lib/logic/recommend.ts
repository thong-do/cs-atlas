import type { LessonMeta } from '@/lib/types'
import { DEFAULT_TRACK, MASTERED } from './lessons'

export const PREREQUISITE_READY = 50

export function recommendedLesson(
  lessons: LessonMeta[],
  mastery: Map<string, number>,
  started: Set<string>,
  skipped: Set<string> = new Set(),
): string | null {
  const tracks = started.size > 0 ? started : new Set([DEFAULT_TRACK])
  const order = lessons.filter((l) => tracks.has(l.track))
  const m = (slug: string) => mastery.get(slug) ?? 0
  const open = (l: LessonMeta) => m(l.slug) < MASTERED
  // A placed-out prerequisite counts as ready: the learner showed they know it.
  const ready = (l: LessonMeta) => open(l) && l.prerequisites.every((pre) => skipped.has(pre) || m(pre) >= PREREQUISITE_READY)
  const fresh = order.filter((l) => !skipped.has(l.slug))
  return (fresh.find(ready) ?? fresh.find(open) ?? order.find(open))?.slug ?? null
}
