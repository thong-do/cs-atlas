import { flashcardKey } from '@/lib/content/review-keys'
import { buildExport, mergeUserData, type ExportFile } from '@/lib/logic/transfer'
import type { RemoteApi } from '@/lib/supabase/remote-api'
import type { Changes } from '@/lib/supabase/rows'
import {
  SCHEMA_VERSION,
  type Meta, type Note, type ReviewRating, type Settings, type SolveRating, type TrainAttempt, type UserData,
} from '@/lib/types'
import {
  applyBump, designWrites, noteWrite, quizWrites, reviewWrites, solveWrites, sortUserData, trainWrites, type DesignAnswer, type WriteSet,
} from './mutations'
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
  for (const c of w.cards ?? []) upsert(d.cards, c, (x) => x.slug)
  if (w.log) upsert(d.reviewLogs, w.log, (x) => x.id)
  if (w.attempt) upsert(d.trainAttempts, w.attempt, (x) => x.id)
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
  if (w.cards?.length) c.cards = w.cards
  if (w.log) c.reviewLogs = [w.log]
  if (w.attempt) c.trainAttempts = [w.attempt]
  if (w.bump) {
    const { date, field } = w.bump
    c.activityIncrements = [{ date, reviews: 0, solves: 0, trains: 0, [field]: 1 }]
  }
  return c
}

type Apply = (d: UserData) => void

interface PendingWrite {
  id: number
  apply: Apply
  /** Set when the server accepted the write (confirmation order, compared with a refresh's start mark). */
  confirmedAt?: number
  /** Refresh starts seen when the write began; if this changes before confirmation, resync afterwards. */
  refreshesAtStart: number
}

/** Store backed by a signed-in user's Supabase data: in-memory snapshot, optimistic writes, Realtime refresh. */
export class SupabaseStore implements Store {
  /** Last server-confirmed data (incl. meta.importId). */
  private base: UserData
  /** In-flight and not-yet-folded writes, in start order. */
  private pending: PendingWrite[] = []
  /** Writes folded into `base` since the latest refresh began; re-applied if that refresh's result lacks them. */
  private folded: { confirmedAt: number; apply: Apply }[] = []
  /** Visible snapshot: sortUserData(base + pending). */
  private data: UserData
  private nextWriteId = 0
  private confirmations = 0
  private refreshStarts = 0
  /** Seq of the refresh whose loadAll is in flight, if any. */
  private loadingSeq: number | undefined
  private listeners = new Set<() => void>()
  private readonly offRemote: () => void
  private readonly onVisibility?: () => void
  private readonly debounceMs: number
  private timer: ReturnType<typeof setTimeout> | undefined
  private refreshSeq = 0
  private disposed = false

  constructor(private readonly remote: RemoteApi, initial: UserData, opts?: { refreshDebounceMs?: number }) {
    // importId stays as given (normally undefined): the contract requires no import generation until an import/refresh.
    this.base = sortUserData(clone(initial))
    this.data = this.base
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

  async completeQuiz(slug: string, flashcardIds: string[], result: { correct: number; total: number }, now: Date): Promise<void> {
    const d = this.data
    const existingCardKeys = new Set(flashcardIds.map((id) => flashcardKey(slug, id)).filter((k) => find(d.cards, k)))
    const prev = { progress: find(d.progress, slug), card: find(d.cards, slug), existingCardKeys }
    const w = quizWrites(prev, slug, flashcardIds, result, now, d.meta.settings.desiredRetention)
    await this.commit(w, changesFromWriteSet(w))
  }

  async completeDesign(slug: string, answer: DesignAnswer, now: Date): Promise<void> {
    const d = this.data
    const prev = { progress: find(d.progress, slug), note: find(d.notes, slug), card: find(d.cards, slug) }
    const w = designWrites(prev, slug, answer, now, d.meta.settings.desiredRetention)
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
    this.refreshSeq++ // any in-flight refresh loaded pre-import data
    this.loadingSeq = undefined
    this.base = next
    this.folded = []
    this.pending = this.pending.filter((p) => p.confirmedAt === undefined)
    this.recompute()
    this.scheduleRefresh()
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

  /** base + pending, sorted into primary-key order like DexieStore; then notify. */
  private recompute(): void {
    const next = clone(this.base)
    for (const p of this.pending) p.apply(next)
    this.data = sortUserData(next)
    this.emit()
  }

  private async commit(writes: WriteSet | null, changes: Changes, patch?: Apply): Promise<void> {
    const entry: PendingWrite = {
      id: this.nextWriteId++,
      apply: (d) => {
        if (writes) applyWriteSet(d, clone(writes))
        patch?.(d)
      },
      refreshesAtStart: this.refreshStarts,
    }
    this.pending.push(entry)
    this.recompute()
    try {
      await this.remote.applyChanges(changes)
    } catch {
      this.pending = this.pending.filter((p) => p.id !== entry.id)
      this.recompute()
      this.scheduleRefresh() // other in-flight writes may have landed; resync
      throw saveError()
    }
    if (!this.pending.includes(entry)) return // superseded by an import or a refresh that already contains it
    entry.confirmedAt = ++this.confirmations
    // Fold the confirmed prefix into base, in start order.
    while (this.pending.length > 0 && this.pending[0].confirmedAt !== undefined) {
      const done = this.pending.shift()!
      done.apply(this.base)
      this.base = sortUserData(this.base)
      if (this.loadingSeq !== undefined) this.folded.push({ confirmedAt: done.confirmedAt!, apply: done.apply })
    }
    this.recompute()
    // A refresh that started while this write was in flight may or may not contain it; resync to be exact.
    if (entry.refreshesAtStart !== this.refreshStarts) this.scheduleRefresh()
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
    this.loadingSeq = seq
    this.refreshStarts++
    const mark = this.confirmations // writes confirmed up to here are in the loaded data
    this.folded = this.folded.filter((f) => f.confirmedAt > mark)
    try {
      const loaded = await this.remote.loadAll()
      // Drop the result if disposed or a newer refresh (or an import) has started meanwhile.
      if (this.disposed || seq !== this.refreshSeq) return
      const base: UserData = { ...loaded, meta: { ...loaded.meta, importId: crypto.randomUUID() } }
      // Writes confirmed after loadAll began might be missing from it: re-apply them (idempotent except
      // activity bumps; such writes schedule a follow-up refresh, which corrects any double count).
      for (const f of this.folded) f.apply(base)
      this.base = sortUserData(base)
      this.folded = []
      this.pending = this.pending.filter((p) => p.confirmedAt === undefined || p.confirmedAt > mark)
      this.recompute()
    } catch (err) {
      console.warn('SupabaseStore: refresh failed; will retry on the next change', err)
    } finally {
      if (this.loadingSeq === seq) this.loadingSeq = undefined
    }
  }
}

function find<T extends { slug: string }>(list: T[], slug: string): T | undefined {
  return list.find((x) => x.slug === slug)
}
