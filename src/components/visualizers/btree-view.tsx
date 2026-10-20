import { type BTreeStep } from '@/lib/visualizers/btree-steps'
import { cn } from '@/lib/utils'

const ROWS = 3

export function BTreeView({ step }: { step: BTreeStep }) {
  const { levels, inserting, focus, overflow, splits, height } = step
  const shape = levels.map((l) => l.map((n) => (n.length ? n.join(' ') : 'empty')).join(' | ')).join(' / ')
  const summary = `B-tree, ${height} ${height === 1 ? 'level' : 'levels'}: ${shape}; ${inserting !== null ? `inserting ${inserting}` : 'not inserting'}; ${overflow ? 'a node is overflowing; ' : ''}${splits} ${splits === 1 ? 'split' : 'splits'}`
  return (
    <div className="space-y-3" role="img" aria-label={summary}>
      <div className="space-y-2">
        {Array.from({ length: ROWS }, (_, level) => (
          <div key={level} className="flex h-12 min-w-0 items-center justify-center gap-1 sm:gap-2">
            {(levels[level] ?? []).map((keys, node) => {
              const focused = focus?.level === level && focus.node === node
              const over = focused && overflow
              return (
                <div
                  key={node}
                  className={cn(
                    'flex h-12 min-w-0 max-w-[4.5rem] flex-1 flex-col sm:max-w-[6rem] items-center justify-center rounded-md border-2 px-1 text-center font-mono text-[11px] font-semibold tabular-nums sm:text-xs',
                    focused && 'border-primary bg-primary/10 ring-2 ring-primary',
                    over && 'border-[#b91c1c] bg-red-50 ring-[#b91c1c] dark:border-red-400 dark:bg-red-950/40 dark:ring-red-400',
                  )}
                >
                  <span className="max-w-full whitespace-nowrap">{keys.length ? keys.join('·') : 'empty'}</span>
                  {over && <span className="text-[9px] leading-none text-red-700 dark:text-red-400">overflow</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <p className="text-xs tabular-nums max-[374px]:min-h-8">
        {inserting !== null ? `Inserting ${inserting}` : '—'} · Splits {splits} · Height {height}
      </p>
    </div>
  )
}
