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
