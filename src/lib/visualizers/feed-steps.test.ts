import { describe, expect, it } from 'vitest'
import { feedFanoutSteps, type Follower } from './feed-steps'

const E: string[] = []
const feeds = (o: Partial<Record<Follower, string[]>>): Record<Follower, string[]> => ({
  F1: E, F2: E, F3: E, F4: E, F5: E, ...o,
})

describe('feedFanoutSteps', () => {
  const steps = feedFanoutSteps()

  it('has 11 steps with only the last done', () => {
    expect(steps).toHaveLength(11)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
    expect(steps[10].done).toBe(true)
  })

  it('pins captions verbatim', () => {
    expect(steps.map((s) => s.caption)).toEqual([
      "Push: each post was copied into every follower's feed when it was written",
      'Ana posted p1 — it was written to 2 feeds (F1, F2)',
      'Cel posted p2 — it was written to 5 feeds (F1, F2, F3, F4, F5)',
      'Ben posted p3 — it was written to 1 feed (F3)',
      'F1 read its feed in 1 lookup: p2, p1',
      "Hybrid: Cel's posts were pulled at read time; everyone else's were still pushed",
      'Ana posted p1 — it was written to 2 feeds (F1, F2)',
      "Cel posted p2 — it was stored once in Cel's timeline, not in any feed",
      'Ben posted p3 — it was written to 1 feed (F3)',
      "F1 read its feed and Cel's timeline in 2 lookups and merged them: p2, p1",
      'Done: push made 8 feed writes and 1 read; hybrid made 3 writes and 2 reads — with millions of followers, skipping the celebrity\'s fan-out saves the most',
    ])
  })

  it('pins mode, focus, touched, counters and timeline', () => {
    expect(steps.map((s) => s.mode)).toEqual([...Array(5).fill('push'), ...Array(6).fill('hybrid')])
    expect(steps.map((s) => s.focus)).toEqual([null, 'p1', 'p2', 'p3', 'F1', null, 'p1', 'p2', 'p3', 'F1', null])
    expect(steps.map((s) => s.touched)).toEqual([
      [], ['F1', 'F2'], ['F1', 'F2', 'F3', 'F4', 'F5'], ['F3'], ['F1'], [], ['F1', 'F2'], [], ['F3'], ['F1'], [],
    ])
    expect(steps.map((s) => s.writes)).toEqual([0, 2, 7, 8, 8, 0, 2, 2, 3, 3, 3])
    expect(steps.map((s) => s.reads)).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0, 2, 2])
    expect(steps.map((s) => s.celebTimeline)).toEqual([[], [], [], [], [], [], [], ['p2'], ['p2'], ['p2'], ['p2']])
  })

  it('pins feeds after each step, newest first', () => {
    const push3 = feeds({ F1: ['p2', 'p1'], F2: ['p2', 'p1'], F3: ['p3', 'p2'], F4: ['p2'], F5: ['p2'] })
    expect(steps.map((s) => s.feeds)).toEqual([
      feeds({}),
      feeds({ F1: ['p1'], F2: ['p1'] }),
      feeds({ F1: ['p2', 'p1'], F2: ['p2', 'p1'], F3: ['p2'], F4: ['p2'], F5: ['p2'] }),
      push3,
      push3,
      feeds({}),
      feeds({ F1: ['p1'], F2: ['p1'] }),
      feeds({ F1: ['p1'], F2: ['p1'] }),
      feeds({ F1: ['p1'], F2: ['p1'], F3: ['p3'] }),
      feeds({ F1: ['p1'], F2: ['p1'], F3: ['p3'] }),
      feeds({ F1: ['p1'], F2: ['p1'], F3: ['p3'] }),
    ])
  })
})
