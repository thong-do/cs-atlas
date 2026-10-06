'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/lib/content/catalog-context'
import { lessonHref } from '@/lib/content/hrefs'
import { useMasteries } from '@/lib/hooks/use-masteries'
import { continueLesson, trackMastery } from '@/lib/logic/lessons'
import { MASTERED } from '@/lib/logic/mastery'

export function TrackHome({ slug }: { slug: string }) {
  const { trackBySlug, lessonBySlug } = useCatalog()
  const masteries = useMasteries() ?? new Map<string, number>()
  const track = trackBySlug.get(slug)!
  const next = continueLesson(track, masteries)

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">{track.title}</h1>
        <p className="text-lg text-muted-foreground">{track.summary}</p>
        <p className="text-sm text-muted-foreground">{trackMastery(track, masteries)}% mastered</p>
        {next && (
          <Button asChild>
            <Link href={lessonHref(lessonBySlug.get(next)!)}>Continue: {lessonBySlug.get(next)!.title}</Link>
          </Button>
        )}
      </header>

      {track.modules.map((m) => (
        <section key={m.slug} className="space-y-3">
          <h2 className="text-xl font-semibold">{m.title}</h2>
          <ul className="divide-y rounded-lg border">
            {m.lessons.map((s) => {
              const lesson = lessonBySlug.get(s)!
              const value = masteries.get(s) ?? 0
              return (
                <li key={s} className="flex items-center gap-3 px-3 py-2">
                  <Link href={lessonHref(lesson)} className="min-w-0 flex-1 truncate hover:underline">{lesson.title}</Link>
                  <Badge variant="secondary" className="capitalize">{lesson.level}</Badge>
                  <span className={value >= MASTERED ? 'w-10 text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400' : 'w-10 text-right text-sm tabular-nums'}>{value}%</span>
                </li>
              )
            })}
            {m.comingSoon.map((title) => (
              <li key={title} className="flex items-center gap-3 px-3 py-2 text-muted-foreground">
                <span className="min-w-0 flex-1 truncate">{title}</span>
                <span className="text-xs">Coming soon</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
