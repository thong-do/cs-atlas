import type { HeapStep } from '@/lib/visualizers/heap-steps'
import { cn } from '@/lib/utils'

const W = 320
const LEVEL_H = 52
const R = 16

export function HeapView({ step, maxSize }: { step: HeapStep; maxSize: number }) {
  const { heap, active = [], popped = [] } = step
  // Size the tree for the largest heap in the sequence so the figure never changes height.
  const levels = Math.floor(Math.log2(Math.max(maxSize, heap.length, 1))) + 1
  const pos = (i: number) => {
    const level = Math.floor(Math.log2(i + 1))
    const k = i - (2 ** level - 1)
    return { x: ((k + 0.5) / 2 ** level) * W, y: R + 4 + level * LEVEL_H }
  }
  const height = R * 2 + 8 + (levels - 1) * LEVEL_H
  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`Heap [${heap.join(', ')}]`} className="mx-auto w-full max-w-md">
        {heap.map((_, i) => {
          if (i === 0) return null
          const a = pos((i - 1) >> 1)
          const b = pos(i)
          return <line key={`e${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-border" strokeWidth={2} />
        })}
        {heap.map((v, i) => {
          const { x, y } = pos(i)
          const on = active.includes(i)
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={R} className="fill-background" />
              <circle cx={x} cy={y} r={R} className={cn('fill-transparent stroke-border', on && 'fill-primary/15 stroke-primary')} strokeWidth={on ? 3 : 1.5} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="fill-foreground font-mono text-[13px]">{v}</text>
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-1">
        {heap.map((v, i) => (
          <div key={i} className="flex w-10 flex-col items-center">
            <div className={cn('flex size-10 items-center justify-center rounded-md border font-mono', active.includes(i) && 'border-primary bg-primary/15 ring-2 ring-primary')}>{v}</div>
            <div className="text-xs text-muted-foreground">{i}</div>
          </div>
        ))}
        {heap.length === 0 && <div className="flex h-10 items-center text-sm text-muted-foreground">(empty heap)</div>}
      </div>
      <p className="min-h-5 text-sm">{popped.length > 0 && `Popped: ${popped.join(', ')}`}</p>
    </div>
  )
}
