export type SolutionSectionStep = 'intuition' | 'brute-force' | 'better' | 'optimal'

/** The `##` headings of a solution file, in order, and the `data-step` each section gets. */
export const SECTION_STEPS: Record<string, SolutionSectionStep> = {
  Intuition: 'intuition',
  'Brute force': 'brute-force',
  Better: 'better',
  Optimal: 'optimal',
}
