import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { exerciseHref } from '@/lib/content/hrefs'
import type { QuizExercise } from '@/lib/types'

/** No rating buttons: finishing the quiz records the review. */
export function QuizReviewItem({ exercise, lessonTitle }: { exercise: QuizExercise; lessonTitle: string }) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <p className="font-semibold">Retake the {lessonTitle} quiz ({exercise.questionCount} questions)</p>
      <Button asChild><Link href={exerciseHref(exercise.slug)}>Take the quiz</Link></Button>
    </article>
  )
}
