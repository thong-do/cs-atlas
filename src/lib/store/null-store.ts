import { buildExport, type ExportFile } from '@/lib/logic/transfer'
import { DEFAULT_SETTINGS, SCHEMA_VERSION, type Meta, type UserData } from '@/lib/types'
import type { Store } from './types'

export class StoreUnavailableError extends Error {
  constructor() {
    super("Progress can't be saved in this browser (storage is unavailable).")
    this.name = 'StoreUnavailableError'
  }
}

const meta = (): Meta => ({ schemaVersion: SCHEMA_VERSION, settings: { ...DEFAULT_SETTINGS } })
const fail = async (..._args: unknown[]): Promise<never> => { throw new StoreUnavailableError() }

/** Read-only stand-in used before IndexedDB opens and when it cannot open at all. */
export class NullStore implements Store {
  listProgress = async () => []
  getProgress = async () => undefined
  getNote = async () => undefined
  getCard = async () => undefined
  listCards = async () => []
  dueCards = async () => []
  listReviewLogs = async () => []
  listTrainAttempts = async () => []
  listActivity = async () => []
  getMeta = async () => meta()
  hasData = async () => false
  getUserData = async (): Promise<UserData> => ({
    progress: [], notes: [], cards: [], reviewLogs: [], trainAttempts: [], activity: [], meta: meta(),
  })
  exportAll = async (now: Date): Promise<ExportFile> => buildExport(await this.getUserData(), now)
  markSolved = fail
  saveNote = fail
  recordReview = fail
  recordTrainAttempt = fail
  saveSettings = fail
  markBackedUp = fail
  importAll = fail
}
