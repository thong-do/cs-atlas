export type HeapOp = { push: number } | 'pop'

export interface HeapStep {
  heap: number[]
  active?: number[]
  popped?: number[]
  caption: string
  done?: boolean
}

export function heapSteps(ops: HeapOp[]): HeapStep[] {
  const steps: HeapStep[] = []
  const heap: number[] = []
  const popped: number[] = []
  const add = (caption: string, active?: number[]) =>
    steps.push({ heap: [...heap], active, popped: [...popped], caption })

  for (const op of ops) {
    if (op === 'pop') {
      if (heap.length === 0) {
        add('The heap is empty — there is nothing to pop.')
        continue
      }
      const root = heap[0]
      const last = heap.pop()!
      popped.push(root)
      if (heap.length === 0) {
        add(`Pop ${root}: it was the only element, so the heap is now empty`)
        add('Heap property restored')
        continue
      }
      heap[0] = last
      add(`Pop ${root}: move the last element ${last} to the root`, [0])
      let k = 0
      for (;;) {
        const l = 2 * k + 1
        const r = l + 1
        if (l >= heap.length) break
        const c = r < heap.length && heap[r] < heap[l] ? r : l
        if (heap[c] < heap[k]) {
          const [a, b] = [heap[k], heap[c]]
          ;[heap[k], heap[c]] = [b, a]
          add(`${a} > ${b} (its smaller child): swap down`, [k, c])
          k = c
        } else {
          add(`${heap[k]} ≤ ${heap[c]} (its smaller child): stop`, [k, c])
          break
        }
      }
      add('Heap property restored')
    } else {
      const v = op.push
      heap.push(v)
      let k = heap.length - 1
      add(`Push ${v}: add it at the end (index ${k})`, [k])
      while (k > 0) {
        const p = (k - 1) >> 1
        if (heap[k] < heap[p]) {
          const [a, b] = [heap[k], heap[p]]
          ;[heap[k], heap[p]] = [b, a]
          add(`${a} < ${b} (its parent): swap up`, [p, k])
          k = p
        } else {
          add(`${heap[k]} ≥ ${heap[p]} (its parent): stop`, [k, p])
          break
        }
      }
      add('Heap property restored')
    }
  }
  if (steps.length > 0) steps[steps.length - 1].done = true
  return steps
}
