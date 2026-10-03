'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/lib/content/catalog-context'
import type { ProblemMeta, ReviewRating } from '@/lib/types'

const RATINGS: { value: ReviewRating; label: string }[] = [
  { value: 'again', label: 'Again' },
  { value: 'hard', label: 'Hard' },
  { value: 'good', label: 'Good' },
  { value: 'easy', label: 'Easy' },
]

export function ReviewItem({
  problem, insight, needsResolve, onRate,
}: {
  problem: ProblemMeta
  insight?: string
  needsResolve: boolean
  onRate: (rating: ReviewRating) => Promise<void>
}) {
  const { patternBySlug } = useCatalog()
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <article className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">
          <Link href={`/problems/${problem.slug}/`} className="hover:underline">{problem.title}</Link>
        </h3>
        <a href={problem.url} target="_blank" rel="noreferrer" className="shrink-0 text-sm text-muted-foreground hover:text-foreground">LeetCode ↗</a>
      </div>
      {needsResolve && <p className="text-xs text-amber-700 dark:text-amber-400">Marked for re-solve last time.</p>}
      {!revealed ? (
        <>
          <p className="text-sm text-muted-foreground">Which pattern solves it, and what’s the key insight? Recall it first, then reveal.</p>
          <Button variant="secondary" onClick={() => setRevealed(true)}>Reveal</Button>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {problem.patterns.map((s) => <Badge key={s} variant="secondary">{patternBySlug.get(s)?.title ?? s}</Badge>)}
          </div>
          <blockquote className="border-l-4 border-primary pl-3">{insight || 'No insight saved.'}</blockquote>
          <div role="group" aria-label="How well did you remember?" className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <Button
                key={r.value}
                variant={r.value === 'again' ? 'destructive' : 'outline'}
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try { await onRate(r.value) } finally { setBusy(false) }
                }}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Again = forgot it (you’ll be asked to re-solve on LeetCode).</p>
        </>
      )}
    </article>
  )
}
