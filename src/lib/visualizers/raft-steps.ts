export type NodeId = 'S1' | 'S2' | 'S3'
export type Role = 'follower' | 'candidate' | 'leader' | 'down'

export interface RaftNode {
  id: NodeId
  role: Role
  term: number
  votedFor: NodeId | null
  log: { term: number; cmd: string }[]
  commitIndex: number
}
export interface RaftMsg {
  from: NodeId
  to: NodeId
  kind: 'RequestVote' | 'Vote' | 'AppendEntries' | 'Ack'
}
export interface RaftStep {
  nodes: RaftNode[]
  messages: RaftMsg[]
  focus: NodeId | null
  caption: string
  done?: boolean
}

export const RAFT_IDS: NodeId[] = ['S1', 'S2', 'S3']

const majority = (n: number) => Math.floor(n / 2) + 1
const list = (ids: string[]) => (ids.length <= 2 ? ids.join(' and ') : `${ids.slice(0, -1).join(', ')} and ${ids.at(-1)}`)

export function raftSteps(): RaftStep[] {
  const nodes: RaftNode[] = RAFT_IDS.map((id) => ({ id, role: 'follower', term: 1, votedFor: null, log: [], commitIndex: 0 }))
  const get = (id: NodeId) => nodes.find((n) => n.id === id)!
  const total = nodes.length
  const need = majority(total)
  const steps: RaftStep[] = []
  const push = (focus: NodeId | null, messages: RaftMsg[], caption: string, done?: boolean) => {
    steps.push({ nodes: structuredClone(nodes), messages, focus, caption, ...(done ? { done: true } : {}) })
  }
  const msg = (from: NodeId, to: NodeId, kind: RaftMsg['kind']): RaftMsg => ({ from, to, kind })

  const candidate: NodeId = 'S2'
  const others = RAFT_IDS.filter((id) => id !== candidate)
  const crashed: NodeId = 'S3'
  const live = others.find((id) => id !== crashed)!
  const startTerm = get(candidate).term

  push(null, [], `Three followers in term ${startTerm} waited to hear from a leader`)

  // Election
  const c = get(candidate)
  c.role = 'candidate'
  c.term = startTerm + 1
  c.votedFor = candidate
  const term = c.term
  push(candidate, [], `${candidate}'s election timeout fired first: it became a candidate for term ${term} and voted for itself`)

  push(candidate, others.map((o) => msg(candidate, o, 'RequestVote')), `${candidate} asked ${list(others)} for their votes in term ${term}`)

  for (const o of others) {
    const n = get(o)
    n.term = term
    n.votedFor = candidate
  }
  const votes = nodes.filter((n) => n.votedFor === candidate).length
  push(candidate, others.map((o) => msg(o, candidate, 'Vote')), `${list(others)} moved to term ${term} and voted for ${candidate} — ${votes} of ${total} votes, and a majority needs ${need}`)

  if (votes < need) throw new Error(`${candidate} has ${votes} of ${total} votes but needs ${need}`)
  c.role = 'leader'
  push(candidate, [], `${candidate} became the leader for term ${term}`)

  // Client write
  const entry = { term, cmd: 'x=1' }
  c.log = [{ ...entry }]
  push(candidate, [], `A client sent ${entry.cmd}; ${candidate} appended it at index ${c.log.length} in term ${term}, not yet committed`)

  // Crash
  get(crashed).role = 'down'
  push(crashed, [], `${crashed} crashed`)

  // Replicate
  const index = c.log.length
  push(candidate, others.map((o) => msg(candidate, o, 'AppendEntries')), `${candidate} sent index ${index} to ${list(others)}; ${crashed} did not answer`)

  get(live).log = c.log.map((e) => ({ ...e }))
  const stored = nodes.filter((n) => n.log.length >= index).length
  push(live, [msg(live, candidate, 'Ack')], `${live} stored index ${index} and acknowledged — ${stored} of ${total} nodes had it, a majority`)

  // Commit only on a majority
  if (stored < need) throw new Error(`index ${index} is on ${stored} of ${total} nodes but needs ${need}`)
  c.commitIndex = index
  push(candidate, [], `${candidate} committed index ${index} and applied ${entry.cmd}; the client got its reply`)

  get(live).commitIndex = index
  push(live, [msg(candidate, live, 'AppendEntries')], `The next heartbeat told ${live} that index ${index} was committed`)

  // Recovery
  const r = get(crashed)
  r.role = 'follower'
  r.log = c.log.map((e) => ({ ...e }))
  r.commitIndex = index
  push(crashed, [msg(candidate, crashed, 'AppendEntries'), msg(crashed, candidate, 'Ack')], `${crashed} restarted, received the leader's entries and caught up: it stored and committed index ${index}`)

  push(null, [], `Done: ${candidate} won term ${term} with a majority, and ${entry.cmd} committed on ${stored} of ${total} nodes while ${crashed} was down`, true)
  return steps
}
