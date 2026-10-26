import { describe, expect, it } from 'vitest'
import { formatAmount, parseAmount, scoreEstimate, stepCorrect, UNIT_PREFIXES, withinTolerance } from './estimate'

describe('parseAmount', () => {
  it('reads plain, decimal, grouped and scientific numbers', () => {
    expect(parseAmount('7.5')).toBe(7.5)
    expect(parseAmount(' 230 ')).toBe(230)
    expect(parseAmount('7,500')).toBe(7500)
    expect(parseAmount('1,234,567.5')).toBe(1234567.5)
    expect(parseAmount('1e4')).toBe(10000)
    expect(parseAmount('2.5E-3')).toBe(0.0025)
    expect(parseAmount('.5')).toBe(0.5)
  })
  it('rejects empty, non-numeric, badly grouped and non-finite input', () => {
    for (const t of ['', '  ', 'abc', '7,5', '12,34', '1,2345', '7.5.1', '1e', 'Infinity', 'NaN', '1e400', '5 TB']) {
      expect(parseAmount(t), t).toBeNull()
    }
  })
  it('keeps zero and negatives so the UI can explain them', () => {
    expect(parseAmount('0')).toBe(0)
    expect(parseAmount('-3')).toBe(-3)
  })
})

describe('withinTolerance', () => {
  it('accepts values within ×tolerance either way, including the edge', () => {
    expect(withinTolerance(20, 10, 2)).toBe(true)
    expect(withinTolerance(5, 10, 2)).toBe(true)
    expect(withinTolerance(0.2 * 1e12, 1e11, 2)).toBe(true) // 0.2 TB vs 100 GB, through a scale
    expect(withinTolerance(3 * 0.1 * 1e9, 0.15e9, 2)).toBe(true) // float noise at the edge
  })
  it('rejects values just outside the band and non-positive values', () => {
    expect(withinTolerance(20.1, 10, 2)).toBe(false)
    expect(withinTolerance(4.9, 10, 2)).toBe(false)
    expect(withinTolerance(0, 10, 2)).toBe(false)
    expect(withinTolerance(-10, 10, 2)).toBe(false)
  })
})

describe('stepCorrect and scoreEstimate', () => {
  it('uses the default tolerance of 2 unless the step sets one', () => {
    expect(stepCorrect({ answer: 100 }, 199)).toBe(true)
    expect(stepCorrect({ answer: 100 }, 201)).toBe(false)
    expect(stepCorrect({ answer: 100, tolerance: 3 }, 290)).toBe(true)
  })
  it('counts correct steps', () => {
    expect(scoreEstimate([{ answer: 10 }, { answer: 100 }, { answer: 1000, tolerance: 1.5 }], [12, 500, 1400])).toEqual({ correct: 2, total: 3 })
  })
})

describe('formatAmount', () => {
  it('picks the largest prefix that keeps the number at least 1, with 3 significant figures', () => {
    expect(formatAmount(7.3e12, 'bytes')).toBe('7.3 TB')
    expect(formatAmount(1e13, 'bytes')).toBe('10 TB')
    expect(formatAmount(2.1949e13, 'bytes')).toBe('21.9 TB')
    expect(formatAmount(230, 'requests/s')).toBe('230 /s')
    expect(formatAmount(4.2e9, 'bits/s')).toBe('4.2 Gbit/s')
    expect(formatAmount(86400, 'seconds')).toBe('1 day')
    expect(formatAmount(5e6, 'count')).toBe('5 million')
    expect(formatAmount(750, 'count')).toBe('750')
    expect(formatAmount(2.5e18, 'bytes')).toBe('2,500 PB')
    expect(formatAmount(0.5, 'bytes')).toBe('0.5 B')
  })
  it('lists picker prefixes in ascending order for every unit', () => {
    for (const [unit, list] of Object.entries(UNIT_PREFIXES)) {
      expect(list.map((p) => p.scale), unit).toEqual([...list.map((p) => p.scale)].sort((a, b) => a - b))
    }
  })
})
