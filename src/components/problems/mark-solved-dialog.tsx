'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { INSIGHT_MAX, validateInsight } from '@/lib/logic/insight'
import { useLive, useStore } from '@/lib/store/context'
import type { SolveRating } from '@/lib/types'
import { cn } from '@/lib/utils'

const OPTIONS: { value: SolveRating; label: string }[] = [
  { value: 'alone', label: 'Solved it alone' },
  { value: 'hint', label: 'Needed a hint' },
  { value: 'solution', label: 'Looked at the solution' },
]

export function MarkSolvedDialog({ slug, open, onOpenChange }: { slug: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const store = useStore()
  const note = useLive((s) => s.getNote(slug), [slug])
  const [rating, setRating] = useState<SolveRating>('alone')
  const [insight, setInsight] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setInsight(note?.insight ?? '')
      setError(null)
    }
  }, [open, note?.insight])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const valid = validateInsight(insight)
    if (!valid.ok) {
      setError(valid.error)
      return
    }
    setSaving(true)
    try {
      await store.markSolved(slug, rating, valid.value, new Date())
      toast.success('Saved — your next review is scheduled.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>How did it go?</DialogTitle>
            <DialogDescription>Be honest — it decides when you’ll see this problem again.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={rating} onValueChange={(v) => setRating(v as SolveRating)}>
            {OPTIONS.map((o) => (
              <div key={o.value} className="flex items-center gap-2">
                <RadioGroupItem id={`rating-${o.value}`} value={o.value} />
                <Label htmlFor={`rating-${o.value}`}>{o.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <div className="space-y-1">
            <Label htmlFor="insight">Key insight</Label>
            <Input
              id="insight"
              value={insight}
              onChange={(e) => setInsight(e.target.value)}
              placeholder="e.g. Sorted → move the pointer that fixes the sum"
              aria-invalid={!!error}
              aria-describedby="insight-help"
            />
            <p id="insight-help" className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
              {error ?? `${insight.trim().length}/${INSIGHT_MAX} · the one line you’ll see at review time`}
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>Save solve</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
