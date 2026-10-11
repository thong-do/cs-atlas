import { buildExport, mergeUserData, type ExportFile } from '@/lib/logic/transfer'
import type { RemoteApi } from '@/lib/supabase/remote-api'
import type { Changes } from '@/lib/supabase/rows'
import {
  SCHEMA_VERSION,
  type Meta, type Note, type ReviewRating, type Settings, type SolveRating, type TrainAttempt, type UserData,
} from '@/lib/types'
import { applyBump, noteWrite, reviewWrites, solveWrites, sortUserData, trainWrites, type WriteSet } from './mutations'
import type { MasteryInputs, Store } from './types'

export const OFFLINE_MESSAGE = "You're offline — this change wasn't saved."
export const SAVE_FAILED_MESSAGE = "Couldn't save to your account. Try again."

const clone = <T>(x: T): T => structuredClone(x)

function saveError(): Error {
  return new Error(typeof navigator !== 'undefined' && navigator.onLine === false ? OFFLINE_MESSAGE : SAVE_FAILED_MESSAGE)
}

function upsert<T>(list: T[], item: T, key: (x: T) => string): void {
  const i = list.findIndex((x) => key(x) === key(item))
  if (i >= 0) list[i] = item
  else list.push(item)
}

function applyWriteSet(d: UserData, w: WriteSet): void {
  if (w.progress) upsert(d.progress, w.progress, (x) => x.slug)
  if (w.note) upsert(d.notes, w.note, (x) => x.slug)
  if (w.card) upsert(d.cards, w.card, (x) => x.slug)
  if (w.log) d.reviewLogs.push(w.log)
  if (w.attempt) d.trainAttempts.push(w.attempt)
  if (w.bump) {
    const { date } = w.bump
    upsert(d.activity, applyBump(d.activity.find((a) => a.date === date), w.bump), (x) => x.date)
  }
}

/** One user action = at most one activity increment (one date), as apply_changes requires. */
function changesFromWriteSet(w: WriteSet): Changes {
  const c: Changes = {}
  if (w.progress) c.progress = [w.progress]
  if (w.note) c.notes = [w.note]
  if (w.card) c.cards = [w.card]
  if (w.log) c.reviewLogs = [w.log]
  if (w.attempt) c.trainAttempts = [w.attempt]
  if (w.bump) {
    const { date, field } = w.bump
    c.activityIncrements = [{ date, reviews: 0, solves: 0, trains: 0, [field]: 1 }]
  }
  return c
}

/** Store backed by a signed-in user's Supabase data: in-memory snapshot, optimistic writes, Realtime refresh. */
export class SupabaseStore implements Store {
  private data: UserData
  private listeners = new Set<() => void>()
  private readonly offRemote: () => void
  private readonly onVisibility?: () => void
  private readonly debounceMs: number
  private timer: ReturnType<typeof setTimeout> | undefined
  private refreshSeq = 0
  private disposed = false

  constructor(private readonly remote: RemoteApi, initial: UserData, opts?: { refreshDebounceMs?: number }) {
    // importId stays as given (normally undefined): the contract requires no import generation until an import/refresh.
    this.data = sortUserData(clone(initial))
    this.debounceMs = opts?.refreshDebounceMs ?? 300
    this.offRemote = remote.onRemoteChange(() => this.scheduleRefresh())
    if (typeof document !== 'undefined') {
      this.onVisibility = () => { if (document.visibilityState === 'visible') this.scheduleRefresh() }
      document.addEventListener('visibilitychange', this.onVisibility)
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.offRemote()
    if (this.onVisibility) document.removeEventListener('visibilitychange', this.onVisibility)
    clearTimeout(this.timer)
    this.timer = undefined
  }

  // ---- reads ----
  async listProgress() { return clone(this.data.progress) }
  async getProgress(slug: string) { return clone(this.data.progress.find((p) => p.slug === slug)) }
  async getNote(slug: string) { return clone(this.data.notes.find((n) => n.slug === slug)) }
  async getCard(slug: string) { return clone(this.data.cards.find((c) => c.slug === slug)) }
  async listCards() { return clone(this.data.cards) }
  async listTrainAttempts() { return clone(this.data.trainAttempts) }
  async listActivity() { return clone(this.data.activity) }

  async dueCards(now: Date) {
    const at = now.toISOString()
    return clone(this.data.cards.filter((c) => c.due <= at).sort((a, b) => a.due.localeCompare(b.due)))
  }

  async listReviewLogs(slug: string) {
    return clone(this.data.reviewLogs.filter((l) => l.slug === slug).sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt)))
  }

  async getMeta(): Promise<Meta> { return clone(this.data.meta) }

  async hasData(): Promise<boolean> {
    return this.data.progress.length + this.data.trainAttempts.length > 0
  }

  async getMasteryInputs(): Promise<MasteryInputs> {
    const { progress, cards, trainAttempts, meta } = this.data
    return clone({ progress, cards, attempts: trainAttempts, importId: meta.importId })
  }

  async getUserData(): Promise<UserData> { return this.getUserDataSync() }

  async exportAll(now: Date): Promise<ExportFile> {
    return buildExport(this.getUserDataSync(), now)
  }

  // ---- writes ----
  async markSolved(slug: string, solveRating: SolveRating, insight: string, now: Date): Promise<void> {
    const d = this.data
    const prev = { progress: find(d.progress, slug), note: find(d.notes, slug), card: find(d.cards, slug) }
    const w = solveWrites(prev, slug, solveRating, insight, now, d.meta.settings.desiredRetention)
    await this.commit(w, changesFromWriteSet(w))
  }

  async recordReview(slug: string, rating: ReviewRating, now: Date): Promise<void> {
    const d = this.data
    const prev = { progress: find(d.progress, slug), card: find(d.cards, slug) }
    const w = reviewWrites(prev, slug, rating, now, d.meta.settings.desiredRetention)
    await this.commit(w, changesFromWriteSet(w))
  }

  async saveNote(note: Omit<Note, 'updatedAt'>, now: Date): Promise<void> {
    const w: WriteSet = { note: noteWrite(note, now) }
    await this.commit(w, changesFromWriteSet(w))
  }

  async recordTrainAttempt(attempt: Omit<TrainAttempt, 'id'>): Promise<void> {
    const w = trainWrites(attempt)
    await this.commit(w, changesFromWriteSet(w))
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.commit(null, { profile: { settings } }, (d) => { d.meta.settings = clone(settings) })
  }

  async markBackedUp(now: Date): Promise<void> {
    const lastBackupAt = now.toISOString()
    await this.commit(null, { profile: { lastBackupAt } }, (d) => { d.meta.lastBackupAt = lastBackupAt })
  }

  async importAll(file: ExportFile, mode: 'replace' | 'merge'): Promise<void> {
    const data = mode === 'replace' ? file.data : mergeUserData(this.getUserDataSync(), file.data)
    try {
      await this.remote.replaceAll(data)
    } catch {
      throw saveError()
    }
    const next = sortUserData(clone(data))
    next.meta = { ...next.meta, schemaVersion: SCHEMA_VERSION, importId: crypto.randomUUID() }
    this.data = next
    this.emit()
  }

  subscribe(onChange: () => void): () => void {
    const listener = () => onChange()
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  // ---- internals ----
  private getUserDataSync(): UserData {
    const copy = clone(this.data)
    delete copy.meta.importId
    return sortUserData(copy)
  }

  private emit(): void {
    for (const cb of [...this.listeners]) cb()
  }

  private async commit(writes: WriteSet | null, changes: Changes, patch?: (d: UserData) => void): Promise<void> {
    const before = this.data
    const next = clone(before)
    if (writes) applyWriteSet(next, clone(writes))
    patch?.(next)
    this.data = next
    this.emit()
    try {
      await this.remote.applyChanges(changes)
    } catch {
      this.data = before
      this.emit()
      this.scheduleRefresh() // other in-flight writes may have landed; resync
      throw saveError()
    }
  }

  /** Debounced: a burst of Realtime events (one per table per write) results in one loadAll. */
  private scheduleRefresh(): void {
    if (this.disposed) return
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = undefined
      void this.refresh()
    }, this.debounceMs)
  }

  private async refresh(): Promise<void> {
    const seq = ++this.refreshSeq
    try {
      const loaded = await this.remote.loadAll()
      // Drop the result if disposed or a newer refresh has started meanwhile.
      if (this.disposed || seq !== this.refreshSeq) return
      this.data = { ...loaded, meta: { ...loaded.meta, importId: crypto.randomUUID() } }
      this.emit()
    } catch (err) {
      console.warn('SupabaseStore: refresh failed; will retry on the next change', err)
    }
  }
}

function find<T extends { slug: string }>(list: T[], slug: string): T | undefined {
  return list.find((x) => x.slug === slug)
}
