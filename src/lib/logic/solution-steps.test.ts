import { describe, expect, it } from 'vitest'
import { nextStep, ratingForStep } from './solution-steps'

describe('ratingForStep', () => {
  it('defaults to alone when nothing was opened', () => {
    expect(ratingForStep(null)).toBe('alone')
  })

  it('counts the hint and the intuition as a hint', () => {
    expect(ratingForStep('hint')).toBe('hint')
    expect(ratingForStep('intuition')).toBe('hint')
  })

  it('counts any approach as looking at the solution', () => {
    expect(ratingForStep('brute-force')).toBe('solution')
    expect(ratingForStep('better')).toBe('solution')
    expect(ratingForStep('optimal')).toBe('solution')
  })
})

describe('nextStep', () => {
  const steps = ['hint', 'intuition', 'brute-force', 'optimal'] as const

  it('returns the step after the opened ones, or null when all are open', () => {
    expect(nextStep([...steps], 0)).toBe('hint')
    expect(nextStep([...steps], 2)).toBe('brute-force')
    expect(nextStep([...steps], 4)).toBeNull()
  })
})
