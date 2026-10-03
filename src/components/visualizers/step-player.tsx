'use client'

import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { VisStep } from '@/lib/visualizers/steps'
import { cn } from '@/lib/utils'

export function StepPlayer({ steps, title }: { steps: VisStep[]; title: string }) {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const step = steps[i]
  const last = steps.length - 1

  useEffect(() => {
    if (!playing) return
    if (i >= last) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setI((x) => Math.min(x + 1, last)), 1200)
    return () => clearTimeout(t)
  }, [playing, i, last])

  const markersAt = (idx: number) => Object.entries(step.markers).filter(([, v]) => v === idx).map(([k]) => k)
  const inRange = (idx: number) => step.highlight && idx >= step.highlight[0] && idx <= step.highlight[1]

  return (
    <figure className="not-prose my-6 space-y-3 rounded-lg border p-4">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      <div className="flex flex-wrap gap-1">
        {step.cells.map((cell, idx) => (
          <div key={idx} className="flex w-10 flex-col items-center">
            <div className={cn('flex size-10 items-center justify-center rounded-md border font-mono', inRange(idx) && 'bg-primary/15 border-primary', markersAt(idx).length > 0 && 'ring-2 ring-primary')}>
              {cell}
            </div>
            <div className="h-5 text-xs font-semibold text-primary">{markersAt(idx).join('/')}</div>
          </div>
        ))}
      </div>
      <p aria-live="polite" className={cn('min-h-12 text-sm', step.done && 'font-medium')}>{step.caption}</p>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="outline" aria-label="Previous step" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}><SkipBack /></Button>
        <Button size="icon" variant="outline" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)} disabled={i === last}>{playing ? <Pause /> : <Play />}</Button>
        <Button size="icon" variant="outline" aria-label="Next step" onClick={() => setI((x) => Math.min(last, x + 1))} disabled={i === last}><SkipForward /></Button>
        <Button size="icon" variant="ghost" aria-label="Restart" onClick={() => { setI(0); setPlaying(false) }}><RotateCcw /></Button>
        <span className="ml-2 text-xs text-muted-foreground">Step {i + 1} / {steps.length}</span>
      </div>
    </figure>
  )
}
