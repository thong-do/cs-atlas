export interface VisStep {
  cells: (number | string)[]
  markers: Record<string, number>
  highlight?: [number, number]
  caption: string
  done?: boolean
}

export function twoPointersSteps(nums: number[], target: number): VisStep[] {
  const steps: VisStep[] = []
  let l = 0
  let r = nums.length - 1
  while (l < r) {
    const sum = nums[l] + nums[r]
    if (sum === target) {
      steps.push({ cells: nums, markers: { L: l, R: r }, caption: `${nums[l]} + ${nums[r]} = ${target} — found it!`, done: true })
      return steps
    }
    steps.push({
      cells: nums,
      markers: { L: l, R: r },
      caption: sum < target
        ? `${nums[l]} + ${nums[r]} = ${sum} < ${target}: need a bigger sum, move L right`
        : `${nums[l]} + ${nums[r]} = ${sum} > ${target}: need a smaller sum, move R left`,
    })
    if (sum < target) l++
    else r--
  }
  steps.push({ cells: nums, markers: {}, caption: `Pointers met — no pair sums to ${target}.`, done: true })
  return steps
}

export function slidingWindowSteps(s: string): VisStep[] {
  const cells = [...s]
  const steps: VisStep[] = []
  const lastSeen = new Map<string, number>()
  let left = 0
  let best = 0
  for (let right = 0; right < cells.length; right++) {
    const ch = cells[right]
    const seen = lastSeen.get(ch)
    if (seen !== undefined && seen >= left) {
      steps.push({ cells, markers: { L: left, R: right }, highlight: [left, right], caption: `'${ch}' is already in the window — move L to ${seen + 1}` })
      left = seen + 1
    }
    lastSeen.set(ch, right)
    best = Math.max(best, right - left + 1)
    steps.push({
      cells,
      markers: { L: left, R: right },
      highlight: [left, right],
      caption: `Window "${cells.slice(left, right + 1).join('')}" has no repeats (length ${right - left + 1}, best ${best})`,
    })
  }
  steps.push({ cells, markers: {}, caption: `Longest window without repeats: ${best}`, done: true })
  return steps
}

export function binarySearchSteps(nums: number[], target: number): VisStep[] {
  const steps: VisStep[] = []
  let lo = 0
  let hi = nums.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const markers = { lo, mid, hi }
    if (nums[mid] === target) {
      steps.push({ cells: nums, markers, highlight: [lo, hi], caption: `nums[${mid}] = ${target} — found it!`, done: true })
      return steps
    }
    const goRight = nums[mid] < target
    steps.push({
      cells: nums,
      markers,
      highlight: [lo, hi],
      caption: goRight
        ? `nums[${mid}] = ${nums[mid]} < ${target}: the answer is to the right, lo = ${mid + 1}`
        : `nums[${mid}] = ${nums[mid]} > ${target}: the answer is to the left, hi = ${mid - 1}`,
    })
    if (goRight) lo = mid + 1
    else hi = mid - 1
  }
  steps.push({ cells: nums, markers: {}, caption: `The range is empty — ${target} is not in the array.`, done: true })
  return steps
}
