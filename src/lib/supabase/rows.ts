import {
  DEFAULT_SETTINGS, SCHEMA_VERSION,
  type Activity, type Note, type ProblemProgress, type ReviewCard, type ReviewLog, type ReviewRating,
  type Settings, type SolveRating, type StoredCard, type TrainAttempt, type UserData,
} from '@/lib/types'
import { sortUserData } from '@/lib/store/mutations'

/** Changes for one user action; maps to the apply_changes payload. */
export interface Changes {
  progress?: ProblemProgress[]
  notes?: Note[]
  cards?: ReviewCard[]
  reviewLogs?: ReviewLog[]
  trainAttempts?: TrainAttempt[]
  /** Counts to ADD per date. */
  activityIncrements?: Activity[]
  profile?: { settings?: Settings; lastBackupAt?: string }
}

// Row shapes mirror the SQL columns (supabase/migrations/20261011000000_phase1_accounts.sql) without user_id.
export interface ProfileRow { display_name: string | null; avatar_url: string | null; settings: Settings; last_backup_at: string | null; created_at: string }
export interface ProgressRow { slug: string; status: 'unsolved' | 'solved'; solve_rating: SolveRating | null; first_solved_at: string | null; needs_resolve: boolean; updated_at: string }
export interface NoteRow { slug: string; insight: string; approach: string; complexity: string; mistakes: string; code: string; updated_at: string }
export interface CardRow { slug: string; card: StoredCard; due: string; updated_at: string }
export interface ReviewLogRow { id: string; slug: string; rating: ReviewRating; reviewed_at: string; kind: 'solve' | 'review' | null }
export interface TrainAttemptRow { id: string; problem_slug: string; correct_pattern: string; chosen_pattern: string; correct: boolean; at: string }
export interface ActivityRow { date: string; reviews: number; solves: number; trains: number }

export interface RemoteRows {
  profiles: ProfileRow[]
  progress: ProgressRow[]
  notes: NoteRow[]
  cards: CardRow[]
  review_logs: ReviewLogRow[]
  train_attempts: TrainAttemptRow[]
  activity: ActivityRow[]
}

const iso = (s: string) => new Date(s).toISOString()

const progressToRow = (p: ProblemProgress) => ({
  slug: p.slug, status: p.status, solve_rating: p.solveRating ?? null, first_solved_at: p.firstSolvedAt ?? null,
  needs_resolve: p.needsResolve, updated_at: p.updatedAt,
})
const noteToRow = (n: Note) => ({
  slug: n.slug, insight: n.insight, approach: n.approach, complexity: n.complexity, mistakes: n.mistakes, code: n.code, updated_at: n.updatedAt,
})
const cardToRow = (c: ReviewCard) => ({ slug: c.slug, card: c.card, due: c.due, updated_at: c.updatedAt })
const logToRow = (l: ReviewLog) => ({ id: l.id, slug: l.slug, rating: l.rating, reviewed_at: l.reviewedAt, kind: l.kind ?? null })
const attemptToRow = (a: TrainAttempt) => ({
  id: a.id, problem_slug: a.problemSlug, correct_pattern: a.correctPattern, chosen_pattern: a.chosenPattern, correct: a.correct, at: a.at,
})
const activityToRow = (a: Activity) => ({ date: a.date, reviews: a.reviews, solves: a.solves, trains: a.trains })

export function toApplyPayload(changes: Changes): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (changes.progress) payload.progress = changes.progress.map(progressToRow)
  if (changes.notes) payload.notes = changes.notes.map(noteToRow)
  if (changes.cards) payload.cards = changes.cards.map(cardToRow)
  if (changes.reviewLogs) payload.review_logs = changes.reviewLogs.map(logToRow)
  if (changes.trainAttempts) payload.train_attempts = changes.trainAttempts.map(attemptToRow)
  if (changes.activityIncrements) payload.activity_increments = changes.activityIncrements.map(activityToRow)
  if (changes.profile) {
    payload.profile = {
      ...(changes.profile.settings ? { settings: changes.profile.settings } : {}),
      ...(changes.profile.lastBackupAt ? { last_backup_at: changes.profile.lastBackupAt } : {}),
    }
  }
  return payload
}

export function toReplacePayload(data: UserData): Record<string, unknown> {
  return {
    progress: data.progress.map(progressToRow),
    notes: data.notes.map(noteToRow),
    cards: data.cards.map(cardToRow),
    review_logs: data.reviewLogs.map(logToRow),
    train_attempts: data.trainAttempts.map(attemptToRow),
    activity: data.activity.map(activityToRow),
    profile: { settings: data.meta.settings, last_backup_at: data.meta.lastBackupAt ?? null },
  }
}

export function fromRows(rows: RemoteRows): UserData {
  const profile = rows.profiles[0]
  return sortUserData({
    progress: rows.progress.map((r): ProblemProgress => ({
      slug: r.slug, status: r.status,
      ...(r.solve_rating ? { solveRating: r.solve_rating } : {}),
      ...(r.first_solved_at ? { firstSolvedAt: iso(r.first_solved_at) } : {}),
      needsResolve: r.needs_resolve, updatedAt: iso(r.updated_at),
    })),
    notes: rows.notes.map((r): Note => ({
      slug: r.slug, insight: r.insight, approach: r.approach, complexity: r.complexity, mistakes: r.mistakes, code: r.code, updatedAt: iso(r.updated_at),
    })),
    cards: rows.cards.map((r): ReviewCard => ({ slug: r.slug, card: r.card, due: iso(r.due), updatedAt: iso(r.updated_at) })),
    reviewLogs: rows.review_logs.map((r): ReviewLog => ({
      id: r.id, slug: r.slug, rating: r.rating, reviewedAt: iso(r.reviewed_at), ...(r.kind ? { kind: r.kind } : {}),
    })),
    trainAttempts: rows.train_attempts.map((r): TrainAttempt => ({
      id: r.id, problemSlug: r.problem_slug, correctPattern: r.correct_pattern, chosenPattern: r.chosen_pattern, correct: r.correct, at: iso(r.at),
    })),
    activity: rows.activity.map((r): Activity => ({ date: r.date, reviews: r.reviews, solves: r.solves, trains: r.trains })),
    meta: {
      schemaVersion: SCHEMA_VERSION,
      settings: profile?.settings ?? DEFAULT_SETTINGS,
      ...(profile?.last_backup_at ? { lastBackupAt: iso(profile.last_backup_at) } : {}),
    },
  })
}
