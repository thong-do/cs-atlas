import { type Side, type TcpSegment, type TcpState, type TcpStep } from '@/lib/visualizers/tcp-steps'
import { cn } from '@/lib/utils'

const STATE_BG: Record<TcpState, string> = {
  CLOSED: 'bg-[#475569]',
  LISTEN: 'bg-[#9333ea]',
  SYN_SENT: 'bg-[#b45309]',
  SYN_RECEIVED: 'bg-[#b45309]',
  ESTABLISHED: 'bg-[#047857]',
  FIN_WAIT_1: 'bg-[#2563eb]',
  FIN_WAIT_2: 'bg-[#2563eb]',
  CLOSE_WAIT: 'bg-[#2563eb]',
  LAST_ACK: 'bg-[#2563eb]',
  TIME_WAIT: 'bg-[#9333ea]',
}

const SIDES: { side: Side; name: string }[] = [
  { side: 'client', name: 'Client' },
  { side: 'server', name: 'Server' },
]

function segmentLabel(s: TcpSegment) {
  const flags = s.flags.length ? s.flags.join('-') : 'DATA'
  return [flags, `seq=${s.seq}`, s.ack !== null ? `ack=${s.ack}` : null, s.len > 0 ? `len=${s.len}` : null].filter(Boolean).join(' ')
}

export function TcpView({ step }: { step: TcpStep }) {
  const { client, server, segment, sent, lost, retransmits, delivered } = step
  const states: Record<Side, TcpState> = { client, server }
  const lane = segment
    ? `${segment.from} sends ${segmentLabel(segment)}${segment.lost ? ', lost' : ''}${segment.retransmit ? ', resent' : ''}`
    : 'no segment'
  const summary = `TCP: client ${client}, server ${server}; ${lane}; sent ${sent}, lost ${lost}, resent ${retransmits}, delivered ${delivered} bytes`
  return (
    <div className="space-y-3" role="img" aria-label={summary}>
      <div className="grid grid-cols-2 gap-2">
        {SIDES.map(({ side, name }) => (
          <div key={side} className={cn('min-w-0 space-y-1 rounded-md border-2 p-2 text-xs', segment?.from === side && 'border-primary bg-primary/10 ring-2 ring-primary')}>
            <p className="font-semibold">{name}</p>
            <p className={cn('rounded px-1 py-0.5 text-center font-mono text-[10px] font-semibold text-white sm:text-xs', STATE_BG[states[side]])}>{states[side]}</p>
          </div>
        ))}
      </div>
      <div className="flex h-24 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border px-2 text-center text-xs">
        {segment ? (
          <>
            <p className="max-w-full break-words font-mono font-semibold tabular-nums">{segmentLabel(segment)}</p>
            <p className={cn('font-mono text-base leading-none', segment.lost && 'text-red-700 dark:text-red-400')}>{segment.from === 'client' ? '──▶' : '◀──'}</p>
            <p className="h-4 font-semibold">
              {segment.lost && <span className="text-red-700 dark:text-red-400">✕ lost</span>}
              {segment.retransmit && <span className="text-[#b45309] dark:text-amber-400">↻ resent</span>}
            </p>
          </>
        ) : (
          <p className="font-mono text-base">—</p>
        )}
      </div>
      <p className="text-xs tabular-nums max-[374px]:min-h-8">
        Sent {sent} · Lost {lost} · Resent {retransmits} · Delivered {delivered} bytes
      </p>
    </div>
  )
}
