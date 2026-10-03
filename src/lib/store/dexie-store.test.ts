import { beforeEach, describe, expect, it } from 'vitest'
import { localDate } from '@/lib/logic/dates'
import { LeetHubDB } from './db'
import { DexieStore } from './dexie-store'
import { NullStore, StoreUnavailableError } from './null-store'

const day = (d: number, h = 9) => new Date(2026, 9, d, h)
let store: DexieStore

beforeEach(() => {
  store = new DexieStore(new LeetHubDB(`test-${crypto.randomUUID()}`))
})

describe('DexieStore.markSolved', () => {
  it('creates progress, note, scheduled card, log and activity', async () => {
    await store.markSolved('two-sum', 'alone', '  map value to index  ', day(3))
    const progress = await store.getProgress('two-sum')
    expect(progress).toMatchObject({ status: 'solved', solveRating: 'alone', needsResolve: false, firstSolvedAt: day(3).toISOString() })
    expect((await store.getNote('two-sum'))?.insight).toBe('map value to index')
    const card = await store.getCard('two-sum')
    expect(Date.parse(card!.due)).toBeGreaterThan(day(3).getTime())
    expect(await store.listReviewLogs('two-sum')).toHaveLength(1)
    expect((await store.listReviewLogs('two-sum'))[0].kind).toBe('solve')
    expect(await store.listActivity()).toEqual([{ date: localDate(day(3)), reviews: 0, solves: 1, trains: 0 }])
  })

  it('rejects an invalid insight without writing anything', async () => {
    await expect(store.markSolved('two-sum', 'alone', '   ', day(3))).rejects.toThrow('Write the key insight in one line.')
    await expect(store.markSolved('two-sum', 'alone', 'a\nb', day(3))).rejects.toThrow('single line')
    expect(await store.hasData()).toBe(false)
  })

  it('re-solving keeps history: firstSolvedAt kept, card rescheduled, needsResolve cleared', async () => {
    await store.markSolved('two-sum', 'solution', 'map value to index', day(3))
    await store.recordReview('two-sum', 'again', day(4))
    expect((await store.getProgress('two-sum'))?.needsResolve).toBe(true)
    const repsBefore = (await store.getCard('two-sum'))!.card.reps as number

    await store.markSolved('two-sum', 'alone', 'hash map of seen values', day(5))
    const progress = await store.getProgress('two-sum')
    expect(progress).toMatchObject({ solveRating: 'alone', needsResolve: false, firstSolvedAt: day(3).toISOString() })
    expect((await store.getCard('two-sum'))!.card.reps).toBe(repsBefore + 1)
    const logs = await store.listReviewLogs('two-sum')
    expect(logs).toHaveLength(3)
    expect(logs.map((l) => l.kind)).toEqual(['solve', 'review', 'solve'])
  })
})

describe('DexieStore reviews', () => {
  it('lists due cards and records reviews', async () => {
    await store.markSolved('a', 'alone', 'insight a', day(3))
    expect(await store.dueCards(day(3, 9))).toHaveLength(0)
    expect(await store.dueCards(day(10))).toHaveLength(1)
    await store.recordReview('a', 'good', day(10))
    expect(await store.dueCards(day(10))).toHaveLength(0)
    expect((await store.listReviewLogs('a')).at(-1)?.kind).toBe('review')
    expect((await store.listActivity()).find((a) => a.date === localDate(day(10)))?.reviews).toBe(1)
  })

  it('throws when reviewing a problem with no card', async () => {
    await expect(store.recordReview('nope', 'good', day(3))).rejects.toThrow('No review card for "nope"')
  })
})

describe('DexieStore notes, training and meta', () => {
  it('validates insight on saveNote', async () => {
    await expect(store.saveNote({ slug: 'a', insight: 'x'.repeat(141), approach: '', complexity: '', mistakes: '', code: '' }, day(3)))
      .rejects.toThrow('Keep it under 140')
  })

  it('records train attempts with activity', async () => {
    await store.recordTrainAttempt({ problemSlug: 'a', correctPattern: 'tp', chosenPattern: 'sw', correct: false, at: day(3).toISOString() })
    expect(await store.listTrainAttempts()).toHaveLength(1)
    expect((await store.listActivity())[0].trains).toBe(1)
  })

  it('returns default meta and saves settings and backup time', async () => {
    expect((await store.getMeta()).settings).toEqual({ desiredRetention: 0.9, theme: 'system' })
    await store.saveSettings({ desiredRetention: 0.85, theme: 'dark' })
    await store.markBackedUp(day(3))
    expect(await store.getMeta()).toMatchObject({ lastBackupAt: day(3).toISOString(), settings: { desiredRetention: 0.85, theme: 'dark' } })
  })
})

describe('DexieStore export/import', () => {
  it('stamps the export time as lastBackupAt inside the file', async () => {
    await store.markSolved('a', 'alone', 'insight a', day(3))
    await store.markBackedUp(day(1))
    const file = await store.exportAll(day(4))
    expect(file.data.meta.lastBackupAt).toBe(day(4).toISOString())
  })

  it('replace-imports into an empty store and reviews still work afterwards', async () => {
    await store.markSolved('a', 'alone', 'insight a', day(3))
    const file = JSON.parse(JSON.stringify(await store.exportAll(day(4))))
    const other = new DexieStore(new LeetHubDB(`test-${crypto.randomUUID()}`))
    await other.importAll(file, 'replace')
    expect((await other.getNote('a'))?.insight).toBe('insight a')
    await expect(other.recordReview('a', 'good', day(12))).resolves.toBeUndefined()
    expect(Date.parse((await other.getCard('a'))!.due)).toBeGreaterThan(day(12).getTime())
  })

  it('merge-import twice is idempotent', async () => {
    await store.markSolved('a', 'alone', 'insight a', day(3))
    const file = await store.exportAll(day(4))
    const other = new DexieStore(new LeetHubDB(`test-${crypto.randomUUID()}`))
    await other.markSolved('b', 'hint', 'insight b', day(3))
    await other.importAll(file, 'merge')
    const once = await other.getUserData()
    await other.importAll(file, 'merge')
    expect(await other.getUserData()).toEqual(once)
    expect(once.progress.map((p) => p.slug).sort()).toEqual(['a', 'b'])
  })
})

describe('DexieStore destructive imports', () => {
  it('replace-import over a non-empty store discards rows not in the file', async () => {
    await store.markSolved('a', 'alone', 'insight a', day(3))
    const file = await store.exportAll(day(4))
    const other = new DexieStore(new LeetHubDB(`test-${crypto.randomUUID()}`))
    await other.markSolved('b', 'hint', 'insight b', day(3))
    await other.importAll(file, 'replace')
    expect(await other.getProgress('b')).toBeUndefined()
    expect(await other.getNote('b')).toBeUndefined()
    expect(await other.getProgress('a')).toBeDefined()
  })

  it('is atomic: a failing import rejects and leaves existing data intact', async () => {
    await store.markSolved('a', 'alone', 'insight a', day(3))
    const file = JSON.parse(JSON.stringify(await store.exportAll(day(4))))
    file.data.progress = [{ status: 'solved' }]
    await expect(store.importAll(file as never, 'replace')).rejects.toBeDefined()
    expect(await store.hasData()).toBe(true)
    expect((await store.getNote('a'))?.insight).toBe('insight a')
  })

  it('merge keeps the newer record on both sides', async () => {
    await store.markSolved('x', 'alone', 'old insight', day(3))
    await store.markSolved('y', 'alone', 'local newer', day(9))
    const other = new DexieStore(new LeetHubDB(`test-${crypto.randomUUID()}`))
    await other.markSolved('x', 'alone', 'incoming newer', day(8))
    await other.markSolved('y', 'alone', 'incoming older', day(4))
    await store.importAll(await other.exportAll(day(10)), 'merge')
    expect((await store.getNote('x'))?.insight).toBe('incoming newer')
    expect((await store.getNote('y'))?.insight).toBe('local newer')
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
