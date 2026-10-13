import type { ExerciseDoc } from '@/lib/types'
import { isProblem } from '@/lib/types'
import { DesignWorkspace } from './design-workspace'
import { ProblemWorkspace } from './problem-workspace'
import { QuizWorkspace } from './quiz-workspace'

/** Server component: picks the client workspace for the exercise type. */
export function ExerciseWorkspace({ exercise }: { exercise: ExerciseDoc }) {
  if (isProblem(exercise)) return <ProblemWorkspace exercise={exercise} />
  if (exercise.type === 'quiz') return <QuizWorkspace quiz={exercise} />
  return <DesignWorkspace design={exercise} />
}
