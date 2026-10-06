'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { validateInsight } from '@/lib/logic/insight'
import { useLive, useStore } from '@/lib/store/context'
import type { Note } from '@/lib/types'

type Draft = Omit<Note, 'updatedAt'>
type Field = 'approach' | 'complexity' | 'mistakes' | 'code'

const FIELDS: { key: Field; label: string; rows: number }[] = [
  { key: 'approach', label: 'Approach', rows: 4 },
  { key: 'complexity', label: 'Complexity', rows: 2 },
  { key: 'mistakes', label: 'Mistakes I made', rows: 3 },
  { key: 'code', label: 'My code', rows: 10 },
]

export function NoteEditor({ slug }: { slug: string }) {
  const store = useStore()
  const note = useLive((s) => s.getNote(slug), [slug])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!note) return null

  async function save() {
    if (!draft) return
    const valid = validateInsight(draft.insight)
    if (!valid.ok) {
      setError(valid.error)
      return
    }
    try {
      await store.saveNote(draft, new Date())
      setDraft(null)
      setError(null)
      toast.success('Note saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  if (!draft) {
    return (
      <section className="space-y-4" aria-labelledby="note-heading">
        <div className="flex items-center justify-between">
          <h2 id="note-heading" className="text-xl font-semibold">My note</h2>
          <Button variant="outline" size="sm" onClick={() => setDraft({ slug, insight: note.insight, approach: note.approach, complexity: note.complexity, mistakes: note.mistakes, code: note.code })}>
            Edit note
          </Button>
        </div>
        <blockquote className="border-l-4 border-primary pl-4 text-lg">{note.insight}</blockquote>
        {FIELDS.filter((f) => note[f.key]).map((f) => (
          <div key={f.key} className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground">{f.label}</h3>
            {f.key === 'code' ? (
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm"><code>{note.code}</code></pre>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note[f.key]}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
      </section>
    )
  }

  return (
    <section className="space-y-4" aria-labelledby="note-heading">
      <h2 id="note-heading" className="text-xl font-semibold">Edit note</h2>
      <div className="space-y-1">
        <Label htmlFor="note-insight">Key insight</Label>
        <Input id="note-insight" value={draft.insight} onChange={(e) => setDraft({ ...draft, insight: e.target.value })} aria-invalid={!!error} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label htmlFor={`note-${f.key}`}>{f.label}</Label>
          <Textarea
            id={`note-${f.key}`}
            rows={f.rows}
            className={f.key === 'code' ? 'font-mono text-sm' : undefined}
            value={draft[f.key]}
            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
            placeholder={f.key === 'code' ? 'Paste your Python solution' : 'Markdown supported'}
          />
        </div>
      ))}
      <div className="flex gap-2">
        <Button onClick={save}>Save note</Button>
        <Button variant="ghost" onClick={() => { setDraft(null); setError(null) }}>Cancel</Button>
      </div>
    </section>
  )
}
