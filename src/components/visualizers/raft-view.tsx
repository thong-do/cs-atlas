import { type RaftMsg, type RaftStep, type Role } from '@/lib/visualizers/raft-steps'
import { cn } from '@/lib/utils'

const SLOTS = 2
const MSG_SLOTS = 2
const ROLE_LABEL: Record<Role, string> = { follower: 'Follower', candidate: 'Candidate', leader: 'Leader', down: 'Down' }
const ROLE_BG: Record<Role, string> = { follower: 'bg-[#2563eb]', candidate: 'bg-[#b45309]', leader: 'bg-[#047857]', down: 'bg-[#475569]' }

export function RaftView({ step }: { step: RaftStep }) {
  const { nodes, messages, focus } = step
  const summary = nodes.map((n) => `${n.id} ${ROLE_LABEL[n.role]} term ${n.term} voted ${n.votedFor ?? 'none'} log ${n.log.length} commit ${n.commitIndex}`).join('; ')
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3" role="img" aria-label={`Raft cluster: ${summary}`}>
        {nodes.map((n) => (
          <div
            key={n.id}
            className={cn(
              'min-w-0 space-y-1 rounded-md border-2 p-1.5 text-xs sm:p-2',
              n.id === focus && 'border-primary bg-primary/10 ring-2 ring-primary',
              n.role === 'down' && 'border-dashed bg-muted text-muted-foreground',
            )}
          >
            <p className="font-mono font-semibold">{n.id}</p>
            <p className={cn('rounded px-1 py-0.5 text-center font-semibold text-white', ROLE_BG[n.role])}>{ROLE_LABEL[n.role]}</p>
            <p className="tabular-nums">term {n.term}</p>
            <p className="tabular-nums">voted: {n.votedFor ?? '—'}</p>
            <div className="space-y-0.5">
              {Array.from({ length: SLOTS }, (_, i) => {
                const e = n.log[i]
                return (
                  <p key={i} className={cn('truncate rounded border px-0.5 py-0.5 font-mono text-[11px] tabular-nums', !e && 'border-dashed text-muted-foreground')}>
                    {e ? `${i + 1}·t${e.term} ${e.cmd}` : `${i + 1}·—`}
                  </p>
                )
              })}
            </div>
            <p className="tabular-nums">commit {n.commitIndex}</p>
          </div>
        ))}
      </div>
      <Messages messages={messages} />
    </div>
  )
}

function Messages({ messages }: { messages: RaftMsg[] }) {
  return (
    <ul className="space-y-1">
      {Array.from({ length: MSG_SLOTS }, (_, i) => {
        const m = messages[i]
        return (
          <li key={i} className={cn('h-7 truncate rounded-md border px-2 font-mono text-xs leading-[1.625rem]', !m && 'border-dashed text-muted-foreground', m && 'bg-muted')}>
            {m ? `${m.from} → ${m.to} · ${m.kind}` : i === 0 && messages.length === 0 ? 'No messages this step' : ''}
          </li>
        )
      })}
    </ul>
  )
}
