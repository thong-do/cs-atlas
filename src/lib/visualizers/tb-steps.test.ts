import { describe, expect, it } from 'vitest'
import { tokenBucketSteps } from './tb-steps'

const tok = (n: number) => `${n} ${n === 1 ? 'token' : 'tokens'}`

describe('tokenBucketSteps', () => {
  const steps = tokenBucketSteps()

  it('has 20 steps with only the last done', () => {
    expect(steps).toHaveLength(20)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
    expect(steps[19].done).toBe(true)
  })

  it('pins the traced kinds, t, requests and allowed flags', () => {
    expect(steps.map((s) => s.kind)).toEqual([
      'start', 'request', 'request', 'request', 'request', 'request', 'request', 'request', 'request',
      'refill', 'request', 'refill', 'request', 'refill', 'request', 'request', 'refill', 'refill', 'request', 'done',
    ])
    expect(steps.map((s) => s.t)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 5, 5, 5])
    expect(steps.map((s) => s.request)).toEqual([null, 1, 2, 3, 4, 5, 6, 7, 8, null, 9, null, 10, null, 11, 12, null, null, 13, null])
    expect(steps.map((s) => s.allowed)).toEqual([
      null, true, true, true, true, true, false, false, false, null, true, null, true, null, true, false, null, null, true, null,
    ])
  })

  it('pins tokens and running counters', () => {
    expect(steps.map((s) => s.tokens)).toEqual([5, 4, 3, 2, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 2, 1, 1])
    expect(steps.map((s) => s.allowedCount)).toEqual([0, 1, 2, 3, 4, 5, 5, 5, 5, 5, 6, 6, 7, 7, 8, 8, 8, 8, 9, 9])
    expect(steps.map((s) => s.rejectedCount)).toEqual([0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4])
  })

  it('pins every caption verbatim', () => {
    const expected: string[] = ['The bucket started full: 5 tokens, refilling 1 per second']
    const tokens = [4, 3, 2, 1, 0]
    tokens.forEach((t, i) => expected.push(`t=0: request ${i + 1} was allowed — ${tok(t)} left`))
    for (const n of [6, 7, 8]) expected.push(`t=0: request ${n} was rejected with 429 — the bucket was empty`)
    expected.push(
      't=1: 1 token was added — 1 left',
      't=1: request 9 was allowed — 0 tokens left',
      't=2: 1 token was added — 1 left',
      't=2: request 10 was allowed — 0 tokens left',
      't=3: 1 token was added — 1 left',
      't=3: request 11 was allowed — 0 tokens left',
      't=3: request 12 was rejected with 429 — the bucket was empty',
      't=4: 1 token was added — 1 left',
      't=5: 1 token was added — 2 left',
      't=5: request 13 was allowed — 1 token left',
      'Done: 9 requests allowed, 4 rejected — bursts drained the bucket, steady traffic refilled it',
    )
    expect(steps.map((s) => s.caption)).toEqual(expected)
  })
})
