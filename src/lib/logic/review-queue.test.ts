import { describe, expect, it } from 'vitest'
import type { DesignExercise, EstimateExercise, ExerciseMeta, FlashcardEntry, ProblemExercise, QuizExercise } from '@/lib/types'
import { resolveDue } from './review-queue'

const problem: ProblemExercise = { slug: 'p', title: 'P', lessons: ['l'], ladderOrder: 1, type: 'external-problem', leetcodeId: 1, url: 'u', difficulty: 'easy', recognitionPrompt: '', hint: '' }
const quiz: QuizExercise = { slug: 'q', title: 'Q', lessons: ['l'], ladderOrder: 2, type: 'quiz', questionCount: 5, flashcardIds: ['c1'] }
const design: DesignExercise = { slug: 'd', title: 'D', lessons: ['l'], ladderOrder: 3, type: 'design-prompt', kind: 'design', rubric: ['a'] }
const drill: EstimateExercise = { slug: 'e', title: 'E', lessons: ['l'], ladderOrder: 4, type: 'estimate', stepCount: 3 }
const bySlug = new Map<string, ExerciseMeta>([problem, quiz, design, drill].map((e) => [e.slug, e]))
const card: FlashcardEntry = { front: 'f', back: 'b', quiz: 'q', lesson: 'l' }
const cards = { 'q#c1': card }

describe('resolveDue', () => {
  it('resolves each kind and preserves order', () => {
    expect(resolveDue(['d', 'q#c1', 'p', 'q'], bySlug, cards)).toEqual([
      { kind: 'design', key: 'd', exercise: design },
      { kind: 'flashcard', key: 'q#c1', card },
      { kind: 'problem', key: 'p', exercise: problem },
      { kind: 'quiz', key: 'q', exercise: quiz },
    ])
  })
  it('resolves estimation drills to their own kind, not design', () => {
    expect(resolveDue(['e'], bySlug, cards)).toEqual([{ kind: 'estimate', key: 'e', exercise: drill }])
  })
  it('drops unknown exercises, deleted flashcards and malformed keys', () => {
    expect(resolveDue(['nope', 'q#gone', '#x', 'p'], bySlug, cards)).toEqual([{ kind: 'problem', key: 'p', exercise: problem }])
  })
})
