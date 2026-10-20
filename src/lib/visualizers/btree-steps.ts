export interface BTreeStep {
  /** levels[0] is the root level; each level lists its nodes left to right; each node lists its keys ascending. */
  levels: number[][][]
  inserting: number | null
  focus: { level: number; node: number } | null
  /** True while the focused node holds 3 keys. */
  overflow: boolean
  splits: number
  height: number
  caption: string
  done?: boolean
}

export const BTREE_INSERT_KEYS = [50, 20, 70, 10, 30, 60, 40, 80]
const MAX_KEYS = 2

interface BNode {
  keys: number[]
  children: BNode[]
}

const fmt = (keys: number[]) => `[${keys.join(', ')}]`
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

function toLevels(root: BNode): number[][][] {
  const levels: number[][][] = []
  let row: BNode[] = [root]
  while (row.length) {
    levels.push(row.map((n) => [...n.keys]))
    row = row.flatMap((n) => n.children)
  }
  return levels
}

function locate(root: BNode, target: BNode): { level: number; node: number } {
  let row: BNode[] = [root]
  for (let level = 0; row.length; level++) {
    const node = row.indexOf(target)
    if (node >= 0) return { level, node }
    row = row.flatMap((n) => n.children)
  }
  throw new Error('node not in tree')
}

function inOrder(n: BNode, out: number[]) {
  n.children.forEach((c, i) => {
    inOrder(c, out)
    if (i < n.keys.length) out.push(n.keys[i])
  })
  if (n.children.length === 0) out.push(...n.keys)
}

export function bTreeInsertSteps(): BTreeStep[] {
  const steps: BTreeStep[] = []
  let root: BNode = { keys: [], children: [] }
  let splits = 0

  const push = (inserting: number | null, focus: BNode | null, caption: string, done?: boolean) => {
    const levels = toLevels(root)
    const pos = focus ? locate(root, focus) : null
    for (const level of levels) for (const keys of level) if (keys.length > MAX_KEYS + 1) throw new Error(`node holds ${keys.length} keys`)
    steps.push({ levels, inserting, focus: pos, overflow: !!focus && focus.keys.length > MAX_KEYS, splits, height: levels.length, caption, ...(done ? { done: true } : {}) })
  }

  push(null, null, 'An empty order-3 B-tree: each node held at most 2 keys')

  for (const key of BTREE_INSERT_KEYS) {
    // Descend by key comparison, remembering the path.
    const path: BNode[] = [root]
    while (path[path.length - 1].children.length) {
      const n = path[path.length - 1]
      let i = 0
      while (i < n.keys.length && key > n.keys[i]) i++
      path.push(n.children[i])
    }
    const leaf = path[path.length - 1]
    const before = [...leaf.keys]
    let at = 0
    while (at < leaf.keys.length && leaf.keys[at] < key) at++
    leaf.keys.splice(at, 0, key)
    const isRoot = path.length === 1

    if (leaf.keys.length > MAX_KEYS) {
      push(key, leaf, isRoot ? `Inserted ${key}; the root leaf overflowed with ${fmt(leaf.keys)}` : `Inserted ${key}; leaf ${fmt(leaf.keys)} overflowed`)
    } else if (before.length === 0) {
      push(key, leaf, `Inserted ${key} into the empty root`)
    } else if (isRoot) {
      push(key, leaf, `Inserted ${key}; the root leaf held ${fmt(leaf.keys)}`)
    } else {
      push(key, leaf, `Inserted ${key} into leaf ${fmt(before)}, giving ${fmt(leaf.keys)}`)
    }

    // Split upward while the node on the path overflows.
    for (let d = path.length - 1; d >= 0 && path[d].keys.length > MAX_KEYS; d--) {
      const node = path[d]
      const [lo, mid, hi] = node.keys
      const right: BNode = { keys: [hi], children: node.children.slice(2) }
      node.keys = [lo]
      node.children = node.children.slice(0, 2)
      splits++
      const isLeaf = node.children.length === 0
      if (d === 0) {
        root = { keys: [mid], children: [node, right] }
        if (isLeaf) push(null, root, `The root split: ${mid} moved up into a new root above ${fmt(node.keys)} and ${fmt(right.keys)}`)
        else push(null, root, `The root split: ${mid} moved up into a new root, and the tree grew to ${toLevels(root).length} levels`)
      } else {
        const parent = path[d - 1]
        const idx = parent.children.indexOf(node)
        parent.keys.splice(idx, 0, mid)
        parent.children.splice(idx + 1, 0, right)
        const parentIsRoot = d - 1 === 0
        const tail = parent.keys.length > MAX_KEYS ? `; the ${parentIsRoot ? 'root' : 'node'} overflowed with ${fmt(parent.keys)}` : ''
        const into = tail ? '' : parentIsRoot ? ' into the root' : ' into its parent'
        push(null, parent, `The ${isLeaf ? 'leaf' : 'node'} split into ${fmt(node.keys)} and ${fmt(right.keys)}, and ${mid} moved up${into}${tail}`)
      }
    }
  }

  const sorted: number[] = []
  inOrder(root, sorted)
  if (sorted.some((k, i) => i > 0 && k <= sorted[i - 1])) throw new Error('in-order walk is not sorted')
  push(null, null, `Done: ${sorted.length} ${plural(sorted.length, 'key', 'keys')} and ${splits} ${plural(splits, 'split', 'splits')}; the tree grew taller only when the root split`, true)
  return steps
}
