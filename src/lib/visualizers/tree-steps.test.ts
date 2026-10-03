import { describe, expect, it } from 'vitest'
import { subsetsTreeSteps } from './tree-steps'

describe('subsetsTreeSteps', () => {
  const steps = subsetsTreeSteps([1, 2, 3])

  it('collects the 8 subsets in DFS order', () => {
    expect(steps.at(-1)!.results).toEqual([[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]])
    expect(steps.at(-1)).toMatchObject({ done: true, caption: 'All 8 subsets found' })
  })

  it('shares one precomputed node array', () => {
    expect(steps[0].nodes).toHaveLength(8)
    for (const s of steps) expect(s.nodes).toBe(steps[0].nodes)
    expect(steps[0].nodes[0]).toMatchObject({ label: '[]', parent: null, depth: 0 })
  })

  it('keeps path equal to the label of the current node', () => {
    for (const s of steps) expect(s.nodes[s.current].label).toBe(`[${s.path.join(',')}]`)
  })

  it('chooses append one element and unchooses remove the last', () => {
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1].path
      const s = steps[i]
      if (s.action === 'choose') {
        expect(s.path).toHaveLength(prev.length + 1)
        expect(s.path.slice(0, -1)).toEqual(prev)
      } else if (s.action === 'unchoose') {
        expect(s.path).toEqual(prev.slice(0, -1))
      }
    }
  })

  it('records once per node', () => {
    const rec = steps.filter((s) => s.action === 'record')
    expect(rec).toHaveLength(8)
    expect(new Set(rec.map((s) => s.current)).size).toBe(8)
  })

  it('uses the documented captions', () => {
    const caps = steps.map((s) => s.caption)
    expect(caps).toContain('Record [1,2] as a subset')
    expect(caps).toContain('Choose 3 → [1,2,3]')
    expect(caps).toContain('Un-choose 3 → back to [1,2]')
  })

  it('marks visited nodes cumulatively', () => {
    expect(steps[0].visited).toEqual([0])
    expect(steps.at(-1)!.visited).toHaveLength(8)
  })

  it('handles an empty input', () => {
    const s = subsetsTreeSteps([])
    expect(s.at(-1)!.results).toEqual([[]])
    expect(s.at(-1)!.done).toBe(true)
  })
})
