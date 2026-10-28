import { describe, expect, it } from 'vitest'
import type { ExerciseMeta, LessonMeta, TrackMeta } from '@/lib/types'
import { continueLesson, exercisesInTracks, lessonExercises, relatedExercises, startedTracks, trackComplete, trackLessons, trackLookup, trackMastery } from './lessons'

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
    expect(lessonExercises(lessons[0], exercises).map((e) => e.slug)).toEqual(['lru', 'reverse'])
  })
  it('does not share an exercise with a second lesson in the same track', () => {
    expect(lessonExercises(lessons[1], exercises).map((e) => e.slug)).toEqual(['own'])
  })
  it('does not count an exercise from another track toward a lesson', () => {
    expect(lessonExercises(lessons[2], exercises).map((e) => e.slug)).toEqual([])
  })
})

describe('exercisesInTracks', () => {
  it('keeps exercises whose primary lesson is in one of the tracks', () => {
    expect(exercisesInTracks(exercises, new Set(['algorithms']), trackOf).map((e) => e.slug)).toEqual(['lru', 'own', 'reverse'])
    expect(exercisesInTracks(exercises, new Set(['system-design']), trackOf)).toEqual([])
  })
})

describe('relatedExercises', () => {
  it('lists exercises from other tracks that also name the lesson', () => {
    expect(relatedExercises(lessons[2], exercises, trackOf).map((e) => e.slug)).toEqual(['lru'])
  })
  it('lists nothing for a lesson whose sharers are all in its own track', () => {
    expect(relatedExercises(lessons[1], exercises, trackOf)).toEqual([])
    expect(relatedExercises(lessons[0], exercises, trackOf)).toEqual([])
  })
})

describe('track helpers', () => {
  it('lists a track’s lessons in module order', () => {
    expect(trackLessons(sd)).toEqual(['cache', 'lb'])
  })
  it('is complete only when every lesson is mastered', () => {
    expect(trackComplete(sd, new Map([['cache', 90], ['lb', 80]]))).toBe(true)
    expect(trackComplete(sd, new Map([['cache', 90], ['lb', 79]]))).toBe(false)
    expect(trackComplete({ ...sd, modules: [] }, new Map())).toBe(false)
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
