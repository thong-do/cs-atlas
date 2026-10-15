import { describe, expect, it } from 'vitest'
import { consistentHashingSteps } from './ch-steps'

const owners = (s: { keys: { owner: string | null }[] }) => s.keys.map((k) => k.owner)

describe('consistentHashingSteps', () => {
  const steps = consistentHashingSteps()

  it('has 10 steps with only the last done', () => {
    expect(steps).toHaveLength(10)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
    expect(steps[9].done).toBe(true)
  })

  it('pins captions verbatim', () => {
    expect(steps.map((s) => s.caption)).toEqual([
      'Three nodes sat on a ring of positions 0–99',
      'k1 (5) went to A, the first node clockwise',
      'k2 (30) went to B, the first node clockwise',
      'k3 (50) went to C, the first node clockwise',
      'k4 (70) went to C, the first node clockwise',
      'k5 (90) wrapped past 99 and went to A',
      'Each node owned the arc of positions just before it',
      'Node D joined at position 60',
      'k3 (50) moved from C to D — the only key that changed owner',
      'Done: adding D moved 1 of 5 keys; with hash mod N, going from 3 to 4 servers would move about 3 in 4 keys',
    ])
  })

  it('pins focus, owners and moved after each step', () => {
    expect(steps.map((s) => s.focus)).toEqual([null, 'k1', 'k2', 'k3', 'k4', 'k5', null, 'D', 'k3', null])
    expect(steps.map(owners)).toEqual([
      [null, null, null, null, null],
      ['A', null, null, null, null],
      ['A', 'B', null, null, null],
      ['A', 'B', 'C', null, null],
      ['A', 'B', 'C', 'C', null],
      ['A', 'B', 'C', 'C', 'A'],
      ['A', 'B', 'C', 'C', 'A'],
      ['A', 'B', 'C', 'C', 'A'],
      ['A', 'B', 'D', 'C', 'A'],
      ['A', 'B', 'D', 'C', 'A'],
    ])
    expect(steps.map((s) => s.moved)).toEqual([[], [], [], [], [], [], [], [], ['k3'], []])
  })

  it('places nodes and keys at the given positions', () => {
    expect(steps[0].nodes).toEqual([{ id: 'A', pos: 10 }, { id: 'B', pos: 45 }, { id: 'C', pos: 80 }])
    expect(steps[7].nodes.map((n) => n.id)).toEqual(['A', 'B', 'D', 'C'])
    expect(steps[7].nodes.find((n) => n.id === 'D')?.pos).toBe(60)
    expect(steps[0].keys.map((k) => k.pos)).toEqual([5, 30, 50, 70, 90])
    expect(steps[0].keys.map((k) => k.id)).toEqual(['k1', 'k2', 'k3', 'k4', 'k5'])
  })
})
