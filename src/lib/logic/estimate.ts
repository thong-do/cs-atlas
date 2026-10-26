import type { EstimateStep, EstimateUnit } from '@/lib/types'

export const DEFAULT_TOLERANCE = 2

/** Picker options per unit, smallest first. Byte prefixes are decimal (KB = 10³), matching the estimation lesson. */
export const UNIT_PREFIXES: Record<EstimateUnit, { label: string; scale: number }[]> = {
  bytes: [{ label: 'B', scale: 1 }, { label: 'KB', scale: 1e3 }, { label: 'MB', scale: 1e6 }, { label: 'GB', scale: 1e9 }, { label: 'TB', scale: 1e12 }, { label: 'PB', scale: 1e15 }],
  'bytes/s': [{ label: 'B/s', scale: 1 }, { label: 'KB/s', scale: 1e3 }, { label: 'MB/s', scale: 1e6 }, { label: 'GB/s', scale: 1e9 }],
  'bits/s': [{ label: 'bit/s', scale: 1 }, { label: 'Kbit/s', scale: 1e3 }, { label: 'Mbit/s', scale: 1e6 }, { label: 'Gbit/s', scale: 1e9 }, { label: 'Tbit/s', scale: 1e12 }],
  'requests/s': [{ label: '/s', scale: 1 }, { label: 'K/s', scale: 1e3 }, { label: 'M/s', scale: 1e6 }],
  count: [{ label: '×1', scale: 1 }, { label: 'thousand', scale: 1e3 }, { label: 'million', scale: 1e6 }, { label: 'billion', scale: 1e9 }],
  seconds: [{ label: 'ms', scale: 1e-3 }, { label: 's', scale: 1 }, { label: 'min', scale: 60 }, { label: 'h', scale: 3600 }, { label: 'day', scale: 86400 }],
}
export const ESTIMATE_UNITS = Object.keys(UNIT_PREFIXES) as EstimateUnit[]

const PLAIN = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i
const GROUPED = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/

/** A typed amount, or null if it isn't a plain, comma-grouped or scientific number. Commas only group thousands. */
export function parseAmount(text: string): number | null {
  const t = text.trim()
  if (t.includes(',') ? !GROUPED.test(t) : !PLAIN.test(t)) return null
  const n = Number(t.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/** True when value is within ×tolerance of answer in either direction; the edge counts. */
export function withinTolerance(value: number, answer: number, tolerance: number): boolean {
  if (!(value > 0) || !(answer > 0)) return false
  return Math.max(value / answer, answer / value) <= tolerance * (1 + 1e-9)
}

export function stepCorrect(step: Pick<EstimateStep, 'answer' | 'tolerance'>, value: number): boolean {
  return withinTolerance(value, step.answer, step.tolerance ?? DEFAULT_TOLERANCE)
}

export function scoreEstimate(steps: Pick<EstimateStep, 'answer' | 'tolerance'>[], values: number[]): { correct: number; total: number } {
  return { correct: steps.filter((s, i) => stepCorrect(s, values[i])).length, total: steps.length }
}

const FORMAT = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 })

/** A base-unit amount with the largest prefix that keeps it at least 1, e.g. 7.3e12 bytes → "7.3 TB". */
export function formatAmount(base: number, unit: EstimateUnit): string {
  const prefixes = UNIT_PREFIXES[unit]
  const p = [...prefixes].reverse().find((x) => base / x.scale >= 1) ?? prefixes[0]
  const n = FORMAT.format(base / p.scale)
  return p.label === '×1' ? n : `${n} ${p.label}`
}
