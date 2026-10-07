'use client'

import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { useCatalog } from '@/lib/content/catalog-context'
import { trackHref } from '@/lib/content/hrefs'
import { useMasteries } from '@/lib/hooks/use-masteries'
import { trackLessons, trackMastery } from '@/lib/logic/lessons'

export function TracksOverview() {
  const { tracks } = useCatalog()
  const masteries = useMasteries() ?? new Map<string, number>()
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {tracks.map((t) => {
        const value = trackMastery(t, masteries)
        const lessons = trackLessons(t).length
        return (
          <li key={t.slug}>
            <Link href={trackHref(t.slug)} className="block space-y-3 rounded-lg border p-4 hover:bg-muted">
              <h2 className="text-lg font-semibold">{t.title}</h2>
              <p className="text-sm text-muted-foreground">{t.summary}</p>
              <p className="text-xs text-muted-foreground">{lessons} lesson{lessons === 1 ? '' : 's'} · {value}% mastered</p>
              <Progress value={value} className="h-2" aria-label={`${t.title} mastery`} />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
