'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Markdown } from '@/components/markdown'
import { StatusIcon } from '@/components/status-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEFAULT_TOLERANCE, formatAmount, parseAmount, scoreEstimate, stepCorrect, UNIT_PREFIXES } from '@/lib/logic/estimate'
import { exerciseStatus } from '@/lib/logic/filter'
import { useLive, useStore } from '@/lib/store/context'
import type { EstimateDoc } from '@/lib/types'
import { LessonBadges } from './lesson-badges'
import { ReviewHistory } from './review-history'

const RESULT_LABEL = { alone: 'solved alone', hint: 'solved with help', solution: 'needs another try' } as const

export function EstimateWorkspace({ drill }: { drill: EstimateDoc }) {
  const store = useStore()
  const progress = useLive((s) => s.getProgress(drill.slug), [drill.slug])
  const fresh = () => drill.steps.map(() => ({ text: '', prefix: -1 })) // -1: no unit chosen yet
  const [entries, setEntries] = useState(fresh)
  const [values, setValues] = useState<number[]>([]) // base-unit values of the checked steps, in order
  const resultRefs = useRef<(HTMLDivElement | null)[]>([])
  const summaryRef = useRef<HTMLParagraphElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const refocusFirst = useRef(false) // set by Try again, so first mount never steals focus
  const savingRef = useRef(false)
  const total = drill.steps.length
  const done = values.length === total
  const solved = progress?.status === 'solved'

  // Move focus to the newest result (the form it replaced is gone), but never on first mount.
  useEffect(() => {
    if (values.length === 0) {
      if (refocusFirst.current) {
        refocusFirst.current = false
        firstInputRef.current?.focus()
      }
      return
    }
    if (values.length === total) summaryRef.current?.focus()
    else resultRefs.current[values.length - 1]?.focus()
  }, [values.length, total])

  async function check(i: number) {
    const step = drill.steps[i]
    const n = parseAmount(entries[i].text)
    const prefix = entries[i].prefix
    if (n === null || n <= 0 || prefix < 0) return
    if (values.length !== i) return // this step was already checked
    const next = [...values, n * UNIT_PREFIXES[step.unit][prefix].scale]
    setValues(next)
    if (next.length < total || savingRef.current) return
    savingRef.current = true
    try {
      await store.completeQuiz(drill.slug, [], scoreEstimate(drill.steps, next), new Date())
      toast.success('Saved to your progress')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      savingRef.current = false
    }
  }

  function tryAgain() {
    savingRef.current = false
    refocusFirst.current = true
    setEntries(fresh())
    setValues([])
  }

  function edit(i: number, patch: Partial<{ text: string; prefix: number }>) {
    setEntries((prev) => prev.map((e, k) => (k === i ? { ...e, ...patch } : e)))
  }

  const { correct } = scoreEstimate(drill.steps.slice(0, values.length), values)

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <StatusIcon status={exerciseStatus(progress)} /> {drill.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <LessonBadges lessons={drill.lessons} />
        </div>
        <p className="text-sm text-muted-foreground">
          {total} steps · answers are graded by order of magnitude
          {solved && progress?.solveRating && <> · Last result: {RESULT_LABEL[progress.solveRating]}</>}
        </p>
      </header>

      <Markdown>{drill.scenario}</Markdown>

      <div className="space-y-4">
        {drill.steps.slice(0, Math.min(values.length + 1, total)).map((step, i) => {
          const headingId = `${step.id}-ask`
          if (i < values.length) {
            const ok = stepCorrect(step, values[i])
            return (
              <section key={step.id} aria-labelledby={headingId} className="space-y-2 rounded-lg border p-4">
                <h2 id={headingId} className="font-medium">{i + 1}. {step.ask}</h2>
                <div ref={(el) => { resultRefs.current[i] = el }} tabIndex={-1} className="space-y-1 text-sm break-words outline-none">
                  <p>
                    Your answer: {formatAmount(values[i], step.unit)} —{' '}
                    <span className={ok ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'font-medium text-destructive'}>
                      {ok ? '✓ Within range' : '✗ Outside range'}
                    </span>
                  </p>
                  <p>Reference: {formatAmount(step.answer, step.unit)} · Within {step.tolerance ?? DEFAULT_TOLERANCE}× counts</p>
                  <p className="text-muted-foreground">{step.work}</p>
                </div>
              </section>
            )
          }
          const text = entries[i].text
          const n = parseAmount(text)
          const errorId = `${step.id}-error`
          const unparsable = text.trim() !== '' && n === null
          const nonPositive = n !== null && n <= 0
          const invalid = unparsable || nonPositive
          return (
            <section key={step.id} aria-labelledby={headingId} className="space-y-3 rounded-lg border p-4">
              <h2 id={headingId} className="font-medium">{i + 1}. {step.ask}</h2>
              <form className="flex flex-wrap items-end gap-2" onSubmit={(ev) => { ev.preventDefault(); void check(i) }}>
                <label className="min-w-0 flex-1 space-y-1 text-sm">
                  <span className="block">Your estimate</span>
                  <Input
                    ref={i === 0 ? firstInputRef : undefined}
                    inputMode="decimal"
                    autoComplete="off"
                    value={text}
                    onChange={(ev) => edit(i, { text: ev.target.value })}
                    aria-invalid={invalid || undefined}
                    aria-describedby={invalid ? errorId : undefined}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="block">Unit</span>
                  <select
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={entries[i].prefix}
                    onChange={(ev) => edit(i, { prefix: Number(ev.target.value) })}
                  >
                    <option value={-1} disabled>Choose a unit</option>
                    {UNIT_PREFIXES[step.unit].map((p, k) => <option key={p.label} value={k}>{p.label}</option>)}
                  </select>
                </label>
                <Button type="submit" disabled={n === null || n <= 0 || entries[i].prefix < 0}>Check</Button>
                {unparsable && <p id={errorId} className="w-full text-sm text-destructive">Enter a number like 7.5, 7,500 or 1e4.</p>}
                {nonPositive && <p id={errorId} className="w-full text-sm text-destructive">Enter an amount above zero.</p>}
                <p className="w-full text-xs text-muted-foreground">Within {step.tolerance ?? DEFAULT_TOLERANCE}× of the reference counts.</p>
              </form>
            </section>
          )
        })}
      </div>

      {done && (
        <div className="space-y-3">
          <p ref={summaryRef} tabIndex={-1} role="status" className="font-medium outline-none">{correct} of {total} right</p>
          <p className="text-sm">{drill.takeaway}</p>
          <Button variant="outline" onClick={tryAgain}>Try again</Button>
        </div>
      )}

      {solved && <ReviewHistory slug={drill.slug} />}
    </div>
  )
}
