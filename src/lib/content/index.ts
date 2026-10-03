import { patterns, problems, roadmap } from '#site/content'
import type { Catalog, PatternMeta, ProblemMeta } from '@/lib/types'

export interface TocEntry {
  title: string
  url: string
  items: TocEntry[]
}

export type PatternDoc = PatternMeta & { body: string; toc: TocEntry[] }

function toPatternMeta(p: PatternMeta): PatternMeta {
  return {
    slug: p.slug,
    title: p.title,
    prerequisites: p.prerequisites,
    confusedWith: p.confusedWith,
    triggers: p.triggers,
    complexity: p.complexity,
    summary: p.summary,
    stub: p.stub,
  }
}

export function getCatalog(): Catalog {
  const order = roadmap.order
  const rank = (slug: string) => order.indexOf(slug)
  return {
    order,
    patterns: order.map((slug) => toPatternMeta(patterns.find((p) => p.slug === slug)!)),
    problems: [...(problems as ProblemMeta[])].sort(
      (a, b) => rank(a.patterns[0]) - rank(b.patterns[0]) || a.ladderOrder - b.ladderOrder,
    ),
  }
}

export function getPatternDoc(slug: string): PatternDoc | undefined {
  return patterns.find((p) => p.slug === slug) as PatternDoc | undefined
}

export function getProblem(slug: string): ProblemMeta | undefined {
  return (problems as ProblemMeta[]).find((p) => p.slug === slug)
}
