import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { exerciseHref } from '@/lib/content/hrefs'
import type { EstimateExercise } from '@/lib/types'

/** No rating buttons: finishing the drill records the review. */
export function EstimateReviewItem({ exercise }: { exercise: EstimateExercise }) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <p className="font-semibold">Redo {exercise.title} ({exercise.stepCount} steps)</p>
      <Button asChild><Link href={exerciseHref(exercise.slug)}>Do the drill</Link></Button>
    </article>
  )
}
