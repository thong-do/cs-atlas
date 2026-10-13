import type { ExerciseDoc } from '@/lib/types'
import { isProblem } from '@/lib/types'
import { ProblemWorkspace } from './problem-workspace'

export function ExerciseWorkspace({ exercise }: { exercise: ExerciseDoc }) {
  if (isProblem(exercise)) return <ProblemWorkspace exercise={exercise} />
  return <p>Coming soon</p>
}
