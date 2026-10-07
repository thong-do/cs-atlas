import type { ExerciseMeta, LessonMeta, TrackMeta } from '@/lib/types'

/** Mastery at or above this counts as mastered. */
export const MASTERED = 80
/** The only track the pattern-recognition trainer covers. */
export const TRAINER_TRACK = 'algorithms'
/** Where a learner who hasn't started anything is pointed. */
export const DEFAULT_TRACK = 'algorithms'

export function trackLookup(lessons: LessonMeta[]): (slug: string) => string | undefined {
  const map = new Map(lessons.map((l) => [l.slug, l.track]))
  return (slug) => map.get(slug)
}

/**
 * Exercises that count for a lesson: its ladder (exercises whose primary lesson it is), then
 * exercises from other tracks that also list it. A second lesson in the same track does not
 * count, which keeps v1 algorithms mastery unchanged.
 */
export function lessonExercises(
  lesson: LessonMeta,
  exercises: ExerciseMeta[],
  trackOf: (slug: string) => string | undefined,
): ExerciseMeta[] {
  const ladder = exercises.filter((e) => e.lessons[0] === lesson.slug)
  const shared = exercises.filter(
    (e) => e.lessons[0] !== lesson.slug && e.lessons.includes(lesson.slug) && trackOf(e.lessons[0]) !== lesson.track,
  )
  return [...ladder, ...shared]
}

export function trackLessons(track: TrackMeta): string[] {
  return track.modules.flatMap((m) => m.lessons)
}

export function trackMastery(track: TrackMeta, masteries: Map<string, number>): number {
  const slugs = trackLessons(track)
  if (slugs.length === 0) return 0
  return Math.round(slugs.reduce((sum, s) => sum + (masteries.get(s) ?? 0), 0) / slugs.length)
}

export function continueLesson(track: TrackMeta, masteries: Map<string, number>): string | null {
  const slugs = trackLessons(track)
  return slugs.find((s) => (masteries.get(s) ?? 0) < MASTERED) ?? slugs[0] ?? null
}

export function startedTracks(
  exercises: ExerciseMeta[],
  solved: Set<string>,
  trackOf: (slug: string) => string | undefined,
): Set<string> {
  const started = new Set<string>()
  for (const e of exercises) {
    if (!solved.has(e.slug)) continue
    for (const slug of e.lessons) {
      const track = trackOf(slug)
      if (track) started.add(track)
    }
  }
  return started
}
