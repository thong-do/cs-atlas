import type { ExerciseDoc } from '@/lib/types'
import { isProblem } from '@/lib/types'
import { DesignWorkspace } from './design-workspace'
import { EstimateWorkspace } from './estimate-workspace'
import { ProblemWorkspace } from './problem-workspace'
import { QuizWorkspace } from './quiz-workspace'

/** Server component: picks the client workspace for the exercise type. */
export function ExerciseWorkspace({ exercise }: { exercise: ExerciseDoc }) {
  if (isProblem(exercise)) return <ProblemWorkspace exercise={exercise} />
  if (exercise.type === 'quiz') return <QuizWorkspace quiz={exercise} />
  if (exercise.type === 'estimate') return <EstimateWorkspace drill={exercise} />
  return <DesignWorkspace design={exercise} />
}
