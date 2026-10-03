import type { ReactNode } from 'react'
import type { VisStep } from '@/lib/visualizers/steps'
import { cn } from '@/lib/utils'

const markersAt = (step: VisStep, idx: number) => Object.entries(step.markers).filter(([, v]) => v === idx).map(([k]) => k)

export function GridView({ step }: { step: VisStep }): ReactNode {
  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${step.cols}, 2.5rem)` }}>
        {step.cells.map((cell, idx) => {
          const visited = step.visited?.includes(idx)
          const queued = step.frontier?.includes(idx)
          const water = cell === '0'
          return (
            <div
              key={idx}
              className={cn(
                'flex size-10 items-center justify-center rounded-md border font-mono',
                water && 'bg-muted text-muted-foreground',
                visited && 'bg-primary/15 border-primary',
                queued && 'border-dashed border-amber-500',
                markersAt(step, idx).length > 0 && 'ring-2 ring-primary',
              )}
            >
              {cell}
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Current: ring · In queue: dashed amber · Visited: tinted · Water: grey</p>
    </div>
  )
}

export function ArrayView({ step }: { step: VisStep }): ReactNode {
  const inRange = (idx: number) => step.highlight && idx >= step.highlight[0] && idx <= step.highlight[1]
  return (
    <div className="flex flex-wrap gap-1">
      {step.cells.map((cell, idx) => (
        <div key={idx} className="flex w-10 flex-col items-center">
          <div className={cn('flex size-10 items-center justify-center rounded-md border font-mono', inRange(idx) && 'bg-primary/15 border-primary', markersAt(step, idx).length > 0 && 'ring-2 ring-primary')}>
            {cell}
          </div>
          <div className="h-5 text-xs font-semibold text-primary">{markersAt(step, idx).join('/')}</div>
        </div>
      ))}
    </div>
  )
}

export function VisStepView({ step }: { step: VisStep }): ReactNode {
  return step.cols ? <GridView step={step} /> : <ArrayView step={step} />
}
