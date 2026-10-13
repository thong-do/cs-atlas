import { describe, expect, it } from 'vitest'
import { localDate } from '@/lib/logic/dates'
import { flashcardKey } from '@/lib/content/review-keys'
import {
  applyBump, designWrites, noteWrite, quizWrites, reviewRatingFromScore, reviewWrites, solveRatingFromScore, solveWrites, sortUserData, trainWrites,
} from './mutations'

const now = new Date(2026, 9, 3, 9)

describe('mutations', () => {
  it('solveWrites builds progress, note, card, log and a solves bump', () => {
    const w = solveWrites({}, 'two-sum', 'alone', '  map value to index  ', now, 0.9)
    expect(w.progress).toMatchObject({ slug: 'two-sum', status: 'solved', solveRating: 'alone', needsResolve: false, firstSolvedAt: now.toISOString(), updatedAt: now.toISOString() })
    expect(w.note).toMatchObject({ slug: 'two-sum', insight: 'map value to index', approach: '', updatedAt: now.toISOString() })
    expect(Date.parse(w.cards![0].due)).toBeGreaterThan(now.getTime())
    expect(w.log).toMatchObject({ slug: 'two-sum', kind: 'solve', reviewedAt: now.toISOString() })
    expect(w.bump).toEqual({ date: localDate(now), field: 'solves' })
  })

  it('solveWrites keeps firstSolvedAt and the existing note fields', () => {
    const prev = {
      progress: { slug: 's', status: 'solved' as const, solveRating: 'hint' as const, firstSolvedAt: '2026-01-01T00:00:00.000Z', needsResolve: true, updatedAt: '2026-01-01T00:00:00.000Z' },
      note: { slug: 's', insight: 'old', approach: 'two passes', complexity: '', mistakes: '', code: '', updatedAt: '2026-01-01T00:00:00.000Z' },
    }
    const w = solveWrites(prev, 's', 'alone', 'new insight', now, 0.9)
    expect(w.progress?.firstSolvedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(w.progress?.needsResolve).toBe(false)
    expect(w.note?.approach).toBe('two passes')
  })

  it('solveWrites rejects an invalid insight', () => {
    expect(() => solveWrites({}, 's', 'alone', '   ', now, 0.9)).toThrow('Write the key insight in one line.')
  })

  it('reviewWrites reschedules, logs, flags needsResolve on again, and bumps reviews', () => {
    const solved = solveWrites({}, 's', 'alone', 'insight', now, 0.9)
    const later = new Date(2026, 9, 20, 9)
    const w = reviewWrites({ progress: solved.progress, card: solved.cards![0] }, 's', 'again', later, 0.9)
    expect(w.log).toMatchObject({ kind: 'review', rating: 'again' })
    expect(w.progress?.needsResolve).toBe(true)
    expect(w.bump).toEqual({ date: localDate(later), field: 'reviews' })
  })

  it('reviewWrites throws without a card', () => {
    expect(() => reviewWrites({}, 's', 'good', now, 0.9)).toThrow('No review card for "s"')
  })

  it('noteWrite validates and stamps', () => {
    const n = noteWrite({ slug: 's', insight: ' x ', approach: '', complexity: '', mistakes: '', code: '' }, now)
    expect(n).toMatchObject({ insight: 'x', updatedAt: now.toISOString() })
  })

  it('trainWrites assigns an id and bumps trains on the attempt date', () => {
    const at = now.toISOString()
    const w = trainWrites({ problemSlug: 'a', correctPattern: 'tp', chosenPattern: 'tp', correct: true, at })
    expect(w.attempt?.id).toMatch(/[0-9a-f-]{36}/)
    expect(w.bump).toEqual({ date: localDate(now), field: 'trains' })
  })

  it('applyBump starts at zero and increments one field', () => {
    expect(applyBump(undefined, { date: '2026-10-03', field: 'solves' })).toEqual({ date: '2026-10-03', reviews: 0, solves: 1, trains: 0 })
    expect(applyBump({ date: '2026-10-03', reviews: 2, solves: 1, trains: 0 }, { date: '2026-10-03', field: 'reviews' }).reviews).toBe(3)
  })

  it('sortUserData sorts every collection by its key', () => {
    const meta = { schemaVersion: 1, settings: { desiredRetention: 0.9, theme: 'system' as const } }
    const sorted = sortUserData({
      progress: [{ slug: 'b' }, { slug: 'a' }] as never, notes: [], cards: [], reviewLogs: [{ id: '2' }, { id: '1' }] as never,
      trainAttempts: [], activity: [{ date: '2026-10-02' }, { date: '2026-10-01' }] as never, meta,
    })
    expect(sorted.progress.map((p) => p.slug)).toEqual(['a', 'b'])
    expect(sorted.reviewLogs.map((l) => l.id)).toEqual(['1', '2'])
    expect(sorted.activity.map((a) => a.date)).toEqual(['2026-10-01', '2026-10-02'])
  })
})

describe('score mappings', () => {
  it('maps to solve ratings with integer thresholds', () => {
    expect(solveRatingFromScore(4, 5)).toBe('alone')
    expect(solveRatingFromScore(79, 100)).toBe('hint')
    expect(solveRatingFromScore(1, 2)).toBe('hint')
    expect(solveRatingFromScore(49, 100)).toBe('solution')
    expect(solveRatingFromScore(0, 3)).toBe('solution')
  })
  it('maps to review ratings', () => {
    expect(reviewRatingFromScore(5, 5)).toBe('easy')
    expect(reviewRatingFromScore(99, 100)).toBe('good')
    expect(reviewRatingFromScore(4, 5)).toBe('good')
    expect(reviewRatingFromScore(1, 2)).toBe('hard')
    expect(reviewRatingFromScore(49, 100)).toBe('again')
  })
})

describe('quizWrites', () => {
  const empty = { existingCardKeys: new Set<string>() }
  it('first completion: progress, quiz card, one card per flashcard, solve log and bump', () => {
    const w = quizWrites(empty, 'caching-quiz', ['ttl', 'lru'], { correct: 5, total: 5 }, now, 0.9)
    expect(w.progress).toMatchObject({ slug: 'caching-quiz', status: 'solved', solveRating: 'alone', needsResolve: false })
    expect(w.cards!.map((c) => c.slug)).toEqual(['caching-quiz', flashcardKey('caching-quiz', 'ttl'), flashcardKey('caching-quiz', 'lru')])
    expect(w.log).toMatchObject({ slug: 'caching-quiz', kind: 'solve' })
    expect(w.bump).toEqual({ date: localDate(now), field: 'solves' })
  })
  it('retake: reviews the quiz card, never duplicates flashcards, bumps reviews', () => {
    const first = quizWrites(empty, 'q', ['a', 'b'], { correct: 2, total: 5 }, now, 0.9)
    const later = new Date(2026, 9, 20, 9)
    const prev = { progress: first.progress, card: first.cards![0], existingCardKeys: new Set(['q#a', 'q#b']) }
    const w = quizWrites(prev, 'q', ['a', 'b', 'c'], { correct: 5, total: 5 }, later, 0.9)
    expect(w.cards!.map((c) => c.slug)).toEqual(['q', 'q#c'])
    expect(w.log).toMatchObject({ kind: 'review', rating: 'easy' })
    expect(w.progress?.firstSolvedAt).toBe(first.progress?.firstSolvedAt)
    expect(w.bump?.field).toBe('reviews')
  })
  it('schedules new flashcards as again below 80% and good at 80%+', () => {
    const low = quizWrites(empty, 'q', ['a'], { correct: 3, total: 5 }, now, 0.9).cards![1]
    const high = quizWrites(empty, 'q', ['a'], { correct: 4, total: 5 }, now, 0.9).cards![1]
    expect(Date.parse(high.due)).toBeGreaterThan(Date.parse(low.due))
  })
  it('rejects impossible results', () => {
    expect(() => quizWrites(empty, 'q', [], { correct: 1, total: 0 }, now, 0.9)).toThrow('Quiz result must have at least one question.')
    expect(() => quizWrites(empty, 'q', [], { correct: 6, total: 5 }, now, 0.9)).toThrow('Quiz result is out of range.')
  })
})

describe('designWrites', () => {
  it('saves the design as the note approach and scores the rubric', () => {
    const prevNote = { slug: 'd', insight: 'old', approach: 'old', complexity: 'O(1)', mistakes: 'm', code: '', updatedAt: '2026-01-01T00:00:00.000Z' }
    const w = designWrites({ note: prevNote }, 'd', { design: '  cache-aside with TTL  ', insight: ' TTL plus delete on write ', covered: 3, total: 5 }, now, 0.9)
    expect(w.note).toMatchObject({ approach: 'cache-aside with TTL', insight: 'TTL plus delete on write', complexity: 'O(1)', mistakes: 'm' })
    expect(w.progress?.solveRating).toBe('hint')
    expect(w.cards!.map((c) => c.slug)).toEqual(['d'])
    expect(w.log?.kind).toBe('solve')
  })
  it('validates the insight and the design', () => {
    expect(() => designWrites({}, 'd', { design: 'x', insight: 'a\nb', covered: 1, total: 3 }, now, 0.9)).toThrow('single line')
    expect(() => designWrites({}, 'd', { design: '   ', insight: 'ok insight', covered: 1, total: 3 }, now, 0.9)).toThrow('Write your design first.')
  })
})
