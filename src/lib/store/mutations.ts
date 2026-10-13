import { localDate } from '@/lib/logic/dates'
import { initialReviewRating, newCard, scheduleReview } from '@/lib/logic/fsrs'
import { validateInsight } from '@/lib/logic/insight'
import type {
  Activity, Note, ProblemProgress, ReviewCard, ReviewLog, ReviewRating, SolveRating, TrainAttempt, UserData,
} from '@/lib/types'

export type ActivityField = 'reviews' | 'solves' | 'trains'

/** The rows one user action writes. Both stores apply a WriteSet; neither re-implements the rules. */
export interface WriteSet {
  progress?: ProblemProgress
  note?: Note
  card?: ReviewCard
  log?: ReviewLog
  attempt?: TrainAttempt
  bump?: { date: string; field: ActivityField }
}

const emptyNote = (slug: string): Omit<Note, 'updatedAt'> => ({ slug, insight: '', approach: '', complexity: '', mistakes: '', code: '' })

function checkedInsight(insight: string): string {
  const valid = validateInsight(insight)
  if (!valid.ok) throw new Error(valid.error)
  return valid.value
}

export function solveWrites(
  prev: { progress?: ProblemProgress; note?: Note; card?: ReviewCard },
  slug: string, solveRating: SolveRating, insight: string, now: Date, desiredRetention: number,
): WriteSet {
  const text = checkedInsight(insight)
  const at = now.toISOString()
  const rating = initialReviewRating(solveRating)
  const card = scheduleReview(prev.card?.card ?? newCard(now), rating, now, desiredRetention)
  return {
    progress: { slug, status: 'solved', solveRating, firstSolvedAt: prev.progress?.firstSolvedAt ?? at, needsResolve: false, updatedAt: at },
    note: { ...(prev.note ?? emptyNote(slug)), insight: text, updatedAt: at },
    card: { slug, card, due: card.due, updatedAt: at },
    log: { id: crypto.randomUUID(), slug, rating, reviewedAt: at, kind: 'solve' },
    bump: { date: localDate(now), field: 'solves' },
  }
}

export function reviewWrites(
  prev: { progress?: ProblemProgress; card?: ReviewCard },
  slug: string, rating: ReviewRating, now: Date, desiredRetention: number,
): WriteSet {
  if (!prev.card) throw new Error(`No review card for "${slug}"`)
  const at = now.toISOString()
  const card = scheduleReview(prev.card.card, rating, now, desiredRetention)
  return {
    card: { slug, card, due: card.due, updatedAt: at },
    log: { id: crypto.randomUUID(), slug, rating, reviewedAt: at, kind: 'review' },
    ...(prev.progress ? { progress: { ...prev.progress, needsResolve: rating === 'again', updatedAt: at } } : {}),
    bump: { date: localDate(now), field: 'reviews' },
  }
}

export function noteWrite(note: Omit<Note, 'updatedAt'>, now: Date): Note {
  return { ...note, insight: checkedInsight(note.insight), updatedAt: now.toISOString() }
}

export function trainWrites(attempt: Omit<TrainAttempt, 'id'>): WriteSet {
  return { attempt: { ...attempt, id: crypto.randomUUID() }, bump: { date: localDate(new Date(attempt.at)), field: 'trains' } }
}

export function applyBump(current: Activity | undefined, bump: { date: string; field: ActivityField }): Activity {
  const base = current ?? { date: bump.date, reviews: 0, solves: 0, trains: 0 }
  return { ...base, [bump.field]: base[bump.field] + 1 }
}

export function sortUserData(data: UserData): UserData {
  const by = <T>(key: (x: T) => string) => (a: T, b: T) => key(a).localeCompare(key(b))
  return {
    progress: [...data.progress].sort(by((x) => x.slug)),
    notes: [...data.notes].sort(by((x) => x.slug)),
    cards: [...data.cards].sort(by((x) => x.slug)),
    reviewLogs: [...data.reviewLogs].sort(by((x) => x.id)),
    trainAttempts: [...data.trainAttempts].sort(by((x) => x.id)),
    activity: [...data.activity].sort(by((x) => x.date)),
    meta: data.meta,
  }
}
