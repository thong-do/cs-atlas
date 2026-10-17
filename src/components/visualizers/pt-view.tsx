import { PAGE_SIZE, TLB_CAPACITY, type PtStep } from '@/lib/visualizers/pt-steps'
import { cn } from '@/lib/utils'

const ROWS = 4
const box = (active: boolean) => cn('min-w-0 space-y-1 rounded-md border-2 p-2 text-xs', active && 'border-primary bg-primary/10 ring-2 ring-primary')
const n = (x: number) => x.toLocaleString('en-US')

export function PtView({ step }: { step: PtStep }) {
  const { va, page, offset, tlb, table, disk, pa, hits, misses, faults, focus } = step
  const split = va === null ? 'no address yet' : `address ${n(va)} = page ${page}, offset ${offset}`
  const summary = [
    `Virtual memory, page size ${n(PAGE_SIZE)} bytes: ${split}`,
    `TLB ${tlb.length ? tlb.map((e) => `page ${e.page} to frame ${e.frame}`).join(', ') : 'empty'}`,
    `page table ${table.map((r) => `page ${r.page} ${r.present ? `frame ${r.frame}` : 'on disk'}`).join(', ')}`,
    `disk ${disk.map((d) => `page ${d.page} ${d.loadedInto === null ? 'swapped out' : `read into frame ${d.loadedInto}`}`).join(', ')}`,
    `physical address ${pa === null ? 'not yet known' : n(pa)}`,
    `${hits} hits, ${misses} misses, ${faults} faults`,
    focus ? `focus ${focus}` : 'no focus',
  ].join('; ')
  return (
    <div className="space-y-3" role="img" aria-label={summary}>
      <p className="rounded-md border px-2 py-1 font-mono text-xs tabular-nums">
        {va === null ? 'virtual address: —' : `${n(va)} = page ${page} | offset ${offset}`}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className={box(focus === 'tlb')}>
          <p className="font-semibold">TLB (LRU)</p>
          {Array.from({ length: TLB_CAPACITY }, (_, i) => {
            const e = tlb[i]
            return (
              <p key={i} className={cn('truncate rounded border px-1 py-0.5 font-mono tabular-nums', !e && 'border-dashed text-muted-foreground')}>
                {e ? `p${e.page} → frame ${e.frame}` : '—'}
              </p>
            )
          })}
        </div>
        <div className={box(focus === 'disk')}>
          <p className="font-semibold">Disk</p>
          {Array.from({ length: TLB_CAPACITY }, (_, i) => {
            const r = disk[i]
            return (
              <p key={i} className={cn('truncate rounded border px-1 py-0.5 font-mono tabular-nums', !r && 'border-dashed text-muted-foreground')}>
                {r ? (r.loadedInto === null ? `p${r.page} · swapped out` : `p${r.page} → frame ${r.loadedInto}`) : '—'}
              </p>
            )
          })}
        </div>
      </div>
      <div className={box(focus === 'table')}>
        <p className="font-semibold">Page table</p>
        {Array.from({ length: ROWS }, (_, i) => {
          const r = table[i]
          return (
            <p key={i} className="flex items-center justify-between gap-2 rounded border px-1 py-0.5 font-mono tabular-nums">
              <span className="truncate">page {r.page} → {r.present ? `frame ${r.frame}` : 'on disk'}</span>
              <span className={cn('shrink-0 rounded px-1 font-sans font-semibold text-white', r.present ? 'bg-[#047857]' : 'bg-[#475569]')}>
                {r.present ? 'present' : 'absent'}
              </span>
            </p>
          )
        })}
      </div>
      <p className="font-mono text-xs tabular-nums">physical address = {pa === null ? '—' : n(pa)}</p>
      <p className="text-xs font-semibold tabular-nums">Hits {hits} · Misses {misses} · Faults {faults}</p>
    </div>
  )
}
