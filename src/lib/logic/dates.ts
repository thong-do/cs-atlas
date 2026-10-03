import type { Activity, ReviewCard } from '@/lib/types'

const pad = (n: number) => String(n).padStart(2, '0')

export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Local midnight of `d` shifted by `n` calendar days. */
export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() + n)
  return x
}

const total = (a: Activity) => a.reviews + a.solves + a.trains
const activeDates = (activity: Activity[]) => new Set(activity.filter((a) => total(a) > 0).map((a) => a.date))

export function currentStreak(activity: Activity[], today: Date): number {
  const active = activeDates(activity)
  let cursor = addDays(today, 0)
  if (!active.has(localDate(cursor))) cursor = addDays(cursor, -1)
  let streak = 0
  while (active.has(localDate(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function longestStreak(activity: Activity[]): number {
  const dates = [...activeDates(activity)].sort()
  let best = 0
  let run = 0
  let prev: string | undefined
  for (const date of dates) {
    run = prev && localDate(addDays(parseLocalDate(prev), 1)) === date ? run + 1 : 1
    best = Math.max(best, run)
    prev = date
  }
  return best
}

export function heatmapDays(activity: Activity[], today: Date, weeks: number): { date: string; count: number }[] {
  const counts = new Map(activity.map((a) => [a.date, total(a)]))
  const start = addDays(today, -((weeks - 1) * 7 + today.getDay()))
  const days: { date: string; count: number }[] = []
  const end = localDate(today)
  for (let d = start; localDate(d) <= end; d = addDays(d, 1)) {
    const date = localDate(d)
    days.push({ date, count: counts.get(date) ?? 0 })
  }
  return days
}

export function reviewForecast(cards: ReviewCard[], now: Date, days = 7): number[] {
  const buckets = Array.from({ length: days }, (_, i) => localDate(addDays(now, i)))
  const counts = new Array<number>(days).fill(0)
  for (const c of cards) {
    const due = localDate(new Date(c.due))
    if (due <= buckets[0]) counts[0]++
    else {
      const i = buckets.indexOf(due)
      if (i >= 0) counts[i]++
    }
  }
  return counts
}

export const BACKUP_INTERVAL_DAYS = 14

export function needsBackupReminder(lastBackupAt: string | undefined, hasData: boolean, now: Date): boolean {
  if (!hasData) return false
  if (!lastBackupAt) return true
  const last = Date.parse(lastBackupAt)
  if (Number.isNaN(last)) return true
  return now.getTime() - last > BACKUP_INTERVAL_DAYS * 86_400_000
}
