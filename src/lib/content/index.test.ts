import { describe, expect, it } from 'vitest'
import { getCatalog, getPatternDoc, getProblem } from './index'

describe('content accessors', () => {
  it('orders patterns by roadmap and exposes slim metadata', () => {
    const catalog = getCatalog()
    expect(catalog.order[0]).toBe('arrays-hashing')
    expect(catalog.patterns.map((p) => p.slug)).toEqual(catalog.order)
    expect(catalog.patterns[0]).not.toHaveProperty('body')
  })

  it('sorts problems by primary pattern order, then ladderOrder', () => {
    const { problems, order } = getCatalog()
    const keys = problems.map((p) => [order.indexOf(p.patterns[0]), p.ladderOrder])
    const sorted = [...keys].sort((a, b) => a[0] - b[0] || a[1] - b[1])
    expect(keys).toEqual(sorted)
  })

  it('finds a pattern doc with compiled body and a problem by slug', () => {
    expect(getPatternDoc('two-pointers')?.body.length).toBeGreaterThan(0)
    expect(getProblem('two-sum')?.leetcodeId).toBe(1)
    expect(getProblem('missing')).toBeUndefined()
  })
})

describe('content inventory', () => {
  const { patterns, problems } = getCatalog()
  const FULL = ['arrays-hashing', 'two-pointers', 'sliding-window', 'stack', 'binary-search', 'linked-list', 'trees', 'graphs', 'tries', 'heap', 'backtracking', 'intervals', 'greedy', 'dp-1d']
  const SECTIONS = ['Intuition', 'Visual', 'Template', 'Complexity', 'Pitfalls', 'Tips & tricks']

  it('has 18 patterns, exactly the 14 with full theory', () => {
    expect(patterns).toHaveLength(18)
    expect(patterns.filter((p) => !p.stub).map((p) => p.slug).sort()).toEqual([...FULL].sort())
  })

  it('has 138 problems and every ladder is numbered 1..n', () => {
    expect(problems).toHaveLength(138)
    for (const p of patterns) {
      const orders = problems.filter((x) => x.patterns[0] === p.slug).map((x) => x.ladderOrder).sort((a, b) => a - b)
      expect(orders, p.slug).toEqual(orders.map((_, i) => i + 1))
    }
  })

  it('gives every one of the 18 patterns at least 5 ladder problems', () => {
    for (const p of patterns) {
      expect(problems.filter((x) => x.patterns[0] === p.slug).length, p.slug).toBeGreaterThanOrEqual(5)
    }
  })

  it('gives every full pattern at least 5 ladder problems and the standard sections in order', () => {
    for (const slug of FULL) {
      expect(problems.filter((x) => x.patterns[0] === slug).length, slug).toBeGreaterThanOrEqual(5)
      expect(getPatternDoc(slug)!.toc.map((t) => t.title), slug).toEqual(SECTIONS)
    }
  })

  it('uses https leetcode problem URLs', () => {
    for (const p of problems) expect(p.url, p.slug).toMatch(/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/)
  })
})
