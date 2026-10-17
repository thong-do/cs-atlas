import { TPC_NAMES, type CoordState, type PState, type TpcStep } from '@/lib/visualizers/tpc-steps'
import { cn } from '@/lib/utils'

const MSG_SLOTS = 2
const COORD_LABEL: Record<CoordState, string> = { idle: 'Idle', waiting: 'Waiting for votes', committed: 'Committed', aborted: 'Aborted', down: 'Down' }
const COORD_BG: Record<CoordState, string> = { idle: 'bg-[#475569]', waiting: 'bg-[#b45309]', committed: 'bg-[#047857]', aborted: 'bg-[#475569]', down: 'bg-[#b91c1c]' }
const P_BG: Record<PState, string> = { working: 'bg-[#475569]', prepared: 'bg-[#b45309]', committed: 'bg-[#047857]', aborted: 'bg-[#475569]' }
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export function TpcView({ step }: { step: TpcStep }) {
  const { run, coordinator, participants, messages } = step
  const summary = `${run === 'commit' ? 'Commit run' : 'Crash run'}: coordinator ${COORD_LABEL[coordinator]}; ${participants
    .map((p) => `${p.id} ${p.state}, ${p.locked ? 'locked' : 'unlocked'}, vote ${p.vote ?? 'none'}${p.state === 'prepared' && coordinator === 'down' ? ', blocked' : ''}`)
    .join('; ')}`
  return (
    <div className="space-y-3">
      <p className="inline-block rounded-md border px-2 py-1 text-xs font-semibold">{run === 'commit' ? 'Commit run' : 'Crash run'}</p>
      <div className="space-y-2" role="img" aria-label={summary}>
        <div className={cn('rounded-md border-2 p-2 text-xs', coordinator === 'down' && 'border-[#b91c1c]')}>
          <p className="font-semibold">Coordinator</p>
          <p className={cn('mt-1 rounded px-1 py-0.5 text-center font-semibold text-white', COORD_BG[coordinator])}>{COORD_LABEL[coordinator]}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {participants.map((p) => {
            const blocked = p.state === 'prepared' && coordinator === 'down'
            return (
              <div key={p.id} className={cn('min-w-0 space-y-1 rounded-md border-2 p-2 text-xs', blocked && 'border-[#b91c1c] bg-[#b91c1c]/10 dark:bg-red-600/15')}>
                <p className="font-semibold">{p.id} · {TPC_NAMES[p.id]}</p>
                <p className={cn('rounded px-1 py-0.5 text-center font-semibold text-white', blocked ? 'bg-[#b91c1c]' : P_BG[p.state])}>
                  {cap(p.state)}
                </p>
                <p>{p.locked ? '🔒 locked' : 'unlocked'}</p>
                <p className={cn('font-semibold', blocked ? 'text-[#b91c1c] dark:text-red-400' : 'invisible')}>Blocked</p>
                <p>vote: {p.vote ? p.vote.toUpperCase() : '—'}</p>
              </div>
            )
          })}
        </div>
      </div>
      <ul className="space-y-1">
        {Array.from({ length: MSG_SLOTS }, (_, i) => {
          const m = messages[i]
          return (
            <li key={i} className={cn('h-7 truncate rounded-md border px-2 font-mono text-xs leading-[1.625rem]', m ? 'bg-muted' : 'border-dashed text-muted-foreground')}>
              {m ? `${m.from} → ${m.to} · ${m.kind}` : i === 0 && messages.length === 0 ? 'No messages this step' : ''}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
