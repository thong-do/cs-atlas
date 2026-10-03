import type { TreeStep } from '@/lib/visualizers/tree-steps'
import { cn } from '@/lib/utils'

const SLOT = 62
const LEVEL_H = 56
const NODE_W = 54
const NODE_H = 24

/** Leaf-slot layout: leaves take consecutive x slots, parents sit centred over their children. */
function layout(nodes: TreeStep['nodes']) {
  const kids = new Map<number, number[]>()
  for (const n of nodes) if (n.parent !== null) kids.set(n.parent, [...(kids.get(n.parent) ?? []), n.id])
  const xs = new Map<number, number>()
  let slot = 0
  const place = (id: number) => {
    const ch = kids.get(id) ?? []
    for (const c of ch) place(c)
    xs.set(id, ch.length ? (xs.get(ch[0])! + xs.get(ch[ch.length - 1])!) / 2 : (slot++ + 0.5) * SLOT)
  }
  place(0)
  return { xs, width: Math.max(slot, 1) * SLOT }
}

export function TreeView({ step }: { step: TreeStep }) {
  const { nodes, visited, current, path, results, action } = step
  const { xs, width } = layout(nodes)
  const depth = Math.max(...nodes.map((n) => n.depth))
  const y = (d: number) => NODE_H / 2 + 4 + d * LEVEL_H
  const height = y(depth) + NODE_H / 2 + 4
  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Decision tree, current path ${JSON.stringify(path)}, ${results.length} subsets recorded`} className="mx-auto w-full max-w-xs">
        {nodes.map((n) => {
          if (n.parent === null) return null
          const hot = action === 'choose' && n.id === current
          return (
            <line
              key={`e${n.id}`}
              x1={xs.get(n.parent)}
              y1={y(nodes[n.parent].depth)}
              x2={xs.get(n.id)}
              y2={y(n.depth)}
              className={cn(hot ? 'stroke-primary' : visited.includes(n.id) ? 'stroke-foreground/50' : 'stroke-border')}
              strokeWidth={hot ? 3 : 1.5}
              opacity={visited.includes(n.id) ? 1 : 0.5}
            />
          )
        })}
        {nodes.map((n) => {
          const seen = visited.includes(n.id)
          const cur = n.id === current
          return (
            <g key={n.id}>
              <rect x={(xs.get(n.id) ?? 0) - NODE_W / 2} y={y(n.depth) - NODE_H / 2} width={NODE_W} height={NODE_H} rx={6} className="fill-background" />
              <rect
                x={(xs.get(n.id) ?? 0) - NODE_W / 2}
                y={y(n.depth) - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={6}
                className={cn('fill-background stroke-border', seen && 'fill-primary/15 stroke-primary', cur && 'stroke-primary')}
                strokeWidth={cur ? 3 : 1.5}
                strokeOpacity={seen ? 1 : 0.5}
              />
              <text x={xs.get(n.id)} y={y(n.depth)} textAnchor="middle" dominantBaseline="central" className={cn('font-mono text-[11px]', seen ? 'fill-foreground' : 'fill-muted-foreground/50')}>{n.label}</text>
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-xs text-muted-foreground">Path</span>
        {path.length === 0 && <span className="text-sm text-muted-foreground">(empty)</span>}
        {path.map((v, i) => (
          <div key={i} className="flex size-9 items-center justify-center rounded-md border border-primary bg-primary/15 font-mono">{v}</div>
        ))}
      </div>
      <p className="text-sm">
        <span className="text-xs text-muted-foreground">Results </span>
        <span className="font-mono">{results.map((r) => `[${r.join(',')}]`).join(' ')}</span>
      </p>
    </div>
  )
}
