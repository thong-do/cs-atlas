'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { StatusIcon } from '@/components/status-icon'
import { Button } from '@/components/ui/button'
import { flashcardKey } from '@/lib/content/review-keys'
import { exerciseStatus } from '@/lib/logic/filter'
import { useLive, useStore } from '@/lib/store/context'
import type { QuizDoc } from '@/lib/types'
import { LessonBadges } from './lesson-badges'
import { ReviewHistory } from './review-history'

const RESULT_LABEL = { alone: 'solved alone', hint: 'solved with help', solution: 'needs another try' } as const

export function QuizWorkspace({ quiz }: { quiz: QuizDoc }) {
  const store = useStore()
  const progress = useLive((s) => s.getProgress(quiz.slug), [quiz.slug])
  const inReview = useLive(
    async (s) => (await Promise.all(quiz.flashcards.map((f) => s.getCard(flashcardKey(quiz.slug, f.id))))).filter(Boolean).length,
    [quiz.slug],
  )
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [flipped, setFlipped] = useState<Set<string>>(new Set())
  const total = quiz.questions.length
  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined)
  const correct = quiz.questions.filter((q) => answers[q.id] === q.answer).length
  const solved = progress?.status === 'solved'

  async function check() {
    setBusy(true)
    try {
      await store.completeQuiz(quiz.slug, quiz.flashcards.map((f) => f.id), { correct, total }, new Date())
      setChecked(true)
      toast.success('Saved to your progress')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function toggleCard(id: string) {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <StatusIcon status={exerciseStatus(progress)} /> {quiz.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <LessonBadges lessons={quiz.lessons} />
        </div>
        <p className="text-sm text-muted-foreground">
          {total} questions
          {solved && progress?.solveRating && <> · Last result: {RESULT_LABEL[progress.solveRating]}</>}
        </p>
      </header>

      <div className="space-y-6">
        {quiz.questions.map((q, qi) => (
          <fieldset key={q.id} className="space-y-2 rounded-lg border p-4">
            <legend className="px-1 font-medium">{qi + 1}. {q.prompt}</legend>
            {q.choices.map((choice, ci) => {
              const isAnswer = ci === q.answer
              const isPick = answers[q.id] === ci
              return (
                <label key={ci} className="flex cursor-pointer items-start gap-2 rounded-md p-2 text-sm hover:bg-muted">
                  <input
                    type="radio"
                    name={q.id}
                    className="mt-1"
                    checked={isPick}
                    disabled={checked}
                    onChange={() => setAnswers({ ...answers, [q.id]: ci })}
                  />
                  <span className="min-w-0 break-words">
                    {choice}
                    {checked && isAnswer && <span className="ml-2 font-medium text-emerald-700 dark:text-emerald-400">✓ Correct answer</span>}
                    {checked && isPick && !isAnswer && <span className="ml-2 font-medium text-destructive">✗ Your answer</span>}
                  </span>
                </label>
              )
            })}
            {checked && <p className="text-sm text-muted-foreground">{q.explanation}</p>}
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!checked ? (
          <Button onClick={check} disabled={!allAnswered || busy}>Check answers</Button>
        ) : (
          <>
            <p role="status" className="font-medium">{correct} of {total} correct</p>
            <Button variant="outline" onClick={() => { setAnswers({}); setChecked(false) }}>Retake</Button>
          </>
        )}
      </div>

      {(solved || checked) && quiz.flashcards.length > 0 && (
        <section className="space-y-3" aria-labelledby="flashcards-heading">
          <h2 id="flashcards-heading" className="text-xl font-semibold">Flashcards — in your reviews</h2>
          <p className="text-sm text-muted-foreground">{inReview ?? 0} of {quiz.flashcards.length} cards scheduled. Tap a card to flip it.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {quiz.flashcards.map((f) => {
              const open = flipped.has(f.id)
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={open}
                  onClick={() => toggleCard(f.id)}
                  className="rounded-lg border p-4 text-left text-sm break-words hover:bg-muted"
                >
                  {open ? f.back : f.front}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {solved && <ReviewHistory slug={quiz.slug} />}
    </div>
  )
}
