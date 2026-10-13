import { flashcardKey } from '@/lib/content/review-keys'
import Dexie from 'dexie'
import { buildExport, mergeUserData, type ExportFile } from '@/lib/logic/transfer'
import {
  DEFAULT_SETTINGS, SCHEMA_VERSION,
  type Meta, type Note, type ReviewRating, type Settings, type SolveRating, type TrainAttempt, type UserData,
} from '@/lib/types'
import type { LeetHubDB } from './db'
import {
  applyBump, designWrites, noteWrite, quizWrites, reviewWrites, solveWrites, sortUserData, trainWrites, type DesignAnswer, type WriteSet,
} from './mutations'
import type { MasteryInputs, Store } from './types'

export class DexieStore implements Store {
  constructor(private readonly db: LeetHubDB) {}

  listProgress() { return this.db.progress.toArray() }
  getProgress(slug: string) { return this.db.progress.get(slug) }
  getNote(slug: string) { return this.db.notes.get(slug) }
  getCard(slug: string) { return this.db.cards.get(slug) }
  listCards() { return this.db.cards.toArray() }
  listTrainAttempts() { return this.db.trainAttempts.toArray() }
  listActivity() { return this.db.activity.toArray() }

  dueCards(now: Date) {
    return this.db.cards.where('due').belowOrEqual(now.toISOString()).sortBy('due')
  }

  listReviewLogs(slug: string) {
    return this.db.reviewLogs.where('slug').equals(slug).sortBy('reviewedAt')
  }

  async markSolved(slug: string, solveRating: SolveRating, insight: string, now: Date): Promise<void> {
    const { settings } = await this.getMeta()
    const { db } = this
    await db.transaction('rw', [db.progress, db.notes, db.cards, db.reviewLogs, db.activity], async () => {
      const prev = { progress: await db.progress.get(slug), note: await db.notes.get(slug), card: await db.cards.get(slug) }
      await this.apply(solveWrites(prev, slug, solveRating, insight, now, settings.desiredRetention))
    })
  }

  async completeQuiz(slug: string, flashcardIds: string[], result: { correct: number; total: number }, now: Date): Promise<void> {
    const { settings } = await this.getMeta()
    const { db } = this
    await db.transaction('rw', [db.progress, db.cards, db.reviewLogs, db.activity], async () => {
      const keys = flashcardIds.map((id) => flashcardKey(slug, id))
      const found = await db.cards.bulkGet(keys)
      const existingCardKeys = new Set(keys.filter((_, i) => found[i]))
      const prev = { progress: await db.progress.get(slug), card: await db.cards.get(slug), existingCardKeys }
      await this.apply(quizWrites(prev, slug, flashcardIds, result, now, settings.desiredRetention))
    })
  }

  async completeDesign(slug: string, answer: DesignAnswer, now: Date): Promise<void> {
    const { settings } = await this.getMeta()
    const { db } = this
    await db.transaction('rw', [db.progress, db.notes, db.cards, db.reviewLogs, db.activity], async () => {
      const prev = { progress: await db.progress.get(slug), note: await db.notes.get(slug), card: await db.cards.get(slug) }
      await this.apply(designWrites(prev, slug, answer, now, settings.desiredRetention))
    })
  }

  async saveNote(note: Omit<Note, 'updatedAt'>, now: Date): Promise<void> {
    await this.db.notes.put(noteWrite(note, now))
  }

  async recordReview(slug: string, rating: ReviewRating, now: Date): Promise<void> {
    const { settings } = await this.getMeta()
    const { db } = this
    await db.transaction('rw', [db.progress, db.cards, db.reviewLogs, db.activity], async () => {
      const prev = { progress: await db.progress.get(slug), card: await db.cards.get(slug) }
      await this.apply(reviewWrites(prev, slug, rating, now, settings.desiredRetention))
    })
  }

  async recordTrainAttempt(attempt: Omit<TrainAttempt, 'id'>): Promise<void> {
    const { db } = this
    await db.transaction('rw', [db.trainAttempts, db.activity], async () => {
      await this.apply(trainWrites(attempt))
    })
  }

  /** Calls `onChange` after any IndexedDB change, from this tab or another. */
  subscribe(onChange: () => void): () => void {
    const listener = () => onChange()
    Dexie.on('storagemutated', listener)
    return () => Dexie.on('storagemutated').unsubscribe(listener)
  }

  async clearAll(): Promise<void> {
    const { db } = this
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()))
    })
  }

  async getMeta(): Promise<Meta> {
    const row = await this.db.meta.get('meta')
    if (!row) return { schemaVersion: SCHEMA_VERSION, settings: { ...DEFAULT_SETTINGS } }
    const { key: _key, ...meta } = row
    return meta
  }

  async saveSettings(settings: Settings): Promise<void> {
    const { db } = this
    await db.transaction('rw', db.meta, async () => {
      await db.meta.put({ ...(await this.getMeta()), settings, key: 'meta' })
    })
  }

  async markBackedUp(now: Date): Promise<void> {
    const { db } = this
    await db.transaction('rw', db.meta, async () => {
      await db.meta.put({ ...(await this.getMeta()), lastBackupAt: now.toISOString(), key: 'meta' })
    })
  }

  async hasData(): Promise<boolean> {
    return (await this.db.progress.count()) + (await this.db.trainAttempts.count()) > 0
  }

  async getMasteryInputs(): Promise<MasteryInputs> {
    const { db } = this
    return db.transaction('r', [db.progress, db.cards, db.trainAttempts, db.meta], async () => {
      const [progress, cards, attempts, meta] = await Promise.all([
        db.progress.toArray(), db.cards.toArray(), db.trainAttempts.toArray(), db.meta.get('meta'),
      ])
      return { progress, cards, attempts, importId: meta?.importId }
    })
  }

  async getUserData(): Promise<UserData> {
    const { db } = this
    const [progress, notes, cards, reviewLogs, trainAttempts, activity, meta] = await Promise.all([
      db.progress.toArray(), db.notes.toArray(), db.cards.toArray(), db.reviewLogs.toArray(),
      db.trainAttempts.toArray(), db.activity.toArray(), this.getMeta(),
    ])
    return sortUserData({ progress, notes, cards, reviewLogs, trainAttempts, activity, meta })
  }

  async exportAll(now: Date): Promise<ExportFile> {
    return buildExport(await this.getUserData(), now)
  }

  async importAll(file: ExportFile, mode: 'replace' | 'merge'): Promise<void> {
    const { db } = this
    await db.transaction('rw', db.tables, async () => {
      const data = mode === 'replace' ? file.data : mergeUserData(await this.getUserData(), file.data)
      await Promise.all(db.tables.map((t) => t.clear()))
      await db.progress.bulkPut(data.progress)
      await db.notes.bulkPut(data.notes)
      await db.cards.bulkPut(data.cards)
      await db.reviewLogs.bulkPut(data.reviewLogs)
      await db.trainAttempts.bulkPut(data.trainAttempts)
      await db.activity.bulkPut(data.activity)
      await db.meta.put({ ...data.meta, schemaVersion: SCHEMA_VERSION, importId: crypto.randomUUID(), key: 'meta' })
    })
  }

  private async apply(w: WriteSet): Promise<void> {
    const { db } = this
    if (w.progress) await db.progress.put(w.progress)
    if (w.note) await db.notes.put(w.note)
    if (w.cards?.length) await db.cards.bulkPut(w.cards)
    if (w.log) await db.reviewLogs.add(w.log)
    if (w.attempt) await db.trainAttempts.add(w.attempt)
    if (w.bump) {
      const current = await db.activity.get(w.bump.date)
      await db.activity.put(applyBump(current, w.bump))
    }
  }
}
