import { TB_CAPACITY, TB_SECONDS, type TbStep } from '@/lib/visualizers/tb-steps'
import { cn } from '@/lib/utils'

export function TbView({ step }: { step: TbStep }) {
  const { t, tokens, request, allowed, allowedCount, rejectedCount } = step
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Bucket ({tokens} of {TB_CAPACITY} tokens)</p>
        <div className="flex gap-2" aria-label={`Bucket holds ${tokens} of ${TB_CAPACITY} tokens`}>
          {Array.from({ length: TB_CAPACITY }, (_, i) => (
            <div
              key={i}
              className={cn('size-9 rounded-full border-2', i < tokens ? 'border-primary bg-primary/70' : 'border-dashed text-muted-foreground')}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Timeline (seconds)</p>
        <div className="flex gap-1" aria-label={`Timeline, now at t=${t}`}>
          {Array.from({ length: TB_SECONDS }, (_, i) => (
            <div
              key={i}
              className={cn(
                'flex h-8 w-9 items-center justify-center rounded-md border font-mono text-xs',
                i === t && 'border-primary bg-primary/15 ring-2 ring-primary font-medium',
                i < t && 'text-muted-foreground',
              )}
            >
              {i}
            </div>
          ))}
        </div>
      </div>
      <div className="flex h-8 items-center">
        {request !== null ? (
          <span
            className={cn(
              'rounded-md border px-2 py-1 font-mono text-xs font-medium',
              allowed ? 'border-green-600 bg-green-600/15 text-green-700 dark:text-green-400' : 'border-red-600 bg-red-600/15 text-red-700 dark:text-red-400',
            )}
          >
            Request {request}: {allowed ? 'allowed' : '429'}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No request this step</span>
        )}
      </div>
      <p className="text-sm tabular-nums">Allowed {allowedCount} · Rejected {rejectedCount}</p>
    </div>
  )
}
