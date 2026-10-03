import { describe, expect, it } from 'vitest'
import { fromStored, initialReviewRating, newCard, retrievability, scheduleReview, toStored } from './fsrs'

const now = new Date('2026-10-03T09:00:00Z')
const daysLater = (d: number) => new Date(now.getTime() + d * 86_400_000)

describe('fsrs adapter', () => {
  it('maps solve ratings to initial review ratings', () => {
    expect(initialReviewRating('alone')).toBe('good')
    expect(initialReviewRating('hint')).toBe('hard')
    expect(initialReviewRating('solution')).toBe('again')
  })

  it('creates a new card due now with ISO dates', () => {
    const card = newCard(now)
    expect(card.due).toBe(now.toISOString())
    expect(card.state).toBe(0)
  })

  it('round-trips through stored form', () => {
    const card = scheduleReview(newCard(now), 'good', now, 0.9)
    expect(toStored(fromStored(card))).toEqual(card)
  })

  it('schedules later for better ratings', () => {
    const graduated = scheduleReview(scheduleReview(newCard(now), 'good', now, 0.9), 'good', daysLater(1), 0.9)
    const at = daysLater(5)
    const again = Date.parse(scheduleReview(graduated, 'again', at, 0.9).due)
    const good = Date.parse(scheduleReview(graduated, 'good', at, 0.9).due)
    const easy = Date.parse(scheduleReview(graduated, 'easy', at, 0.9).due)
    expect(good).toBeGreaterThan(at.getTime())
    expect(again).toBeLessThan(good)
    expect(easy).toBeGreaterThanOrEqual(good)
  })

  it('works on a card whose dates came back from JSON', () => {
    const card = JSON.parse(JSON.stringify(scheduleReview(newCard(now), 'good', now, 0.9)))
    expect(() => scheduleReview(card, 'good', daysLater(3), 0.9)).not.toThrow()
  })

  it('reports retrievability: 0 for new, ~1 just after review, decaying over time', () => {
    expect(retrievability(newCard(now), now)).toBe(0)
    const card = scheduleReview(newCard(now), 'good', now, 0.9)
    expect(retrievability(card, now)).toBeGreaterThan(0.95)
    const later = retrievability(card, daysLater(60))
    expect(later).toBeLessThan(retrievability(card, daysLater(1)))
    expect(later).toBeGreaterThanOrEqual(0)
  })
})
