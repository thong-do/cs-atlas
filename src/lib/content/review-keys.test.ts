import { describe, expect, it } from 'vitest'
import { flashcardKey, parseReviewKey } from './review-keys'

describe('review keys', () => {
  it('builds and parses flashcard keys', () => {
    expect(flashcardKey('caching-quiz', 'ttl')).toBe('caching-quiz#ttl')
    expect(parseReviewKey('caching-quiz#ttl')).toEqual({ kind: 'flashcard', quiz: 'caching-quiz', card: 'ttl' })
  })
  it('treats any key without # as an exercise slug', () => {
    expect(parseReviewKey('two-sum')).toEqual({ kind: 'exercise', slug: 'two-sum' })
  })
  it('splits on the first # only', () => {
    expect(parseReviewKey('q#a#b')).toEqual({ kind: 'flashcard', quiz: 'q', card: 'a#b' })
  })
})
