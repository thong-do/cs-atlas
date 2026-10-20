import { describe, expect, it } from 'vitest'
import { bTreeInsertSteps } from './btree-steps'

const L12 = [[[50]], [[20], [70]], [[10], [30, 40], [60], [80]]]

type Focus = { level: number; node: number } | null
// levels, inserting, focus, overflow, [splits, height], caption
const EXPECTED: [number[][][], number | null, Focus, boolean, number[], string][] = [
  [[[[]]], null, null, false, [0, 1], 'An empty order-3 B-tree: each node held at most 2 keys'],
  [[[[50]]], 50, { level: 0, node: 0 }, false, [0, 1], 'Inserted 50 into the empty root'],
  [[[[20, 50]]], 20, { level: 0, node: 0 }, false, [0, 1], 'Inserted 20; the root leaf held [20, 50]'],
  [[[[20, 50, 70]]], 70, { level: 0, node: 0 }, true, [0, 1], 'Inserted 70; the root leaf overflowed with [20, 50, 70]'],
  [[[[50]], [[20], [70]]], null, { level: 0, node: 0 }, false, [1, 2], 'The root split: 50 moved up into a new root above [20] and [70]'],
  [[[[50]], [[10, 20], [70]]], 10, { level: 1, node: 0 }, false, [1, 2], 'Inserted 10 into leaf [20], giving [10, 20]'],
  [[[[50]], [[10, 20, 30], [70]]], 30, { level: 1, node: 0 }, true, [1, 2], 'Inserted 30; leaf [10, 20, 30] overflowed'],
  [[[[20, 50]], [[10], [30], [70]]], null, { level: 0, node: 0 }, false, [2, 2], 'The leaf split into [10] and [30], and 20 moved up into the root'],
  [[[[20, 50]], [[10], [30], [60, 70]]], 60, { level: 1, node: 2 }, false, [2, 2], 'Inserted 60 into leaf [70], giving [60, 70]'],
  [[[[20, 50]], [[10], [30, 40], [60, 70]]], 40, { level: 1, node: 1 }, false, [2, 2], 'Inserted 40 into leaf [30], giving [30, 40]'],
  [[[[20, 50]], [[10], [30, 40], [60, 70, 80]]], 80, { level: 1, node: 2 }, true, [2, 2], 'Inserted 80; leaf [60, 70, 80] overflowed'],
  [[[[20, 50, 70]], [[10], [30, 40], [60], [80]]], null, { level: 0, node: 0 }, true, [3, 2], 'The leaf split into [60] and [80], and 70 moved up; the root overflowed with [20, 50, 70]'],
  [L12, null, { level: 0, node: 0 }, false, [4, 3], 'The root split: 50 moved up into a new root, and the tree grew to 3 levels'],
  [L12, null, null, false, [4, 3], 'Done: 8 keys and 4 splits; the tree grew taller only when the root split'],
]

const CC_LEAF1 = [[0]]
const CC_L2 = [[2], [0, 0]]
const CC_L2_3 = [[3], [0, 0, 0]]
const CC_L2_4 = [[4], [0, 0, 0, 0]]
const CC_L3 = [[2], [2, 2], [0, 0, 0, 0]]
const CHILD_COUNTS = [CC_LEAF1, CC_LEAF1, CC_LEAF1, CC_LEAF1, CC_L2, CC_L2, CC_L2, CC_L2_3, CC_L2_3, CC_L2_3, CC_L2_3, CC_L2_4, CC_L3, CC_L3]

describe('bTreeInsertSteps', () => {
  const steps = bTreeInsertSteps()

  it('has 14 steps with one done step', () => {
    expect(steps).toHaveLength(14)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
    expect(steps[13].done).toBe(true)
  })

  it('pins levels at every step', () => {
    expect(steps.map((s) => s.levels)).toEqual(EXPECTED.map((e) => e[0]))
  })

  it('pins childCounts (step 11 has a transient 4-child root)', () => {
    expect(steps.map((s) => s.childCounts)).toEqual(CHILD_COUNTS)
  })

  it('pins inserting, focus, overflow, splits and height', () => {
    expect(steps.map((s) => [s.inserting, s.focus, s.overflow, [s.splits, s.height]])).toEqual(EXPECTED.map((e) => [e[1], e[2], e[3], e[4]]))
  })

  it('writes the captions', () => {
    expect(steps.map((s) => s.caption)).toEqual(EXPECTED.map((e) => e[5]))
  })
})
