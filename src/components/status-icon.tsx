import type { ProblemStatus } from '@/lib/logic/filter'
import { cn } from '@/lib/utils'

const META: Record<ProblemStatus, { glyph: string; label: string; className: string }> = {
  unsolved: { glyph: '○', label: 'Unsolved', className: 'text-muted-foreground' },
  helped: { glyph: '◐', label: 'Solved with help', className: 'text-amber-600 dark:text-amber-400' },
  alone: { glyph: '●', label: 'Solved alone', className: 'text-emerald-600 dark:text-emerald-400' },
}

export function StatusIcon({ status }: { status: ProblemStatus }) {
  const m = META[status]
  return (
    <span role="img" aria-label={m.label} title={m.label} className={cn('inline-block w-4 text-center', m.className)}>
      {m.glyph}
    </span>
  )
}
