import type { PatternMeta, ProblemMeta } from '@/lib/types'

export interface ContentInput {
  roadmap: string[]
  patterns: PatternMeta[]
  problems: ProblemMeta[]
}

export function validateContent({ roadmap, patterns, problems }: ContentInput): string[] {
  const errors: string[] = []

  const patternSlugs = new Set<string>()
  for (const p of patterns) {
    if (patternSlugs.has(p.slug)) errors.push(`Duplicate pattern slug "${p.slug}"`)
    patternSlugs.add(p.slug)
  }
  const known = (slug: string) => patternSlugs.has(slug)

  for (const p of patterns) {
    for (const ref of p.prerequisites) if (!known(ref)) errors.push(`Pattern "${p.slug}": unknown prerequisite "${ref}"`)
    for (const ref of p.confusedWith) if (!known(ref)) errors.push(`Pattern "${p.slug}": unknown confusedWith "${ref}"`)
  }

  const inRoadmap = new Set<string>()
  for (const slug of roadmap) {
    if (!known(slug)) errors.push(`Roadmap: unknown pattern "${slug}"`)
    if (inRoadmap.has(slug)) errors.push(`Roadmap: duplicate pattern "${slug}"`)
    inRoadmap.add(slug)
  }
  for (const slug of patternSlugs) if (!inRoadmap.has(slug)) errors.push(`Roadmap: missing pattern "${slug}"`)

  const cycle = findCycle(patterns)
  if (cycle) errors.push(`Prerequisite cycle: ${cycle.join(' -> ')}`)

  const problemSlugs = new Set<string>()
  const ids = new Set<number>()
  const ladderKeys = new Set<string>()
  for (const pr of problems) {
    if (problemSlugs.has(pr.slug)) errors.push(`Duplicate problem slug "${pr.slug}"`)
    problemSlugs.add(pr.slug)
    if (ids.has(pr.leetcodeId)) errors.push(`Duplicate leetcodeId ${pr.leetcodeId} ("${pr.slug}")`)
    ids.add(pr.leetcodeId)
    if (pr.patterns.length === 0) {
      errors.push(`Problem "${pr.slug}": no patterns`)
      continue
    }
    for (const ref of pr.patterns) if (!known(ref)) errors.push(`Problem "${pr.slug}": unknown pattern "${ref}"`)
    const key = `${pr.patterns[0]}#${pr.ladderOrder}`
    if (ladderKeys.has(key)) errors.push(`Problem "${pr.slug}": duplicate ladderOrder ${pr.ladderOrder} in "${pr.patterns[0]}"`)
    ladderKeys.add(key)
  }

  return errors
}

function findCycle(patterns: PatternMeta[]): string[] | null {
  const bySlug = new Map(patterns.map((p) => [p.slug, p]))
  const state = new Map<string, 'visiting' | 'done'>()
  const path: string[] = []

  const visit = (slug: string): string[] | null => {
    if (state.get(slug) === 'done') return null
    if (state.get(slug) === 'visiting') return [...path.slice(path.indexOf(slug)), slug]
    state.set(slug, 'visiting')
    path.push(slug)
    for (const pre of bySlug.get(slug)?.prerequisites ?? []) {
      if (!bySlug.has(pre)) continue
      const found = visit(pre)
      if (found) return found
    }
    path.pop()
    state.set(slug, 'done')
    return null
  }

  for (const p of patterns) {
    const found = visit(p.slug)
    if (found) return found
  }
  return null
}
