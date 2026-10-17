export interface PtTlbEntry {
  page: number
  frame: number
}
export interface PtRow {
  page: number
  frame: number | null
  present: boolean
}
export interface PtStep {
  va: number | null
  page: number | null
  offset: number | null
  tlb: PtTlbEntry[] // most recently used last
  table: PtRow[]
  pa: number | null
  hits: number
  misses: number
  faults: number
  focus: 'tlb' | 'table' | 'disk' | null
  caption: string
  done?: boolean
}

export const PAGE_SIZE = 4096
export const TLB_CAPACITY = 2
const ADDRESSES = [291, 4100, 8200]

const n = (x: number) => x.toLocaleString('en-US')
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export function pageTableSteps(): PtStep[] {
  const steps: PtStep[] = []
  const table: PtRow[] = [
    { page: 0, frame: 5, present: true },
    { page: 1, frame: 2, present: true },
    { page: 2, frame: null, present: false },
    { page: 3, frame: 7, present: true },
  ]
  const freeFrames = [3]
  let tlb: PtTlbEntry[] = [{ page: 0, frame: 5 }]
  let va: number | null = null
  let page: number | null = null
  let offset: number | null = null
  let pa: number | null = null
  let hits = 0
  let misses = 0
  let faults = 0

  const push = (focus: PtStep['focus'], caption: string, done?: boolean) => {
    steps.push({ va, page, offset, tlb: structuredClone(tlb), table: structuredClone(table), pa, hits, misses, faults, focus, caption, ...(done ? { done: true } : {}) })
  }
  const translate = (frame: number) => frame * PAGE_SIZE + offset!
  const cache = (p: number, frame: number) => {
    const evicted = tlb.length >= TLB_CAPACITY ? tlb[0] : null // LRU is first (MRU last)
    if (evicted) tlb = tlb.slice(1)
    tlb = [...tlb, { page: p, frame }]
    return evicted
  }

  push(null, `Pages were ${n(PAGE_SIZE)} bytes, and the TLB already cached page 0 → frame 5`)

  for (const addr of ADDRESSES) {
    va = addr
    page = Math.floor(addr / PAGE_SIZE)
    offset = addr % PAGE_SIZE
    pa = null
    push(null, `Address ${n(addr)} split into page ${page}, offset ${offset}`)

    const hit = tlb.find((e) => e.page === page)
    if (hit) {
      hits++
      tlb = [...tlb.filter((e) => e.page !== page), hit]
      pa = translate(hit.frame)
      push('tlb', `TLB hit: page ${page} was in frame ${hit.frame}, so the physical address was ${hit.frame} × ${n(PAGE_SIZE)} + ${offset} = ${n(pa)}`)
      continue
    }

    misses++
    push('table', `TLB miss: page ${page} was not cached, so the page table was walked`)
    const row = table[page]
    if (row.present) {
      cache(page, row.frame!)
      pa = translate(row.frame!)
      push('table', `The page table mapped page ${page} to frame ${row.frame}; the TLB cached it and the address became ${row.frame} × ${n(PAGE_SIZE)} + ${offset} = ${n(pa)}`)
      continue
    }

    faults++
    push('disk', `Page fault: page ${page} was not in memory, so the OS took over`)
    const frame = freeFrames.shift()
    if (frame === undefined) throw new Error('no free frame to load the faulting page')
    row.frame = frame
    row.present = true
    push('disk', `The OS read page ${page} from disk into free frame ${frame} and updated the page table`)
    const evicted = cache(page, frame)
    pa = translate(frame)
    push('tlb', `The access was retried: the TLB cached page ${page}${evicted ? `, evicting page ${evicted.page}` : ''}, and the address became ${frame} × ${n(PAGE_SIZE)} + ${offset} = ${n(pa)}`)
  }

  push(null, `Done: ${plural(hits, 'TLB hit', 'TLB hits')}, ${plural(misses, 'miss', 'misses')} and ${plural(faults, 'page fault', 'page faults')} — the fault needed a disk read, far slower than any memory access`, true)
  return steps
}
