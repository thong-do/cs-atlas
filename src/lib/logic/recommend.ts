import type { LessonMeta } from '@/lib/types'
import { MASTERED } from './mastery'

export const PREREQUISITE_READY = 50

export function recommendedLesson(order: string[], lessons: LessonMeta[], mastery: Map<string, number>): string | null {
  const bySlug = new Map(lessons.map((l) => [l.slug, l]))
  const m = (slug: string) => mastery.get(slug) ?? 0
  const ready = order.find(
    (slug) => m(slug) < MASTERED && (bySlug.get(slug)?.prerequisites ?? []).every((pre) => m(pre) >= PREREQUISITE_READY),
  )
  return ready ?? order.find((slug) => m(slug) < MASTERED) ?? null
}
