import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs'
import type { ReviewRating, SolveRating, StoredCard } from '@/lib/types'

const GRADE: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

export function initialReviewRating(rating: SolveRating): ReviewRating {
  if (rating === 'alone') return 'good'
  if (rating === 'hint') return 'hard'
  return 'again'
}

export function toStored(card: Card): StoredCard {
  const { due, last_review, ...rest } = card
  const stored: StoredCard = { ...rest, due: due.toISOString() }
  if (last_review) stored.last_review = last_review.toISOString()
  return stored
}

export function fromStored(stored: StoredCard): Card {
  return {
    ...stored,
    due: new Date(stored.due),
    last_review: stored.last_review ? new Date(stored.last_review) : undefined,
  } as unknown as Card
}

export function newCard(now: Date): StoredCard {
  return toStored(createEmptyCard(now))
}

export function scheduleReview(card: StoredCard, rating: ReviewRating, now: Date, desiredRetention: number): StoredCard {
  const scheduler = fsrs(generatorParameters({ request_retention: desiredRetention }))
  return toStored(scheduler.next(fromStored(card), now, GRADE[rating]).card)
}

export function retrievability(card: StoredCard, now: Date): number {
  const c = fromStored(card)
  if (c.state === State.New) return 0
  const r = fsrs().get_retrievability(c, now, false)
  return Math.min(1, Math.max(0, r))
}
