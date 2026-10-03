import type { Difficulty } from '@/lib/types'
import { cn } from '@/lib/utils'

const STYLE: Record<Difficulty, string> = {
  easy: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950',
  medium: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950',
  hard: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950',
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={cn('rounded px-2 py-0.5 text-xs font-medium capitalize', STYLE[difficulty])}>{difficulty}</span>
  )
}
