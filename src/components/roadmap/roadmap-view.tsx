'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useCatalog } from '@/lib/content/catalog-context'
import { lessonHref } from '@/lib/content/hrefs'
import { useMasteries } from '@/lib/hooks/use-masteries'
import { MASTERED } from '@/lib/logic/mastery'
import { lessonExercises, startedTracks, trackLookup } from '@/lib/logic/lessons'
import { recommendedLesson } from '@/lib/logic/recommend'
import { layoutRoadmap } from '@/lib/logic/roadmap-layout'
import { useLive } from '@/lib/store/context'

const COL = 190
const PAD = 30
const ROW = 120
const R = 26
const CIRC = 2 * Math.PI * R

export function RoadmapView() {
  const router = useRouter()
  const { lessons, exercises, lessonBySlug } = useCatalog()
  const order = useMemo(() => lessons.map((l) => l.slug), [lessons])
  const masteries = useMasteries()
  const progress = useLive((s) => s.listProgress())
  const layout = useMemo(() => layoutRoadmap(order, lessons), [order, lessons])

  const m = masteries ?? new Map<string, number>()
  const solved = new Set((progress ?? []).filter((p) => p.status === 'solved').map((p) => p.slug))
  const trackOf = trackLookup(lessons)
  const recommended = masteries ? recommendedLesson(lessons, masteries, startedTracks(exercises, solved, trackOf)) : null
  const count = (slug: string) => {
    const ladder = lessonExercises(lessonBySlug.get(slug)!, exercises, trackOf)
    return `${ladder.filter((p) => solved.has(p.slug)).length}/${ladder.length}`
  }

  const width = layout.maxRow * COL + PAD * 2
  const height = layout.levels * ROW + 30
  const pos = new Map(layout.nodes.map((n) => [n.slug, {
    x: PAD + ((layout.maxRow - n.rowSize) * COL) / 2 + n.index * COL + COL / 2,
    y: n.level * ROW + 40,
  }]))

  return (
    <div className="overflow-x-auto rounded-lg border p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto h-auto w-full min-w-[720px] max-w-4xl" role="group" aria-label="Pattern roadmap">
        {layout.edges.map((e) => {
          const a = pos.get(e.from)!
          const b = pos.get(e.to)!
          const y1 = a.y + R + 40
          const y2 = b.y - R - 4
          const dy = (y2 - y1) / 2
          return <path key={`${e.from}-${e.to}`} d={`M ${a.x} ${y1} C ${a.x} ${y1 + dy}, ${b.x} ${y2 - dy}, ${b.x} ${y2}`} fill="none" className="stroke-border" strokeWidth={2} />
        })}
        {layout.nodes.map((n) => {
          const p = pos.get(n.slug)!
          const value = m.get(n.slug) ?? 0
          const isNext = n.slug === recommended
          const lesson = lessonBySlug.get(n.slug)
          const title = lesson?.title ?? n.slug
          const go = () => router.push(lessonHref(lesson!))
          return (
            <g
              key={n.slug}
              transform={`translate(${p.x} ${p.y})`}
              role="link"
              tabIndex={0}
              aria-label={`${title}: ${value}% mastery, ${count(n.slug)} solved${isNext ? ', recommended next' : ''}`}
              onClick={go}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } }}
              className="cursor-pointer focus:outline-none [&:focus-visible_.focus-ring]:opacity-100"
            >
              <circle r={R + 10} className="focus-ring fill-none stroke-ring opacity-0" strokeWidth={2} />
              {isNext && <circle r={R + 6} fill="none" className="stroke-amber-500" strokeWidth={2} strokeDasharray="4 3" />}
              <circle r={R} className="fill-background stroke-muted" strokeWidth={6} />
              <circle
                r={R}
                fill="none"
                className={value >= MASTERED ? 'stroke-emerald-500' : 'stroke-primary'}
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={`${(value / 100) * CIRC} ${CIRC}`}
                transform="rotate(-90)"
              />
              <text textAnchor="middle" dy="0.35em" className="fill-foreground text-[13px] font-semibold">{value}%</text>
              <text y={R + 18} textAnchor="middle" className="fill-foreground stroke-background text-[13px] font-medium" strokeWidth={5} strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>{title}</text>
              <text y={R + 34} textAnchor="middle" className="fill-muted-foreground stroke-background text-[11px]" strokeWidth={4} strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>{count(n.slug)}{isNext ? ' · next' : ''}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
