import { describe, expect, it } from 'vitest'
import { dnsResolutionSteps } from './dns-steps'

describe('dnsResolutionSteps', () => {
  const steps = dnsResolutionSteps()

  it('matches the hand-traced sequence', () => {
    expect(steps.map((s) => s.lookup)).toEqual([1, 1, 1, 1, 1, 1, 1, 2, 2, 2])
    expect(steps.map((s) => s.active ?? '-')).toEqual(['-', 'browser', 'os', 'resolver', 'root', 'tld', 'auth', '-', 'resolver', '-'])
    expect(steps.map((s) => s.elapsedMs)).toEqual([0, 0, 0, 5, 25, 45, 75, 0, 5, 5])
    expect(steps.map((s) => s.resolverCache.length)).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1])
  })

  it('caches the answer with its TTL', () => {
    expect(steps[6].resolverCache).toEqual(['www.example.com → 192.0.2.10 (TTL 300 s)'])
  })

  it('writes the captions', () => {
    expect(steps.map((s) => s.caption)).toEqual([
      'Lookup 1: the browser needed the IP address of www.example.com',
      'Browser cache: miss',
      'Operating-system cache: miss',
      'Asked the recursive resolver (5 ms): it had no cached answer',
      'Root server (20 ms) replied: ask the .com servers',
      ".com TLD server (20 ms) replied: ask example.com's name servers",
      'Authoritative server (30 ms) replied: 192.0.2.10, cache it for 300 s',
      'Lookup 2: another device on the same network asked for www.example.com',
      'The resolver answered from its cache in 5 ms — no other servers involved',
      'Done: the first lookup took 75 ms, the cached one 5 ms',
    ])
    expect(steps.filter((s) => s.done)).toHaveLength(1)
    expect(steps.at(-1)!.done).toBe(true)
  })
})
