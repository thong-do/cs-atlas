'use client'

import { Progress } from '@/components/ui/progress'
import { useCatalog } from '@/lib/content/catalog-context'
import { formatDay } from '@/lib/format'
import { useMasteries } from '@/lib/hooks/use-masteries'
import { addDays, currentStreak, heatmapDays, longestStreak, reviewForecast } from '@/lib/logic/dates'
import { recognitionAccuracy } from '@/lib/logic/mastery'
import { useLive } from '@/lib/store/context'
import { cn } from '@/lib/utils'

const level = (count: number) =>
  count === 0 ? 'bg-muted'
  : count <= 2 ? 'bg-emerald-200 dark:bg-emerald-900'
  : count <= 5 ? 'bg-emerald-400 dark:bg-emerald-700'
  : 'bg-emerald-600 dark:bg-emerald-500'

export function StatsView() {
  const { lessons } = useCatalog()
  const masteries = useMasteries()
  const data = useLive(async (s) => ({
    activity: await s.listActivity(),
    attempts: await s.listTrainAttempts(),
    cards: await s.listCards(),
  }))
  if (!data || !masteries) return <p className="text-muted-foreground">Loading…</p>

  const today = new Date()
  const days = heatmapDays(data.activity, today, 26)
  const forecast = reviewForecast(data.cards, today)
  const maxForecast = Math.max(1, ...forecast)
  const accuracy = lessons
    .map((p) => ({ p, acc: recognitionAccuracy(data.attempts, p.slug) }))
    .filter((x): x is { p: typeof x.p; acc: number } => x.acc !== undefined)

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">Stats</h1>

      <section className="flex gap-3">
        <div className="rounded-lg border px-4 py-2"><div className="text-xl font-bold">🔥 {currentStreak(data.activity, today)}</div><div className="text-xs text-muted-foreground">Current streak</div></div>
        <div className="rounded-lg border px-4 py-2"><div className="text-xl font-bold">{longestStreak(data.activity)}</div><div className="text-xs text-muted-foreground">Longest streak</div></div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Activity</h2>
        <div className="overflow-x-auto">
          <div className="grid w-max grid-flow-col grid-rows-7 gap-1" aria-label="Activity over the last 26 weeks">
            {days.map((d) => (
              <div key={d.date} title={`${d.date}: ${d.count}`} className={cn('size-3 rounded-sm', level(d.count))} />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Mastery</h2>
        <ul className="space-y-2">
          {lessons.map((p) => (
            <li key={p.slug} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[12rem_1fr_3rem]">
              <span className="truncate">{p.title}</span>
              <Progress value={masteries.get(p.slug) ?? 0} className="h-2" aria-label={`${p.title} mastery`} />
              <span className="text-right tabular-nums">{masteries.get(p.slug) ?? 0}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recognition accuracy</h2>
        {accuracy.length === 0 ? (
          <p className="text-muted-foreground">Play a training round to see this.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {accuracy.map(({ p, acc }) => (
              <li key={p.slug} data-testid="recognition-row" className="flex justify-between gap-3">
                <span>{p.title}</span><span className="tabular-nums">{Math.round(acc * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Reviews in the next 7 days</h2>
        <ul className="space-y-1 text-sm">
          {forecast.map((n, i) => (
            <li key={i} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3">
              <span>{i === 0 ? 'Today' : formatDay(addDays(today, i).toISOString())}</span>
              <div className="h-2 rounded bg-primary" style={{ width: `${(n / maxForecast) * 100}%` }} />
              <span className="text-right tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
