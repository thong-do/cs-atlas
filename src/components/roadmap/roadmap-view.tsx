'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/lib/content/catalog-context'
import { lessonHref } from '@/lib/content/hrefs'
import { useMasteries } from '@/lib/hooks/use-masteries'
import { usePlacements } from '@/lib/hooks/use-placements'
import { MASTERED } from '@/lib/logic/mastery'
import { lessonExercises, startedTracks, trackLookup } from '@/lib/logic/lessons'
import { allSkippedLessons, placedTracks } from '@/lib/logic/placement'
import { recommendedLesson } from '@/lib/logic/recommend'
import { layoutBands } from '@/lib/logic/roadmap-layout'
import { useLive } from '@/lib/store/context'
import { anchoredScroll, clampZoom, fitZoom, zoomIn, zoomOut } from '@/lib/logic/zoom'

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
  const placements = usePlacements()
  const progress = useLive((s) => s.listProgress())
  const frame = useRef<HTMLDivElement>(null)
  const [zoom, setZoomState] = useState(1)
  const zoomRef = useRef(1)
  // Viewport point (px) to hold still across the next zoom change; centre of the frame unless the wheel set it.
  const anchor = useRef<{ x: number; y: number; from: number } | null>(null)
  const centred = useRef(false)
  const { bands, crossEdges, maxRow } = useMemo(
    () => layoutBands([...tracks].sort((a, b) => a.order - b.order), lessons),
    [tracks, lessons],
  )

  const m = masteries ?? new Map<string, number>()
  const solved = new Set((progress ?? []).filter((p) => p.status === 'solved').map((p) => p.slug))
  const trackOf = trackLookup(lessons)
  // A placement counts as starting a track, so the roadmap recommends from it before any exercise is solved.
  const started = new Set([...startedTracks(exercises, solved, trackOf), ...placedTracks(tracks, placements)])
  const recommended = masteries ? recommendedLesson(lessons, masteries, started, allSkippedLessons(tracks, placements)) : null
  const count = (slug: string) => {
    const ladder = lessonExercises(lessonBySlug.get(slug)!, exercises)
    return `${ladder.filter((p) => solved.has(p.slug)).length}/${ladder.length}`
  }

  const heights = bands.map((b) => TITLE + b.layout.levels * ROW + 20)
  const top = heights.map((_, i) => heights.slice(0, i).reduce((x, y) => x + y, 0))
  const gutter = crossEdges.length ? 12 + 10 * crossEdges.length : 0
  const width = maxRow * COL + PAD * 2 + gutter
  const height = heights.reduce((x, y) => x + y, 0) + 10
  const pos = new Map(bands.flatMap((band, i) => band.layout.nodes.map((n) => [n.slug, {
    x: gutter + PAD + ((maxRow - n.rowSize) * COL) / 2 + n.index * COL + COL / 2,
    y: top[i] + TITLE + n.level * ROW + 40,
  }] as const)))
  const nodes = bands.flatMap((band) => band.layout.nodes)
  const edges = [
    ...bands.flatMap((band) => band.layout.edges.map((e) => ({ ...e, lane: -1 }))),
    ...crossEdges.map((e, i) => ({ ...e, lane: i })),
  ]

  const setZoom = (next: number, at?: { x: number; y: number }) => {
    const el = frame.current
    const to = clampZoom(next)
    if (to === zoomRef.current) return
    if (el) anchor.current = { ...(at ?? { x: el.clientWidth / 2, y: el.clientHeight / 2 }), from: zoomRef.current }
    zoomRef.current = to
    setZoomState(to)
  }

  useLayoutEffect(() => {
    const el = frame.current
    const a = anchor.current
    if (!el || !a) return
    anchor.current = null
    el.scrollLeft = anchoredScroll(el.scrollLeft, a.x, a.from, zoom)
    el.scrollTop = anchoredScroll(el.scrollTop, a.y, a.from, zoom)
  }, [zoom])

  // Ctrl/⌘ + wheel (and trackpad pinch, which browsers report as ctrl + wheel) zooms around the pointer.
  useEffect(() => {
    const el = frame.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      setZoom(zoomRef.current * Math.exp(-e.deltaY * 0.01), { x: e.clientX - r.left, y: e.clientY - r.top })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Start with the recommended lesson in view; the tree is larger than most screens at full size.
  const target = recommended ? pos.get(recommended) : undefined
  useEffect(() => {
    const el = frame.current
    if (!el || !target || centred.current) return
    centred.current = true
    el.scrollLeft = target.x * zoomRef.current - el.clientWidth / 2
    el.scrollTop = target.y * zoomRef.current - el.clientHeight / 3
  }, [target])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1" role="toolbar" aria-label="Roadmap zoom">
        <Button variant="outline" size="icon-sm" aria-label="Zoom out" onClick={() => setZoom(zoomOut(zoom))}>−</Button>
        <span className="w-12 text-center text-sm tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="icon-sm" aria-label="Zoom in" onClick={() => setZoom(zoomIn(zoom))}>+</Button>
        <Button variant="outline" size="sm" onClick={() => setZoom(fitZoom((frame.current?.clientWidth ?? 0) - 16, width))}>Fit</Button>
        <Button variant="outline" size="sm" onClick={() => setZoom(1)}>100%</Button>
        <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">Ctrl/⌘ + scroll to zoom</span>
      </div>
      <div ref={frame} role="region" tabIndex={0} aria-label="Roadmap, scrollable" className="max-h-[75vh] overflow-auto rounded-lg border p-2">
        <svg viewBox={`0 0 ${width} ${height}`} width={width * zoom} height={height * zoom} className="mx-auto block max-w-none" role="group" aria-label="Roadmap">
          {bands.map((band, i) => (
            <g key={band.track}>
              {i > 0 && <line x1={gutter + PAD} x2={width - PAD} y1={top[i] - 4} y2={top[i] - 4} className="stroke-border" strokeWidth={1} />}
              <g transform={`translate(${gutter + PAD} ${top[i] + 24})`}>
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
            const cross = e.lane >= 0
            const laneX = 12 + 10 * e.lane
            const yOut = a.y + R + 46
            const yIn = b.y - R - 16
            return (
              <path
                key={`${e.from}-${e.to}`}
                data-from={e.from}
                data-to={e.to}
                d={cross ? `M ${a.x} ${yOut} H ${laneX} V ${yIn} H ${b.x} V ${y2}` : `M ${a.x} ${y1} C ${a.x} ${y1 + dy}, ${b.x} ${y2 - dy}, ${b.x} ${y2}`}
                fill="none"
                className="stroke-border"
                strokeWidth={2}
                strokeDasharray={cross ? '6 4' : undefined}
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
    </div>
  )
}
