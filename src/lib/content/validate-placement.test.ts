import { describe, expect, it } from 'vitest'
import type { PlacementQuestion } from '@/lib/types'
import type { ContentInput } from './validate'
import { validatePlacements, type PlacementInput } from './validate-placement'

const content = (): ContentInput => ({
  tracks: [
    { slug: 'cs', folder: 'cs', order: 1, modules: [
      { slug: 'm1', lessons: ['a'], comingSoon: [] },
      { slug: 'm2', lessons: ['b'], comingSoon: [] },
      { slug: 'later', lessons: [], comingSoon: ['Soon'] },
    ] },
    { slug: 'system-design', folder: 'system-design', order: 2, modules: [
      { slug: 'm1', lessons: ['c'], comingSoon: [] },
      { slug: 'case-studies', lessons: ['d'], comingSoon: [] },
    ] },
  ],
  lessons: [],
  exercises: [{
    slug: 'a-quiz', type: 'quiz', title: 'q', lessons: ['a'], ladderOrder: 1, path: 'exercises/a-quiz', flashcards: [],
    questions: [{ id: 'q1', prompt: 'Which  Structure is FAST?', choices: ['x', 'y'], answer: 0, explanation: 'e' }],
  }],
} as unknown as ContentInput)
let n = 0
const q = (module: string, o: Partial<PlacementQuestion> = {}): PlacementQuestion =>
  ({ module, prompt: `prompt ${++n}`, choices: ['w', 'x', 'y', 'z'], answer: 1, explanation: 'e', ...o })
const file = (track: string, questions: PlacementQuestion[], path = `placement/${track}`): PlacementInput => ({ track, path, questions })
const ok = () => file('cs', [q('m1'), q('m1'), q('m2'), q('m2'), q('m2')])

describe('validatePlacements', () => {
  it('accepts a valid file, and tracks without a file', () => {
    expect(validatePlacements([ok()], content())).toEqual([])
    expect(validatePlacements([], content())).toEqual([])
  })
  it('rejects an unknown track, a mismatched file name and a second file for one track', () => {
    expect(validatePlacements([file('nope', [])], content())).toEqual(['[V14] content/placement/nope.yaml: unknown track "nope"'])
    expect(validatePlacements([{ ...ok(), path: 'placement/other' }], content())[0]).toContain('file name "other" must equal track "cs"')
    expect(validatePlacements([ok(), ok()], content())).toContain('[V14] content/placement/cs.yaml: track "cs" already has a placement quiz')
  })
  it('rejects unknown modules and wrong question counts', () => {
    const errors = validatePlacements([file('cs', [q('m1'), q('m2'), q('m2'), q('zzz')])], content())
    expect(errors).toContain('[V14] content/placement/cs.yaml: question 4 names unknown module "zzz"')
    expect(errors).toContain('[V14] content/placement/cs.yaml: module "m1" has 1 question(s); it needs 2–3')
    expect(validatePlacements([file('cs', [q('m1'), q('m1'), q('m1'), q('m1'), q('m2'), q('m2')])], content()))
      .toContain('[V14] content/placement/cs.yaml: module "m1" has 4 question(s); it needs 2–3')
  })
  it('requires 0 questions for exempt modules and modules without lessons', () => {
    expect(validatePlacements([file('cs', [...ok().questions, q('later')])], content()))
      .toContain('[V14] content/placement/cs.yaml: module "later" must have no placement questions')
    expect(validatePlacements([file('system-design', [q('m1'), q('m1')])], content())).toEqual([])
    expect(validatePlacements([file('system-design', [q('m1'), q('m1'), q('case-studies')])], content()))
      .toContain('[V14] content/placement/system-design.yaml: module "case-studies" must have no placement questions')
  })
  it('rejects bad choices and answers', () => {
    const errors = validatePlacements([file('cs', [
      q('m1', { choices: ['w', 'x', 'y'] }), q('m1', { choices: ['w', 'W ', 'y', 'z'] }),
      q('m2', { answer: 4 }), q('m2'),
    ])], content())
    expect(errors).toContain('[V14] content/placement/cs.yaml: question 1 needs exactly 4 choices, has 3')
    expect(errors).toContain('[V14] content/placement/cs.yaml: question 2 has duplicate choices')
    expect(errors).toContain('[V14] content/placement/cs.yaml: question 3 answer 4 is not one of its choices')
  })
  it('rejects a prompt that repeats a lesson-quiz question', () => {
    expect(validatePlacements([file('cs', [q('m1', { prompt: 'which structure is  fast?' }), q('m1'), q('m2'), q('m2')])], content()))
      .toContain('[V14] content/placement/cs.yaml: question 1 repeats a lesson-quiz prompt')
  })
  it('reserves the lesson slug "placement"', () => {
    const c = content()
    c.lessons = [{ slug: 'placement', path: 'tracks/cs/lessons/placement' } as ContentInput['lessons'][number]]
    expect(validatePlacements([], c)).toEqual(['[V14] content/tracks/cs/lessons/placement.mdx: the slug "placement" is reserved for the placement quiz route'])
  })
})
