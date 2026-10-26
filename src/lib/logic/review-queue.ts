import { parseReviewKey } from '@/lib/content/review-keys'
import type { DesignExercise, EstimateExercise, ExerciseMeta, FlashcardEntry, ProblemExercise, QuizExercise } from '@/lib/types'

export type DueItem =
  | { kind: 'problem'; key: string; exercise: ProblemExercise }
  | { kind: 'quiz'; key: string; exercise: QuizExercise }
  | { kind: 'design'; key: string; exercise: DesignExercise }
  | { kind: 'estimate'; key: string; exercise: EstimateExercise }
  | { kind: 'flashcard'; key: string; card: FlashcardEntry }

/** Resolve due review keys to renderable items, in order. Keys that no longer resolve are dropped. */
export function resolveDue(
  keys: string[],
  exerciseBySlug: Map<string, ExerciseMeta>,
  flashcards: Record<string, FlashcardEntry>,
): DueItem[] {
  const items: DueItem[] = []
  for (const key of keys) {
    const parsed = parseReviewKey(key)
    if (parsed.kind === 'flashcard') {
      const card = Object.hasOwn(flashcards, key) ? flashcards[key] : undefined
      if (card) items.push({ kind: 'flashcard', key, card })
      continue
    }
    const e = exerciseBySlug.get(parsed.slug)
    if (!e) continue
    if (e.type === 'external-problem') items.push({ kind: 'problem', key, exercise: e })
    else if (e.type === 'quiz') items.push({ kind: 'quiz', key, exercise: e })
    else if (e.type === 'estimate') items.push({ kind: 'estimate', key, exercise: e })
    else items.push({ kind: 'design', key, exercise: e })
  }
  return items
}
