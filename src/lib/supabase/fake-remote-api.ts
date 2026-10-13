import { DEFAULT_SETTINGS, SCHEMA_VERSION, type UserData } from '@/lib/types'
import { sortUserData } from '@/lib/store/mutations'
import type { RemoteApi } from './remote-api'
import type { Changes } from './rows'

const emptyData = (): UserData => ({
  progress: [], notes: [], cards: [], reviewLogs: [], trainAttempts: [], activity: [],
  meta: { schemaVersion: SCHEMA_VERSION, settings: { ...DEFAULT_SETTINGS } },
})
const clone = <T>(x: T): T => structuredClone(x)

function upsertBy<T>(list: T[], items: T[], key: (x: T) => string) {
  for (const item of items) {
    const i = list.findIndex((x) => key(x) === key(item))
    if (i >= 0) list[i] = clone(item)
    else list.push(clone(item))
  }
}
function insertIgnoring<T>(list: T[], items: T[], key: (x: T) => string) {
  for (const item of items) if (!list.some((x) => key(x) === key(item))) list.push(clone(item))
}

/** In-memory RemoteApi with the same semantics as the SQL functions (apply_changes / replace_all / delete_my_account). */
export class FakeRemoteApi implements RemoteApi {
  private state: UserData = emptyData()
  private listeners = new Set<() => void>()
  private nextError: Error | null = null
  deleted = false

  constructor(public userId: string) {}

  /** Current server-side state (a live reference, for assertions). */
  get data(): UserData { return this.state }

  seed(data: UserData) { this.state = clone(data) }
  failNext(err: Error) { this.nextError = err }
  emitRemoteChange() { for (const cb of [...this.listeners]) cb() }

  private maybeFail() {
    if (this.nextError) {
      const e = this.nextError
      this.nextError = null
      throw e
    }
  }

  async loadAll(): Promise<UserData> {
    this.maybeFail()
    return sortUserData(clone(this.state))
  }

  async applyChanges(c: Changes): Promise<void> {
    this.maybeFail()
    const s = this.state
    if (c.progress) upsertBy(s.progress, c.progress, (x) => x.slug)
    if (c.notes) upsertBy(s.notes, c.notes, (x) => x.slug)
    if (c.cards) upsertBy(s.cards, c.cards, (x) => x.slug)
    if (c.reviewLogs) insertIgnoring(s.reviewLogs, c.reviewLogs, (x) => x.id)
    if (c.trainAttempts) insertIgnoring(s.trainAttempts, c.trainAttempts, (x) => x.id)
    for (const inc of c.activityIncrements ?? []) {
      const add = { reviews: Math.max(inc.reviews, 0), solves: Math.max(inc.solves, 0), trains: Math.max(inc.trains, 0) }
      const row = s.activity.find((a) => a.date === inc.date)
      if (row) {
        row.reviews += add.reviews
        row.solves += add.solves
        row.trains += add.trains
      } else s.activity.push({ date: inc.date, ...add })
    }
    if (c.profile) {
      if (c.profile.settings) s.meta.settings = clone(c.profile.settings)
      if (c.profile.lastBackupAt) s.meta.lastBackupAt = c.profile.lastBackupAt
    }
  }

  async replaceAll(data: UserData): Promise<void> {
    this.maybeFail()
    const d = clone(data)
    const next = emptyData()
    next.progress = d.progress
    next.notes = d.notes
    next.cards = d.cards
    insertIgnoring(next.reviewLogs, d.reviewLogs, (x) => x.id)
    insertIgnoring(next.trainAttempts, d.trainAttempts, (x) => x.id)
    next.activity = d.activity
    next.meta.settings = d.meta.settings ?? this.state.meta.settings
    if (d.meta.lastBackupAt) next.meta.lastBackupAt = d.meta.lastBackupAt
    this.state = next
  }

  async deleteAccount(): Promise<void> {
    this.deleted = true
    this.state = emptyData()
  }

  onRemoteChange(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }
}
