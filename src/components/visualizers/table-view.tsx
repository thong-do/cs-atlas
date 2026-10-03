import type { TableStep } from '@/lib/visualizers/table-steps'
import { cn } from '@/lib/utils'

export function TableView({ step }: { step: TableStep }) {
  const { rowLabels, colLabels, values, current, deps = [] } = step
  const isDep = (i: number, j: number) => deps.some(([r, c]) => r === i && c === j)
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 text-center font-mono text-sm">
          <thead>
            <tr>
              <th scope="col" className="size-9" />
              {colLabels.map((c, j) => (
                <th key={j} scope="col" className="size-9 font-semibold text-muted-foreground">{c || '∅'}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {values.map((row, i) => (
              <tr key={i}>
                <th scope="row" className="h-9 min-w-9 px-1 font-semibold text-muted-foreground">{rowLabels[i] || '∅'}</th>
                {row.map((v, j) => {
                  const cur = current?.[0] === i && current?.[1] === j
                  return (
                    <td
                      key={j}
                      className={cn(
                        'size-9 min-w-9 rounded-md border',
                        v === null && 'border-dashed',
                        isDep(i, j) && 'border-amber-500 bg-amber-500/20',
                        cur && 'bg-primary/15 ring-2 ring-primary',
                      )}
                    >
                      {v}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Current: ring · Depends on: amber · Empty: not filled yet</p>
    </div>
  )
}
