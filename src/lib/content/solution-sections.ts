export type SolutionSectionStep = 'intuition' | 'brute-force' | 'better' | 'optimal'

/** The `##` headings of a solution file, in order, and the `data-step` each section gets. */
export const SECTION_STEPS: Record<string, SolutionSectionStep> = {
  Intuition: 'intuition',
  'Brute force': 'brute-force',
  Better: 'better',
  Optimal: 'optimal',
}

/**
 * The steps of a solution, from its toc. Throws when a top-level toc entry isn't a step: an `#` heading would
 * nest the `##` sections under it and leave the steps unreadable, so fail loudly rather than hide the solution.
 */
export function solutionSteps(toc: { title: string }[], path: string): SolutionSectionStep[] {
  return toc.map(({ title }) => {
    const step = Object.hasOwn(SECTION_STEPS, title) ? SECTION_STEPS[title] : undefined
    if (!step) throw new Error(`content/${path}.mdx: top-level heading "${title}" is not a step`)
    return step
  })
}
