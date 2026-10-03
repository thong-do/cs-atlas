import { describe, expect, it } from 'vitest'
import type { ProblemMeta, ProblemProgress } from '@/lib/types'
import { filterProblems, problemStatus, type ProblemFilter } from './filter'

const prob = (slug: string, title: string, id: number, patterns: string[], difficulty: ProblemMeta['difficulty']): ProblemMeta => ({
  slug, title, leetcodeId: id, url: 'https://leetcode.com/problems/x/', difficulty, patterns, ladderOrder: 1, recognitionPrompt: 'prompt', hint: 'h',
})
const problems = [
  prob('two-sum', 'Two Sum', 1, ['arrays-hashing'], 'easy'),
  prob('3sum', '3Sum', 15, ['two-pointers'], 'medium'),
  prob('trap', 'Trapping Rain Water', 42, ['two-pointers', 'stack'], 'hard'),
]
const progress = new Map<string, ProblemProgress>([
  ['two-sum', { slug: 'two-sum', status: 'solved', solveRating: 'alone', needsResolve: false, updatedAt: '' }],
  ['3sum', { slug: '3sum', status: 'solved', solveRating: 'hint', needsResolve: true, updatedAt: '' }],
])
const all: ProblemFilter = { q: '', pattern: 'all', difficulty: 'all', status: 'all' }
const slugs = (f: Partial<ProblemFilter>) => filterProblems(problems, progress, { ...all, ...f }).map((p) => p.slug)

describe('problemStatus', () => {
  it('derives unsolved, helped and alone', () => {
    expect(problemStatus(undefined)).toBe('unsolved')
    expect(problemStatus(progress.get('two-sum'))).toBe('alone')
    expect(problemStatus(progress.get('3sum'))).toBe('helped')
  })
})

describe('filterProblems', () => {
  it('returns everything with no filters', () => {
    expect(slugs({})).toEqual(['two-sum', '3sum', 'trap'])
  })

  it('searches title case-insensitively and by leetcode id prefix', () => {
    expect(slugs({ q: '  rain ' })).toEqual(['trap'])
    expect(slugs({ q: '15' })).toEqual(['3sum'])
  })

  it('filters by any listed pattern and difficulty', () => {
    expect(slugs({ pattern: 'stack' })).toEqual(['trap'])
    expect(slugs({ pattern: 'two-pointers', difficulty: 'medium' })).toEqual(['3sum'])
  })

  it('filters by status, including needs re-solve', () => {
    expect(slugs({ status: 'unsolved' })).toEqual(['trap'])
    expect(slugs({ status: 'alone' })).toEqual(['two-sum'])
    expect(slugs({ status: 'resolve' })).toEqual(['3sum'])
  })
})
