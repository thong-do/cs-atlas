import { afterEach, describe, expect, it, vi } from 'vitest'
import { FakeRemoteApi } from '@/lib/supabase/fake-remote-api'
import { DEFAULT_SETTINGS, SCHEMA_VERSION, type UserData } from '@/lib/types'
import { runStoreContract } from './store-contract'
import { OFFLINE_MESSAGE, SAVE_FAILED_MESSAGE, SupabaseStore } from './supabase-store'

const empty = (): UserData => ({
  progress: [], notes: [], cards: [], reviewLogs: [], trainAttempts: [], activity: [],
  meta: { schemaVersion: SCHEMA_VERSION, settings: { ...DEFAULT_SETTINGS } },
})
const day = (d: number, h = 9) => new Date(2026, 9, d, h)
const stores: SupabaseStore[] = []
const make = (remote = new FakeRemoteApi('user-1'), initial = empty()) => {
  const s = new SupabaseStore(remote, initial, { refreshDebounceMs: 0 })
  stores.push(s)
  return s
}
afterEach(() => { stores.splice(0).forEach((s) => s.dispose()); vi.unstubAllGlobals() })

runStoreContract('SupabaseStore', async () => make())

describe('SupabaseStore writes', () => {
  it('applies writes to the snapshot and to the remote', async () => {
    const remote = new FakeRemoteApi('user-1')
    const store = make(remote)
    await store.markSolved('two-sum', 'alone', 'map value to index', day(3))
    expect((await store.getProgress('two-sum'))?.status).toBe('solved')
    expect(remote.data.progress.map((p) => p.slug)).toEqual(['two-sum'])
    expect(remote.data.activity[0].solves).toBe(1)
  })

  it('rolls back and explains when offline', async () => {
    const remote = new FakeRemoteApi('user-1')
    const store = make(remote)
    vi.stubGlobal('navigator', { onLine: false })
    remote.failNext(new Error('fetch failed'))
    await expect(store.markSolved('two-sum', 'alone', 'map value to index', day(3))).rejects.toThrow(OFFLINE_MESSAGE)
    expect(await store.getProgress('two-sum')).toBeUndefined()
    expect(await store.listActivity()).toEqual([])
  })

  it('rolls back with a generic message when online', async () => {
    const remote = new FakeRemoteApi('user-1')
    const store = make(remote)
    vi.stubGlobal('navigator', { onLine: true })
    remote.failNext(new Error('500'))
    await expect(store.saveSettings({ desiredRetention: 0.8, theme: 'dark' })).rejects.toThrow(SAVE_FAILED_MESSAGE)
    expect((await store.getMeta()).settings.theme).toBe('system')
  })

  it('increments activity on the remote instead of overwriting it', async () => {
    const remote = new FakeRemoteApi('user-1')
    remote.seed({ ...empty(), activity: [{ date: '2026-10-03', reviews: 0, solves: 2, trains: 0 }] })
    const store = make(remote, await remote.loadAll())
    await store.markSolved('a', 'alone', 'insight a', day(3))
    expect(remote.data.activity.find((a) => a.date === '2026-10-03')?.solves).toBe(3)
  })
})

describe('SupabaseStore remote changes', () => {
  it('refreshes from the remote on a change event, notifies, and starts a new import generation', async () => {
    const remote = new FakeRemoteApi('user-1')
    const store = make(remote)
    const before = (await store.getMasteryInputs()).importId
    let calls = 0
    store.subscribe(() => { calls++ })
    remote.seed({ ...empty(), progress: [{ slug: 'x', status: 'solved', solveRating: 'alone', firstSolvedAt: day(3).toISOString(), needsResolve: false, updatedAt: day(3).toISOString() }] })
    remote.emitRemoteChange()
    await vi.waitFor(async () => expect((await store.listProgress()).map((p) => p.slug)).toEqual(['x']))
    expect(calls).toBeGreaterThan(0)
    expect((await store.getMasteryInputs()).importId).not.toBe(before)
  })

  it('stops listening after dispose', async () => {
    const remote = new FakeRemoteApi('user-1')
    const store = make(remote)
    store.dispose()
    remote.seed({ ...empty(), progress: [{ slug: 'x', status: 'unsolved', needsResolve: false, updatedAt: day(3).toISOString() }] })
    remote.emitRemoteChange()
    await new Promise((r) => setTimeout(r, 20))
    expect(await store.listProgress()).toEqual([])
  })
})

describe('SupabaseStore imports and account', () => {
  it('merge-import uploads the merged data with replaceAll', async () => {
    const remote = new FakeRemoteApi('user-1')
    const store = make(remote)
    await store.markSolved('a', 'alone', 'insight a', day(3))
    const file = await store.exportAll(day(4))
    const other = make(new FakeRemoteApi('user-2'))
    await other.importAll(file, 'merge')
    expect((await other.listProgress()).map((p) => p.slug)).toEqual(['a'])
  })

  it('getUserData reflects the snapshot and hasData counts progress or attempts', async () => {
    const store = make()
    expect(await store.hasData()).toBe(false)
    await store.recordTrainAttempt({ problemSlug: 'a', correctPattern: 'tp', chosenPattern: 'sw', correct: false, at: day(3).toISOString() })
    expect(await store.hasData()).toBe(true)
    expect((await store.getUserData()).trainAttempts).toHaveLength(1)
  })
})

describe('SupabaseStore robustness', () => {
  it('coalesces a burst of change events into one loadAll', async () => {
    const remote = new FakeRemoteApi('user-1')
    const loadAll = vi.spyOn(remote, 'loadAll')
    const store = new SupabaseStore(remote, empty(), { refreshDebounceMs: 10 })
    stores.push(store)
    for (let i = 0; i < 7; i++) remote.emitRemoteChange()
    await new Promise((r) => setTimeout(r, 40))
    expect(loadAll).toHaveBeenCalledTimes(1)
  })

  it('does not refresh after dispose even when a refresh was already scheduled', async () => {
    const remote = new FakeRemoteApi('user-1')
    const loadAll = vi.spyOn(remote, 'loadAll')
    const store = new SupabaseStore(remote, empty(), { refreshDebounceMs: 10 })
    stores.push(store)
    remote.emitRemoteChange()
    store.dispose()
    await new Promise((r) => setTimeout(r, 40))
    expect(loadAll).not.toHaveBeenCalled()
  })

  it('a failed import leaves the snapshot unchanged', async () => {
    const remote = new FakeRemoteApi('user-1')
    const store = make(remote)
    await store.markSolved('a', 'alone', 'insight a', day(3))
    const file = await store.exportAll(day(4))
    const other = make(new FakeRemoteApi('user-2'))
    await other.markSolved('b', 'alone', 'insight b', day(3))
    const before = await other.getUserData()
    vi.stubGlobal('navigator', { onLine: true })
    const otherRemote = (other as unknown as { remote: FakeRemoteApi }).remote
    otherRemote.failNext(new Error('500'))
    await expect(other.importAll(file, 'replace')).rejects.toThrow(SAVE_FAILED_MESSAGE)
    expect(await other.getUserData()).toEqual(before)
  })

  it('sends at most one activity increment per action', async () => {
    const remote = new FakeRemoteApi('user-1')
    const apply = vi.spyOn(remote, 'applyChanges')
    const store = make(remote)
    await store.markSolved('a', 'alone', 'insight a', day(3))
    await store.recordReview('a', 'good', day(10))
    await store.recordTrainAttempt({ problemSlug: 'a', correctPattern: 'tp', chosenPattern: 'sw', correct: true, at: day(3).toISOString() })
    for (const [c] of apply.mock.calls) expect(c.activityIncrements).toHaveLength(1)
    expect(apply.mock.calls.map(([c]) => c.activityIncrements![0])).toEqual([
      { date: '2026-10-03', reviews: 0, solves: 1, trains: 0 },
      { date: '2026-10-10', reviews: 1, solves: 0, trains: 0 },
      { date: '2026-10-03', reviews: 0, solves: 0, trains: 1 },
    ])
  })

  it('returns copies so callers cannot mutate the snapshot', async () => {
    const store = make()
    await store.markSolved('a', 'alone', 'insight a', day(3))
    const list = await store.listProgress()
    list[0].status = 'unsolved'
    ;(await store.getMeta()).settings.theme = 'dark'
    expect((await store.getProgress('a'))?.status).toBe('solved')
    expect((await store.getMeta()).settings.theme).toBe('system')
  })
})
