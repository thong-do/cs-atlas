export type DnsNodeId = 'browser' | 'os' | 'resolver' | 'root' | 'tld' | 'auth'

export const DNS_NODES: { id: DnsNodeId; label: string }[] = [
  { id: 'browser', label: 'Browser cache' },
  { id: 'os', label: 'OS cache' },
  { id: 'resolver', label: 'Recursive resolver' },
  { id: 'root', label: 'Root server' },
  { id: 'tld', label: '.com TLD server' },
  { id: 'auth', label: 'example.com authoritative server' },
]

export interface DnsStep {
  lookup: 1 | 2
  active: DnsNodeId | null
  elapsedMs: number
  resolverCache: string[]
  caption: string
  done?: boolean
}

const NAME = 'www.example.com'
const IP = '192.0.2.10'
const TTL = 300
const CLIENT_MS = 5
const ROOT_MS = 20
const TLD_MS = 20
const AUTH_MS = 30

export function dnsResolutionSteps(): DnsStep[] {
  const entry = `${NAME} → ${IP} (TTL ${TTL} s)`
  const rootAt = CLIENT_MS + ROOT_MS
  const tldAt = rootAt + TLD_MS
  const total = tldAt + AUTH_MS
  return [
    { lookup: 1, active: null, elapsedMs: 0, resolverCache: [], caption: `Lookup 1: the browser needed the IP address of ${NAME}` },
    { lookup: 1, active: 'browser', elapsedMs: 0, resolverCache: [], caption: 'Browser cache: miss' },
    { lookup: 1, active: 'os', elapsedMs: 0, resolverCache: [], caption: 'Operating-system cache: miss' },
    { lookup: 1, active: 'resolver', elapsedMs: CLIENT_MS, resolverCache: [], caption: `Asked the recursive resolver (${CLIENT_MS} ms): it had no cached answer` },
    { lookup: 1, active: 'root', elapsedMs: rootAt, resolverCache: [], caption: `Root server (${ROOT_MS} ms) replied: ask the .com servers` },
    { lookup: 1, active: 'tld', elapsedMs: tldAt, resolverCache: [], caption: `.com TLD server (${TLD_MS} ms) replied: ask example.com's name servers` },
    { lookup: 1, active: 'auth', elapsedMs: total, resolverCache: [entry], caption: `Authoritative server (${AUTH_MS} ms) replied: ${IP}, cache it for ${TTL} s` },
    { lookup: 2, active: null, elapsedMs: 0, resolverCache: [entry], caption: `Lookup 2: another device on the same network asked for ${NAME}` },
    { lookup: 2, active: 'resolver', elapsedMs: CLIENT_MS, resolverCache: [entry], caption: `The resolver answered from its cache in ${CLIENT_MS} ms — no other servers involved` },
    { lookup: 2, active: null, elapsedMs: CLIENT_MS, resolverCache: [entry], done: true, caption: `Done: the first lookup took ${total} ms, the cached one ${CLIENT_MS} ms` },
  ]
}
