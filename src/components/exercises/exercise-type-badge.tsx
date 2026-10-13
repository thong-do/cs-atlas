import { Badge } from '@/components/ui/badge'
import type { ExerciseType } from '@/lib/types'

export const TYPE_LABEL: Record<ExerciseType, string> = {
  'external-problem': 'LeetCode',
  quiz: 'Quiz',
  'design-prompt': 'Design',
}

export function ExerciseTypeBadge({ type }: { type: ExerciseType }) {
  return <Badge variant="outline">{TYPE_LABEL[type]}</Badge>
}
