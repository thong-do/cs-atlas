import { ChevronRight } from 'lucide-react'
import { DNS_NODES, type DnsStep } from '@/lib/visualizers/dns-steps'
import { cn } from '@/lib/utils'

export function DnsView({ step }: { step: DnsStep }) {
  const { active, elapsedMs, resolverCache } = step
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label="Servers consulted during the lookup">
        {DNS_NODES.map((n, i) => (
          <div key={n.id} className="flex items-center gap-1">
            <div
              className={cn(
                'flex h-14 w-24 items-center justify-center rounded-md border-2 px-1 text-center text-xs leading-tight',
                n.id === active && 'border-primary bg-primary/15 ring-2 ring-primary font-medium',
              )}
            >
              {n.label}
            </div>
            {i < DNS_NODES.length - 1 && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
          </div>
        ))}
      </div>
      <p className="text-sm tabular-nums">Elapsed: {elapsedMs} ms</p>
      <div className="rounded-md border border-dashed p-2">
        <p className="mb-1 text-xs text-muted-foreground">Resolver cache</p>
        <p className="min-h-8 break-words font-mono text-xs">{resolverCache.length ? resolverCache.join('; ') : '(empty)'}</p>
      </div>
    </div>
  )
}
