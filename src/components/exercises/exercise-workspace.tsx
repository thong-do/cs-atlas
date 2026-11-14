import { MDXContent } from '@/components/mdx-content'
import type { ExerciseDoc } from '@/lib/types'
import { isProblem } from '@/lib/types'
import { DesignWorkspace } from './design-workspace'
import { EstimateWorkspace } from './estimate-workspace'
import { ProblemWorkspace } from './problem-workspace'
import { QuizWorkspace } from './quiz-workspace'

/** Server component: picks the client workspace for the exercise type. */
export function ExerciseWorkspace({ exercise }: { exercise: ExerciseDoc }) {
  if (isProblem(exercise)) {
    // Rendered here, on the server: the compiled MDX is neither sent to nor evaluated in the browser.
    const { solution, ...problem } = exercise
    const solutionBody = solution ? <MDXContent code={solution.body} /> : undefined
    return <ProblemWorkspace key={exercise.slug} exercise={problem} steps={solution?.steps} solutionBody={solutionBody} />
  }
  if (exercise.type === 'quiz') return <QuizWorkspace quiz={exercise} />
  if (exercise.type === 'estimate') return <EstimateWorkspace drill={exercise} />
  return <DesignWorkspace design={exercise} />
}
