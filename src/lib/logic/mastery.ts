import type { LessonMeta, ExerciseMeta, ProblemProgress, ReviewCard, SolveRating, TrainAttempt } from '@/lib/types'
import { retrievability } from './fsrs'

export const SOLVE_WEIGHT: Record<SolveRating, number> = { alone: 1, hint: 0.7, solution: 0.4 }
export const RECOGNITION_WINDOW = 20
export const MASTERED = 80

export interface MasteryInput {
  exercises: ExerciseMeta[]
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

export function lessonMastery(lessonSlug: string, input: MasteryInput): number {
  const ladder = input.exercises.filter((p) => p.lessons[0] === lessonSlug)
  const progress = new Map(input.progress.map((p) => [p.slug, p]))
  const cards = new Map(input.cards.map((c) => [c.slug, c]))

  let exerciseScore = 0
  if (ladder.length > 0) {
    let sum = 0
    for (const exercise of ladder) {
      const p = progress.get(exercise.slug)
      if (p?.status !== 'solved' || !p.solveRating) continue
      const card = cards.get(exercise.slug)
      sum += SOLVE_WEIGHT[p.solveRating] * (card ? retrievability(card.card, input.now) : 1)
    }
    exerciseScore = sum / ladder.length
  }

  const recognitionScore = recognitionAccuracy(input.attempts, lessonSlug) ?? 0
  return Math.round(100 * (0.7 * exerciseScore + 0.3 * recognitionScore))
}

export function computeMasteries(lessons: LessonMeta[], input: MasteryInput): Map<string, number> {
  return new Map(lessons.map((p) => [p.slug, lessonMastery(p.slug, input)]))
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
