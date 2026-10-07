import type { CacheStep } from '@/lib/visualizers/cache-steps'
import { cn } from '@/lib/utils'

export function CacheView({ step }: { step: CacheStep }) {
  const { slots, capacity, requests, index, event, evicted, hits, misses } = step
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Requests</p>
        <div className="flex flex-wrap gap-1" aria-label={`Requests ${requests.join(' ')}`}>
          {requests.map((r, i) => (
            <div
              key={i}
              className={cn(
                'flex size-8 items-center justify-center rounded-md border font-mono text-sm',
                i === index && 'border-primary bg-primary/15 ring-2 ring-primary',
                index !== undefined && i < index && 'text-muted-foreground',
              )}
            >
              {r}
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Cache — most recent → least recent</p>
        <div className="flex gap-2" aria-label={`Cache [${slots.join(', ')}]`}>
          {Array.from({ length: capacity }, (_, i) => (
            <div
              key={i}
              className={cn(
                'flex size-12 items-center justify-center rounded-md border-2 font-mono text-lg',
                slots[i] === undefined && 'border-dashed text-muted-foreground',
                i === 0 && event === 'hit' && 'border-emerald-500 bg-emerald-500/15',
                i === 0 && event === 'miss' && 'border-amber-500 bg-amber-500/15',
              )}
            >
              {slots[i] ?? '·'}
            </div>
          ))}
        </div>
      </div>
      <p className="min-h-5 text-sm tabular-nums">
        Hits {hits} · Misses {misses}
        {evicted && <span className="text-muted-foreground"> · evicted {evicted}</span>}
      </p>
    </div>
  )
}
