export interface ChNode { id: string; pos: number }
export interface ChKey { id: string; pos: number; owner: string | null }

export interface ChStep {
  nodes: ChNode[]
  keys: ChKey[]
  focus: string | null
  /** Keys that changed owner in this step. */
  moved: string[]
  caption: string
  done?: boolean
}

export const CH_RING_SIZE = 100

const INITIAL_NODES: ChNode[] = [{ id: 'A', pos: 10 }, { id: 'B', pos: 45 }, { id: 'C', pos: 80 }]
const NODE_D: ChNode = { id: 'D', pos: 60 }
const KEY_POSITIONS = [5, 30, 50, 70, 90]

/** First node clockwise whose position is >= the key, wrapping to the lowest node. */
function ownerOf(pos: number, nodes: ChNode[]): ChNode {
  const sorted = [...nodes].sort((a, b) => a.pos - b.pos)
  return sorted.find((n) => n.pos >= pos) ?? sorted[0]
}

export function consistentHashingSteps(): ChStep[] {
  let nodes = INITIAL_NODES.map((n) => ({ ...n }))
  const keys: ChKey[] = KEY_POSITIONS.map((pos, i) => ({ id: `k${i + 1}`, pos, owner: null }))
  const steps: ChStep[] = []
  const push = (focus: string | null, caption: string, moved: string[] = [], done?: boolean) =>
    steps.push({
      nodes: nodes.map((n) => ({ ...n })),
      keys: keys.map((k) => ({ ...k })),
      focus,
      moved,
      caption,
      ...(done ? { done } : {}),
    })

  push(null, 'Three nodes sat on a ring of positions 0–99')

  for (const k of keys) {
    const owner = ownerOf(k.pos, nodes)
    k.owner = owner.id
    const wrapped = owner.pos < k.pos
    push(k.id, wrapped ? `${k.id} (${k.pos}) wrapped past 99 and went to ${owner.id}` : `${k.id} (${k.pos}) went to ${owner.id}, the first node clockwise`)
  }

  push(null, 'Each node owned the arc of positions just before it')

  nodes = [...nodes, { ...NODE_D }].sort((a, b) => a.pos - b.pos)
  push('D', `Node D joined at position ${NODE_D.pos}`)

  const moved: string[] = []
  for (const k of keys) {
    const owner = ownerOf(k.pos, nodes).id
    if (owner === k.owner) continue
    const from = k.owner
    k.owner = owner
    moved.push(k.id)
    push(k.id, `${k.id} (${k.pos}) moved from ${from} to ${owner} — the only key that changed owner`, [k.id])
  }

  push(null, `Done: adding D moved ${moved.length} of ${keys.length} keys; with hash mod N, going from 3 to 4 servers would move about 3 in 4 keys`, [], true)
  return steps
}
