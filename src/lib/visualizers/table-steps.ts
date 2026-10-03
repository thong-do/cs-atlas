export interface TableStep {
  rowLabels: string[]
  colLabels: string[]
  values: (number | null)[][]
  current?: [number, number]
  deps?: [number, number][]
  caption: string
  done?: boolean
}

const copy = (v: (number | null)[][]) => v.map((r) => [...r])

export function lcsTableSteps(a: string, b: string): TableStep[] {
  const rowLabels = ['', ...a]
  const colLabels = ['', ...b]
  const values: (number | null)[][] = rowLabels.map((_, i) => colLabels.map((_, j) => (i === 0 || j === 0 ? 0 : null)))
  const steps: TableStep[] = [
    { rowLabels, colLabels, values: copy(values), caption: 'Base case: an empty string has a common subsequence of length 0 with anything' },
  ]
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const up = values[i - 1][j]!
      const left = values[i][j - 1]!
      const diag = values[i - 1][j - 1]!
      let caption: string
      let deps: [number, number][]
      if (a[i - 1] === b[j - 1]) {
        values[i][j] = diag + 1
        deps = [[i - 1, j - 1]]
        caption = `a[i-1] = '${a[i - 1]}' matches b[j-1]: 1 + diagonal = ${diag + 1}`
      } else {
        values[i][j] = Math.max(up, left)
        deps = [[i - 1, j], [i, j - 1]]
        caption = `'${a[i - 1]}' ≠ '${b[j - 1]}': max(up ${up}, left ${left}) = ${values[i][j]}`
      }
      steps.push({ rowLabels, colLabels, values: copy(values), current: [i, j], deps, caption })
    }
  }
  const len = values[a.length][b.length]!
  steps.push({ rowLabels, colLabels, values: copy(values), current: [a.length, b.length], caption: `LCS length = ${len}`, done: true })
  return steps
}

export function houseRobberSteps(nums: number[]): TableStep[] {
  const rowLabels = ['nums', 'best']
  const colLabels = nums.map((_, i) => String(i))
  const best: (number | null)[] = nums.map(() => null)
  const snap = () => [[...nums], [...best]]
  const steps: TableStep[] = []
  for (let i = 0; i < nums.length; i++) {
    const skip = i >= 1 ? best[i - 1]! : 0
    const prev2 = i >= 2 ? best[i - 2]! : 0
    const rob = nums[i] + prev2
    best[i] = Math.max(skip, rob)
    const deps: [number, number][] = []
    if (i >= 1) deps.push([1, i - 1])
    if (i >= 2) deps.push([1, i - 2])
    if (i >= 1) deps.push([0, i])
    const caption =
      i === 0
        ? `best[0] = ${nums[0]}: with one house, rob it`
        : i === 1
          ? `max(skip: ${skip}, rob: ${nums[i]}) = ${best[i]}`
          : `max(skip: ${skip}, rob: ${prev2} + ${nums[i]}) = ${best[i]}`
    steps.push({ rowLabels, colLabels, values: snap(), current: [1, i], deps, caption })
  }
  steps.push({ rowLabels, colLabels, values: snap(), current: nums.length ? [1, nums.length - 1] : undefined, caption: `Best total = ${nums.length ? best[nums.length - 1] : 0}`, done: true })
  return steps
}
