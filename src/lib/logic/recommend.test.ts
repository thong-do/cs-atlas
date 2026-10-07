import { describe, expect, it } from 'vitest'
import type { LessonMeta } from '@/lib/types'
import { recommendedLesson } from './recommend'

const p = (slug: string, prerequisites: string[] = [], track = 'algorithms'): LessonMeta => ({
  slug, track, title: slug, summary: 's', level: 'beginner', authors: [], prerequisites, confusedWith: [], triggers: ['t'], complexity: 'O(n)',
})
const lessons = [p('a'), p('b', ['a']), p('c', ['a']), p('d', ['b', 'c']), p('sd1', ['a'], 'system-design')]
const algo = new Set(['algorithms'])

describe('recommendedLesson', () => {
  it('starts with the first algorithms lesson when nothing is started', () => {
    expect(recommendedLesson(lessons, new Map(), new Set())).toBe('a')
  })
  it('moves on once a lesson is mastered', () => {
    expect(recommendedLesson(lessons, new Map([['a', 85]]), algo)).toBe('b')
  })
  it('skips lessons whose prerequisites are below 50', () => {
    expect(recommendedLesson(lessons, new Map([['a', 85], ['b', 85], ['c', 40]]), algo)).toBe('c')
  })
  it('only recommends from started tracks, honouring cross-track prerequisites', () => {
    const sdOnly = new Set(['system-design'])
    expect(recommendedLesson(lessons, new Map(), sdOnly)).toBe('sd1')
    expect(recommendedLesson(lessons, new Map([['a', 60]]), sdOnly)).toBe('sd1')
  })
  it('returns null when every lesson in the started tracks is mastered', () => {
    expect(recommendedLesson(lessons, new Map(lessons.map((l) => [l.slug, 90])), algo)).toBeNull()
  })
  it('falls back to the first unmastered lesson when none in the started track is ready', () => {
    const ls = [p('b', ['a']), p('a', [], 'system-design')]
    expect(recommendedLesson(ls, new Map(), new Set(['algorithms']))).toBe('b')
  })
})
