'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Markdown } from '@/components/markdown'
import { StatusIcon } from '@/components/status-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { exerciseStatus } from '@/lib/logic/filter'
import { useLive, useStore } from '@/lib/store/context'
import type { DesignDoc } from '@/lib/types'
import { LessonBadges } from './lesson-badges'
import { NoteEditor } from './note-editor'
import { ReviewHistory } from './review-history'

export function DesignWorkspace({ design }: { design: DesignDoc }) {
  const store = useStore()
  const note = useLive((s) => s.getNote(design.slug), [design.slug])
  const progress = useLive((s) => s.getProgress(design.slug), [design.slug])
  const [draft, setDraft] = useState('')
  const [insight, setInsight] = useState('')
  const [compared, setCompared] = useState(false)
  const [covered, setCovered] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const solved = progress?.status === 'solved'
  const showReference = compared || !!note

  async function save() {
    setBusy(true)
    try {
      await store.completeDesign(design.slug, { design: draft, insight, covered: covered.size, total: design.rubricPoints.length }, new Date())
      setSaved(`Saved — ${covered.size} of ${design.rubricPoints.length} rubric points`)
      toast.success('Saved to your progress')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function toggle(id: string, on: boolean) {
    setCovered((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <StatusIcon status={exerciseStatus(progress)} /> {design.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <LessonBadges lessons={design.lessons} />
        </div>
      </header>

      <Markdown>{design.prompt}</Markdown>

      {design.hint && (
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer font-medium">Show hint</summary>
          <p className="mt-2 text-muted-foreground">{design.hint}</p>
        </details>
      )}

      {!compared && !note && (
        <section className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="design-draft">Your design</Label>
            <Textarea id="design-draft" rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Markdown supported" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="design-insight">Key insight</Label>
            <Input id="design-insight" value={insight} onChange={(e) => setInsight(e.target.value)} />
          </div>
          <Button onClick={() => setCompared(true)} disabled={!draft.trim() || !insight.trim()}>Compare with reference</Button>
        </section>
      )}

      {showReference && (
        <>
          <section className="space-y-3" aria-labelledby="reference-heading">
            <h2 id="reference-heading" className="text-xl font-semibold">Reference answer</h2>
            <Markdown>{design.reference}</Markdown>
          </section>
          <section className="space-y-3" aria-labelledby="rubric-heading">
            <h2 id="rubric-heading" className="text-xl font-semibold">Rubric</h2>
            {compared && !saved ? (
              <>
                <fieldset className="space-y-2">
                  <legend className="text-sm text-muted-foreground">I covered this</legend>
                  {design.rubricPoints.map((r) => (
                    <label key={r.id} className="flex cursor-pointer items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" checked={covered.has(r.id)} onChange={(e) => toggle(r.id, e.target.checked)} />
                      <span className="min-w-0 break-words">{r.point}</span>
                    </label>
                  ))}
                </fieldset>
                <Button onClick={save} disabled={busy}>Save</Button>
              </>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {design.rubricPoints.map((r) => <li key={r.id} className="break-words">{r.point}</li>)}
              </ul>
            )}
          </section>
        </>
      )}

      {saved && <p role="status" className="font-medium">{saved}</p>}

      {(solved || note) && (
        <>
          <NoteEditor slug={design.slug} />
          <ReviewHistory slug={design.slug} />
        </>
      )}
    </div>
  )
}
