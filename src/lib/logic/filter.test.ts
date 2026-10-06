import { describe, expect, it } from 'vitest'
import type { ExerciseMeta, ProblemProgress } from '@/lib/types'
import { filterExercises, exerciseStatus, type ExerciseFilter } from './filter'

const prob = (slug: string, title: string, id: number, lessons: string[], difficulty: ExerciseMeta['difficulty']): ExerciseMeta => ({
  slug, type: 'external-problem', title, leetcodeId: id, url: 'https://leetcode.com/problems/x/', difficulty, lessons, ladderOrder: 1, recognitionPrompt: 'prompt', hint: 'h',
})
const exercises = [
  prob('two-sum', 'Two Sum', 1, ['arrays-hashing'], 'easy'),
  prob('3sum', '3Sum', 15, ['two-pointers'], 'medium'),
  prob('trap', 'Trapping Rain Water', 42, ['two-pointers', 'stack'], 'hard'),
]
const progress = new Map<string, ProblemProgress>([
  ['two-sum', { slug: 'two-sum', status: 'solved', solveRating: 'alone', needsResolve: false, updatedAt: '' }],
  ['3sum', { slug: '3sum', status: 'solved', solveRating: 'hint', needsResolve: true, updatedAt: '' }],
])
const all: ExerciseFilter = { q: '', lesson: 'all', difficulty: 'all', status: 'all' }
const slugs = (f: Partial<ExerciseFilter>) => filterExercises(exercises, progress, { ...all, ...f }).map((p) => p.slug)

describe('exerciseStatus', () => {
  it('derives unsolved, helped and alone', () => {
    expect(exerciseStatus(undefined)).toBe('unsolved')
    expect(exerciseStatus(progress.get('two-sum'))).toBe('alone')
    expect(exerciseStatus(progress.get('3sum'))).toBe('helped')
  })
})

describe('filterExercises', () => {
  it('returns everything with no filters', () => {
    expect(slugs({})).toEqual(['two-sum', '3sum', 'trap'])
  })

  it('searches title case-insensitively and by leetcode id prefix', () => {
    expect(slugs({ q: '  rain ' })).toEqual(['trap'])
    expect(slugs({ q: '15' })).toEqual(['3sum'])
  })

  it('filters by any listed pattern and difficulty', () => {
    expect(slugs({ lesson: 'stack' })).toEqual(['trap'])
    expect(slugs({ lesson: 'two-pointers', difficulty: 'medium' })).toEqual(['3sum'])
  })

  it('filters by status, including needs re-solve', () => {
    expect(slugs({ status: 'unsolved' })).toEqual(['trap'])
    expect(slugs({ status: 'alone' })).toEqual(['two-sum'])
    expect(slugs({ status: 'resolve' })).toEqual(['3sum'])
  })
})
