import { LB_REQUESTS, LB_SERVERS, type LbStep } from '@/lib/visualizers/lb-steps'
import { cn } from '@/lib/utils'

const SLOTS = 3

export function LbView({ step }: { step: LbStep }) {
  const { policy, request, server, active, peak } = step
  const current = request ? LB_REQUESTS.indexOf(request) : -1
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Policy: {policy === 'round-robin' ? 'Round-robin' : 'Least-connections'}</p>
      <div className="grid grid-cols-3 gap-2">
        {LB_SERVERS.map((s) => (
          <div key={s} className={cn('rounded-md border-2 p-2', s === server && 'border-primary bg-primary/10')}>
            <p className="mb-1 text-center font-mono text-xs">Server&nbsp;{s}</p>
            <div className="space-y-1" aria-label={`Server ${s} active [${active[s].join(', ')}]`}>
              {Array.from({ length: SLOTS }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex h-7 items-center justify-center rounded border font-mono text-xs',
                    active[s][i] === undefined ? 'border-dashed text-muted-foreground' : active[s][i] === request ? 'border-primary bg-primary/20' : 'bg-muted',
                  )}
                >
                  {active[s][i] ?? '·'}
                </div>
              ))}
            </div>
            <p className="mt-1 text-center text-xs tabular-nums text-muted-foreground">peak {peak[s]}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Requests</p>
        <div className="flex flex-wrap gap-1" aria-label={`Requests ${LB_REQUESTS.join(' ')}`}>
          {LB_REQUESTS.map((r, i) => (
            <div
              key={r}
              className={cn(
                'flex h-8 w-9 items-center justify-center rounded-md border font-mono text-xs',
                i === current && 'border-primary bg-primary/15 ring-2 ring-primary',
                i < current && 'text-muted-foreground',
              )}
            >
              {r}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
