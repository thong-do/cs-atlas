import { describe, expect, it } from 'vitest'
import { houseRobberSteps, lcsTableSteps } from './table-steps'

function lcsTable(a: string, b: string): number[][] {
  const t = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0))
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) t[i][j] = a[i - 1] === b[j - 1] ? t[i - 1][j - 1] + 1 : Math.max(t[i - 1][j], t[i][j - 1])
  return t
}

describe('lcsTableSteps', () => {
  const steps = lcsTableSteps('ace', 'abcde')
  const expected = lcsTable('ace', 'abcde')

  it('has headers and a first step with the base row and column zero-filled', () => {
    expect(steps[0].rowLabels).toEqual(['', 'a', 'c', 'e'])
    expect(steps[0].colLabels).toEqual(['', 'a', 'b', 'c', 'd', 'e'])
    expect(steps[0].values[0]).toEqual([0, 0, 0, 0, 0, 0])
    expect(steps[0].values.map((r) => r[0])).toEqual([0, 0, 0, 0])
    expect(steps[0].values[1][1]).toBeNull()
  })

  it('fills every cell with the standard DP value', () => {
    for (const s of steps) {
      s.values.forEach((row, i) => row.forEach((v, j) => { if (v !== null) expect(v).toBe(expected[i][j]) }))
    }
  })

  it('has one fill step per inner cell and ends with the LCS length', () => {
    const fills = steps.filter((s) => s.current && !s.done)
    expect(fills).toHaveLength(15)
    const last = steps.at(-1)!
    expect(last).toMatchObject({ done: true, caption: 'LCS length = 3' })
    expect(last.values).toEqual(expected)
    expect(last.current).toEqual([3, 5])
  })

  it('uses the diagonal on a match', () => {
    const s = steps.find((x) => x.current?.[0] === 2 && x.current?.[1] === 3)!
    expect(s.deps).toEqual([[1, 2]])
    expect(s.caption).toBe("a[i-1] = 'c' matches b[j-1]: 1 + diagonal = 2")
  })

  it('uses up and left on a mismatch', () => {
    const s = steps.find((x) => x.current?.[0] === 1 && x.current?.[1] === 2)!
    expect(s.deps).toEqual([[0, 2], [1, 1]])
    expect(s.caption).toBe("'a' ≠ 'b': max(up 0, left 1) = 1")
  })

  it('does not throw on empty inputs', () => {
    expect(lcsTableSteps('', '').at(-1)).toMatchObject({ done: true, caption: 'LCS length = 0' })
    expect(lcsTableSteps('ab', '').at(-1)!.caption).toBe('LCS length = 0')
    expect(lcsTableSteps('', 'ab').at(-1)!.caption).toBe('LCS length = 0')
  })
})

describe('houseRobberSteps', () => {
  const steps = houseRobberSteps([2, 7, 9, 3, 1])

  it('has the nums and best rows', () => {
    expect(steps[0].rowLabels).toEqual(['nums', 'best'])
    expect(steps[0].values[0]).toEqual([2, 7, 9, 3, 1])
  })

  it('computes best = [2, 7, 11, 11, 12] and ends with the total', () => {
    const last = steps.at(-1)!
    expect(last.values[1]).toEqual([2, 7, 11, 11, 12])
    expect(last).toMatchObject({ done: true, caption: 'Best total = 12', current: [1, 4] })
  })

  it('explains each choice and marks the two dependencies', () => {
    const s = steps.find((x) => x.current?.[1] === 2)!
    expect(s.caption).toBe('max(skip: 7, rob: 2 + 9) = 11')
    expect(s.deps).toEqual([[1, 1], [1, 0], [0, 2]])
  })

  it('does not throw on empty input', () => {
    expect(houseRobberSteps([]).at(-1)).toMatchObject({ done: true, caption: 'Best total = 0' })
  })
})
