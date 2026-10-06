import type { LessonMeta } from '@/lib/types'

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
