'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { FlashcardEntry, ReviewRating } from '@/lib/types'
import { RatingButtons } from './rating-buttons'

export function FlashcardReviewItem({
  card, lessonTitle, onRate,
}: {
  card: FlashcardEntry
  lessonTitle: string
  onRate: (rating: ReviewRating) => Promise<void>
}) {
  const [revealed, setRevealed] = useState(false)
  return (
    <article className="space-y-3 rounded-lg border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Flashcard · {lessonTitle}</p>
      <p className="text-lg font-semibold">{card.front}</p>
      {!revealed ? (
        <Button variant="secondary" onClick={() => setRevealed(true)}>Reveal</Button>
      ) : (
        <>
          <blockquote className="border-l-4 border-primary pl-3">{card.back}</blockquote>
          <RatingButtons onRate={onRate} />
        </>
      )}
    </article>
  )
}
