'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { useCatalog } from '@/lib/content/catalog-context'
import { lessonHref } from '@/lib/content/hrefs'

export function LessonBadges({ lessons }: { lessons: string[] }) {
  const { lessonBySlug } = useCatalog()
  return (
    <>
      {lessons.map((slug) => {
        const lesson = lessonBySlug.get(slug)
        const badge = <Badge variant="secondary">{lesson?.title ?? slug}</Badge>
        return lesson ? <Link key={slug} href={lessonHref(lesson)}>{badge}</Link> : <span key={slug}>{badge}</span>
      })}
    </>
  )
}
