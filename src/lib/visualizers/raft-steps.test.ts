import { describe, expect, it } from 'vitest'
import { raftSteps, type NodeId, type RaftStep } from './raft-steps'

const node = (s: RaftStep, id: NodeId) => s.nodes.find((n) => n.id === id)!
const msgs = (s: RaftStep) => s.messages.map((m) => `${m.from}>${m.to}:${m.kind}`)
const X = { term: 2, cmd: 'x=1' }

describe('raftSteps', () => {
  const steps = raftSteps()

  it('has 13 steps with one done step', () => {
    expect(steps).toHaveLength(13)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
    expect(steps[12].done).toBe(true)
  })

  it('starts with three followers in term 1', () => {
    expect(steps[0].nodes.map((n) => [n.id, n.role, n.term, n.votedFor, n.log, n.commitIndex])).toEqual([
      ['S1', 'follower', 1, null, [], 0],
      ['S2', 'follower', 1, null, [], 0],
      ['S3', 'follower', 1, null, [], 0],
    ])
    expect(steps[0].messages).toEqual([])
    expect(steps[0].focus).toBeNull()
  })

  it('traces the election', () => {
    expect(node(steps[1], 'S2')).toMatchObject({ role: 'candidate', term: 2, votedFor: 'S2' })
    expect(node(steps[1], 'S1')).toMatchObject({ role: 'follower', term: 1, votedFor: null })
    expect(steps[1].focus).toBe('S2')
    expect(msgs(steps[2])).toEqual(['S2>S1:RequestVote', 'S2>S3:RequestVote'])
    for (const id of ['S1', 'S3'] as const) expect(node(steps[3], id)).toMatchObject({ role: 'follower', term: 2, votedFor: 'S2' })
    expect(msgs(steps[3])).toEqual(['S1>S2:Vote', 'S3>S2:Vote'])
    expect(node(steps[4], 'S2').role).toBe('leader')
    expect(steps[4].messages).toEqual([])
    expect(steps.slice(1, 5).map((s) => s.focus)).toEqual(['S2', 'S2', 'S2', 'S2'])
  })

  it('traces replication with S3 down', () => {
    expect(node(steps[5], 'S2').log).toEqual([X])
    expect(node(steps[5], 'S2').commitIndex).toBe(0)
    expect(node(steps[6], 'S3')).toMatchObject({ role: 'down', term: 2, votedFor: 'S2', log: [], commitIndex: 0 })
    expect(steps[6].focus).toBe('S3')
    expect(msgs(steps[7])).toEqual(['S2>S1:AppendEntries', 'S2>S3:AppendEntries'])
    expect(node(steps[8], 'S1').log).toEqual([X])
    expect(msgs(steps[8])).toEqual(['S1>S2:Ack'])
    expect(steps[8].focus).toBe('S1')
    expect(node(steps[9], 'S2').commitIndex).toBe(1)
    expect(node(steps[9], 'S1').commitIndex).toBe(0)
    expect(node(steps[10], 'S1').commitIndex).toBe(1)
    expect(msgs(steps[10])).toEqual(['S2>S1:AppendEntries'])
    expect(steps.slice(5, 11).map((s) => s.focus)).toEqual(['S2', 'S3', 'S2', 'S1', 'S2', 'S1'])
  })

  it('catches S3 up', () => {
    expect(node(steps[11], 'S3')).toMatchObject({ role: 'follower', term: 2, log: [X], commitIndex: 1 })
    expect(msgs(steps[11])).toEqual(['S2>S3:AppendEntries', 'S3>S2:Ack'])
    expect(steps[11].focus).toBe('S3')
    expect(steps[12].nodes).toEqual(steps[11].nodes)
    expect(steps[12].messages).toEqual([])
    expect(steps[12].focus).toBeNull()
  })

  it('writes the captions', () => {
    expect(steps.map((s) => s.caption)).toEqual([
      'Three followers in term 1 waited to hear from a leader',
      "S2's election timeout fired first: it became a candidate for term 2 and voted for itself",
      'S2 asked S1 and S3 for their votes in term 2',
      'S1 and S3 moved to term 2 and voted for S2 — 3 of 3 votes, and a majority needs 2',
      'S2 became the leader for term 2',
      'A client sent x=1; S2 appended it at index 1 in term 2, not yet committed',
      'S3 crashed',
      'S2 sent index 1 to S1 and S3; S3 did not answer',
      'S1 stored index 1 and acknowledged — 2 of 3 nodes had it, a majority',
      'S2 committed index 1 and applied x=1; the client got its reply',
      'The next heartbeat told S1 that index 1 was committed',
      "S3 restarted, received the leader's entries and caught up: it stored and committed index 1",
      'Done: S2 won term 2 with a majority, and x=1 committed on 2 of 3 nodes while S3 was down',
    ])
  })

  it('does not share node objects between steps', () => {
    expect(node(steps[0], 'S2').role).toBe('follower')
    expect(node(steps[4], 'S1').log).toEqual([])
  })
})
