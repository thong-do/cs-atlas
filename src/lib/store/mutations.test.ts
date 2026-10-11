import { describe, expect, it } from 'vitest'
import { localDate } from '@/lib/logic/dates'
import { applyBump, noteWrite, reviewWrites, solveWrites, sortUserData, trainWrites } from './mutations'

const now = new Date(2026, 9, 3, 9)

describe('mutations', () => {
  it('solveWrites builds progress, note, card, log and a solves bump', () => {
    const w = solveWrites({}, 'two-sum', 'alone', '  map value to index  ', now, 0.9)
    expect(w.progress).toMatchObject({ slug: 'two-sum', status: 'solved', solveRating: 'alone', needsResolve: false, firstSolvedAt: now.toISOString(), updatedAt: now.toISOString() })
    expect(w.note).toMatchObject({ slug: 'two-sum', insight: 'map value to index', approach: '', updatedAt: now.toISOString() })
    expect(Date.parse(w.card!.due)).toBeGreaterThan(now.getTime())
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
    const w = reviewWrites({ progress: solved.progress, card: solved.card }, 's', 'again', later, 0.9)
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
