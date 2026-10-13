import { describe, expect, it } from 'vitest'
import { LeetHubDB } from './db'
import { DexieStore } from './dexie-store'
import { NullStore, StoreUnavailableError } from './null-store'
import { runStoreContract } from './store-contract'

const day = (d: number, h = 9) => new Date(2026, 9, d, h)
const makeStore = async () => new DexieStore(new LeetHubDB(`test-${crypto.randomUUID()}`))

runStoreContract('DexieStore', makeStore)

describe('DexieStore specifics', () => {
  it('NullStore returns empty mastery inputs', async () => {
    expect(await new NullStore().getMasteryInputs()).toEqual({ progress: [], cards: [], attempts: [] })
  })

  it('is atomic: a failing import rejects and leaves existing data intact', async () => {
    const store = await makeStore()
    await store.markSolved('a', 'alone', 'insight a', day(3))
    const file = JSON.parse(JSON.stringify(await store.exportAll(day(4))))
    file.data.progress = [{ status: 'solved' }]
    await expect(store.importAll(file as never, 'replace')).rejects.toBeDefined()
    expect(await store.hasData()).toBe(true)
    expect((await store.getNote('a'))?.insight).toBe('insight a')
  })

  it('clearAll empties the store', async () => {
    const store = await makeStore()
    await store.markSolved('a', 'alone', 'insight a', day(3))
    await store.saveSettings({ desiredRetention: 0.85, theme: 'dark' })
    await store.clearAll()
    expect(await store.hasData()).toBe(false)
    expect((await store.getMeta()).settings).toEqual({ desiredRetention: 0.9, theme: 'system' })
  })
})

describe('NullStore', () => {
  it('reads empty and refuses writes', async () => {
    const n = new NullStore()
    expect(await n.listProgress()).toEqual([])
    expect(await n.hasData()).toBe(false)
    await expect(n.markSolved('a', 'alone', 'x', day(3))).rejects.toBeInstanceOf(StoreUnavailableError)
  })

  it('refuses to export so an empty backup is never produced', async () => {
    await expect(new NullStore().exportAll(day(3))).rejects.toBeInstanceOf(StoreUnavailableError)
  })
})
