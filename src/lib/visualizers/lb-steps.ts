export type LbServer = 'A' | 'B' | 'C'
export type LbPolicy = 'round-robin' | 'least-connections'

export const LB_SERVERS: LbServer[] = ['A', 'B', 'C']
export const LB_DURATIONS = [4, 1, 1, 4, 1, 1, 4, 1]
export const LB_REQUESTS = LB_DURATIONS.map((_, i) => `r${i + 1}`)

export interface LbStep {
  policy: LbPolicy
  t: number | null
  request: string | null
  server: LbServer | null
  /** Requests on each server just after this step's assignment. */
  active: Record<LbServer, string[]>
  /** Running maximum of active requests per server within the phase. */
  peak: Record<LbServer, number>
  caption: string
  done?: boolean
}

const empty = (): Record<LbServer, string[]> => ({ A: [], B: [], C: [] })
const zero = (): Record<LbServer, number> => ({ A: 0, B: 0, C: 0 })
const maxOf = (p: Record<LbServer, number>) => Math.max(p.A, p.B, p.C)

function phase(policy: LbPolicy, intro: string, summary: (peak: number) => string): LbStep[] {
  const peak = zero()
  const steps: LbStep[] = [{ policy, t: null, request: null, server: null, active: empty(), peak: { ...peak }, caption: intro }]
  const assigned: { server: LbServer; end: number; name: string }[] = []

  LB_DURATIONS.forEach((d, t) => {
    const name = LB_REQUESTS[t]
    const live = (s: LbServer) => assigned.filter((a) => a.server === s && a.end > t)
    const server =
      policy === 'round-robin'
        ? LB_SERVERS[t % LB_SERVERS.length]
        : LB_SERVERS.reduce((best, s) => (live(s).length < live(best).length ? s : best))
    assigned.push({ server, end: t + d, name })
    const active = empty()
    for (const s of LB_SERVERS) active[s] = live(s).map((a) => a.name)
    for (const s of LB_SERVERS) peak[s] = Math.max(peak[s], active[s].length)
    steps.push({
      policy, t, request: name, server, active, peak: { ...peak },
      caption: `t=${t}: ${name} (${d} s) went to ${server} — ${server} now has ${active[server].length} active`,
    })
  })

  steps.push({ policy, t: null, request: null, server: null, active: empty(), peak: { ...peak }, caption: summary(maxOf(peak)) })
  return steps
}

export function loadBalancerSteps(): LbStep[] {
  const rr = phase('round-robin', 'Round-robin: each new request went to the next server in turn', (n) => `Round-robin: the busiest server peaked at ${n} active requests`)
  const lc = phase(
    'least-connections',
    'Least-connections: each new request went to the server with the fewest active requests',
    (n) => `Least-connections: no server ever had more than ${n} active request${n === 1 ? '' : 's'}`,
  )
  const peakRr = maxOf(rr.at(-1)!.peak)
  const peakLc = maxOf(lc.at(-1)!.peak)
  return [
    ...rr,
    ...lc,
    { policy: 'least-connections', t: null, request: null, server: null, active: empty(), peak: { ...lc.at(-1)!.peak }, done: true, caption: `Done: peak load ${peakRr} with round-robin vs ${peakLc} with least-connections` },
  ]
}
