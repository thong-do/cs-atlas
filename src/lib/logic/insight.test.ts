import { describe, expect, it } from 'vitest'
import { INSIGHT_MAX, validateInsight } from './insight'

describe('validateInsight', () => {
  it('accepts and trims a one-line insight', () => {
    expect(validateInsight('  two pointers from both ends  ')).toEqual({ ok: true, value: 'two pointers from both ends' })
  })

  it('rejects empty or whitespace-only text', () => {
    expect(validateInsight('   ').ok).toBe(false)
  })

  it('rejects text over the limit', () => {
    const r = validateInsight('x'.repeat(INSIGHT_MAX + 1))
    expect(r).toEqual({ ok: false, error: `Keep it under ${INSIGHT_MAX} characters (${INSIGHT_MAX + 1}).` })
  })

  it('accepts exactly the limit', () => {
    expect(validateInsight('x'.repeat(INSIGHT_MAX)).ok).toBe(true)
  })

  it('rejects multi-line text', () => {
    expect(validateInsight('line one\nline two')).toEqual({ ok: false, error: 'The insight must be a single line.' })
  })
})
