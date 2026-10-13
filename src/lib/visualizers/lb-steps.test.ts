import { describe, expect, it } from 'vitest'
import { loadBalancerSteps } from './lb-steps'

const counts = (s: { active: Record<'A' | 'B' | 'C', string[]> }) => [s.active.A.length, s.active.B.length, s.active.C.length]

describe('loadBalancerSteps', () => {
  const steps = loadBalancerSteps()

  it('has 21 steps with one done step', () => {
    expect(steps).toHaveLength(21)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
    expect(steps[20].done).toBe(true)
  })

  it('round-robin assigns A B C A B C A B with the traced counts', () => {
    expect(steps.slice(1, 9).map((s) => s.server)).toEqual(['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B'])
    expect(steps.slice(1, 9).map(counts)).toEqual([[1, 0, 0], [1, 1, 0], [1, 0, 1], [2, 0, 0], [1, 1, 0], [1, 0, 1], [2, 0, 0], [1, 1, 0]])
    expect(steps[8].peak).toEqual({ A: 2, B: 1, C: 1 })
    expect(steps.slice(0, 10).every((s) => s.policy === 'round-robin')).toBe(true)
  })

  it('least-connections assigns A B B B A A A B', () => {
    expect(steps.slice(11, 19).map((s) => s.server)).toEqual(['A', 'B', 'B', 'B', 'A', 'A', 'A', 'B'])
    expect(steps.slice(11, 19).map(counts)).toEqual([[1, 0, 0], ...Array(7).fill([1, 1, 0])])
    expect(steps[18].peak).toEqual({ A: 1, B: 1, C: 0 })
    expect(steps.slice(10).every((s) => s.policy === 'least-connections')).toBe(true)
  })

  it('resets between phases', () => {
    expect(steps[10].t).toBeNull()
    expect(steps[10].request).toBeNull()
    expect(counts(steps[10])).toEqual([0, 0, 0])
    expect(steps[10].peak).toEqual({ A: 0, B: 0, C: 0 })
    expect(steps[0].t).toBeNull()
    expect(steps[0].peak).toEqual({ A: 0, B: 0, C: 0 })
  })

  it('writes the captions', () => {
    expect(steps[0].caption).toBe('Round-robin: each new request went to the next server in turn')
    expect(steps[1].caption).toBe('t=0: r1 (4 s) went to A — A now has 1 active')
    expect(steps[2].caption).toBe('t=1: r2 (1 s) went to B — B now has 1 active')
    expect(steps[4].caption).toBe('t=3: r4 (4 s) went to A — A now has 2 active')
    expect(steps[9].caption).toBe('Round-robin: the busiest server peaked at 2 active requests')
    expect(steps[10].caption).toBe('Least-connections: each new request went to the server with the fewest active requests')
    expect(steps[13].caption).toBe('t=2: r3 (1 s) went to B — B now has 1 active')
    expect(steps[19].caption).toBe('Least-connections: no server ever had more than 1 active request')
    expect(steps[20].caption).toBe('Done: peak load 2 with round-robin vs 1 with least-connections')
  })
})
