import { CH_RING_SIZE, type ChStep } from '@/lib/visualizers/ch-steps'

const SIZE = 240
const C = SIZE / 2
const NODE_R = 92
const KEY_R = 68
const OWNER_COLOR: Record<string, string> = { A: '#2563eb', B: '#b45309', C: '#047857', D: '#9333ea' }
const UNPLACED = '#9ca3af'

const at = (pos: number, r: number) => {
  const a = ((pos / CH_RING_SIZE) * 360 * Math.PI) / 180
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) }
}

export function ChView({ step }: { step: ChStep }) {
  const { nodes, keys, focus, moved } = step
  const legend = nodes.map((n) => {
    const owned = keys.filter((k) => k.owner === n.id).map((k) => k.id)
    return `${n.id}: ${owned.length ? owned.join(', ') : '–'}`
  })
  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block aspect-square w-full max-w-[260px]" role="img" aria-label={`Hash ring of positions 0 to 99; ${legend.join("; ")}`}>
        <circle cx={C} cy={C} r={NODE_R} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={2} />
        <text x={C} y={C - 4} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.6}>0 at top,</text>
        <text x={C} y={C + 8} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.6}>clockwise to 99</text>
        {nodes.map((n) => {
          const p = at(n.pos, NODE_R)
          return (
            <g key={n.id}>
              <circle cx={p.x} cy={p.y} r={11} fill={OWNER_COLOR[n.id]} stroke="currentColor" strokeWidth={n.id === focus ? 3 : 0} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">{n.id}</text>
            </g>
          )
        })}
        {keys.map((k) => {
          const p = at(k.pos, KEY_R)
          const isMoved = moved.includes(k.id)
          return (
            <g key={k.id}>
              <circle
                cx={p.x} cy={p.y} r={9}
                fill={k.owner ? OWNER_COLOR[k.owner] : 'none'}
                fillOpacity={0.55}
                stroke={isMoved ? '#ef4444' : k.id === focus ? 'currentColor' : UNPLACED}
                strokeWidth={isMoved || k.id === focus ? 3 : 1.5}
                strokeDasharray={k.owner ? undefined : '3 2'}
              />
              <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize={9} fontWeight={600} fill="currentColor">{k.id}</text>
            </g>
          )
        })}
      </svg>
      <p className="min-h-10 text-center font-mono text-xs leading-5 tabular-nums">{legend.join(' · ')}</p>
    </div>
  )
}
