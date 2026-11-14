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
import { labelLines, layoutBands } from '@/lib/logic/roadmap-layout'
import { useLive } from '@/lib/store/context'
import { clampZoom, fitZoom, zoomIn, zoomOut } from '@/lib/logic/zoom'

const COL = 190
const PAD = 30
const ROW = 120
const TITLE = 44
const R = 26
const CIRC = 2 * Math.PI * R
const LINE = 15

export function RoadmapView() {
  const router = useRouter()
  const { tracks, lessons, exercises, lessonBySlug } = useCatalog()
  const masteries = useMasteries()
  const placements = usePlacements()
  const progress = useLive((s) => s.listProgress())
  const frame = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  // null = fit the whole tree to the frame's width (the default overview); a number = that scale, scrolling sideways.
  const [zoom, setZoomState] = useState<number | null>(null)
  // Content point under the pointer (or frame centre), held still across the next zoom change.
  const anchor = useRef<{ clientX: number; clientY: number; cx: number; cy: number } | null>(null)
  const [shown, setShown] = useState(1)
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

  const scale = () => (svgRef.current ? svgRef.current.getBoundingClientRect().width / width : 1)
  const fitScale = () => fitZoom((frame.current?.clientWidth ?? 0) - 18, width)

  /** Zooming out to (or below) the overview snaps back to fit, so the tree never shrinks smaller than the frame. */
  const setZoom = (next: number | null, at?: { clientX: number; clientY: number }) => {
    const el = frame.current
    const svg = svgRef.current
    if (!el || !svg) return
    const to = next === null || clampZoom(next) <= fitScale() + 1e-6 ? null : clampZoom(next)
    const r = svg.getBoundingClientRect()
    const box = el.getBoundingClientRect()
    const p = at ?? { clientX: box.left + box.width / 2, clientY: (Math.max(r.top, 0) + Math.min(r.bottom, window.innerHeight)) / 2 }
    const s = r.width / width
    anchor.current = { ...p, cx: (p.clientX - r.left) / s, cy: (p.clientY - r.top) / s }
    setZoomState(to)
  }

  useLayoutEffect(() => {
    const el = frame.current
    const svg = svgRef.current
    const a = anchor.current
    if (!el || !svg || !a) return
    anchor.current = null
    const r = svg.getBoundingClientRect()
    const s = r.width / width
    el.scrollLeft += r.left + a.cx * s - a.clientX
    window.scrollBy(0, r.top + a.cy * s - a.clientY)
  }, [zoom, width])

  // Keeps the readout true while fitted, as the frame resizes.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const ro = new ResizeObserver(() => setShown(svg.getBoundingClientRect().width / width))
    ro.observe(svg)
    return () => ro.disconnect()
  }, [width])

  // Ctrl/⌘ + wheel (and trackpad pinch, which browsers report as ctrl + wheel) zooms around the pointer.
  const wheelZoom = useRef(setZoom)
  wheelZoom.current = setZoom
  useEffect(() => {
    const el = frame.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      wheelZoom.current(scale() * Math.exp(-e.deltaY * 0.01), { clientX: e.clientX, clientY: e.clientY })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1" role="toolbar" aria-label="Roadmap zoom">
        <Button variant="outline" size="icon-sm" aria-label="Zoom out" disabled={zoom === null} onClick={() => setZoom(zoomOut(scale()))}>−</Button>
        <span className="w-12 text-center text-sm tabular-nums" aria-live="polite">{Math.round((zoom ?? shown) * 100)}%</span>
        <Button variant="outline" size="icon-sm" aria-label="Zoom in" onClick={() => setZoom(zoomIn(scale()))}>+</Button>
        <Button variant="outline" size="sm" disabled={zoom === null} onClick={() => setZoom(null)}>Fit</Button>
        <Button variant="outline" size="sm" onClick={() => setZoom(1)}>100%</Button>
        <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">Ctrl/⌘ + scroll to zoom</span>
      </div>
      <div ref={frame} role="region" tabIndex={0} aria-label="Roadmap, scrollable" className="overflow-x-auto rounded-lg border p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          {...(zoom === null
            ? { className: 'mx-auto block h-auto w-full', style: { maxWidth: width } }
            : { width: width * zoom, height: height * zoom, className: 'mx-auto block max-w-none' })}
          role="group"
          aria-label="Roadmap"
        >
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
            const below = (labelLines(lessonBySlug.get(e.from)?.title ?? e.from).length - 1) * LINE
            const y1 = a.y + R + 40 + below
            const y2 = b.y - R - 4
            const dy = (y2 - y1) / 2
            const cross = e.lane >= 0
            const laneX = 12 + 10 * e.lane
            const yOut = a.y + R + 46 + below
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
            const lines = labelLines(title)
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
                <text y={R + 18} textAnchor="middle" className="fill-foreground stroke-background text-[13px] font-medium" strokeWidth={5} strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>
                  {lines.map((line, i) => <tspan key={i} x={0} dy={i ? LINE : 0}>{line}</tspan>)}
                </text>
                <text y={R + 34 + (lines.length - 1) * LINE} textAnchor="middle" className="fill-muted-foreground stroke-background text-[11px]" strokeWidth={4} strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>{count(n.slug)}{isNext ? ' · next' : ''}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
