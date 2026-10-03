import { describe, expect, it } from 'vitest'
import type { Activity, ReviewCard } from '@/lib/types'
import {
  addDays, currentStreak, heatmapDays, localDate, longestStreak, needsBackupReminder, parseLocalDate, reviewForecast,
} from './dates'

const act = (date: string, n = 1): Activity => ({ date, reviews: n, solves: 0, trains: 0 })
const card = (due: Date): ReviewCard => ({ slug: due.toISOString(), card: { due: due.toISOString(), state: 2 }, due: due.toISOString(), updatedAt: '' })

describe('localDate', () => {
  it('uses local calendar day, around midnight too', () => {
    expect(localDate(new Date(2026, 9, 3, 23, 59))).toBe('2026-10-03')
    expect(localDate(new Date(2026, 9, 4, 0, 1))).toBe('2026-10-04')
  })

  it('round-trips with parseLocalDate and addDays across month ends', () => {
    expect(localDate(addDays(parseLocalDate('2026-09-30'), 1))).toBe('2026-10-01')
    expect(localDate(addDays(parseLocalDate('2026-03-01'), -1))).toBe('2026-02-28')
  })
})

describe('streaks', () => {
  const today = new Date(2026, 9, 1, 10)

  it('counts consecutive days ending today across a month boundary', () => {
    expect(currentStreak([act('2026-10-01'), act('2026-09-30'), act('2026-09-29')], today)).toBe(3)
  })

  it('still counts when today has no activity yet but yesterday does', () => {
    expect(currentStreak([act('2026-09-30'), act('2026-09-29')], today)).toBe(2)
  })

  it('is 0 after a missed day', () => {
    expect(currentStreak([act('2026-09-29')], today)).toBe(0)
  })

  it('ignores all-zero records', () => {
    expect(currentStreak([act('2026-10-01', 0)], today)).toBe(0)
  })

  it('finds the longest run regardless of input order', () => {
    const a = ['2026-01-05', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-07'].map((d) => act(d))
    expect(longestStreak(a)).toBe(3)
    expect(longestStreak([])).toBe(0)
  })
})

describe('heatmapDays', () => {
  it('starts on a Sunday, ends today, and fills counts', () => {
    const today = new Date(2026, 9, 3) // a Saturday
    const days = heatmapDays([{ date: '2026-10-03', reviews: 2, solves: 1, trains: 1 }], today, 26)
    expect(parseLocalDate(days[0].date).getDay()).toBe(0)
    expect(days.at(-1)).toEqual({ date: '2026-10-03', count: 4 })
    expect(days).toHaveLength(25 * 7 + today.getDay() + 1)
  })
})

describe('reviewForecast', () => {
  it('buckets by local day with overdue in day 0 and ignores beyond range', () => {
    const now = new Date(2026, 9, 3, 9)
    const cards = [
      card(new Date(2026, 9, 1, 9)), // overdue
      card(new Date(2026, 9, 3, 22)), // today
      card(new Date(2026, 9, 5, 8)), // +2
      card(new Date(2026, 9, 20, 8)), // beyond 7 days
    ]
    expect(reviewForecast(cards, now)).toEqual([2, 0, 1, 0, 0, 0, 0])
  })
})

describe('needsBackupReminder', () => {
  const now = new Date('2026-10-20T00:00:00Z')

  it('never nags with no data', () => {
    expect(needsBackupReminder(undefined, false, now)).toBe(false)
  })

  it('nags when never backed up or older than 14 days', () => {
    expect(needsBackupReminder(undefined, true, now)).toBe(true)
    expect(needsBackupReminder('2026-10-05T00:00:00Z', true, now)).toBe(true)
    expect(needsBackupReminder('2026-10-07T00:00:00Z', true, now)).toBe(false)
  })

  it('treats an unparseable timestamp as never backed up', () => {
    expect(needsBackupReminder('garbage', true, now)).toBe(true)
    expect(needsBackupReminder('garbage', false, now)).toBe(false)
  })
})
