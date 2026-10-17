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

  it('pins every node field on every step', () => {
    const row = (s: RaftStep) => s.nodes.map((n) => [n.id, n.role, n.term, n.votedFor, n.log.length, n.commitIndex])
    const f1 = (id: string) => [id, 'follower', 1, null, 0, 0]
    const f2 = (id: string, extra: Partial<Record<number, unknown>> = {}) => Object.assign([id, 'follower', 2, 'S2', 0, 0], extra)
    const cand = ['S2', 'candidate', 2, 'S2', 0, 0]
    const lead = (log: number, commit: number) => ['S2', 'leader', 2, 'S2', log, commit]
    const down = ['S3', 'down', 2, 'S2', 0, 0]
    const expected: unknown[][][] = [
      [f1('S1'), f1('S2'), f1('S3')],
      [f1('S1'), cand, f1('S3')],
      [f1('S1'), cand, f1('S3')],
      [f2('S1'), cand, f2('S3')],
      [f2('S1'), lead(0, 0), f2('S3')],
      [f2('S1'), lead(1, 0), f2('S3')],
      [f2('S1'), lead(1, 0), down],
      [f2('S1'), lead(1, 0), down],
      [f2('S1', { 4: 1 }), lead(1, 0), down],
      [f2('S1', { 4: 1 }), lead(1, 1), down],
      [f2('S1', { 4: 1, 5: 1 }), lead(1, 1), down],
      [f2('S1', { 4: 1, 5: 1 }), lead(1, 1), ['S3', 'follower', 2, 'S2', 1, 1]],
      [f2('S1', { 4: 1, 5: 1 }), lead(1, 1), ['S3', 'follower', 2, 'S2', 1, 1]],
    ]
    expected.forEach((e, i) => expect(row(steps[i]), `step ${i}`).toEqual(e))
    // log contents: empty until the write, then exactly x=1 in term 2
    const logsOf = (s: RaftStep) => s.nodes.map((n) => n.log)
    for (const i of [0, 1, 2, 3, 4]) expect(logsOf(steps[i])).toEqual([[], [], []])
    for (const i of [5, 6, 7]) expect(logsOf(steps[i])).toEqual([[], [X], []])
    for (const i of [8, 9, 10]) expect(logsOf(steps[i])).toEqual([[X], [X], []])
    for (const i of [11, 12]) expect(logsOf(steps[i])).toEqual([[X], [X], [X]])
  })

  it('traces focus and messages', () => {
    expect(steps.map((s) => s.focus)).toEqual([null, 'S2', 'S2', 'S2', 'S2', 'S2', 'S3', 'S2', 'S1', 'S2', 'S1', 'S3', null])
    expect(steps.map(msgs)).toEqual([
      [], [], ['S2>S1:RequestVote', 'S2>S3:RequestVote'], ['S1>S2:Vote', 'S3>S2:Vote'], [], [], [],
      ['S2>S1:AppendEntries', 'S2>S3:AppendEntries'], ['S1>S2:Ack'], [], ['S2>S1:AppendEntries'],
      ['S2>S3:AppendEntries', 'S3>S2:Ack'], [],
    ])
    expect(steps[12].nodes).toEqual(steps[11].nodes)
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
