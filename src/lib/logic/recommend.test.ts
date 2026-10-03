import { describe, expect, it } from 'vitest'
import type { PatternMeta } from '@/lib/types'
import { recommendedPattern } from './recommend'

const p = (slug: string, prerequisites: string[] = []): PatternMeta => ({
  slug, title: slug, prerequisites, confusedWith: [], triggers: ['t'], complexity: '', summary: '', stub: false,
})
const patterns = [p('a'), p('b', ['a']), p('c', ['a']), p('d', ['b', 'c'])]
const order = ['a', 'b', 'c', 'd']

describe('recommendedPattern', () => {
  it('starts at the first pattern', () => {
    expect(recommendedPattern(order, patterns, new Map())).toBe('a')
  })

  it('moves on once a pattern is mastered and unlocks dependents at 50', () => {
    expect(recommendedPattern(order, patterns, new Map([['a', 85]]))).toBe('b')
  })

  it('skips patterns whose prerequisites are below 50', () => {
    const m = new Map([['a', 85], ['b', 85], ['c', 40]])
    expect(recommendedPattern(order, patterns, m)).toBe('c')
  })

  it('falls back to the first unmastered pattern when none is ready', () => {
    const m = new Map([['a', 40], ['b', 0]])
    expect(recommendedPattern(['b', 'a'], patterns, m)).toBe('a')
    expect(recommendedPattern(['b'], patterns, m)).toBe('b')
  })

  it('returns null when everything is mastered', () => {
    expect(recommendedPattern(order, patterns, new Map(order.map((s) => [s, 90])))).toBeNull()
  })
})
