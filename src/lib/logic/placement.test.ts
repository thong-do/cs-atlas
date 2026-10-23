import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type PlacementQuestion, type TrackMeta } from '@/lib/types'
import { allSkippedLessons, placedTracks, scorePlacement, skippedLessons, withPlacement } from './placement'

const track: TrackMeta = {
  slug: 't', title: 'T', summary: 's', order: 1,
  modules: [
    { slug: 'm1', title: 'M1', lessons: ['a', 'b'], comingSoon: [] },
    { slug: 'm2', title: 'M2', lessons: ['c'], comingSoon: [] },
    { slug: 'm3', title: 'M3', lessons: ['d', 'e'], comingSoon: [] },
  ],
}
const q = (module: string, answer: number): PlacementQuestion => ({ module, prompt: `${module}?`, choices: ['w', 'x', 'y', 'z'], answer, explanation: 'e' })
// m3's questions come first to prove passedModules follows track order, not question order.
const questions = [q('m3', 0), q('m3', 1), q('m1', 2), q('m1', 3), q('m2', 0), q('m2', 1)]

describe('scorePlacement', () => {
  it('passes a module only when every one of its questions is right, in track order', () => {
    const s = scorePlacement(track, questions, [0, 1, 2, 3, 0, 2])
    expect(s.passedModules).toEqual(['m1', 'm3'])
    expect(s.byModule).toEqual({ m1: { correct: 2, total: 2 }, m2: { correct: 1, total: 2 }, m3: { correct: 2, total: 2 } })
  })
  it('treats a missing answer as wrong', () => {
    expect(scorePlacement(track, questions, [0, 1]).passedModules).toEqual(['m3'])
  })
})

describe('skippedLessons', () => {
  it('returns the lessons of every passed module, even after a failed one', () => {
    expect(skippedLessons(track, { passedModules: ['m1', 'm3'], takenAt: '2026-10-23T00:00:00.000Z' })).toEqual(new Set(['a', 'b', 'd', 'e']))
  })
  it('is empty without a placement and ignores unknown module slugs', () => {
    expect(skippedLessons(track, undefined)).toEqual(new Set())
    expect(skippedLessons(track, { passedModules: ['gone', 'm2'], takenAt: '2026-10-23T00:00:00.000Z' })).toEqual(new Set(['c']))
  })
  it('combines every track that has a placement', () => {
    const other: TrackMeta = { ...track, slug: 'u', modules: [{ slug: 'm1', title: 'M1', lessons: ['x'], comingSoon: [] }] }
    const placements = { t: { passedModules: ['m2'], takenAt: 'x' }, u: { passedModules: ['m1'], takenAt: 'x' } }
    expect(allSkippedLessons([track, other], placements)).toEqual(new Set(['c', 'x']))
    expect(allSkippedLessons([track, other], undefined)).toEqual(new Set())
  })
})

describe('withPlacement', () => {
  const p = { passedModules: ['m1'], takenAt: '2026-10-23T00:00:00.000Z' }
  it('adds or replaces one track and keeps every other setting', () => {
    const base = { desiredRetention: 0.85, theme: 'dark' as const, placements: { u: p } }
    const next = withPlacement(base, 't', p)
    expect(next).toEqual({ desiredRetention: 0.85, theme: 'dark', placements: { u: p, t: p } })
    expect(base.placements).toEqual({ u: p })
  })
  it('clears one track, and drops the field when none remain', () => {
    const one = withPlacement(DEFAULT_SETTINGS, 't', p)
    expect(withPlacement(one, 't', null)).toEqual(DEFAULT_SETTINGS)
    expect('placements' in withPlacement(one, 't', null)).toBe(false)
  })
})

describe('placedTracks', () => {
  const p = { passedModules: [], takenAt: '2026-01-01T00:00:00.000Z' }
  it('ignores keys that are not catalog tracks, in track order', () => {
    const other: TrackMeta = { ...track, slug: 'o', order: 2 }
    expect(placedTracks([track, other], { gone: p, o: p, t: p })).toEqual(['t', 'o'])
  })
  it('returns [] when there are no placements', () => {
    expect(placedTracks([track], undefined)).toEqual([])
  })
})
