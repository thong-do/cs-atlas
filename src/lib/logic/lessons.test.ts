import { describe, expect, it } from 'vitest'
import type { ExerciseMeta, LessonMeta, TrackMeta } from '@/lib/types'
import { continueLesson, lessonExercises, startedTracks, trackLessons, trackLookup, trackMastery } from './lessons'

const lesson = (slug: string, track: string): LessonMeta => ({
  slug, track, title: slug, summary: 's', level: 'beginner', authors: [], prerequisites: [], confusedWith: [], triggers: [],
})
const ex = (slug: string, lessons: string[]): ExerciseMeta => ({
  slug, type: 'external-problem', title: slug, leetcodeId: slug.length, url: 'https://leetcode.com/problems/x/',
  difficulty: 'easy', lessons, ladderOrder: 1, recognitionPrompt: 'prompt text', hint: 'hint',
})
const lessons = [lesson('ll', 'algorithms'), lesson('ah', 'algorithms'), lesson('cache', 'system-design')]
const trackOf = trackLookup(lessons)
const exercises = [ex('lru', ['ll', 'ah', 'cache']), ex('own', ['ah']), ex('reverse', ['ll'])]
const sd: TrackMeta = {
  slug: 'system-design', title: 'SD', summary: 's', order: 2,
  modules: [{ slug: 'a', title: 'A', lessons: ['cache', 'lb'], comingSoon: [] }, { slug: 'b', title: 'B', lessons: [], comingSoon: ['x'] }],
}

describe('lessonExercises', () => {
  it('returns the ladder (primary lesson) first', () => {
    expect(lessonExercises(lessons[0], exercises, trackOf).map((e) => e.slug)).toEqual(['lru', 'reverse'])
  })
  it('does not share an exercise with a second lesson in the same track', () => {
    expect(lessonExercises(lessons[1], exercises, trackOf).map((e) => e.slug)).toEqual(['own'])
  })
  it('shares an exercise with a lesson in another track', () => {
    expect(lessonExercises(lessons[2], exercises, trackOf).map((e) => e.slug)).toEqual(['lru'])
  })
})

describe('track helpers', () => {
  it('lists a track’s lessons in module order', () => {
    expect(trackLessons(sd)).toEqual(['cache', 'lb'])
  })
  it('averages lesson mastery over the track, rounding', () => {
    expect(trackMastery(sd, new Map([['cache', 85], ['lb', 20]]))).toBe(53)
    expect(trackMastery({ ...sd, modules: [] }, new Map())).toBe(0)
  })
  it('continues at the first lesson below mastery, else the first lesson', () => {
    expect(continueLesson(sd, new Map([['cache', 90]]))).toBe('lb')
    expect(continueLesson(sd, new Map([['cache', 90], ['lb', 80]]))).toBe('cache')
    expect(continueLesson({ ...sd, modules: [] }, new Map())).toBeNull()
  })
  it('marks a track started once any exercise listing one of its lessons is solved', () => {
    expect([...startedTracks(exercises, new Set(), trackOf)]).toEqual([])
    expect([...startedTracks(exercises, new Set(['reverse']), trackOf)]).toEqual(['algorithms'])
    expect([...startedTracks(exercises, new Set(['lru']), trackOf)].sort()).toEqual(['algorithms', 'system-design'])
  })
})

describe('continueLesson with placed-out lessons', () => {
  const t: TrackMeta = {
    slug: 't', title: 'T', summary: 's', order: 1,
    modules: [
      { slug: 'm1', title: 'M1', lessons: ['a', 'b'], comingSoon: [] },
      { slug: 'm2', title: 'M2', lessons: ['c'], comingSoon: [] },
    ],
  }
  it('skips placed-out lessons', () => {
    expect(continueLesson(t, new Map(), new Set(['a', 'b']))).toBe('c')
  })
  it('falls back to the first unmastered lesson when everything left is skipped', () => {
    expect(continueLesson(t, new Map([['c', 90]]), new Set(['a', 'b']))).toBe('a')
  })
  it('behaves as before without a skipped set', () => {
    expect(continueLesson(t, new Map([['a', 90]]))).toBe('b')
  })
})
