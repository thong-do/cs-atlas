import { describe, expect, it } from 'vitest'
import { lruCacheSteps } from './cache-steps'

describe('lruCacheSteps', () => {
  const steps = lruCacheSteps(3, ['A', 'B', 'C', 'A', 'D', 'B', 'E', 'A'])

  it('matches the hand-traced LRU sequence', () => {
    expect(steps.map((s) => s.slots.join(''))).toEqual(['', 'A', 'BA', 'CBA', 'ACB', 'DAC', 'BDA', 'EBD', 'AEB', 'AEB'])
    expect(steps.map((s) => s.event ?? '-')).toEqual(['-', 'miss', 'miss', 'miss', 'hit', 'miss', 'miss', 'miss', 'miss', '-'])
    expect(steps.map((s) => s.evicted ?? '-')).toEqual(['-', '-', '-', '-', '-', 'B', 'C', 'A', 'D', '-'])
    expect(steps.map((s) => s.index ?? -1)).toEqual([-1, 0, 1, 2, 3, 4, 5, 6, 7, -1])
  })

  it('writes past-tense captions and a final summary', () => {
    expect(steps[0].caption).toBe('Empty cache with room for 3 items')
    expect(steps[1].caption).toBe('Read A: miss — loaded A from the database')
    expect(steps[4].caption).toBe('Read A: hit — moved A to the front')
    expect(steps[5].caption).toBe('Read D: miss — loaded D and evicted B, the least recently used')
    expect(steps.at(-1)!.caption).toBe('Done: 1 hit, 7 misses, 4 evictions')
    expect(steps.at(-1)!.done).toBe(true)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
  })

  it('counts hits and misses as it goes', () => {
    expect(steps.map((s) => `${s.hits}/${s.misses}`)).toEqual(['0/0', '0/1', '0/2', '0/3', '1/3', '1/4', '1/5', '1/6', '1/7', '1/7'])
  })
})
