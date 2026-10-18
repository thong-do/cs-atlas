import type { ExerciseType, PromptKind } from '@/lib/types'

export const TYPE_LABEL: Record<ExerciseType, string> = {
  'external-problem': 'LeetCode',
  quiz: 'Quiz',
  'design-prompt': 'Design',
}

/** Badge text for an exercise. Diagnose prompts share the design-prompt type but read differently. */
export function exerciseLabel(e: { type: ExerciseType; kind?: PromptKind }): string {
  return e.type === 'design-prompt' && e.kind === 'diagnose' ? 'Diagnose' : TYPE_LABEL[e.type]
}
