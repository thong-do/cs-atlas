import { Badge } from '@/components/ui/badge'
import { exerciseLabel } from '@/lib/logic/exercise-label'
import type { ExerciseType, PromptKind } from '@/lib/types'

export function ExerciseTypeBadge({ exercise }: { exercise: { type: ExerciseType; kind?: PromptKind } }) {
  return <Badge variant="outline">{exerciseLabel(exercise)}</Badge>
}
