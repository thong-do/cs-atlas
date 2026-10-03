import { localDate } from '@/lib/logic/dates'
import { initialReviewRating, newCard, scheduleReview } from '@/lib/logic/fsrs'
import { validateInsight } from '@/lib/logic/insight'
import { buildExport, mergeUserData, type ExportFile } from '@/lib/logic/transfer'
import {
  DEFAULT_SETTINGS, SCHEMA_VERSION,
  type Activity, type Meta, type Note, type ReviewRating, type Settings, type SolveRating, type TrainAttempt, type UserData,
} from '@/lib/types'
import type { LeetHubDB } from './db'
import type { Store } from './types'

const emptyNote = (slug: string): Omit<Note, 'updatedAt'> => ({ slug, insight: '', approach: '', complexity: '', mistakes: '', code: '' })

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
    const valid = validateInsight(insight)
    if (!valid.ok) throw new Error(valid.error)
    const { settings } = await this.getMeta()
    const { db } = this
    await db.transaction('rw', [db.progress, db.notes, db.cards, db.reviewLogs, db.activity], async () => {
      const at = now.toISOString()
      const existing = await db.progress.get(slug)
      await db.progress.put({
        slug, status: 'solved', solveRating, firstSolvedAt: existing?.firstSolvedAt ?? at, needsResolve: false, updatedAt: at,
      })
      const note = await db.notes.get(slug)
      await db.notes.put({ ...(note ?? emptyNote(slug)), insight: valid.value, updatedAt: at })
      const rating = initialReviewRating(solveRating)
      const previous = (await db.cards.get(slug))?.card ?? newCard(now)
      const card = scheduleReview(previous, rating, now, settings.desiredRetention)
      await db.cards.put({ slug, card, due: card.due, updatedAt: at })
      await db.reviewLogs.add({ id: crypto.randomUUID(), slug, rating, reviewedAt: at })
      await this.bump(now, 'solves')
    })
  }

  async saveNote(note: Omit<Note, 'updatedAt'>, now: Date): Promise<void> {
    const valid = validateInsight(note.insight)
    if (!valid.ok) throw new Error(valid.error)
    await this.db.notes.put({ ...note, insight: valid.value, updatedAt: now.toISOString() })
  }

  async recordReview(slug: string, rating: ReviewRating, now: Date): Promise<void> {
    const { settings } = await this.getMeta()
    const { db } = this
    await db.transaction('rw', [db.progress, db.cards, db.reviewLogs, db.activity], async () => {
      const existing = await db.cards.get(slug)
      if (!existing) throw new Error(`No review card for "${slug}"`)
      const at = now.toISOString()
      const card = scheduleReview(existing.card, rating, now, settings.desiredRetention)
      await db.cards.put({ slug, card, due: card.due, updatedAt: at })
      await db.reviewLogs.add({ id: crypto.randomUUID(), slug, rating, reviewedAt: at })
      const progress = await db.progress.get(slug)
      if (progress) await db.progress.put({ ...progress, needsResolve: rating === 'again', updatedAt: at })
      await this.bump(now, 'reviews')
    })
  }

  async recordTrainAttempt(attempt: Omit<TrainAttempt, 'id'>): Promise<void> {
    const { db } = this
    await db.transaction('rw', [db.trainAttempts, db.activity], async () => {
      await db.trainAttempts.add({ ...attempt, id: crypto.randomUUID() })
      await this.bump(new Date(attempt.at), 'trains')
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

  async getUserData(): Promise<UserData> {
    const { db } = this
    const [progress, notes, cards, reviewLogs, trainAttempts, activity, meta] = await Promise.all([
      db.progress.toArray(), db.notes.toArray(), db.cards.toArray(), db.reviewLogs.toArray(),
      db.trainAttempts.toArray(), db.activity.toArray(), this.getMeta(),
    ])
    const byKey = <T>(key: (x: T) => string) => (a: T, b: T) => key(a).localeCompare(key(b))
    return {
      progress: progress.sort(byKey((x) => x.slug)),
      notes: notes.sort(byKey((x) => x.slug)),
      cards: cards.sort(byKey((x) => x.slug)),
      reviewLogs: reviewLogs.sort(byKey((x) => x.id)),
      trainAttempts: trainAttempts.sort(byKey((x) => x.id)),
      activity: activity.sort(byKey((x) => x.date)),
      meta,
    }
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
      await db.meta.put({ ...data.meta, schemaVersion: SCHEMA_VERSION, key: 'meta' })
    })
  }

  private async bump(now: Date, field: keyof Omit<Activity, 'date'>): Promise<void> {
    const date = localDate(now)
    const current = (await this.db.activity.get(date)) ?? { date, reviews: 0, solves: 0, trains: 0 }
    await this.db.activity.put({ ...current, [field]: current[field] + 1 })
  }
}
