import { describe, expect, it } from 'vitest'
import type { ContentInput } from './validate'
import { validateSolutions, type SolutionInput } from './validate-solutions'

const content = (): ContentInput => ({
  tracks: [],
  lessons: [],
  exercises: [
    { slug: 'two-sum', type: 'external-problem', title: 't', lessons: ['a'], ladderOrder: 1, path: 'exercises/two-sum' },
    { slug: 'a-quiz', type: 'quiz', title: 'q', lessons: ['a'], ladderOrder: 0, path: 'exercises/a-quiz', questions: [], flashcards: [] },
  ],
} as unknown as ContentInput)

const approach = (title: string, o: { steps?: number; code?: string; extra?: string; table?: boolean; complexity?: boolean; wasted?: boolean } = {}) => [
  `## ${title}`,
  '',
  'The idea in one sentence.',
  '',
  ...Array.from({ length: o.steps ?? 3 }, (_, i) => `${i + 1}. Step ${i + 1}.`),
  '',
  '```python',
  o.code ?? 'class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]',
  '```',
  ...(o.extra ? ['', o.extra] : []),
  '',
  ...(o.table === false ? [] : ['| i | x |', '|---|---|', '| 0 | 2 |', '']),
  ...(o.complexity === false ? [] : ['**Complexity:** O(n) time, O(n) space.', '']),
  ...(o.wasted ?? title !== 'Optimal' ? ["**What's wasted:** the repeated scan.", ''] : []),
].join('\n')

const intuition = (extra = '') => `## Intuition\n\nA picture of the problem.${extra}\n`
const raw = (...sections: string[]) => sections.join('\n')
const valid = () => raw(intuition(), approach('Brute force'), approach('Optimal'))
const cases = () => [1, 2, 3, 4].map((n) => ({ args: [[n], n], expect: [0] }))

const sol = (o: Partial<SolutionInput> = {}): SolutionInput => ({
  problem: 'two-sum',
  hook: "Don't search for the partner. Let the partner find you.",
  entry: 'twoSum',
  harness: 'function',
  cases: cases(),
  path: 'solutions/two-sum',
  raw: valid(),
  ...o,
})

const one = (s: SolutionInput) => {
  const errors = validateSolutions([s], content())
  expect(errors).toHaveLength(1)
  expect(errors[0]).toMatch(/^\[V18\] content\/solutions\/[a-z-]+\.mdx: /)
  return errors[0]
}

describe('validateSolutions', () => {
  it('accepts a valid file, with or without Better', () => {
    expect(validateSolutions([sol()], content())).toEqual([])
    expect(validateSolutions([sol({ raw: raw(intuition(), approach('Brute force'), approach('Better'), approach('Optimal')) })], content())).toEqual([])
  })
  it('rejects a problem that is unknown, not a LeetCode problem, or already solved', () => {
    expect(one(sol({ problem: 'nope', path: 'solutions/nope' }))).toBe('[V18] content/solutions/nope.mdx: unknown problem "nope"')
    expect(one(sol({ problem: 'a-quiz', path: 'solutions/a-quiz' }))).toContain('"a-quiz" is not a LeetCode problem exercise')
    const errors = validateSolutions([sol(), sol()], content())
    expect(errors).toEqual(['[V18] content/solutions/two-sum.mdx: problem "two-sum" already has a solution'])
  })
  it('rejects a file name that differs from the problem', () => {
    expect(one(sol({ path: 'solutions/other' }))).toContain('file name "other" must equal problem "two-sum"')
  })
  it('rejects a long hook and too few cases', () => {
    expect(one(sol({ hook: 'one two three four five six seven eight nine ten eleven twelve thirteen' }))).toContain('hook has 13 words')
    expect(one(sol({ cases: cases().slice(0, 3) }))).toContain('needs at least 4 cases, has 3')
  })
  it('rejects sections that are extra, out of order or repeated', () => {
    expect(one(sol({ raw: valid() + '\n## Notes\n\nMore.\n' }))).toContain('found "Intuition", "Brute force", "Optimal", "Notes"')
    expect(one(sol({ raw: raw(intuition(), approach('Brute force'), approach('Optimal'), approach('Better')) }))).toContain('found "Intuition", "Brute force", "Optimal", "Better"')
    expect(one(sol({ raw: raw(intuition(), approach('Brute force'), approach('Optimal'), approach('Optimal')) }))).toContain('sections must be')
  })
  it('ignores ## lines inside code blocks', () => {
    const code = 'class Solution:\n    pass\n## Notes'
    expect(validateSolutions([sol({ raw: raw(intuition(), approach('Brute force', { code }), approach('Optimal')) })], content())).toEqual([])
  })
  it('rejects code in Intuition', () => {
    expect(one(sol({ raw: raw(intuition('\n\n```python\nx = 1\n```'), approach('Brute force'), approach('Optimal')) }))).toContain('"## Intuition" must not contain a code block')
  })
  it('checks the parts of each approach', () => {
    const check = (o: Parameters<typeof approach>[1], title = 'Optimal') =>
      one(sol({ raw: raw(intuition(), title === 'Brute force' ? approach(title, o) : approach('Brute force'), title === 'Optimal' ? approach(title, o) : approach('Optimal')) }))
    expect(check({ steps: 6 })).toContain('"## Optimal" needs one numbered list of 2–5 steps, has 6 steps')
    expect(check({ extra: '```python\nclass Solution:\n    pass\n```' })).toContain('"## Optimal" needs exactly one python code block, has 2')
    expect(check({ table: false })).toContain('"## Optimal" needs a trace table')
    expect(check({ complexity: false })).toContain('"## Optimal" needs a "**Complexity:**" line')
    expect(check({ wasted: false }, 'Brute force')).toContain(`"## Brute force" needs a "**What's wasted:**" line`)
    expect(check({ code: 'def twoSum(nums, target):\n    return [0, 1]' })).toContain('"## Optimal" code must define "class Solution"')
  })
  it('counts separate numbered lists', () => {
    const extra = '1. Another list.\n2. Still another.'
    expect(one(sol({ raw: raw(intuition(), approach('Brute force'), approach('Optimal', { extra })) }))).toContain('has 2 numbered lists')
  })
  it('expects the class name for harness: class', () => {
    const code = 'class LRUCache:\n    pass'
    const ok = raw(intuition(), approach('Brute force', { code }), approach('Optimal', { code }))
    expect(validateSolutions([sol({ harness: 'class', entry: 'LRUCache', raw: ok })], content())).toEqual([])
    expect(one(sol({ harness: 'class', entry: 'LRUCache', raw: raw(intuition(), approach('Brute force', { code }), approach('Optimal')) }))).toContain('"## Optimal" code must define "class LRUCache"')
  })
  it('requires check exactly for harness: custom, and large only for harness: function', () => {
    expect(one(sol({ harness: 'custom' }))).toContain('harness "custom" needs a check')
    expect(validateSolutions([sol({ harness: 'custom', check: 'def run(Solution): pass' })], content())).toEqual([])
    expect(one(sol({ check: 'def run(Solution): pass' }))).toContain('only harness "custom" may have a check')
    const large = { args: '[list(range(9))]', expect: 0 }
    expect(validateSolutions([sol({ large })], content())).toEqual([])
    expect(one(sol({ harness: 'custom', check: 'def run(Solution): pass', large }))).toContain('only harness "function" may have large')
  })
})
