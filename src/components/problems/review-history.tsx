'use client'

import { formatDateTime } from '@/lib/format'
import { useLive } from '@/lib/store/context'
import type { ReviewRating } from '@/lib/types'

const LABEL: Record<ReviewRating, string> = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' }

export function ReviewHistory({ slug }: { slug: string }) {
  const logs = useLive((s) => s.listReviewLogs(slug), [slug]) ?? []
  const card = useLive((s) => s.getCard(slug), [slug])
  return (
    <section className="space-y-2" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-xl font-semibold">Reviews</h2>
      {card && (
        <p>Next review: <time dateTime={card.due} className="font-medium">{formatDateTime(card.due)}</time></p>
      )}
      <ol className="space-y-1 text-sm text-muted-foreground">
        {[...logs].reverse().map((log) => (
          <li key={log.id}>{formatDateTime(log.reviewedAt)} — {LABEL[log.rating]}</li>
        ))}
      </ol>
    </section>
  )
}
