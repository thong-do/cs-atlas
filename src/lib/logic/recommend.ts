import type { LessonMeta } from '@/lib/types'
import { DEFAULT_TRACK, MASTERED } from './lessons'

export const PREREQUISITE_READY = 50

export function recommendedLesson(lessons: LessonMeta[], mastery: Map<string, number>, started: Set<string>): string | null {
  const tracks = started.size > 0 ? started : new Set([DEFAULT_TRACK])
  const order = lessons.filter((l) => tracks.has(l.track))
  const m = (slug: string) => mastery.get(slug) ?? 0
  const ready = order.find((l) => m(l.slug) < MASTERED && l.prerequisites.every((pre) => m(pre) >= PREREQUISITE_READY))
  return (ready ?? order.find((l) => m(l.slug) < MASTERED))?.slug ?? null
}
