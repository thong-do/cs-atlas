import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, SCHEMA_VERSION, type Settings, type UserData } from '@/lib/types'
import { sortUserData } from '@/lib/store/mutations'
import { fromRows, toApplyPayload, toReplacePayload, type RemoteRows } from './rows'

const fixture: UserData = {
  progress: [
    { slug: 'a', status: 'solved', solveRating: 'hint', firstSolvedAt: '2026-10-01T10:00:00.000Z', needsResolve: true, updatedAt: '2026-10-02T10:00:00.000Z' },
    { slug: 'b', status: 'unsolved', needsResolve: false, updatedAt: '2026-10-02T11:00:00.000Z' },
  ],
  notes: [{ slug: 'a', insight: 'i', approach: 'ap', complexity: 'O(n)', mistakes: 'm', code: 'c', updatedAt: '2026-10-02T12:00:00.000Z' }],
  cards: [{
    slug: 'a',
    card: { due: '2026-10-05T00:00:00.000Z', last_review: '2026-10-02T00:00:00.000Z', state: 2, stability: 3.5, difficulty: 5, nested: { x: [1, 2] } },
    due: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-02T12:00:00.000Z',
  }],
  reviewLogs: [{ id: 'l1', slug: 'a', rating: 'good', reviewedAt: '2026-10-02T12:00:00.000Z' }, { id: 'l2', slug: 'a', rating: 'easy', reviewedAt: '2026-10-03T12:00:00.000Z', kind: 'solve' }],
  trainAttempts: [{ id: 't1', problemSlug: 'a', correctPattern: 'p1', chosenPattern: 'p2', correct: false, at: '2026-10-03T01:00:00.000Z' }],
  activity: [{ date: '2026-10-02', reviews: 1, solves: 1, trains: 0 }, { date: '2026-10-03', reviews: 0, solves: 0, trains: 2 }],
  meta: { schemaVersion: SCHEMA_VERSION, settings: { desiredRetention: 0.85, theme: 'dark' }, lastBackupAt: '2026-10-04T00:00:00.000Z' },
}

type P = Record<string, Record<string, unknown>[]> & { profile: { settings: Settings; last_backup_at: string | null } }

function asRows(raw: Record<string, unknown>): RemoteRows {
  const payload = raw as unknown as P
  return {
    profiles: [{ settings: payload.profile.settings, last_backup_at: payload.profile.last_backup_at, display_name: null, avatar_url: null, created_at: '2026-01-01T00:00:00+00:00' }],
    progress: payload.progress, notes: payload.notes, cards: payload.cards,
    review_logs: payload.review_logs, train_attempts: payload.train_attempts, activity: payload.activity,
  } as unknown as RemoteRows
}

describe('rows', () => {
  it('round-trips a full UserData', () => {
    const rows = asRows(toReplacePayload(fixture))
    const back = fromRows(rows)
    expect(back).toEqual(sortUserData(fixture))
    expect(back.meta.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('uses snake_case keys', () => {
    const p = toApplyPayload({ trainAttempts: fixture.trainAttempts }) as unknown as P
    expect(Object.keys(p.train_attempts[0]).sort()).toEqual(['at', 'chosen_pattern', 'correct', 'correct_pattern', 'id', 'problem_slug'])
  })

  it('maps activity increments', () => {
    const p = toApplyPayload({ activityIncrements: [{ date: '2026-10-03', reviews: 0, solves: 1, trains: 0 }] }) as unknown as P
    expect(p.activity_increments).toEqual([{ date: '2026-10-03', reviews: 0, solves: 1, trains: 0 }])
  })

  it('maps the profile and sends null backup time on replace', () => {
    const p = toReplacePayload({ ...fixture, meta: { schemaVersion: 1, settings: DEFAULT_SETTINGS } }) as unknown as P
    expect(p.profile).toEqual({ settings: DEFAULT_SETTINGS, last_backup_at: null })
  })

  it('normalises Postgres timestamps to ISO strings', () => {
    const rows = asRows(toReplacePayload(fixture))
    rows.cards[0].due = '2026-10-03T02:00:00+00:00'
    rows.cards[0].updated_at = '2026-10-03T02:00:00+00:00'
    rows.review_logs[0].reviewed_at = '2026-10-03T02:00:00+00:00'
    rows.profiles[0].last_backup_at = '2026-10-03T02:00:00+00:00'
    const back = fromRows(rows)
    expect(back.cards[0].due).toBe('2026-10-03T02:00:00.000Z')
    expect(back.cards[0].updatedAt).toBe('2026-10-03T02:00:00.000Z')
    expect(back.reviewLogs[0].reviewedAt).toBe('2026-10-03T02:00:00.000Z')
    expect(back.meta.lastBackupAt).toBe('2026-10-03T02:00:00.000Z')
  })

  it('falls back to default settings with no profile row', () => {
    const rows = asRows(toReplacePayload(fixture))
    rows.profiles = []
    const back = fromRows(rows)
    expect(back.meta).toEqual({ schemaVersion: SCHEMA_VERSION, settings: DEFAULT_SETTINGS })
  })
})
