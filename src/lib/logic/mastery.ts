import type { PatternMeta, ProblemMeta, ProblemProgress, ReviewCard, SolveRating, TrainAttempt } from '@/lib/types'
import { retrievability } from './fsrs'

export const SOLVE_WEIGHT: Record<SolveRating, number> = { alone: 1, hint: 0.7, solution: 0.4 }
export const RECOGNITION_WINDOW = 20
export const MASTERED = 80

export interface MasteryInput {
  problems: ProblemMeta[]
  progress: ProblemProgress[]
  cards: ReviewCard[]
  attempts: TrainAttempt[]
  now: Date
}

export function recognitionAccuracy(attempts: TrainAttempt[], patternSlug: string): number | undefined {
  const recent = attempts
    .filter((a) => a.correctPattern === patternSlug)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, RECOGNITION_WINDOW)
  if (recent.length === 0) return undefined
  return recent.filter((a) => a.correct).length / recent.length
}

export function patternMastery(patternSlug: string, input: MasteryInput): number {
  const ladder = input.problems.filter((p) => p.patterns[0] === patternSlug)
  const progress = new Map(input.progress.map((p) => [p.slug, p]))
  const cards = new Map(input.cards.map((c) => [c.slug, c]))

  let problemScore = 0
  if (ladder.length > 0) {
    let sum = 0
    for (const problem of ladder) {
      const p = progress.get(problem.slug)
      if (p?.status !== 'solved' || !p.solveRating) continue
      const card = cards.get(problem.slug)
      sum += SOLVE_WEIGHT[p.solveRating] * (card ? retrievability(card.card, input.now) : 1)
    }
    problemScore = sum / ladder.length
  }

  const recognitionScore = recognitionAccuracy(input.attempts, patternSlug) ?? 0
  return Math.round(100 * (0.7 * problemScore + 0.3 * recognitionScore))
}

export function computeMasteries(patterns: PatternMeta[], input: MasteryInput): Map<string, number> {
  return new Map(patterns.map((p) => [p.slug, patternMastery(p.slug, input)]))
}

export interface MasteryBaseline {
  store: unknown
  importId?: string
  masteries: Map<string, number>
}

/** Patterns to celebrate: only genuine crossings within the same store and import generation. */
export function shouldCelebrate(prev: MasteryBaseline | null, next: MasteryBaseline): string[] {
  if (!prev || prev.store !== next.store || prev.importId !== next.importId) return []
  return newlyMastered(prev.masteries, next.masteries)
}

export function newlyMastered(prev: Map<string, number>, next: Map<string, number>): string[] {
  return [...next]
    .filter(([slug, value]) => value >= MASTERED && (prev.get(slug) ?? 0) < MASTERED)
    .map(([slug]) => slug)
}
