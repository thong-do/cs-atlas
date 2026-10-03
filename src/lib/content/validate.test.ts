import { describe, expect, it } from 'vitest'
import type { PatternMeta, ProblemMeta } from '@/lib/types'
import { validateContent } from './validate'

const pattern = (slug: string, o: Partial<PatternMeta> = {}): PatternMeta => ({
  slug, title: slug, prerequisites: [], confusedWith: [], triggers: ['t'],
  complexity: 'O(n)', summary: 's', stub: false, ...o,
})
const problem = (slug: string, o: Partial<ProblemMeta> = {}): ProblemMeta => ({
  slug, title: slug, leetcodeId: slug.length * 100 + slug.charCodeAt(0), url: `https://leetcode.com/problems/${slug}/`,
  difficulty: 'easy', patterns: ['a'], ladderOrder: 1, recognitionPrompt: 'prompt text', hint: 'hint', ...o,
})

const valid = () => ({
  roadmap: ['a', 'b'],
  patterns: [pattern('a'), pattern('b', { prerequisites: ['a'], confusedWith: ['a'] })],
  problems: [problem('p1'), problem('p2', { patterns: ['b'], leetcodeId: 2 })],
})

describe('validateContent', () => {
  it('accepts valid content', () => {
    expect(validateContent(valid())).toEqual([])
  })

  it('reports each problematic roadmap slug once', () => {
    const c = valid()
    c.roadmap = ['a', 'b', 'zzz', 'zzz', 'a', 'a']
    const errors = validateContent(c).filter((e) => e.startsWith('Roadmap'))
    expect(errors).toEqual(['Roadmap: unknown pattern "zzz"', 'Roadmap: duplicate pattern "a"'])
  })

  it('rejects unknown pattern references', () => {
    const c = valid()
    c.patterns[1] = pattern('b', { prerequisites: ['zzz'], confusedWith: ['yyy'] })
    c.problems[0] = problem('p1', { patterns: ['nope'] })
    const errors = validateContent(c)
    expect(errors).toContain('Pattern "b": unknown prerequisite "zzz"')
    expect(errors).toContain('Pattern "b": unknown confusedWith "yyy"')
    expect(errors).toContain('Problem "p1": unknown pattern "nope"')
  })

  it('rejects roadmap entries that are unknown, duplicated or missing', () => {
    const c = valid()
    c.roadmap = ['a', 'a', 'ghost']
    const errors = validateContent(c)
    expect(errors).toContain('Roadmap: duplicate pattern "a"')
    expect(errors).toContain('Roadmap: unknown pattern "ghost"')
    expect(errors).toContain('Roadmap: missing pattern "b"')
  })

  it('rejects prerequisite cycles', () => {
    const c = valid()
    c.patterns[0] = pattern('a', { prerequisites: ['b'] })
    expect(validateContent(c).some((e) => e.startsWith('Prerequisite cycle: '))).toBe(true)
  })

  it('rejects duplicate slugs and leetcode ids', () => {
    const c = valid()
    c.patterns.push(pattern('a'))
    c.problems.push(problem('p1', { leetcodeId: 2, ladderOrder: 9 }))
    const errors = validateContent(c)
    expect(errors).toContain('Duplicate pattern slug "a"')
    expect(errors).toContain('Duplicate problem slug "p1"')
    expect(errors).toContain('Duplicate leetcodeId 2 ("p1")')
  })

  it('rejects duplicate ladderOrder within the same primary pattern only', () => {
    const c = valid()
    c.problems.push(problem('p3', { leetcodeId: 3, ladderOrder: 1 }))
    expect(validateContent(c)).toContain('Problem "p3": duplicate ladderOrder 1 in "a"')
    const ok = valid()
    ok.problems.push(problem('p4', { leetcodeId: 4, patterns: ['b', 'a'], ladderOrder: 2 }))
    expect(validateContent(ok)).toEqual([])
  })

  it('rejects problems with no patterns', () => {
    const c = valid()
    c.problems[0] = problem('p1', { patterns: [] })
    expect(validateContent(c)).toContain('Problem "p1": no patterns')
  })
})
