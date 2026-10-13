import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, SCHEMA_VERSION, type UserData } from '@/lib/types'
import { FakeRemoteApi } from './fake-remote-api'

const empty = (): UserData => ({
  progress: [], notes: [], cards: [], reviewLogs: [], trainAttempts: [], activity: [],
  meta: { schemaVersion: SCHEMA_VERSION, settings: DEFAULT_SETTINGS },
})
const log = (id: string, rating: 'good' | 'easy' = 'good') => ({ id, slug: 'a', rating, reviewedAt: '2026-10-01T00:00:00.000Z' })

describe('FakeRemoteApi', () => {
  it('adds activity increments and clamps negatives at 0', async () => {
    const api = new FakeRemoteApi('user-1')
    await api.applyChanges({ activityIncrements: [{ date: '2026-10-01', reviews: 1, solves: 2, trains: 0 }] })
    await api.applyChanges({ activityIncrements: [{ date: '2026-10-01', reviews: 2, solves: -5, trains: 1 }] })
    expect(api.data.activity).toEqual([{ date: '2026-10-01', reviews: 3, solves: 2, trains: 1 }])
    await api.applyChanges({ activityIncrements: [{ date: '2026-10-09', reviews: -1, solves: 0, trains: 0 }] })
    expect(api.data.activity.find((a) => a.date === '2026-10-09')).toEqual({ date: '2026-10-09', reviews: 0, solves: 0, trains: 0 })
  })

  it('ignores duplicate log and attempt ids', async () => {
    const api = new FakeRemoteApi('user-1')
    await api.applyChanges({ reviewLogs: [log('l1', 'good')] })
    await api.applyChanges({ reviewLogs: [log('l1', 'easy'), log('l2')] })
    expect(api.data.reviewLogs.map((l) => [l.id, l.rating])).toEqual([['l1', 'good'], ['l2', 'good']])
    const t = { id: 't1', problemSlug: 'a', correctPattern: 'x', chosenPattern: 'y', correct: false, at: '2026-10-01T00:00:00.000Z' }
    await api.applyChanges({ trainAttempts: [t] })
    await api.applyChanges({ trainAttempts: [{ ...t, correct: true }] })
    expect(api.data.trainAttempts).toEqual([t])
  })

  it('upserts progress, notes and cards by slug', async () => {
    const api = new FakeRemoteApi('user-1')
    const p = { slug: 'a', status: 'unsolved' as const, needsResolve: false, updatedAt: '2026-10-01T00:00:00.000Z' }
    await api.applyChanges({ progress: [p] })
    await api.applyChanges({ progress: [{ ...p, status: 'solved', updatedAt: '2026-10-02T00:00:00.000Z' }] })
    expect(api.data.progress).toHaveLength(1)
    expect(api.data.progress[0].status).toBe('solved')
  })

  it('merges profile settings and lastBackupAt', async () => {
    const api = new FakeRemoteApi('user-1')
    await api.applyChanges({ profile: { lastBackupAt: '2026-10-05T00:00:00.000Z' } })
    expect(api.data.meta.lastBackupAt).toBe('2026-10-05T00:00:00.000Z')
    expect(api.data.meta.settings).toEqual(DEFAULT_SETTINGS)
    await api.applyChanges({ profile: { settings: { desiredRetention: 0.8, theme: 'dark' } } })
    expect(api.data.meta.settings.theme).toBe('dark')
    expect(api.data.meta.lastBackupAt).toBe('2026-10-05T00:00:00.000Z')
  })

  it('replaceAll clears logs and sets lastBackupAt to the data value', async () => {
    const api = new FakeRemoteApi('user-1')
    await api.applyChanges({ reviewLogs: [log('l1')], profile: { lastBackupAt: '2026-10-05T00:00:00.000Z' } })
    await api.replaceAll({ ...empty(), reviewLogs: [log('l9')] })
    expect(api.data.reviewLogs.map((l) => l.id)).toEqual(['l9'])
    expect(api.data.meta.lastBackupAt).toBeUndefined()
    await api.replaceAll({ ...empty(), meta: { schemaVersion: 1, settings: DEFAULT_SETTINGS, lastBackupAt: '2026-10-06T00:00:00.000Z' } })
    expect(api.data.meta.lastBackupAt).toBe('2026-10-06T00:00:00.000Z')
  })

  it('failNext rejects once, then works', async () => {
    const api = new FakeRemoteApi('user-1')
    api.failNext(new Error('boom'))
    await expect(api.applyChanges({ reviewLogs: [log('l1')] })).rejects.toThrow('boom')
    await api.applyChanges({ reviewLogs: [log('l1')] })
    expect(api.data.reviewLogs).toHaveLength(1)
    api.failNext(new Error('load'))
    await expect(api.loadAll()).rejects.toThrow('load')
    await expect(api.loadAll()).resolves.toBeTruthy()
  })

  it('loadAll returns sorted copies', async () => {
    const api = new FakeRemoteApi('user-1')
    await api.applyChanges({ reviewLogs: [log('b'), log('a')] })
    const loaded = await api.loadAll()
    expect(loaded.reviewLogs.map((l) => l.id)).toEqual(['a', 'b'])
    loaded.reviewLogs[0].rating = 'again'
    loaded.reviewLogs.pop()
    expect(api.data.reviewLogs).toHaveLength(2)
    expect(api.data.reviewLogs.find((l) => l.id === 'a')!.rating).toBe('good')
  })

  it('seed sets state, deleteAccount empties it, and listeners fire', async () => {
    const api = new FakeRemoteApi('user-1')
    expect(api.userId).toBe('user-1')
    api.seed({ ...empty(), reviewLogs: [log('l1')] })
    expect(api.data.reviewLogs).toHaveLength(1)
    const cb = vi.fn()
    const off = api.onRemoteChange(cb)
    api.emitRemoteChange()
    off()
    api.emitRemoteChange()
    expect(cb).toHaveBeenCalledTimes(1)
    await api.deleteAccount()
    expect(api.deleted).toBe(true)
    expect(api.data.reviewLogs).toEqual([])
  })
})
