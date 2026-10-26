import { ABR_BANDWIDTH_MBPS, ABR_LADDER_KBPS, type AbrStep } from '@/lib/visualizers/abr-steps'
import { cn } from '@/lib/utils'

const BUFFER_MAX_SECONDS = 14

// White text on each of these backgrounds clears 4.5:1.
const RENDITION_BG: Record<number, string> = {
  400: 'bg-slate-600',
  1000: 'bg-blue-600',
  2500: 'bg-emerald-700',
  5000: 'bg-purple-600',
}

const short = (kbps: number) => (kbps >= 1000 ? `${kbps / 1000}k` : String(kbps))
const sec = (n: number) => `${Number(n.toFixed(1))} s`

export function AbrView({ step }: { step: AbrStep }) {
  const { segment, bandwidthMbps, renditionKbps, stallSeconds, bufferSeconds, totalStallSeconds, history } = step
  const stalledAt = segment !== null && stallSeconds > 0 ? segment : null
  const total = ABR_BANDWIDTH_MBPS.length
  const done = history.length === total
  const segmentText =
    segment === null
      ? 'no segment downloaded'
      : done
        ? `${total} of ${total} segments downloaded, final rendition ${history[history.length - 1].toLocaleString('en-US')} kbps`
        : `segment ${segment} of ${total} at ${renditionKbps?.toLocaleString('en-US')} kbps`
  const label = `Adaptive bitrate player: ${segmentText}, buffer ${sec(bufferSeconds)} of ${BUFFER_MAX_SECONDS} s, total stalls ${sec(totalStallSeconds)}`

  return (
    <div role="img" aria-label={label} className="space-y-3">
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Ladder (kbps)</p>
        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {[...ABR_LADDER_KBPS].reverse().map((r) => {
            const current = r === renditionKbps
            return (
              <li
                key={r}
                className={cn(
                  'flex h-7 items-center justify-between rounded-md border px-2 font-mono text-xs',
                  current ? `${RENDITION_BG[r]} border-transparent font-medium text-white` : 'text-muted-foreground',
                )}
              >
                <span>{r.toLocaleString('en-US')}</span>
                <span>{current ? 'current' : ''}</span>
              </li>
            )
          })}
        </ul>
      </div>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Segments (kbps)</p>
        <div className="grid grid-cols-8 gap-0.5 sm:gap-1">
          {Array.from({ length: ABR_BANDWIDTH_MBPS.length }, (_, i) => {
            const r = history[i]
            const stalled = stalledAt === i + 1
            return (
              <div
                key={i}
                className={cn(
                  'flex h-8 items-center justify-center rounded-md border-2 font-mono text-[10px] sm:text-xs',
                  r === undefined ? 'border-dashed text-muted-foreground' : `${RENDITION_BG[r]} text-white`,
                  r !== undefined && (stalled ? 'border-red-700 ring-2 ring-red-700' : 'border-transparent'),
                )}
              >
                {r === undefined ? i + 1 : short(r)}
              </div>
            )
          })}
        </div>
        <div className="mt-1 grid h-5 grid-cols-8 gap-0.5 sm:gap-1">
          {stalledAt !== null && (
            <span
              className="w-fit whitespace-nowrap rounded bg-red-700 px-1.5 py-0.5 text-xs font-medium text-white dark:text-red-100"
              style={{ gridColumn: `${stalledAt} / span 3` }}
            >
              stall {sec(stallSeconds)}
            </span>
          )}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Buffer (max {BUFFER_MAX_SECONDS} s)</p>
        <div className="flex h-5 items-center gap-2">
          <div className="h-3 flex-1 overflow-hidden rounded-full border">
            <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, (bufferSeconds / BUFFER_MAX_SECONDS) * 100)}%` }} />
          </div>
          <span className="w-12 text-right font-mono text-xs tabular-nums">{sec(bufferSeconds)}</span>
        </div>
      </div>
      <p className="min-h-12 text-xs tabular-nums sm:min-h-4">
        Bandwidth {bandwidthMbps === null ? '—' : `${bandwidthMbps} Mbit/s`} · Rendition {renditionKbps === null ? '—' : `${renditionKbps.toLocaleString('en-US')} kbps`} · Buffer {sec(bufferSeconds)} ·{' '}
        <span className={cn(totalStallSeconds > 0 && 'font-medium text-red-700 dark:text-red-400')}>Stalls {sec(totalStallSeconds)}</span>
      </p>
    </div>
  )
}
