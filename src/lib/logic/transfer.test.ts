import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, SCHEMA_VERSION, type UserData } from '@/lib/types'
import { newCard } from './fsrs'
import { buildExport, mergeUserData, parseExport } from './transfer'

const t = (day: number) => new Date(Date.UTC(2026, 9, day)).toISOString()
const empty = (): UserData => ({
  progress: [], notes: [], cards: [], reviewLogs: [], trainAttempts: [], activity: [],
  meta: { schemaVersion: SCHEMA_VERSION, settings: { ...DEFAULT_SETTINGS } },
})
const sample = (): UserData => {
  const card = newCard(new Date(t(1)))
  return {
    ...empty(),
    progress: [{ slug: 'two-sum', status: 'solved', solveRating: 'alone', firstSolvedAt: t(1), needsResolve: false, updatedAt: t(1) }],
    notes: [{ slug: 'two-sum', insight: 'map value to index', approach: '', complexity: '', mistakes: '', code: '', updatedAt: t(1) }],
    cards: [{ slug: 'two-sum', card, due: card.due, updatedAt: t(1) }],
    reviewLogs: [{ id: 'r1', slug: 'two-sum', rating: 'good', reviewedAt: t(1) }],
    trainAttempts: [{ id: 'a1', problemSlug: 'two-sum', correctPattern: 'arrays-hashing', chosenPattern: 'arrays-hashing', correct: true, at: t(1) }],
    activity: [{ date: '2026-10-01', reviews: 1, solves: 1, trains: 1 }],
  }
}

describe('parseExport', () => {
  it('round-trips buildExport through JSON', () => {
    const file = buildExport(sample(), new Date(t(2)))
    const parsed = parseExport(JSON.stringify(file))
    expect(parsed).toEqual({ ok: true, file })
  })

  it('rejects invalid JSON', () => {
    expect(parseExport('{nope')).toEqual({ ok: false, error: 'This file is not valid JSON.' })
  })

  it('rejects files that are not LeetHub backups', () => {
    const r = parseExport(JSON.stringify({ app: 'other' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/^Not a LeetHub backup/)
  })

  it('rejects backups from a newer schema version', () => {
    const file = { ...buildExport(sample(), new Date(t(2))), schemaVersion: SCHEMA_VERSION + 1 }
    expect(parseExport(JSON.stringify(file))).toEqual({
      ok: false, error: 'This backup was made by a newer version of LeetHub. Update the app first.',
    })
  })

  it('rejects out-of-range settings', () => {
    const file = buildExport(sample(), new Date(t(2)))
    file.data.meta.settings.desiredRetention = 1.5
    expect(parseExport(JSON.stringify(file)).ok).toBe(false)
  })
})

describe('mergeUserData', () => {
  it('keeps the newer record per slug in both directions', () => {
    const local = sample()
    const incoming = sample()
    incoming.notes[0] = { ...incoming.notes[0], insight: 'newer', updatedAt: t(5) }
    local.progress[0] = { ...local.progress[0], needsResolve: true, updatedAt: t(6) }
    const merged = mergeUserData(local, incoming)
    expect(merged.notes[0].insight).toBe('newer')
    expect(merged.progress[0].needsResolve).toBe(true)
  })

  it('unions logs and attempts by id and adds unknown slugs', () => {
    const incoming = sample()
    incoming.reviewLogs.push({ id: 'r2', slug: 'x', rating: 'easy', reviewedAt: t(3) })
    incoming.progress.push({ slug: 'x', status: 'solved', solveRating: 'hint', needsResolve: false, updatedAt: t(3) })
    const merged = mergeUserData(sample(), incoming)
    expect(merged.reviewLogs.map((r) => r.id).sort()).toEqual(['r1', 'r2'])
    expect(merged.progress.map((p) => p.slug).sort()).toEqual(['two-sum', 'x'])
  })

  it('takes the per-field max for activity on the same date', () => {
    const local = sample()
    const incoming = sample()
    incoming.activity[0] = { date: '2026-10-01', reviews: 3, solves: 0, trains: 1 }
    expect(mergeUserData(local, incoming).activity).toEqual([{ date: '2026-10-01', reviews: 3, solves: 1, trains: 1 }])
  })

  it('keeps local settings and the latest lastBackupAt', () => {
    const local = sample()
    local.meta = { ...local.meta, lastBackupAt: t(1), settings: { desiredRetention: 0.85, theme: 'dark' } }
    const incoming = sample()
    incoming.meta = { ...incoming.meta, lastBackupAt: t(4) }
    const merged = mergeUserData(local, incoming)
    expect(merged.meta.settings).toEqual({ desiredRetention: 0.85, theme: 'dark' })
    expect(merged.meta.lastBackupAt).toBe(t(4))
  })

  it('is idempotent: merging the same backup twice changes nothing', () => {
    const local = sample()
    const incoming = sample()
    incoming.notes[0] = { ...incoming.notes[0], insight: 'newer', updatedAt: t(5) }
    const once = mergeUserData(local, incoming)
    expect(mergeUserData(once, incoming)).toEqual(once)
  })
})
