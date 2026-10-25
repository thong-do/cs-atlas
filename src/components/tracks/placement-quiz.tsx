'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/lib/content/catalog-context'
import { lessonHref } from '@/lib/content/hrefs'
import { useMasteries } from '@/lib/hooks/use-masteries'
import { continueLesson } from '@/lib/logic/lessons'
import { scorePlacement, skippedLessons, withPlacement, type PlacementScore } from '@/lib/logic/placement'
import { useLive, useStore } from '@/lib/store/context'
import type { Placement, PlacementDoc } from '@/lib/types'

export function PlacementQuiz({ placement }: { placement: PlacementDoc }) {
  const store = useStore()
  const { trackBySlug, lessonBySlug } = useCatalog()
  const masteries = useMasteries() ?? new Map<string, number>()
  const meta = useLive((s) => s.getMeta())
  const track = trackBySlug.get(placement.track)!
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ score: PlacementScore; saved: Placement } | null>(null)
  const promptRef = useRef<HTMLLegendElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const total = placement.questions.length

  // Move focus after an answer (the clicked button is replaced), but never on first mount.
  useEffect(() => {
    if (answers.length === 0) return
    if (result) resultRef.current?.focus()
    else promptRef.current?.focus()
  }, [answers.length, result])

  async function choose(choice: number) {
    if (!meta) return
    const next = [...answers, choice]
    setAnswers(next)
    if (next.length < total) return
    const score = scorePlacement(track, placement.questions, next)
    const saved: Placement = { passedModules: score.passedModules, takenAt: new Date().toISOString() }
    setResult({ score, saved })
    try {
      await store.saveSettings(withPlacement(meta.settings, track.slug, saved))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  if (result) {
    const start = continueLesson(track, masteries, skippedLessons(track, result.saved))
    const wrong = placement.questions.map((q, i) => ({ q, i })).filter(({ q, i }) => answers[i] !== q.answer)
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{track.title} placement</h1>
        <h2 ref={resultRef} tabIndex={-1} className="text-xl font-semibold outline-none">Your placement</h2>
        <ul className="divide-y rounded-lg border">
          {track.modules.filter((m) => result.score.byModule[m.slug]).map((m) => {
            const s = result.score.byModule[m.slug]
            const passed = result.saved.passedModules.includes(m.slug)
            return (
              <li key={m.slug} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">{m.title}</span>
                <span className="text-sm tabular-nums">{s.correct}/{s.total}</span>
                <Badge variant={passed ? 'secondary' : 'outline'}>{passed ? 'Placed out' : 'Study this'}</Badge>
              </li>
            )
          })}
        </ul>
        {start && (
          <Button asChild>
            <Link href={lessonHref(lessonBySlug.get(start)!)}>Start at {lessonBySlug.get(start)!.title}</Link>
          </Button>
        )}
        {wrong.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Questions to revisit</h2>
            {wrong.map(({ q, i }) => (
              <div key={i} className="space-y-1 rounded-lg border p-3 text-sm">
                <p className="font-medium">{q.prompt}</p>
                <p>Answer: {q.choices[q.answer]}</p>
                <p className="text-muted-foreground">{q.explanation}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    )
  }

  const q = placement.questions[answers.length]
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{track.title} placement</h1>
      <p className="text-sm text-muted-foreground">
        Answer what you can; a module is placed out only when every question in it is right. Nothing is marked mastered.
      </p>
      <p className="text-sm tabular-nums" aria-live="polite" aria-atomic="true">Question {answers.length + 1} of {total}</p>
      <fieldset className="space-y-3">
        <legend ref={promptRef} tabIndex={-1} className="text-lg font-medium outline-none">{q.prompt}</legend>
        {q.choices.map((c, i) => (
          <Button key={`${answers.length}-${i}`} variant="outline" className="h-auto w-full justify-start whitespace-normal text-left"
            disabled={!meta} onClick={() => void choose(i)}>
            {c}
          </Button>
        ))}
      </fieldset>
    </div>
  )
}
