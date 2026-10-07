import { exercises, lessons, tracks } from '#site/content'
import type { Catalog, ExerciseMeta, LessonMeta, TrackMeta } from '@/lib/types'

export interface TocEntry {
  title: string
  url: string
  items: TocEntry[]
}

export type LessonDoc = LessonMeta & { body: string; toc: TocEntry[] }

function toTrackMeta(t: TrackMeta): TrackMeta {
  return {
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    order: t.order,
    modules: t.modules.map((m) => ({ slug: m.slug, title: m.title, lessons: m.lessons, comingSoon: m.comingSoon })),
  }
}

function toLessonMeta(l: LessonMeta): LessonMeta {
  return {
    slug: l.slug,
    track: l.track,
    title: l.title,
    summary: l.summary,
    level: l.level,
    authors: l.authors,
    prerequisites: l.prerequisites,
    confusedWith: l.confusedWith,
    triggers: l.triggers,
    ...(l.complexity ? { complexity: l.complexity } : {}),
  }
}

function toExerciseMeta(e: ExerciseMeta): ExerciseMeta {
  return {
    slug: e.slug,
    type: e.type,
    title: e.title,
    leetcodeId: e.leetcodeId,
    url: e.url,
    difficulty: e.difficulty,
    lessons: e.lessons,
    ladderOrder: e.ladderOrder,
    recognitionPrompt: e.recognitionPrompt,
    hint: e.hint,
  }
}

export function getCatalog(): Catalog {
  const sortedTracks = [...tracks].sort((a, b) => a.order - b.order).map(toTrackMeta)
  const order = sortedTracks.flatMap((t) => t.modules.flatMap((m) => m.lessons))
  const rank = new Map(order.map((slug, i) => [slug, i]))
  return {
    tracks: sortedTracks,
    lessons: order.map((slug) => toLessonMeta(lessons.find((l) => l.slug === slug)!)),
    exercises: (exercises as ExerciseMeta[]).map(toExerciseMeta).sort(
      (a, b) => rank.get(a.lessons[0])! - rank.get(b.lessons[0])! || a.ladderOrder - b.ladderOrder,
    ),
  }
}

export function getLessonDoc(slug: string): LessonDoc | undefined {
  return lessons.find((l) => l.slug === slug) as LessonDoc | undefined
}

export function getExercise(slug: string): ExerciseMeta | undefined {
  const e = (exercises as ExerciseMeta[]).find((x) => x.slug === slug)
  return e && toExerciseMeta(e)
}
