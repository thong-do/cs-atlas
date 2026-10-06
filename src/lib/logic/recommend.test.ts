import { describe, expect, it } from 'vitest'
import type { LessonMeta } from '@/lib/types'
import { recommendedLesson } from './recommend'

const p = (slug: string, prerequisites: string[] = []): LessonMeta => ({
  slug, track: 'algorithms', title: slug, summary: 's', level: 'beginner', authors: [], prerequisites, confusedWith: [], triggers: ['t'], complexity: 'O(n)',
})
const lessons = [p('a'), p('b', ['a']), p('c', ['a']), p('d', ['b', 'c'])]
const order = ['a', 'b', 'c', 'd']

describe('recommendedLesson', () => {
  it('starts at the first pattern', () => {
    expect(recommendedLesson(order, lessons, new Map())).toBe('a')
  })

  it('moves on once a pattern is mastered and unlocks dependents at 50', () => {
    expect(recommendedLesson(order, lessons, new Map([['a', 85]]))).toBe('b')
  })

  it('skips patterns whose prerequisites are below 50', () => {
    const m = new Map([['a', 85], ['b', 85], ['c', 40]])
    expect(recommendedLesson(order, lessons, m)).toBe('c')
  })

  it('falls back to the first unmastered pattern when none is ready', () => {
    const m = new Map([['a', 40], ['b', 0]])
    expect(recommendedLesson(['b', 'a'], lessons, m)).toBe('a')
    expect(recommendedLesson(['b'], lessons, m)).toBe('b')
  })

  it('returns null when everything is mastered', () => {
    expect(recommendedLesson(order, lessons, new Map(order.map((s) => [s, 90])))).toBeNull()
  })
})
