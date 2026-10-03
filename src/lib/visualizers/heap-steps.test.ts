import { describe, expect, it } from 'vitest'
import { heapSteps, type HeapOp } from './heap-steps'

const isMinHeap = (h: number[]) => h.every((v, i) => i === 0 || h[(i - 1) >> 1] <= v)
const ops: HeapOp[] = [{ push: 5 }, { push: 3 }, { push: 8 }, { push: 1 }, { push: 4 }, 'pop', 'pop']

describe('heapSteps', () => {
  const steps = heapSteps(ops)

  it('satisfies the min-heap invariant whenever the property is restored', () => {
    const restored = steps.filter((s) => s.caption.includes('Heap property restored'))
    expect(restored).toHaveLength(ops.length)
    for (const s of restored) expect(isMinHeap(s.heap)).toBe(true)
  })

  it('pops the smallest values in sorted order and leaves the right heap', () => {
    const last = steps.at(-1)!
    expect(last.done).toBe(true)
    expect(last.popped).toEqual([1, 3])
    expect([...last.heap].sort((a, b) => a - b)).toEqual([4, 5, 8])
    expect(isMinHeap(last.heap)).toBe(true)
  })

  it('explains sift-up comparisons and highlights the compared nodes', () => {
    const swap = steps.find((s) => s.caption === 'Swapped up: 3 was smaller than its parent 5')
    expect(swap).toBeDefined()
    expect(swap!.heap).toEqual([3, 5])
    expect(swap!.active).toEqual([0, 1])
  })

  it('appends at the end first', () => {
    expect(steps[0]).toMatchObject({ heap: [5], active: [0] })
    expect(steps[0].caption).toContain('end')
  })

  it('moves the last element to the root on pop, then sifts down', () => {
    const idx = steps.findIndex((s) => s.caption.startsWith('Pop'))
    expect(idx).toBeGreaterThan(0)
    expect(steps[idx].heap[0]).toBe(steps[idx - 1].heap.at(-1))
    expect(steps.some((s) => s.caption.startsWith('Swapped down: '))).toBe(true)
  })

  it('pop on an empty heap yields one explanatory step without throwing', () => {
    const s = heapSteps(['pop'])
    expect(s).toHaveLength(1)
    expect(s[0]).toMatchObject({ heap: [], done: true })
    expect(s[0].caption).toContain('empty')
  })

  it('sifts down through the right child when it is the smaller one', () => {
    const s = heapSteps([{ push: 1 }, { push: 9 }, { push: 2 }, { push: 10 }, { push: 11 }, { push: 3 }, 'pop'])
    const first = s.find((x) => x.caption.startsWith('Swapped down'))!
    expect(first.active).toEqual([0, 2])
    expect(first.caption).toBe('Swapped down: 3 was larger than its smaller child 2')
    expect(first.heap[0]).toBe(2)
  })

  it('ends with a unique summary step', () => {
    const last = steps.at(-1)!
    expect(last.caption).toBe('Done: popped 1, 3 — heap is [4, 5, 8]')
    expect(steps.filter((s) => s.caption === last.caption)).toHaveLength(1)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
  })

  it('handles no operations', () => {
    expect(heapSteps([])).toEqual([])
  })

  it('does not share heap arrays between steps', () => {
    expect(steps[0].heap).not.toBe(steps[1].heap)
  })
})
