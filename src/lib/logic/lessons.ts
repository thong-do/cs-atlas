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
 * Exercises that count for a lesson's mastery: its ladder, the exercises whose primary lesson it is.
 * An exercise that also lists a lesson from another track shows there as related practice instead
 * (see relatedExercises), so finishing a track never requires another track's exercises.
 */
export function lessonExercises(
  lesson: LessonMeta,
  exercises: ExerciseMeta[],
): ExerciseMeta[] {
  return exercises.filter((e) => e.lessons[0] === lesson.slug)
}

/** Exercises from other tracks that also list the lesson: shown as related practice, never counted. */
export function relatedExercises(
  lesson: LessonMeta,
  exercises: ExerciseMeta[],
  trackOf: (slug: string) => string | undefined,
): ExerciseMeta[] {
  return exercises.filter(
    (e) => e.lessons[0] !== lesson.slug && e.lessons.includes(lesson.slug) && trackOf(e.lessons[0]) !== lesson.track,
  )
}

/** Exercises whose primary lesson belongs to one of the given tracks. */
export function exercisesInTracks(
  exercises: ExerciseMeta[],
  tracks: Set<string>,
  trackOf: (slug: string) => string | undefined,
): ExerciseMeta[] {
  return exercises.filter((e) => tracks.has(trackOf(e.lessons[0]) ?? ''))
}

export function trackLessons(track: TrackMeta): string[] {
  return track.modules.flatMap((m) => m.lessons)
}

/** True once every lesson in the track is mastered. */
export function trackComplete(track: TrackMeta, masteries: Map<string, number>): boolean {
  const slugs = trackLessons(track)
  return slugs.length > 0 && slugs.every((s) => (masteries.get(s) ?? 0) >= MASTERED)
}

export function trackMastery(track: TrackMeta, masteries: Map<string, number>): number {
  const slugs = trackLessons(track)
  if (slugs.length === 0) return 0
  return Math.round(slugs.reduce((sum, s) => sum + (masteries.get(s) ?? 0), 0) / slugs.length)
}

/** First lesson that is neither mastered nor placed out; then the first unmastered one; then the first lesson. */
export function continueLesson(track: TrackMeta, masteries: Map<string, number>, skipped: Set<string> = new Set()): string | null {
  const slugs = trackLessons(track)
  const open = (s: string) => (masteries.get(s) ?? 0) < MASTERED
  return slugs.find((s) => open(s) && !skipped.has(s)) ?? slugs.find(open) ?? slugs[0] ?? null
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
