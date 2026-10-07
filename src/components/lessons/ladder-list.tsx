'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { DifficultyBadge } from '@/components/difficulty-badge'
import { StatusIcon } from '@/components/status-icon'
import { exerciseStatus } from '@/lib/logic/filter'
import { exerciseHref } from '@/lib/content/hrefs'
import { useLive } from '@/lib/store/context'
import type { ExerciseMeta } from '@/lib/types'

export function LadderList({ exercises }: { exercises: ExerciseMeta[] }) {
  const list = useLive((s) => s.listProgress())
  const progress = useMemo(() => new Map((list ?? []).map((p) => [p.slug, p])), [list])
  if (exercises.length === 0) return <p className="text-muted-foreground">No exercises in this ladder yet.</p>
  return (
    <ol className="not-prose divide-y rounded-lg border">
      {exercises.map((p, i) => (
        <li key={p.slug} className="flex items-center gap-3 px-3 py-2">
          <span className="w-5 text-right text-xs text-muted-foreground">{i + 1}</span>
          <StatusIcon status={exerciseStatus(progress.get(p.slug))} />
          <Link href={exerciseHref(p.slug)} className="min-w-0 flex-1 truncate hover:underline">{p.title}</Link>
          <DifficultyBadge difficulty={p.difficulty} />
          <a href={p.url} target="_blank" rel="noreferrer" aria-label={`Open ${p.title} on LeetCode`} className="text-sm text-muted-foreground hover:text-foreground">↗</a>
        </li>
      ))}
    </ol>
  )
}
