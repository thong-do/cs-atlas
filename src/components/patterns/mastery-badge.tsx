'use client'

import { Progress } from '@/components/ui/progress'
import { useMasteries } from '@/lib/hooks/use-masteries'

export function MasteryBadge({ slug }: { slug: string }) {
  const value = useMasteries()?.get(slug) ?? 0
  return (
    <div className="flex max-w-xs items-center gap-3">
      <Progress value={value} aria-label="Mastery" className="h-2" />
      <span className="text-sm tabular-nums text-muted-foreground">{value}% mastery</span>
    </div>
  )
}
