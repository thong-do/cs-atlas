import { describe, expect, it } from 'vitest'
import { exerciseLabel } from './exercise-label'

describe('exerciseLabel', () => {
  it('labels each exercise type', () => {
    expect(exerciseLabel({ type: 'external-problem' })).toBe('LeetCode')
    expect(exerciseLabel({ type: 'quiz' })).toBe('Quiz')
    expect(exerciseLabel({ type: 'design-prompt', kind: 'design' })).toBe('Design')
  })
  it('labels diagnose prompts separately', () => {
    expect(exerciseLabel({ type: 'design-prompt', kind: 'diagnose' })).toBe('Diagnose')
  })
})
