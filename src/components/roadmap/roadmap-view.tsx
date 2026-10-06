'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useCatalog } from '@/lib/content/catalog-context'
import { lessonHref } from '@/lib/content/hrefs'
import { useMasteries } from '@/lib/hooks/use-masteries'
import { MASTERED } from '@/lib/logic/mastery'
import { lessonExercises, startedTracks, trackLookup } from '@/lib/logic/lessons'
import { recommendedLesson } from '@/lib/logic/recommend'
import { layoutBands } from '@/lib/logic/roadmap-layout'
import { useLive } from '@/lib/store/context'

const COL = 190
const PAD = 30
const ROW = 120
const TITLE = 44
const R = 26
const CIRC = 2 * Math.PI * R

export function RoadmapView() {
  const router = useRouter()
  const { tracks, lessons, exercises, lessonBySlug } = useCatalog()
  const masteries = useMasteries()
  const progress = useLive((s) => s.listProgress())
  const { bands, crossEdges, maxRow } = useMemo(
    () => layoutBands([...tracks].sort((a, b) => a.order - b.order), lessons),
    [tracks, lessons],
  )

  const m = masteries ?? new Map<string, number>()
  const solved = new Set((progress ?? []).filter((p) => p.status === 'solved').map((p) => p.slug))
  const trackOf = trackLookup(lessons)
  const recommended = masteries ? recommendedLesson(lessons, masteries, startedTracks(exercises, solved, trackOf)) : null
  const count = (slug: string) => {
    const ladder = lessonExercises(lessonBySlug.get(slug)!, exercises, trackOf)
    return `${ladder.filter((p) => solved.has(p.slug)).length}/${ladder.length}`
  }

  const heights = bands.map((b) => TITLE + b.layout.levels * ROW + 20)
  const top = heights.map((_, i) => heights.slice(0, i).reduce((x, y) => x + y, 0))
  const width = maxRow * COL + PAD * 2
  const height = heights.reduce((x, y) => x + y, 0) + 10
  const pos = new Map(bands.flatMap((band, i) => band.layout.nodes.map((n) => [n.slug, {
    x: PAD + ((maxRow - n.rowSize) * COL) / 2 + n.index * COL + COL / 2,
    y: top[i] + TITLE + n.level * ROW + 40,
  }] as const)))
  const nodes = bands.flatMap((band) => band.layout.nodes)
  const edges = [
    ...bands.flatMap((band) => band.layout.edges.map((e) => ({ ...e, cross: false }))),
    ...crossEdges.map((e) => ({ ...e, cross: true })),
  ]

  return (
    <div className="overflow-x-auto rounded-lg border p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto h-auto w-full min-w-[720px] max-w-4xl" role="group" aria-label="Roadmap">
        {bands.map((band, i) => (
          <g key={band.track}>
            {i > 0 && <line x1={PAD} x2={width - PAD} y1={top[i] - 4} y2={top[i] - 4} className="stroke-border" strokeWidth={1} />}
            <g transform={`translate(${PAD} ${top[i] + 24})`}>
              <text className="fill-foreground text-[15px] font-semibold">{band.title}</text>
            </g>
          </g>
        ))}
        {edges.map((e) => {
          const a = pos.get(e.from)
          const b = pos.get(e.to)
          if (!a || !b) return null
          const y1 = a.y + R + 40
          const y2 = b.y - R - 4
          const dy = (y2 - y1) / 2
          return (
            <path
              key={`${e.from}-${e.to}`}
              data-from={e.from}
              data-to={e.to}
              d={`M ${a.x} ${y1} C ${a.x} ${y1 + dy}, ${b.x} ${y2 - dy}, ${b.x} ${y2}`}
              fill="none"
              className="stroke-border"
              strokeWidth={2}
              strokeDasharray={e.cross ? '6 4' : undefined}
            />
          )
        })}
        {nodes.map((n) => {
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
