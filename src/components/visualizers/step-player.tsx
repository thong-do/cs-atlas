'use client'

import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PlayerStep {
  caption: string
  done?: boolean
}

interface StepPlayerProps<S extends PlayerStep> {
  steps: S[]
  title: string
  render: (step: S) => ReactNode
}

export function StepPlayer<S extends PlayerStep>(props: StepPlayerProps<S>) {
  if (props.steps.length === 0) return null
  return <Player {...props} />
}

function Player<S extends PlayerStep>({ steps, title, render }: StepPlayerProps<S>) {
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

  return (
    <figure className="not-prose my-6 space-y-3 rounded-lg border p-4">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      {render(step)}
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
