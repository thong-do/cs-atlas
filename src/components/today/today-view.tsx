'use client'

import Link from 'next/link'
import { toast } from 'sonner'
import { DifficultyBadge } from '@/components/difficulty-badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useCatalog } from '@/lib/content/catalog-context'
import { useNow } from '@/lib/hooks/use-now'
import { useMasteries } from '@/lib/hooks/use-masteries'
import { currentStreak } from '@/lib/logic/dates'
import { recommendedPattern } from '@/lib/logic/recommend'
import { useLive, useStore } from '@/lib/store/context'
import type { ReviewRating } from '@/lib/types'
import { ReviewItem } from './review-item'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-4 py-2 text-center">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export function TodayView() {
  const store = useStore()
  const { order, patterns, problems, patternBySlug, problemBySlug } = useCatalog()
  const masteries = useMasteries()
  const now = useNow()
  const data = useLive(async (s) => {
    const due = await s.dueCards(now)
    const notes = await Promise.all(due.map((c) => s.getNote(c.slug)))
    return {
      due: due.map((card, i) => ({ card, note: notes[i] })),
      progress: await s.listProgress(),
      activity: await s.listActivity(),
    }
  }, [now])

  if (!data || !masteries) return <p className="text-muted-foreground">Loading…</p>

  const progressBySlug = new Map(data.progress.map((p) => [p.slug, p]))
  const solved = new Set(data.progress.filter((p) => p.status === 'solved').map((p) => p.slug))
  const reviews = data.due.filter((d) => problemBySlug.has(d.card.slug))
  const recommended = recommendedPattern(order, patterns, masteries)
  const recPattern = recommended ? patternBySlug.get(recommended) : undefined
  const recLadder = recommended ? problems.filter((p) => p.patterns[0] === recommended) : []
  const pool = recLadder.some((p) => !solved.has(p.slug)) ? recLadder : problems
  const nextUp = pool.filter((p) => !solved.has(p.slug)).slice(0, 3)

  async function rate(slug: string, rating: ReviewRating) {
    try {
      await store.recordReview(slug, rating, new Date())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Today</h1>
          <p className="text-muted-foreground">
            {reviews.length === 0 ? 'No reviews due.' : `${reviews.length} review${reviews.length === 1 ? '' : 's'} due.`}
          </p>
        </div>
        <div className="flex gap-3">
          <Stat label="Day streak" value={`🔥 ${currentStreak(data.activity, new Date())}`} />
          <Stat label="Solved" value={String(solved.size)} />
        </div>
      </header>

      {recPattern && (
        <section className="space-y-3 rounded-lg border bg-muted/40 p-4" aria-label="Continue">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Continue</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{recPattern.title}</h2>
              <p className="text-sm text-muted-foreground">
                {recLadder.filter((p) => solved.has(p.slug)).length}/{recLadder.length} solved · {masteries.get(recPattern.slug) ?? 0}% mastery
              </p>
              <Progress value={masteries.get(recPattern.slug) ?? 0} className="h-2 w-48" aria-label="Mastery" />
            </div>
            <Button asChild><Link href={`/patterns/${recPattern.slug}/`}>Open pattern</Link></Button>
          </div>
        </section>
      )}

      <section aria-labelledby="reviews-heading" className="space-y-3">
        <h2 id="reviews-heading" className="text-xl font-semibold">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center">All caught up 🎉</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map(({ card, note }) => (
              <li key={card.slug}>
                <ReviewItem
                  problem={problemBySlug.get(card.slug)!}
                  insight={note?.insight}
                  needsResolve={!!progressBySlug.get(card.slug)?.needsResolve}
                  onRate={(rating) => rate(card.slug, rating)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="next-heading" className="space-y-3">
        <h2 id="next-heading" className="text-xl font-semibold">Next up</h2>
        {nextUp.length === 0 ? (
          <p className="text-muted-foreground">You’ve solved every problem here. Keep reviewing!</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {nextUp.map((p) => (
              <li key={p.slug} className="flex items-center gap-3 px-3 py-2">
                <Link href={`/problems/${p.slug}/`} className="min-w-0 flex-1 truncate hover:underline">{p.title}</Link>
                <DifficultyBadge difficulty={p.difficulty} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4" aria-label="Quick train">
        <div>
          <h2 className="font-semibold">Can you spot the pattern?</h2>
          <p className="text-sm text-muted-foreground">Two minutes, five problems, pick the right tool.</p>
        </div>
        <Button asChild variant="secondary"><Link href="/train/">Start training</Link></Button>
      </section>
    </div>
  )
}
