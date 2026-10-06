import { describe, expect, it } from 'vitest'
import type { ExerciseMeta, LessonMeta, ProblemProgress, ReviewCard, TrainAttempt } from '@/lib/types'
import { newCard, scheduleReview } from './fsrs'
import { computeMasteries, newlyMastered, shouldCelebrate, lessonMastery, recognitionAccuracy } from './mastery'

const now = new Date('2026-10-03T09:00:00Z')
const problem = (slug: string, lessons: string[]): ExerciseMeta => ({
  slug, type: 'external-problem', title: slug, leetcodeId: slug.length, url: 'https://leetcode.com/problems/x/', difficulty: 'easy',
  lessons, ladderOrder: 1, recognitionPrompt: 'prompt text', hint: 'hint',
})
const solved = (slug: string, solveRating: ProblemProgress['solveRating']): ProblemProgress => ({
  slug, status: 'solved', solveRating, firstSolvedAt: now.toISOString(), needsResolve: false, updatedAt: now.toISOString(),
})
const freshCard = (slug: string): ReviewCard => {
  const card = scheduleReview(newCard(now), 'good', now, 0.9)
  return { slug, card, due: card.due, updatedAt: now.toISOString() }
}
const attempt = (i: number, pattern: string, correct: boolean): TrainAttempt => ({
  id: `a${i}`, problemSlug: 'p', correctPattern: pattern, chosenPattern: correct ? pattern : 'other', correct,
  at: new Date(now.getTime() + i * 1000).toISOString(),
})

const L = (slug: string, track = 'algorithms'): LessonMeta => ({
  slug, track, title: slug, summary: 's', level: 'beginner', authors: [], prerequisites: [], confusedWith: [], triggers: [],
})
const base = { exercises: [problem('p1', ['tp'])], lessons: [L('tp'), L('other')], progress: [], cards: [], attempts: [], now }

describe('recognitionAccuracy', () => {
  it('is undefined with no attempts for the pattern', () => {
    expect(recognitionAccuracy([attempt(1, 'other', true)], 'tp')).toBeUndefined()
  })

  it('uses only the most recent 20 attempts', () => {
    const attempts = [
      ...Array.from({ length: 5 }, (_, i) => attempt(i, 'tp', false)), // oldest, ignored
      ...Array.from({ length: 20 }, (_, i) => attempt(100 + i, 'tp', true)),
    ]
    expect(recognitionAccuracy(attempts, 'tp')).toBe(1)
  })
})

describe('lessonMastery', () => {
  it('is 0 with nothing done', () => {
    expect(lessonMastery(L('tp'), base)).toBe(0)
  })

  it('gives 70 for the whole ladder solved alone and fresh, with no recognition data', () => {
    expect(lessonMastery(L('tp'), { ...base, progress: [solved('p1', 'alone')], cards: [freshCard('p1')] })).toBe(70)
  })

  it('weights hint and solution solves', () => {
    expect(lessonMastery(L('tp'), { ...base, progress: [solved('p1', 'hint')], cards: [freshCard('p1')] })).toBe(49)
    expect(lessonMastery(L('tp'), { ...base, progress: [solved('p1', 'solution')], cards: [freshCard('p1')] })).toBe(28)
  })

  it('treats a solved problem without a card as fully retrievable', () => {
    expect(lessonMastery(L('tp'), { ...base, progress: [solved('p1', 'alone')] })).toBe(70)
  })

  it('does not count a second lesson in the same track', () => {
    const input = { ...base, exercises: [problem('p1', ['tp']), problem('p2', ['other', 'tp'])], progress: [solved('p2', 'alone')] }
    expect(lessonMastery(L('tp'), input)).toBe(0)
  })

  it('counts a shared exercise for a lesson in another track, without recognition weight', () => {
    const input = {
      ...base,
      lessons: [L('tp'), L('cache', 'system-design')],
      exercises: [problem('p1', ['tp', 'cache'])],
      progress: [solved('p1', 'alone')],
      cards: [freshCard('p1')],
    }
    expect(lessonMastery(L('cache', 'system-design'), input)).toBe(100)
    expect(lessonMastery(L('tp'), input)).toBe(70)
  })

  it('reaches 100 with full problems and perfect recognition', () => {
    const attempts = Array.from({ length: 20 }, (_, i) => attempt(i, 'tp', true))
    expect(lessonMastery(L('tp'), { ...base, progress: [solved('p1', 'alone')], cards: [freshCard('p1')], attempts })).toBe(100)
  })

  it('falls back to recognition only when the ladder is empty (no NaN)', () => {
    const attempts = Array.from({ length: 4 }, (_, i) => attempt(i, 'empty', i % 2 === 0))
    expect(lessonMastery(L('empty'), { ...base, attempts })).toBe(15)
  })

  it('decays as retrievability drops', () => {
    const input = { ...base, progress: [solved('p1', 'alone')], cards: [freshCard('p1')] }
    expect(lessonMastery(L('tp'), { ...input, now: new Date(now.getTime() + 90 * 86_400_000) })).toBeLessThan(70)
  })
})

describe('computeMasteries / newlyMastered', () => {
  it('computes a value for every pattern', () => {
    const map = computeMasteries([L('tp'), L('x')], base)
    expect([...map.keys()]).toEqual(['tp', 'x'])
  })

  it('reports patterns that crossed 80', () => {
    const prev = new Map([['a', 79], ['b', 85], ['c', 10]])
    const next = new Map([['a', 80], ['b', 90], ['c', 50], ['d', 81]])
    expect(newlyMastered(prev, next)).toEqual(['a', 'd'])
  })
})

describe('shouldCelebrate', () => {
  const store = {}
  const snap = (value: number, o: { store?: object; importId?: string } = {}) => ({
    store: o.store ?? store, importId: o.importId, masteries: new Map([['a', value]]),
  })

  it('celebrates genuine crossings within the same store and import generation', () => {
    expect(shouldCelebrate(snap(50, { importId: 'x' }), snap(85, { importId: 'x' }))).toEqual(['a'])
    expect(shouldCelebrate(snap(50), snap(85))).toEqual(['a'])
  })

  it('never celebrates on first snapshot, store swap or after an import', () => {
    expect(shouldCelebrate(null, snap(85))).toEqual([])
    expect(shouldCelebrate(snap(50), snap(85, { store: {} }))).toEqual([])
    expect(shouldCelebrate(snap(50, { importId: 'x' }), snap(85, { importId: 'y' }))).toEqual([])
    expect(shouldCelebrate(snap(50), snap(85, { importId: 'y' }))).toEqual([])
  })
})
