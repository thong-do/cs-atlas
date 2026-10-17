import { describe, expect, it } from 'vitest'
import { pageTableSteps } from './pt-steps'

const T0 = [
  { page: 0, frame: 5, present: true },
  { page: 1, frame: 2, present: true },
  { page: 2, frame: null, present: false },
  { page: 3, frame: 7, present: true },
]
const T2 = T0.map((r) => (r.page === 2 ? { page: 2, frame: 3, present: true } : r))
const A = [{ page: 0, frame: 5 }]
const B = [{ page: 0, frame: 5 }, { page: 1, frame: 2 }]
const C = [{ page: 1, frame: 2 }, { page: 2, frame: 3 }]

// va, page, offset, tlb, table, pa, hits, misses, faults, focus
const EXPECTED = [
  [null, null, null, A, T0, null, 0, 0, 0, null],
  [291, 0, 291, A, T0, null, 0, 0, 0, null],
  [291, 0, 291, A, T0, 20771, 1, 0, 0, 'tlb'],
  [4100, 1, 4, A, T0, null, 1, 0, 0, null],
  [4100, 1, 4, A, T0, null, 1, 1, 0, 'table'],
  [4100, 1, 4, B, T0, 8196, 1, 1, 0, 'table'],
  [8200, 2, 8, B, T0, null, 1, 1, 0, null],
  [8200, 2, 8, B, T0, null, 1, 2, 0, 'table'],
  [8200, 2, 8, B, T0, null, 1, 2, 1, 'disk'],
  [8200, 2, 8, B, T2, null, 1, 2, 1, 'disk'],
  [8200, 2, 8, C, T2, 12296, 1, 2, 1, 'tlb'],
  [8200, 2, 8, C, T2, 12296, 1, 2, 1, null],
] as const

const CAPTIONS = [
  'Pages were 4,096 bytes, and the TLB already cached page 0 → frame 5',
  'Address 291 split into page 0, offset 291',
  'TLB hit: page 0 was in frame 5, so the physical address was 5 × 4,096 + 291 = 20,771',
  'Address 4,100 split into page 1, offset 4',
  'TLB miss: page 1 was not cached, so the page table was walked',
  'The page table mapped page 1 to frame 2; the TLB cached it and the address became 2 × 4,096 + 4 = 8,196',
  'Address 8,200 split into page 2, offset 8',
  'TLB miss: page 2 was not cached, so the page table was walked',
  'Page fault: page 2 was not in memory, so the OS took over',
  'The OS read page 2 from disk into free frame 3 and updated the page table',
  'The access was retried: the TLB cached page 2, evicting page 0, and the address became 3 × 4,096 + 8 = 12,296',
  'Done: 1 TLB hit, 2 misses and 1 page fault — the fault needed a disk read, far slower than any memory access',
]

describe('pageTableSteps', () => {
  const steps = pageTableSteps()

  it('has 12 steps with one done step', () => {
    expect(steps).toHaveLength(12)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
    expect(steps[11].done).toBe(true)
  })

  it('pins state at every step', () => {
    expect(steps.map((s) => [s.va, s.page, s.offset, s.tlb, s.table, s.pa, s.hits, s.misses, s.faults, s.focus])).toEqual(EXPECTED.map((e) => [...e]))
  })

  it('writes the captions', () => {
    expect(steps.map((s) => s.caption)).toEqual(CAPTIONS)
  })

  it('returns independent snapshots', () => {
    expect(steps[0].tlb).toEqual(A)
    expect(steps[0].table).toEqual(T0)
  })
})
