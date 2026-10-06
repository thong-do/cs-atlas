'use client'

import Link from 'next/link'
import { useState } from 'react'
import { DifficultyBadge } from '@/components/difficulty-badge'
import { StatusIcon } from '@/components/status-icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/lib/content/catalog-context'
import { lessonHref } from '@/lib/content/hrefs'
import { exerciseStatus } from '@/lib/logic/filter'
import { useLive } from '@/lib/store/context'
import type { ExerciseMeta } from '@/lib/types'
import { MarkSolvedDialog } from './mark-solved-dialog'
import { NoteEditor } from './note-editor'
import { ReviewHistory } from './review-history'

export function ExerciseWorkspace({ exercise }: { exercise: ExerciseMeta }) {
  const { lessonBySlug } = useCatalog()
  const progress = useLive((s) => s.getProgress(exercise.slug), [exercise.slug])
  const [dialogOpen, setDialogOpen] = useState(false)
  const solved = progress?.status === 'solved'

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">LeetCode #{exercise.leetcodeId}</p>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <StatusIcon status={exerciseStatus(progress)} /> {exercise.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={exercise.difficulty} />
          {exercise.lessons.map((slug) => {
            const lesson = lessonBySlug.get(slug)
            const badge = <Badge variant="secondary">{lesson?.title ?? slug}</Badge>
            return lesson ? <Link key={slug} href={lessonHref(lesson)}>{badge}</Link> : <span key={slug}>{badge}</span>
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={exercise.url} target="_blank" rel="noreferrer">Open on LeetCode ↗</a>
          </Button>
          <Button variant="outline" onClick={() => setDialogOpen(true)}>{solved ? 'Log a re-solve' : 'Mark solved'}</Button>
        </div>
        {progress?.needsResolve && (
          <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
            You forgot this one in a review. Re-solve it on LeetCode, then log the re-solve.
          </p>
        )}
      </header>

      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer font-medium">Show hint</summary>
        <p className="mt-2 text-muted-foreground">{exercise.hint}</p>
      </details>

      {solved ? (
        <>
          <NoteEditor slug={exercise.slug} />
          <ReviewHistory slug={exercise.slug} />
        </>
      ) : (
        <p className="text-muted-foreground">Solve it on LeetCode, then mark it solved to unlock your note and reviews.</p>
      )}

      <MarkSolvedDialog slug={exercise.slug} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
