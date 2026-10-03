export type Difficulty = 'easy' | 'medium' | 'hard'
export type SolveRating = 'alone' | 'hint' | 'solution'
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'

export interface PatternMeta {
  slug: string
  title: string
  prerequisites: string[]
  confusedWith: string[]
  triggers: string[]
  complexity: string
  summary: string
  stub: boolean
}

export interface ProblemMeta {
  slug: string
  title: string
  leetcodeId: number
  url: string
  difficulty: Difficulty
  /** First entry is the primary pattern (ladder + trainer answer). */
  patterns: string[]
  ladderOrder: number
  recognitionPrompt: string
  hint: string
}

/** Slim, serializable content passed from the server layout to client components. */
export interface Catalog {
  order: string[]
  patterns: PatternMeta[]
  problems: ProblemMeta[]
}

/** A ts-fsrs Card with Date fields stored as ISO strings (IndexedDB- and JSON-safe). */
export type StoredCard = { due: string; last_review?: string; state: number } & Record<string, unknown>

export interface ProblemProgress {
  slug: string
  status: 'unsolved' | 'solved'
  solveRating?: SolveRating
  firstSolvedAt?: string
  needsResolve: boolean
  updatedAt: string
}

export interface Note {
  slug: string
  insight: string
  approach: string
  complexity: string
  mistakes: string
  code: string
  updatedAt: string
}

export interface ReviewCard {
  slug: string
  card: StoredCard
  due: string
  updatedAt: string
}

export interface ReviewLog {
  id: string
  slug: string
  rating: ReviewRating
  reviewedAt: string
}

export interface TrainAttempt {
  id: string
  problemSlug: string
  correctPattern: string
  chosenPattern: string
  correct: boolean
  at: string
}

export interface Activity {
  /** Local date, YYYY-MM-DD. */
  date: string
  reviews: number
  solves: number
  trains: number
}

export interface Settings {
  desiredRetention: number
  theme: 'system' | 'light' | 'dark'
}

export interface Meta {
  schemaVersion: number
  lastBackupAt?: string
  settings: Settings
}

export interface UserData {
  progress: ProblemProgress[]
  notes: Note[]
  cards: ReviewCard[]
  reviewLogs: ReviewLog[]
  trainAttempts: TrainAttempt[]
  activity: Activity[]
  meta: Meta
}

export const SCHEMA_VERSION = 1
export const DEFAULT_SETTINGS: Settings = { desiredRetention: 0.9, theme: 'system' }
