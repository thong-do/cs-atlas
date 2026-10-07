import type { LessonMeta, ExerciseMeta, ProblemProgress, ReviewCard, SolveRating, TrainAttempt } from '@/lib/types'
import { retrievability } from './fsrs'
import { MASTERED, TRAINER_TRACK, lessonExercises, trackLookup } from './lessons'

export { MASTERED }

export const SOLVE_WEIGHT: Record<SolveRating, number> = { alone: 1, hint: 0.7, solution: 0.4 }
export const RECOGNITION_WINDOW = 20

export interface MasteryInput {
  exercises: ExerciseMeta[]
  lessons: LessonMeta[]
  progress: ProblemProgress[]
  cards: ReviewCard[]
  attempts: TrainAttempt[]
  now: Date
}

export function recognitionAccuracy(attempts: TrainAttempt[], lessonSlug: string): number | undefined {
  const recent = attempts
    .filter((a) => a.correctPattern === lessonSlug)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, RECOGNITION_WINDOW)
  if (recent.length === 0) return undefined
  return recent.filter((a) => a.correct).length / recent.length
}

export function lessonMastery(lesson: LessonMeta, input: MasteryInput): number {
  const exercises = lessonExercises(lesson, input.exercises, trackLookup(input.lessons))
  const progress = new Map(input.progress.map((p) => [p.slug, p]))
  const cards = new Map(input.cards.map((c) => [c.slug, c]))

  let exerciseScore = 0
  if (exercises.length > 0) {
    let sum = 0
    for (const exercise of exercises) {
      const p = progress.get(exercise.slug)
      if (p?.status !== 'solved' || !p.solveRating) continue
      const card = cards.get(exercise.slug)
      sum += SOLVE_WEIGHT[p.solveRating] * (card ? retrievability(card.card, input.now) : 1)
    }
    exerciseScore = sum / exercises.length
  }

  // Only the trainer's track has recognition data; elsewhere mastery is the exercise score alone.
  if (lesson.track !== TRAINER_TRACK) return Math.round(100 * exerciseScore)
  const recognitionScore = recognitionAccuracy(input.attempts, lesson.slug) ?? 0
  return Math.round(100 * (0.7 * exerciseScore + 0.3 * recognitionScore))
}

export function computeMasteries(lessons: LessonMeta[], input: MasteryInput): Map<string, number> {
  return new Map(lessons.map((l) => [l.slug, lessonMastery(l, input)]))
}

export interface MasteryBaseline {
  store: unknown
  importId?: string
  masteries: Map<string, number>
}

/** Lessons to celebrate: only genuine crossings within the same store and import generation. */
export function shouldCelebrate(prev: MasteryBaseline | null, next: MasteryBaseline): string[] {
  if (!prev || prev.store !== next.store || prev.importId !== next.importId) return []
  return newlyMastered(prev.masteries, next.masteries)
}

export function newlyMastered(prev: Map<string, number>, next: Map<string, number>): string[] {
  return [...next]
    .filter(([slug, value]) => value >= MASTERED && (prev.get(slug) ?? 0) < MASTERED)
    .map(([slug]) => slug)
}
