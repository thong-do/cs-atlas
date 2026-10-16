import { describe, expect, it } from 'vitest'
import { validateContent, type ContentInput, type ExerciseInput, type LessonInput, type TrackInput } from './validate'

const ALGO_SECTIONS = ['Intuition', 'Visual', 'Template', 'Complexity', 'Pitfalls', 'Tips & tricks']
const OTHER_SECTIONS = ['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks']

const lesson = (slug: string, track = 'algorithms', o: Partial<LessonInput> = {}): LessonInput => ({
  slug, track, title: slug, summary: 's', level: 'beginner', authors: [], prerequisites: [], confusedWith: [],
  triggers: track === 'algorithms' ? ['t'] : [], complexity: track === 'algorithms' ? 'O(n)' : undefined,
  headings: track === 'algorithms' ? ALGO_SECTIONS : OTHER_SECTIONS,
  path: `tracks/${track}/lessons/${slug}`, raw: '', ...o,
})
const exercise = (slug: string, lessons: string[], o: Record<string, unknown> = {}): ExerciseInput => ({
  slug, type: 'external-problem', title: slug, leetcodeId: slug.length * 100 + slug.charCodeAt(0),
  url: `https://leetcode.com/problems/${slug}/`, difficulty: 'easy', lessons, ladderOrder: 1,
  recognitionPrompt: 'prompt text', hint: 'hint', path: `exercises/${slug}`, ...o,
} as ExerciseInput)
const quiz = (slug: string, lessons: string[], o: Record<string, unknown> = {}): ExerciseInput => ({
  slug, type: 'quiz', title: slug, lessons, ladderOrder: 1, path: `exercises/${slug}`,
  questions: ['q1', 'q2', 'q3'].map((id) => ({ id, prompt: 'p', choices: ['x', 'y'], answer: 0, explanation: 'e' })),
  flashcards: [], ...o,
} as ExerciseInput)
const design = (slug: string, lessons: string[], o: Record<string, unknown> = {}): ExerciseInput => ({
  slug, type: 'design-prompt', title: slug, lessons, ladderOrder: 1, path: `exercises/${slug}`,
  prompt: 'p', reference: 'r', rubric: ['r1', 'r2', 'r3'].map((id) => ({ id, point: 'x' })), ...o,
} as ExerciseInput)
const track = (slug: string, order: number, modules: TrackInput['modules'], folder = slug): TrackInput => ({ slug, folder, order, modules })

const valid = (): ContentInput => ({
  tracks: [
    track('algorithms', 1, [{ slug: 'm1', lessons: ['aaa', 'bbb'], comingSoon: [] }]),
    track('system-design', 2, [
      { slug: 'm1', lessons: ['ccc'], comingSoon: [] },
      { slug: 'm2', lessons: [], comingSoon: ['Later'] },
    ]),
  ],
  lessons: [
    lesson('aaa'),
    lesson('bbb', 'algorithms', { prerequisites: ['aaa'], confusedWith: ['aaa'] }),
    lesson('ccc', 'system-design', { prerequisites: ['aaa'] }),
  ],
  exercises: [
    exercise('p1', ['aaa']),
    exercise('p2', ['bbb', 'ccc'], { leetcodeId: 2 }),
  ],
})

describe('validateContent', () => {
  it('accepts valid content, including cross-track references', () => {
    expect(validateContent(valid())).toEqual([])
  })

  it('V1: track slug must match its folder, be unreserved, and have a unique order', () => {
    const c = valid()
    c.tracks[0] = track('algos', 1, c.tracks[0].modules, 'algorithms')
    c.tracks[1] = { ...c.tracks[1], order: 1 }
    c.tracks.push(track('stats', 3, [{ slug: 'm', lessons: [], comingSoon: ['x'] }]))
    c.tracks.push(track('404', 4, [{ slug: 'm', lessons: [], comingSoon: ['x'] }]))
    const errors = validateContent(c)
    expect(errors).toContain('[V1] content/tracks/algorithms/track.yaml: slug "algos" must equal the folder name "algorithms"')
    expect(errors).toContain('[V1] content/tracks/system-design/track.yaml: order 1 is already used by another track')
    expect(errors).toContain('[V1] content/tracks/stats/track.yaml: slug "stats" is reserved for a site route')
    expect(errors).toContain('[V1] content/tracks/404/track.yaml: slug "404" is reserved for a site route')
  })

  it('V2: lesson slugs are unique across tracks', () => {
    const c = valid()
    c.lessons.push(lesson('aaa', 'system-design'))
    expect(validateContent(c)).toContain('[V2] content/tracks/system-design/lessons/aaa.mdx: slug "aaa" is already used in track "algorithms"')
  })

  it('V2: lesson file name must equal its slug, and errors name the real file', () => {
    const c = valid()
    c.lessons[0] = lesson('aaa', 'algorithms', { path: 'tracks/algorithms/lessons/my-topic' })
    expect(validateContent(c)).toContain('[V2] content/tracks/algorithms/lessons/my-topic.mdx: file name "my-topic" must equal slug "aaa"')
  })

  it('V3: every lesson sits in exactly one module of its own track', () => {
    const c = valid()
    c.tracks[0].modules[0].lessons = ['aaa', 'aaa', 'ghost', 'ccc']
    const errors = validateContent(c)
    expect(errors).toContain('[V3] content/tracks/algorithms/track.yaml: module "m1" lists "ghost", which is not a lesson in this track')
    expect(errors).toContain('[V3] content/tracks/algorithms/track.yaml: module "m1" lists "ccc", which is not a lesson in this track')
    expect(errors).toContain('[V3] content/tracks/algorithms/lessons/aaa.mdx: lesson is listed 2 times in its track; list it once')
    expect(errors).toContain('[V3] content/tracks/algorithms/lessons/bbb.mdx: lesson is not listed in any module of track "algorithms"')
  })

  it('V3: a lesson folder needs a track.yaml', () => {
    const c = valid()
    c.lessons.push(lesson('ddd', 'orphan'))
    c.exercises.push(exercise('p3', ['ddd'], { leetcodeId: 3 }))
    expect(validateContent(c)).toContain('[V3] content/tracks/orphan/lessons/ddd.mdx: track folder "orphan" has no track.yaml')
  })

  it('V4: a module needs a lesson or a comingSoon title', () => {
    const c = valid()
    c.tracks[1].modules[1].comingSoon = []
    expect(validateContent(c)).toContain('[V4] content/tracks/system-design/track.yaml: module "m2" needs at least one lesson or comingSoon title')
  })

  it('V5: prerequisites, confusedWith and exercise lessons must exist', () => {
    const c = valid()
    c.lessons[1] = lesson('bbb', 'algorithms', { prerequisites: ['zzz'], confusedWith: ['yyy'] })
    c.exercises[0] = exercise('p1', ['aaa', 'nope'])
    const errors = validateContent(c)
    expect(errors).toContain('[V5] content/tracks/algorithms/lessons/bbb.mdx: unknown prerequisite "zzz"')
    expect(errors).toContain('[V5] content/tracks/algorithms/lessons/bbb.mdx: unknown confusedWith "yyy"')
    expect(errors).toContain('[V5] content/exercises/p1.yaml: unknown lesson "nope"')
  })

  it('V5: an exercise must list at least one lesson', () => {
    const c = valid()
    c.exercises.push(exercise('p9', [], { leetcodeId: 9 }))
    expect(validateContent(c)).toContain('[V5] content/exercises/p9.yaml: lists no lessons')
  })

  it('V6: rejects prerequisite cycles, including across tracks', () => {
    const c = valid()
    c.lessons[0] = lesson('aaa', 'algorithms', { prerequisites: ['ccc'] })
    expect(validateContent(c).some((e) => e.startsWith('[V6] content/tracks: prerequisite cycle '))).toBe(true)
  })

  it('V7: ladderOrder is unique per primary lesson only', () => {
    const c = valid()
    c.exercises.push(exercise('p3', ['aaa'], { leetcodeId: 3 }))
    expect(validateContent(c)).toContain('[V7] content/exercises/p3.yaml: ladderOrder 1 is already used in "aaa"')
    const ok = valid()
    ok.exercises.push(exercise('p4', ['bbb', 'aaa'], { leetcodeId: 4, ladderOrder: 2 }))
    expect(validateContent(ok)).toEqual([])
  })

  it('V8: algorithms lessons need triggers and a complexity; other tracks do not', () => {
    const c = valid()
    c.lessons[0] = lesson('aaa', 'algorithms', { triggers: [], complexity: undefined })
    const errors = validateContent(c)
    expect(errors).toContain('[V8] content/tracks/algorithms/lessons/aaa.mdx: algorithms lessons need at least one trigger')
    expect(errors).toContain('[V8] content/tracks/algorithms/lessons/aaa.mdx: algorithms lessons need a complexity')
  })

  it('V9: lessons need the quality-bar sections (Template for algorithms, Example elsewhere)', () => {
    const c = valid()
    c.lessons[0] = lesson('aaa', 'algorithms', { headings: ['Intuition', 'Visual', 'Template', 'Tips & tricks'] })
    c.lessons[2] = lesson('ccc', 'system-design', { prerequisites: ['aaa'], headings: ALGO_SECTIONS })
    const errors = validateContent(c)
    expect(errors).toContain('[V9] content/tracks/algorithms/lessons/aaa.mdx: missing section(s) "## Pitfalls"')
    expect(errors).toContain('[V9] content/tracks/system-design/lessons/ccc.mdx: missing section(s) "## Example"')
  })

  it('V9: a lesson in the case-studies module needs the case-study sections', () => {
    const CS = ['Intuition', 'Requirements & estimates', 'Visual', 'Design walkthrough', 'Pitfalls', 'Tips & tricks']
    const c = valid()
    c.tracks[1].modules.push({ slug: 'case-studies', lessons: ['ddd'], comingSoon: [] })
    c.lessons.push(lesson('ddd', 'system-design', { prerequisites: ['aaa'], headings: CS }))
    c.exercises.push(exercise('p3', ['ddd'], { leetcodeId: 3 }))
    expect(validateContent(c).filter((e) => e.startsWith('[V9]'))).toEqual([])
    c.lessons[3] = lesson('ddd', 'system-design', { prerequisites: ['aaa'], headings: CS.filter((h) => h !== 'Requirements & estimates') })
    expect(validateContent(c)).toContain('[V9] content/tracks/system-design/lessons/ddd.mdx: missing section(s) "## Requirements & estimates"')
  })

  it('V9: a concept lesson with Design walkthrough but no Example still fails', () => {
    const c = valid()
    c.lessons[2] = lesson('ccc', 'system-design', { prerequisites: ['aaa'], headings: ['Intuition', 'Visual', 'Design walkthrough', 'Pitfalls', 'Tips & tricks'] })
    expect(validateContent(c)).toContain('[V9] content/tracks/system-design/lessons/ccc.mdx: missing section(s) "## Example"')
  })

  it('V9: <Visualizer kind> in the body must be a known kind', () => {
    const c = valid()
    c.lessons[0] = lesson('aaa', 'algorithms', { raw: 'ok <Visualizer kind="heap" />\n<Visualizer kind="nope" />' })
    const errors = validateContent(c).filter((e) => e.startsWith('[V9]'))
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/^\[V9\] content\/tracks\/algorithms\/lessons\/aaa\.mdx: unknown visualizer kind "nope" \(valid: .*two-pointers.*\)$/)
  })

  it('V10: every lesson needs at least one exercise', () => {
    const c = valid()
    c.exercises = [exercise('p1', ['aaa'])]
    const errors = validateContent(c)
    expect(errors).toContain('[V10] content/tracks/algorithms/lessons/bbb.mdx: no exercise lists this lesson')
    expect(errors).toContain('[V10] content/tracks/system-design/lessons/ccc.mdx: no exercise lists this lesson')
  })

  it('V11: exercise slugs and LeetCode ids are unique and URLs are on leetcode.com', () => {
    const c = valid()
    c.exercises.push(exercise('p1', ['aaa'], { leetcodeId: 2, ladderOrder: 9 }))
    c.exercises.push(exercise('p5', ['aaa'], { leetcodeId: 5, ladderOrder: 5, url: 'https://example.com/problems/p5/' }))
    const errors = validateContent(c)
    expect(errors).toContain('[V11] content/exercises/p1.yaml: duplicate exercise slug "p1"')
    expect(errors).toContain('[V11] content/exercises/p1.yaml: duplicate leetcodeId 2')
    expect(errors).toContain('[V11] content/exercises/p5.yaml: url must be on leetcode.com')
  })

  it('V11: exercise file name must equal its slug', () => {
    const c = valid()
    c.exercises[0] = exercise('p1', ['aaa'], { path: 'exercises/other' })
    expect(validateContent(c)).toContain('[V11] content/exercises/other.yaml: file name "other" must equal slug "p1"')
  })
  it('V11 applies to LeetCode problems only', () => {
    const c = valid()
    c.exercises.push(quiz('q1', ['aaa'], { ladderOrder: 7 }), design('d1', ['aaa'], { ladderOrder: 8 }))
    expect(validateContent(c)).toEqual([])
  })

  it('V12: quiz ids are unique and answers point at a choice', () => {
    const c = valid()
    c.exercises.push(quiz('q1', ['aaa'], {
      ladderOrder: 7,
      questions: [
        { id: 'a', prompt: 'p', choices: ['x', 'y'], answer: 2, explanation: 'e' },
        { id: 'a', prompt: 'p', choices: ['x', 'y'], answer: 0, explanation: 'e' },
        { id: 'b', prompt: 'p', choices: ['x', 'y'], answer: 1, explanation: 'e' },
      ],
      flashcards: [{ id: 'f', front: 'x', back: 'y' }, { id: 'f', front: 'x', back: 'y' }],
    }))
    const errors = validateContent(c)
    expect(errors).toContain('[V12] content/exercises/q1.yaml: question "a" answer 2 is not one of its 2 choices')
    expect(errors).toContain('[V12] content/exercises/q1.yaml: duplicate question id "a"')
    expect(errors).toContain('[V12] content/exercises/q1.yaml: duplicate flashcard id "f"')
  })

  it('V13: design rubric ids are unique', () => {
    const c = valid()
    c.exercises.push(design('d1', ['aaa'], {
      ladderOrder: 8,
      rubric: [{ id: 'r', point: 'x' }, { id: 'r', point: 'y' }, { id: 's', point: 'z' }],
    }))
    expect(validateContent(c)).toContain('[V13] content/exercises/d1.yaml: duplicate rubric id "r"')
  })

  it('V10 is satisfied by a quiz', () => {
    const c = valid()
    c.exercises = c.exercises.filter((e) => !e.lessons.includes('ccc'))
    c.exercises.push(quiz('q2', ['ccc'], { ladderOrder: 1 }))
    expect(validateContent(c).filter((e) => e.startsWith('[V10]') && e.includes('/ccc.mdx'))).toEqual([])
  })
})
