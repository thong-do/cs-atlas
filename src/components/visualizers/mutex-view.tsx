import { type MutexStep, type ThreadState } from '@/lib/visualizers/mutex-steps'
import { cn } from '@/lib/utils'

const STATE_BG: Record<ThreadState, string> = { ready: 'bg-[#475569]', running: 'bg-[#2563eb]', blocked: 'bg-[#b91c1c]', done: 'bg-[#047857]' }
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export function MutexView({ step }: { step: MutexStep }) {
  const { run, counter, threads, owner, waiting, focus } = step
  const runLabel = run === 'no-lock' ? 'No lock' : 'With mutex'
  const summary = `${runLabel}: counter ${counter}; ${threads.map((t) => `${t.id} ${t.state}, local ${t.local ?? 'none'}`).join('; ')}; lock owner ${owner ?? 'free'}; waiting ${waiting.length ? waiting.join(', ') : 'none'}${focus ? `; focus ${focus}` : ''}`
  return (
    <div className="space-y-3" role="img" aria-label={summary}>
      <p className="inline-block rounded-md border px-2 py-1 text-xs font-semibold">{runLabel} run</p>
      <p className="text-sm font-semibold tabular-nums">
        counter = <span className="font-mono text-2xl">{counter}</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        {threads.map((t) => (
          <div key={t.id} className={cn('min-w-0 space-y-1 rounded-md border-2 p-2 text-xs', t.id === focus && 'border-primary bg-primary/10 ring-2 ring-primary')}>
            <p className="font-mono font-semibold">{t.id}</p>
            <p className={cn('rounded px-1 py-0.5 text-center font-semibold text-white', STATE_BG[t.state])}>{cap(t.state)}</p>
            <p className="font-mono tabular-nums">local = {t.local ?? '—'}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1 rounded-md border-2 p-2 text-xs">
        <p className="font-semibold">{run === 'mutex' ? 'Lock' : 'Lock (not used)'}</p>
        <p className="font-mono">owner: {owner ?? 'free'}</p>
        <p className="font-mono">waiting: {waiting.length ? waiting.join(', ') : 'none'}</p>
      </div>
    </div>
  )
}
