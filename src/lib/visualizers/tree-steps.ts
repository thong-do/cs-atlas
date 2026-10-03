export interface TreeNode {
  id: number
  label: string
  parent: number | null
  depth: number
}

export interface TreeStep {
  nodes: TreeNode[]
  visited: number[]
  current: number
  path: number[]
  results: number[][]
  action: 'record' | 'choose' | 'unchoose' | 'done'
  caption: string
  done?: boolean
}

const fmt = (p: number[]) => `[${p.join(',')}]`

export function subsetsTreeSteps(nums: number[]): TreeStep[] {
  const nodes: TreeNode[] = []
  const children = new Map<number, { num: number; id: number }[]>()
  const build = (path: number[], start: number, parent: number | null): number => {
    const id = nodes.length
    nodes.push({ id, label: fmt(path), parent, depth: path.length })
    const kids: { num: number; id: number }[] = []
    for (let i = start; i < nums.length; i++) kids.push({ num: nums[i], id: build([...path, nums[i]], i + 1, id) })
    children.set(id, kids)
    return id
  }
  build([], 0, null)

  const steps: TreeStep[] = []
  const visited: number[] = []
  const results: number[][] = []
  const path: number[] = []
  const push = (current: number, action: TreeStep['action'], caption: string) =>
    steps.push({ nodes, visited: [...visited], current, path: [...path], results: results.map((r) => [...r]), action, caption })

  const visit = (id: number) => {
    results.push([...path])
    push(id, 'record', `Record ${fmt(path)} as a subset`)
    for (const kid of children.get(id)!) {
      path.push(kid.num)
      visited.push(kid.id)
      push(kid.id, 'choose', `Choose ${kid.num} → ${fmt(path)}`)
      visit(kid.id)
      path.pop()
      push(id, 'unchoose', `Un-choose ${kid.num} → back to ${fmt(path)}`)
    }
  }
  visited.push(0)
  visit(0)
  steps.push({ nodes, visited: [...visited], current: 0, path: [], results: results.map((r) => [...r]), action: 'done', caption: `All ${results.length} subsets found`, done: true })
  return steps
}
