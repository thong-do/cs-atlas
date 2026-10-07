import type { Difficulty, ExerciseMeta, ProblemProgress } from '@/lib/types'

export type ExerciseStatus = 'unsolved' | 'helped' | 'alone'

export interface ExerciseFilter {
  q: string
  track: string
  lesson: string
  difficulty: 'all' | Difficulty
  status: 'all' | ExerciseStatus | 'resolve'
}

export function exerciseStatus(p?: ProblemProgress): ExerciseStatus {
  if (p?.status !== 'solved') return 'unsolved'
  return p.solveRating === 'alone' ? 'alone' : 'helped'
}

export function filterExercises(
  exercises: ExerciseMeta[], progress: Map<string, ProblemProgress>,
  f: ExerciseFilter,
  trackOf: (slug: string) => string | undefined,
): ExerciseMeta[] {
  const q = f.q.trim().toLowerCase()
  return exercises.filter((p) => {
    const pr = progress.get(p.slug)
    if (q && !p.title.toLowerCase().includes(q) && !String(p.leetcodeId).startsWith(q)) return false
    if (f.track !== 'all' && !p.lessons.some((l) => trackOf(l) === f.track)) return false
    if (f.lesson !== 'all' && !p.lessons.includes(f.lesson)) return false
    if (f.difficulty !== 'all' && p.difficulty !== f.difficulty) return false
    if (f.status === 'resolve') return !!pr?.needsResolve
    if (f.status !== 'all' && exerciseStatus(pr) !== f.status) return false
    return true
  })
}
