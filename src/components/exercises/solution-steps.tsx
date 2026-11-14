'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { SolutionSectionStep } from '@/lib/content/solution-sections'
import { nextStep } from '@/lib/logic/solution-steps'
import type { SolutionStep } from '@/lib/types'

const LABELS: Record<SolutionStep, string> = {
  hint: 'hint', intuition: 'intuition', 'brute-force': 'brute force', better: 'better approach', optimal: 'optimal',
}

/**
 * Reveals the hint, then each solution section in order. The body is rendered on the server;
 * this only toggles which `section[data-step]` the CSS shows. Nothing is stored.
 */
export function SolutionSteps({ hint, steps, body, hook, pattern, onFurthestChange }: {
  hint: string
  steps: SolutionSectionStep[]
  body?: ReactNode
  hook?: string
  pattern?: string
  onFurthestChange: (step: SolutionStep | null) => void
}) {
  const all: SolutionStep[] = ['hint', ...(body ? steps : [])]
  const [opened, setOpened] = useState(0)
  const open = all.slice(0, opened)
  const next = nextStep(all, opened)
  const root = useRef<HTMLElement>(null)

  // Move focus to the step just opened: it appears above the button, which unmounts after the last step.
  useEffect(() => {
    if (opened === 0) return
    const step = all[opened - 1]
    const heading = root.current?.querySelector<HTMLElement>(step === 'hint' ? '[data-hint] h2' : `[data-step="${step}"] h2`)
    if (!heading) return
    heading.tabIndex = -1
    heading.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per opened step
  }, [opened])

  function show() {
    setOpened(opened + 1)
    onFurthestChange(all[opened])
  }

  return (
    <section ref={root} aria-label="Solution" className="space-y-4">
      <div className="prose max-w-none dark:prose-invert prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-xl prose-code:before:content-none prose-code:after:content-none">
        {opened > 0 && (
          <section data-hint>
            <h2 className="!mt-0">Hint</h2>
            <p>{hint}</p>
          </section>
        )}
        {body && <div data-solution data-open={open.join(' ')}>{body}</div>}
      </div>
      {open.includes('optimal') && (hook || pattern) && (
        <div className="space-y-1 rounded-lg border bg-muted/40 p-4">
          {hook && <p><span className="font-medium">Remember it:</span> {hook}</p>}
          {pattern && <p className="text-sm text-muted-foreground">Pattern: {pattern}</p>}
        </div>
      )}
      {next && <Button variant="outline" onClick={show}>Show {LABELS[next]}</Button>}
    </section>
  )
}
