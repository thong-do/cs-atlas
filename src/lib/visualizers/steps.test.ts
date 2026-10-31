import { describe, expect, it } from 'vitest'
import { binarySearchSteps, gridBfsSteps, slidingWindowSteps, twoPointersSteps } from './steps'

describe('twoPointersSteps', () => {
  it('walks inward until the pair is found', () => {
    const steps = twoPointersSteps([1, 3, 4, 6, 8, 11], 10)
    expect(steps).toHaveLength(5)
    expect(steps.at(-1)).toMatchObject({ markers: { L: 2, R: 3 }, done: true })
    expect(steps[0].caption).toContain('move R left')
  })

  it('ends with a not-found step when no pair exists', () => {
    const last = twoPointersSteps([1, 2], 10).at(-1)!
    expect(last.done).toBe(true)
    expect(last.caption).toContain('no pair')
  })
})

describe('slidingWindowSteps', () => {
  it('finds the longest window without repeats', () => {
    const steps = slidingWindowSteps('abcabcbb')
    expect(steps.at(-1)).toMatchObject({ done: true, caption: 'Longest window without repeats: 3' })
    expect(steps.some((s) => s.caption.includes("'a' is already in the window"))).toBe(true)
  })

  it('handles an empty string', () => {
    expect(slidingWindowSteps('')).toEqual([{ cells: [], markers: {}, caption: 'Longest window without repeats: 0', done: true }])
  })
})

describe('binarySearchSteps', () => {
  it('narrows the half-open range to the first match, without stopping at a hit', () => {
    const steps = binarySearchSteps([1, 3, 5, 7, 9, 11], 7)
    expect(steps.map((s) => s.markers)).toEqual([
      { lo: 0, mid: 3, hi: 6 },
      { lo: 0, mid: 1, hi: 3 },
      { lo: 2, mid: 2, hi: 3 },
      { lo: 3, hi: 3 },
    ])
    expect(steps.at(-1)).toMatchObject({ done: true })
    expect(steps.at(-1)!.caption).toContain('found it')
  })

  it('finds the first of several equal values', () => {
    expect(binarySearchSteps([2, 2, 2, 2], 2).at(-1)).toMatchObject({ markers: { lo: 0, hi: 0 }, done: true })
  })

  it('never tests hi, and adds a cell for the one-past-the-end marker', () => {
    const steps = binarySearchSteps([1, 3, 5], 9)
    expect(steps[0].cells).toEqual([1, 3, 5, 'end'])
    expect(steps[0].markers.hi).toBe(3)
    for (const s of steps.slice(0, -1)) expect(s.markers.mid).toBeLessThan(s.markers.hi)
  })

  it('reports not found when lo stops on another value or past the end', () => {
    for (const target of [4, 9]) {
      const last = binarySearchSteps([1, 3, 5], target).at(-1)!
      expect(last).toMatchObject({ done: true })
      expect(last.caption).toContain('not in the array')
    }
    expect(binarySearchSteps([], 1).at(-1)!.caption).toContain('not in the array')
  })
})

describe('gridBfsSteps', () => {
  const grid = [
    ['1', '1', '0', '0'],
    ['1', '0', '0', '1'],
    ['1', '1', '0', '1'],
    ['0', '1', '1', '1'],
  ]
  // land cells: 2 + 2 + 3 + 3 = 10, all connected to (0,0)
  const island = 10

  it('explores the whole island and reports its size', () => {
    const steps = gridBfsSteps(grid, [0, 0])
    expect(steps.at(-1)).toMatchObject({ done: true, caption: `Island explored: ${island} cells`, cols: 4 })
    expect(steps[0].caption).toContain('visited when enqueued')
  })

  it('visits every cell once and only land', () => {
    const last = gridBfsSteps(grid, [0, 0]).at(-1)!
    const visited = last.visited!
    expect(new Set(visited).size).toBe(visited.length)
    expect(visited).toHaveLength(island)
    for (const idx of visited) expect(grid.flat()[idx]).toBe('1')
  })

  it('has one dequeue step per island cell', () => {
    const steps = gridBfsSteps(grid, [0, 0])
    expect(steps.filter((s) => s.caption.startsWith('Visit ')).length).toBe(island)
    expect(steps[0].frontier).toEqual([0])
  })

  it('returns a single done step when starting on water', () => {
    const steps = gridBfsSteps(grid, [0, 2])
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ done: true, caption: 'Island explored: 0 cells' })
  })
})
