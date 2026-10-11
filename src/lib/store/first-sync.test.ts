import { describe, expect, it, vi } from 'vitest'
import { FakeRemoteApi } from '@/lib/supabase/fake-remote-api'
import { LeetHubDB } from './db'
import { DexieStore } from './dexie-store'
import { MOVE_FAILED_MESSAGE, moveGuestData } from './first-sync'

const day = (d: number) => new Date(2026, 9, d, 9)
const fresh = () => new DexieStore(new LeetHubDB(`test-${crypto.randomUUID()}`))

async function remoteWith(build: (s: DexieStore) => Promise<void>) {
  const s = fresh()
  await build(s)
  const remote = new FakeRemoteApi('u1')
  remote.seed(await s.getUserData())
  return remote
}

describe('moveGuestData', () => {
  it('empty guest: returns remote data, does not replaceAll', async () => {
    const local = fresh()
    const remote = await remoteWith((s) => s.markSolved('b', 'alone', 'ib', day(3)))
    const spy = vi.spyOn(remote, 'replaceAll')
    const res = await moveGuestData(local, remote)
    expect(res.moved).toBe(0)
    expect(res.data.progress.map((p) => p.slug)).toEqual(['b'])
    expect(spy).not.toHaveBeenCalled()
  })

  it('moves guest progress into an empty account and clears local', async () => {
    const local = fresh()
    await local.markSolved('a', 'alone', 'ia', day(3))
    await local.markSolved('b', 'alone', 'ib', day(3))
    const remote = new FakeRemoteApi('u1')
    const res = await moveGuestData(local, remote)
    expect(res.moved).toBe(2)
    expect(remote.data.progress.map((p) => p.slug).sort()).toEqual(['a', 'b'])
    expect(await local.hasData()).toBe(false)
  })

  it('merges with newest winning and unions review logs', async () => {
    const local = fresh()
    await local.markSolved('a', 'alone', 'guest a', day(5))
    const remote = await remoteWith(async (s) => {
      await s.markSolved('a', 'alone', 'acct a', day(3))
      await s.markSolved('b', 'alone', 'acct b', day(3))
    })
    const accountLogs = remote.data.reviewLogs.length
    const guestLogs = (await local.getUserData()).reviewLogs.length
    const res = await moveGuestData(local, remote)
    expect(res.data.progress.map((p) => p.slug).sort()).toEqual(['a', 'b'])
    expect((await new DexieStore(new LeetHubDB(`t-${crypto.randomUUID()}`)).getUserData()).progress).toEqual([])
    expect(res.data.notes.find((n) => n.slug === 'a')?.insight).toBe('guest a')
    expect(res.data.reviewLogs.length).toBe(accountLogs + guestLogs)
  })

  it('keeps non-default account settings', async () => {
    const local = fresh()
    await local.markSolved('a', 'alone', 'ia', day(3))
    await local.saveSettings({ desiredRetention: 0.9, theme: 'light' })
    const remote = await remoteWith((s) => s.saveSettings({ desiredRetention: 0.9, theme: 'dark' }))
    const res = await moveGuestData(local, remote)
    expect(res.data.meta.settings.theme).toBe('dark')
  })

  it('uses guest settings when account settings are default', async () => {
    const local = fresh()
    await local.markSolved('a', 'alone', 'ia', day(3))
    await local.saveSettings({ desiredRetention: 0.9, theme: 'light' })
    const res = await moveGuestData(local, new FakeRemoteApi('u1'))
    expect(res.data.meta.settings.theme).toBe('light')
  })

  it('upload failure rejects and keeps local data', async () => {
    const local = fresh()
    await local.markSolved('a', 'alone', 'ia', day(3))
    const remote = new FakeRemoteApi('u1')
    const load = remote.loadAll.bind(remote)
    remote.loadAll = async () => { const d = await load(); remote.failNext(new Error('network')); return d }
    await expect(moveGuestData(local, remote)).rejects.toThrow(MOVE_FAILED_MESSAGE)
    expect(await local.hasData()).toBe(true)
  })

  it('load failure rejects and leaves local untouched', async () => {
    const local = fresh()
    await local.markSolved('a', 'alone', 'ia', day(3))
    const remote = new FakeRemoteApi('u1')
    remote.failNext(new Error('network'))
    await expect(moveGuestData(local, remote)).rejects.toThrow(MOVE_FAILED_MESSAGE)
    expect(await local.hasData()).toBe(true)
  })
})
