/** The only place review keys are built or parsed: an exercise slug, or `${quizSlug}#${cardId}` for a flashcard. */
export function flashcardKey(quizSlug: string, cardId: string): string {
  return `${quizSlug}#${cardId}`
}

export type ReviewKey = { kind: 'exercise'; slug: string } | { kind: 'flashcard'; quiz: string; card: string }

export function parseReviewKey(key: string): ReviewKey {
  const i = key.indexOf('#')
  if (i < 0) return { kind: 'exercise', slug: key }
  return { kind: 'flashcard', quiz: key.slice(0, i), card: key.slice(i + 1) }
}
