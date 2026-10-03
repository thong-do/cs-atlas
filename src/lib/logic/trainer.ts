import type { PatternMeta, ProblemMeta, TrainAttempt } from '@/lib/types'
import { recognitionAccuracy } from './mastery'
import { shuffle, type Rng } from './rng'

export interface TrainQuestion {
  problemSlug: string
  prompt: string
  correct: string
  options: string[]
}

export function pickDistractors(correct: string, patterns: PatternMeta[], rng: Rng): string[] {
  const pool = patterns.map((p) => p.slug).filter((slug) => slug !== correct)
  const confused = (patterns.find((p) => p.slug === correct)?.confusedWith ?? []).filter((s) => pool.includes(s))
  const rest = pool.filter((s) => !confused.includes(s))
  return [...shuffle(confused, rng), ...shuffle(rest, rng)].slice(0, 3)
}

export function buildQuestion(problem: ProblemMeta, patterns: PatternMeta[], rng: Rng): TrainQuestion {
  const correct = problem.patterns[0]
  return {
    problemSlug: problem.slug,
    prompt: problem.recognitionPrompt,
    correct,
    options: shuffle([correct, ...pickDistractors(correct, patterns, rng)], rng),
  }
}

export function pickTrainProblems(problems: ProblemMeta[], attempts: TrainAttempt[], count: number, rng: Rng): ProblemMeta[] {
  const weighted = problems
    .filter((p) => p.recognitionPrompt.trim().length > 0)
    .map((p) => ({ p, w: 2 - (recognitionAccuracy(attempts, p.patterns[0]) ?? 0) }))
  const picked: ProblemMeta[] = []
  while (picked.length < count && weighted.length > 0) {
    let r = rng() * weighted.reduce((sum, x) => sum + x.w, 0)
    let i = 0
    while (i < weighted.length - 1 && r >= weighted[i].w) {
      r -= weighted[i].w
      i++
    }
    picked.push(weighted.splice(i, 1)[0].p)
  }
  return picked
}

export function buildRound(
  problems: ProblemMeta[],
  patterns: PatternMeta[],
  attempts: TrainAttempt[],
  count: number,
  rng: Rng,
): TrainQuestion[] {
  return pickTrainProblems(problems, attempts, count, rng).map((p) => buildQuestion(p, patterns, rng))
}
