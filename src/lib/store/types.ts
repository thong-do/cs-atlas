import type { ExportFile } from '@/lib/logic/transfer'
import type {
  Activity, Meta, Note, ProblemProgress, ReviewCard, ReviewLog, ReviewRating, Settings, SolveRating, TrainAttempt, UserData,
} from '@/lib/types'

export interface MasteryInputs {
  progress: ProblemProgress[]
  cards: ReviewCard[]
  attempts: TrainAttempt[]
  importId?: string
}

export interface Store {
  listProgress(): Promise<ProblemProgress[]>
  getProgress(slug: string): Promise<ProblemProgress | undefined>
  markSolved(slug: string, solveRating: SolveRating, insight: string, now: Date): Promise<void>
  getNote(slug: string): Promise<Note | undefined>
  saveNote(note: Omit<Note, 'updatedAt'>, now: Date): Promise<void>
  getCard(slug: string): Promise<ReviewCard | undefined>
  listCards(): Promise<ReviewCard[]>
  dueCards(now: Date): Promise<ReviewCard[]>
  recordReview(slug: string, rating: ReviewRating, now: Date): Promise<void>
  listReviewLogs(slug: string): Promise<ReviewLog[]>
  recordTrainAttempt(attempt: Omit<TrainAttempt, 'id'>): Promise<void>
  listTrainAttempts(): Promise<TrainAttempt[]>
  listActivity(): Promise<Activity[]>
  getMeta(): Promise<Meta>
  saveSettings(settings: Settings): Promise<void>
  markBackedUp(now: Date): Promise<void>
  hasData(): Promise<boolean>
  getMasteryInputs(): Promise<MasteryInputs>
  getUserData(): Promise<UserData>
  exportAll(now: Date): Promise<ExportFile>
  importAll(file: ExportFile, mode: 'replace' | 'merge'): Promise<void>
}
