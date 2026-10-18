'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { exerciseHref } from '@/lib/content/hrefs'
import type { DesignExercise, ReviewRating } from '@/lib/types'
import { RatingButtons } from './rating-buttons'

export function DesignReviewItem({
  exercise, insight, onRate,
}: {
  exercise: DesignExercise
  insight?: string
  onRate: (rating: ReviewRating) => Promise<void>
}) {
  const [revealed, setRevealed] = useState(false)
  const noun = exercise.kind === 'diagnose' ? 'answer' : 'design'
  return (
    <article className="space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">
        <Link href={exerciseHref(exercise.slug)} className="hover:underline">{exercise.title}</Link>
      </h3>
      {!revealed ? (
        <>
          <p className="text-sm text-muted-foreground">Recall your {noun}, then reveal.</p>
          <Button variant="secondary" onClick={() => setRevealed(true)}>Reveal</Button>
        </>
      ) : (
        <>
          <blockquote className="border-l-4 border-primary pl-3">{insight || 'No insight saved.'}</blockquote>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {exercise.rubric.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <RatingButtons onRate={onRate} />
        </>
      )}
    </article>
  )
}
