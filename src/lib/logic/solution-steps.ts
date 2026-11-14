import type { SolutionStep, SolveRating } from '@/lib/types'

/** The Mark-solved default for the furthest step opened: the hint or intuition is a hint, any approach is the solution. */
export function ratingForStep(furthest: SolutionStep | null): SolveRating {
  if (furthest === null) return 'alone'
  return furthest === 'hint' || furthest === 'intuition' ? 'hint' : 'solution'
}

/** The step to offer next, given how many of `steps` (hint first) are open; null once all are. */
export function nextStep(steps: SolutionStep[], opened: number): SolutionStep | null {
  return steps[opened] ?? null
}
