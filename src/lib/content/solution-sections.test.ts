import { describe, expect, it } from 'vitest'
import { solutionSteps } from './solution-sections'

describe('solutionSteps', () => {
  it('maps each top-level toc title to its step', () => {
    const toc = [{ title: 'Intuition' }, { title: 'Brute force' }, { title: 'Better' }, { title: 'Optimal' }]
    expect(solutionSteps(toc, 'solutions/two-sum')).toEqual(['intuition', 'brute-force', 'better', 'optimal'])
  })
  it('throws, naming the file, on a title that is not a step instead of returning undefined', () => {
    // A "# Note" h1 nests the following "##" sections under it in Velite's toc.
    const toc = [{ title: 'Intuition' }, { title: 'Note' }]
    expect(() => solutionSteps(toc, 'solutions/two-sum')).toThrow('content/solutions/two-sum.mdx: top-level heading "Note" is not a step')
    expect(() => solutionSteps([{ title: 'toString' }], 'solutions/two-sum')).toThrow('"toString" is not a step')
  })
})
