import { type BTreeStep } from '@/lib/visualizers/btree-steps'
import { cn } from '@/lib/utils'

const ROWS = 3

/** Leaves beneath each node, bottom-up from childCounts, so a parent can be centred over its own children. */
function spansOf(childCounts: number[][]): number[][] {
  const spans: number[][] = childCounts.map((row) => row.map(() => 1))
  for (let l = childCounts.length - 2; l >= 0; l--) {
    let next = 0
    spans[l] = childCounts[l].map((c) => {
      if (c === 0) return 1
      let sum = 0
      for (let i = 0; i < c; i++) sum += spans[l + 1][next++]
      return sum
    })
  }
  return spans
}

export function BTreeView({ step }: { step: BTreeStep }) {
  const { levels, childCounts, inserting, focus, overflow, splits, height } = step
  const spans = spansOf(childCounts)
  const shape = levels.map((l, i) => `level ${i + 1}: ${l.map((n) => (n.length ? n.join(', ') : 'empty')).join(' | ')}`).join('; ')
  const focusText = focus ? `focused node ${levels[focus.level][focus.node].join(', ') || 'empty'} on level ${focus.level + 1}${overflow ? ', overflowing' : ''}` : 'no focused node'
  const summary = `B-tree, ${height} ${height === 1 ? 'level' : 'levels'}. ${shape}. ${inserting !== null ? `Inserting ${inserting}` : 'Not inserting'}; ${focusText}; ${splits} ${splits === 1 ? 'split' : 'splits'}`
  return (
    <div className="space-y-3" role="img" aria-label={summary}>
      <div className="space-y-2">
        {Array.from({ length: ROWS }, (_, level) => (
          <div key={level} className="flex h-12 min-w-0">
            {(levels[level] ?? []).map((keys, node) => {
              const focused = focus?.level === level && focus.node === node
              const over = focused && overflow
              return (
                <div key={node} className="flex min-w-0 justify-center px-0.5 sm:px-1" style={{ flex: `${spans[level][node]} 1 0%` }}>
                  <div
                    className={cn(
                      'flex h-12 min-w-0 max-w-[4.5rem] flex-1 flex-col items-center justify-center rounded-md border-2 px-1 text-center font-mono text-[11px] font-semibold tabular-nums sm:max-w-[6rem] sm:text-xs',
                      focused && !over && 'border-primary bg-primary/10 ring-2 ring-primary',
                      over && 'border-[#b91c1c] bg-red-50 ring-2 ring-[#b91c1c] dark:border-red-400 dark:bg-red-950/40 dark:ring-red-400',
                    )}
                  >
                    <span className="max-w-full whitespace-nowrap">{keys.length ? keys.join('·') : 'empty'}</span>
                    {over && <span className="text-[9px] leading-none text-red-700 dark:text-red-400">overflow</span>}
                  </div>
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
