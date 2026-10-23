import { exercises, lessons, placements, tracks } from '#site/content'
import type { Catalog, DesignDoc, ExerciseDoc, ExerciseMeta, FlashcardEntry, LessonMeta, PlacementDoc, QuizDoc, TrackMeta } from '@/lib/types'
import { flashcardKey } from './review-keys'

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

// The Velite output, before the validator-only `path` is dropped (prepare deletes it from the emitted data).
type RawExercise = (typeof exercises)[number]

function toExerciseMeta(e: RawExercise): ExerciseMeta {
  const base = { slug: e.slug, title: e.title, lessons: e.lessons, ladderOrder: e.ladderOrder }
  switch (e.type) {
    case 'external-problem':
      return {
        ...base, type: e.type, leetcodeId: e.leetcodeId, url: e.url, difficulty: e.difficulty,
        recognitionPrompt: e.recognitionPrompt, hint: e.hint,
      }
    case 'quiz':
      return { ...base, type: e.type, questionCount: e.questions.length, flashcardIds: e.flashcards.map((f) => f.id) }
    case 'design-prompt':
      return { ...base, type: e.type, kind: e.kind, rubric: e.rubric.map((r) => r.point) }
  }
}

export function getCatalog(): Catalog {
  const sortedTracks = [...tracks].sort((a, b) => a.order - b.order).map(toTrackMeta)
  const order = sortedTracks.flatMap((t) => t.modules.flatMap((m) => m.lessons))
  const rank = new Map(order.map((slug, i) => [slug, i]))
  const flashcards: Record<string, FlashcardEntry> = {}
  for (const e of exercises) {
    if (e.type !== 'quiz') continue
    for (const f of e.flashcards) {
      flashcards[flashcardKey(e.slug, f.id)] = { front: f.front, back: f.back, quiz: e.slug, lesson: e.lessons[0] }
    }
  }
  return {
    tracks: sortedTracks,
    lessons: order.map((slug) => toLessonMeta(lessons.find((l) => l.slug === slug)!)),
    exercises: exercises.map(toExerciseMeta).sort(
      (a, b) => rank.get(a.lessons[0])! - rank.get(b.lessons[0])! || a.ladderOrder - b.ladderOrder,
    ),
    flashcards,
  }
}

export function getLessonDoc(slug: string): LessonDoc | undefined {
  return lessons.find((l) => l.slug === slug) as LessonDoc | undefined
}

export function getExercise(slug: string): ExerciseMeta | undefined {
  const e = exercises.find((x) => x.slug === slug)
  return e && toExerciseMeta(e)
}

/** The full exercise (questions, rubric, reference answer). Server only: keep it out of the client catalog. */
export function getExerciseDoc(slug: string): ExerciseDoc | undefined {
  const e = exercises.find((x) => x.slug === slug)
  if (!e) return undefined
  const meta = toExerciseMeta(e)
  switch (e.type) {
    case 'external-problem':
      return meta as ExerciseDoc
    case 'quiz':
      return { ...(meta as QuizDoc), questions: e.questions, flashcards: e.flashcards }
    case 'design-prompt': {
      const d: DesignDoc = {
        slug: e.slug, title: e.title, lessons: e.lessons, ladderOrder: e.ladderOrder, type: e.type, kind: e.kind,
        prompt: e.prompt, rubric: e.rubric.map((r) => r.point), rubricPoints: e.rubric, reference: e.reference,
        ...(e.hint ? { hint: e.hint } : {}),
      }
      return d
    }
  }
}

/** A track's placement quiz, answers included. Server only, like getExerciseDoc. */
export function getPlacement(track: string): PlacementDoc | undefined {
  const p = placements.find((x) => x.track === track)
  return p && {
    track: p.track,
    questions: p.questions.map(({ module, prompt, choices, answer, explanation }) => ({ module, prompt, choices, answer, explanation })),
  }
}

/** Slugs of tracks that have a placement quiz. */
export function placementTracks(): string[] {
  return placements.map((p) => p.track)
}
