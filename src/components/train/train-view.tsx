'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/lib/content/catalog-context'
import { mulberry32 } from '@/lib/logic/rng'
import { buildRound, type TrainQuestion } from '@/lib/logic/trainer'
import { useLive, useStore } from '@/lib/store/context'
import { cn } from '@/lib/utils'

type Phase =
  | { kind: 'setup' }
  | { kind: 'question'; questions: TrainQuestion[]; index: number; chosen: string | null; correctCount: number; missed: string[] }
  | { kind: 'done'; total: number; correctCount: number; missed: string[] }

/** Reads `?quick=1` in its own Suspense boundary so the rest of the page still prerenders. */
function QuickParam({ onQuick }: { onQuick: () => void }) {
  const quick = useSearchParams().get('quick') === '1'
  useEffect(() => {
    if (quick) onQuick()
  }, [quick, onQuick])
  return null
}

export function TrainView() {
  const store = useStore()
  const { patterns, problems, patternBySlug } = useCatalog()
  const attempts = useLive((s) => s.listTrainAttempts())
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' })
  const [quick, setQuick] = useState(false)
  const autoStarted = useRef(false)
  const markQuick = useCallback(() => setQuick(true), [])
  const title = (slug: string) => patternBySlug.get(slug)?.title ?? slug

  function start(count: number) {
    const questions = buildRound(problems, patterns, attempts ?? [], count, mulberry32(Date.now()))
    if (questions.length === 0) {
      toast.error('No training questions are available yet.')
      return
    }
    setPhase({ kind: 'question', questions, index: 0, chosen: null, correctCount: 0, missed: [] })
  }

  // `/train/?quick=1` starts a 5-question round as soon as attempt history has loaded.
  useEffect(() => {
    if (!quick || autoStarted.current || attempts === undefined || phase.kind !== 'setup') return
    autoStarted.current = true
    start(5)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quick, attempts, phase.kind])

  function answer(option: string) {
    if (phase.kind !== 'question' || phase.chosen) return
    const q = phase.questions[phase.index]
    const correct = option === q.correct
    setPhase({
      ...phase,
      chosen: option,
      correctCount: phase.correctCount + (correct ? 1 : 0),
      missed: correct ? phase.missed : [...phase.missed, q.correct],
    })
    store
      .recordTrainAttempt({ problemSlug: q.problemSlug, correctPattern: q.correct, chosenPattern: option, correct, at: new Date().toISOString() })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : String(err)))
  }

  function next() {
    if (phase.kind !== 'question') return
    if (phase.index + 1 >= phase.questions.length) {
      setPhase({ kind: 'done', total: phase.questions.length, correctCount: phase.correctCount, missed: phase.missed })
    } else {
      setPhase({ ...phase, index: phase.index + 1, chosen: null })
    }
  }

  if (phase.kind === 'setup') {
    return (
      <div className="space-y-4">
        <Suspense><QuickParam onQuick={markQuick} /></Suspense>
        <h1 className="text-2xl font-bold">Pattern Recognition Trainer</h1>
        <p className="text-muted-foreground">
          Read a problem, pick the pattern. This is the skill interviews actually test — and it feeds your mastery score.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => start(5)}>Quick round (5)</Button>
          <Button variant="outline" onClick={() => start(10)}>Full round (10)</Button>
        </div>
      </div>
    )
  }

  if (phase.kind === 'done') {
    const missedCounts = [...phase.missed.reduce((m, s) => m.set(s, (m.get(s) ?? 0) + 1), new Map<string, number>())]
      .sort((a, b) => b[1] - a[1])
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">You got {phase.correctCount} of {phase.total}</h1>
        {missedCounts.length > 0 ? (
          <section className="space-y-2">
            <h2 className="font-semibold">Most missed</h2>
            <ul className="space-y-1">
              {missedCounts.map(([slug, n]) => (
                <li key={slug}>
                  <Link href={`/patterns/${slug}/`} className="underline">{title(slug)}</Link>
                  <span className="text-muted-foreground"> — missed {n}×</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p>Perfect round! 🎯</p>
        )}
        <Button onClick={() => setPhase({ kind: 'setup' })}>Play again</Button>
      </div>
    )
  }

  const q = phase.questions[phase.index]
  const isLast = phase.index + 1 >= phase.questions.length
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Question {phase.index + 1} / {phase.questions.length}</p>
      <blockquote className="rounded-lg border bg-muted/40 p-4 text-lg">{q.prompt}</blockquote>
      <div role="group" aria-label="Pattern options" className="grid gap-2 sm:grid-cols-2">
        {q.options.map((option) => {
          const isCorrect = option === q.correct
          const isChosen = option === phase.chosen
          return (
            <Button
              key={option}
              variant="outline"
              disabled={!!phase.chosen}
              onClick={() => answer(option)}
              className={cn(
                'h-auto justify-start py-3 text-left disabled:opacity-100',
                phase.chosen && isCorrect && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950',
                phase.chosen && isChosen && !isCorrect && 'border-rose-500 bg-rose-50 dark:bg-rose-950',
              )}
            >
              {title(option)}
            </Button>
          )
        })}
      </div>
      {phase.chosen && (
        <div className="space-y-3" aria-live="polite">
          <p className={phase.chosen === q.correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
            {phase.chosen === q.correct ? 'Correct!' : `Not quite — it’s ${title(q.correct)}.`}{' '}
            <Link href={`/patterns/${q.correct}/`} className="underline">Review {title(q.correct)}</Link>
          </p>
          <Button onClick={next}>{isLast ? 'See results' : 'Next question'}</Button>
        </div>
      )}
    </div>
  )
}
