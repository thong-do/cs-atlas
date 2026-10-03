import Dexie, { type Table } from 'dexie'
import type { Activity, Meta, Note, ProblemProgress, ReviewCard, ReviewLog, TrainAttempt } from '@/lib/types'

export type MetaRow = Meta & { key: 'meta' }

export class LeetHubDB extends Dexie {
  declare progress: Table<ProblemProgress, string>
  declare notes: Table<Note, string>
  declare cards: Table<ReviewCard, string>
  declare reviewLogs: Table<ReviewLog, string>
  declare trainAttempts: Table<TrainAttempt, string>
  declare activity: Table<Activity, string>
  declare meta: Table<MetaRow, string>

  constructor(name = 'leethub') {
    super(name)
    this.version(1).stores({
      progress: 'slug',
      notes: 'slug',
      cards: 'slug, due',
      reviewLogs: 'id, slug, reviewedAt',
      trainAttempts: 'id, correctPattern, at',
      activity: 'date',
      meta: 'key',
    })
  }
}
