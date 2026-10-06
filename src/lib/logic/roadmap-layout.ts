import type { LessonMeta, TrackMeta } from '@/lib/types'

export interface RoadmapLayout {
  nodes: { slug: string; level: number; index: number; rowSize: number }[]
  edges: { from: string; to: string }[]
  levels: number
  maxRow: number
}

export function layoutRoadmap(order: string[], lessons: LessonMeta[]): RoadmapLayout {
  const bySlug = new Map(lessons.map((l) => [l.slug, l]))
  const prereqs = (slug: string) => (bySlug.get(slug)?.prerequisites ?? []).filter((s) => bySlug.has(s))
  const memo = new Map<string, number>()
  const level = (slug: string): number => {
    const cached = memo.get(slug)
    if (cached !== undefined) return cached
    const pres = prereqs(slug)
    const value = pres.length ? 1 + Math.max(...pres.map(level)) : 0
    memo.set(slug, value)
    return value
  }

  const rows = new Map<number, string[]>()
  for (const slug of order) {
    if (!bySlug.has(slug)) continue
    const l = level(slug)
    rows.set(l, [...(rows.get(l) ?? []), slug])
  }

  const nodes = [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([l, slugs]) => slugs.map((slug, index) => ({ slug, level: l, index, rowSize: slugs.length })))
  const edges = order.flatMap((slug) => prereqs(slug).map((from) => ({ from, to: slug })))
  const rowSizes = [...rows.values()].map((r) => r.length)

  return {
    nodes,
    edges,
    levels: rows.size ? Math.max(...rows.keys()) + 1 : 0,
    maxRow: rowSizes.length ? Math.max(...rowSizes) : 0,
  }
}

export interface RoadmapBand { track: string; title: string; layout: RoadmapLayout }
export interface CrossEdge { from: string; to: string }

/** One band per track; levels use in-track prerequisites, and cross-track prerequisites become cross edges. */
export function layoutBands(tracks: TrackMeta[], lessons: LessonMeta[]): { bands: RoadmapBand[]; crossEdges: CrossEdge[]; maxRow: number } {
  const trackOf = new Map(lessons.map((l) => [l.slug, l.track]))
  const bands = tracks.map((t) => {
    const order = t.modules.flatMap((m) => m.lessons)
    const own = lessons.filter((l) => l.track === t.slug)
    return { track: t.slug, title: t.title, layout: layoutRoadmap(order, own) }
  })
  const crossEdges = lessons.flatMap((l) =>
    l.prerequisites.filter((pre) => trackOf.has(pre) && trackOf.get(pre) !== l.track).map((from) => ({ from, to: l.slug })),
  )
  return { bands, crossEdges, maxRow: Math.max(0, ...bands.map((b) => b.layout.maxRow)) }
}
