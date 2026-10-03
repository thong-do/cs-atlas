import type { Difficulty, ProblemMeta, ProblemProgress } from '@/lib/types'

export type ProblemStatus = 'unsolved' | 'helped' | 'alone'

export interface ProblemFilter {
  q: string
  pattern: string
  difficulty: 'all' | Difficulty
  status: 'all' | ProblemStatus | 'resolve'
}

export function problemStatus(p?: ProblemProgress): ProblemStatus {
  if (p?.status !== 'solved') return 'unsolved'
  return p.solveRating === 'alone' ? 'alone' : 'helped'
}

export function filterProblems(problems: ProblemMeta[], progress: Map<string, ProblemProgress>, f: ProblemFilter): ProblemMeta[] {
  const q = f.q.trim().toLowerCase()
  return problems.filter((p) => {
    const pr = progress.get(p.slug)
    if (q && !p.title.toLowerCase().includes(q) && !String(p.leetcodeId).startsWith(q)) return false
    if (f.pattern !== 'all' && !p.patterns.includes(f.pattern)) return false
    if (f.difficulty !== 'all' && p.difficulty !== f.difficulty) return false
    if (f.status === 'resolve') return !!pr?.needsResolve
    if (f.status !== 'all' && problemStatus(pr) !== f.status) return false
    return true
  })
}
