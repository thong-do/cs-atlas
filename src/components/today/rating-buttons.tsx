'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ReviewRating } from '@/lib/types'

const RATINGS: { value: ReviewRating; label: string }[] = [
  { value: 'again', label: 'Again' },
  { value: 'hard', label: 'Hard' },
  { value: 'good', label: 'Good' },
  { value: 'easy', label: 'Easy' },
]

export function RatingButtons({ onRate }: { onRate: (rating: ReviewRating) => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return (
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
  )
}
