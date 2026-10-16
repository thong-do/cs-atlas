import { describe, expect, it } from 'vitest'
import { twoPhaseCommitSteps } from './tpc-steps'

const msgs = (s: { messages: { from: string; to: string; kind: string }[] }) => s.messages.map((m) => `${m.from}>${m.to}:${m.kind}`)
const parts = (s: ReturnType<typeof twoPhaseCommitSteps>[number]) => s.participants.map((p) => [p.id, p.state, p.locked, p.vote])
const INIT = [['P1', 'working', true, null], ['P2', 'working', true, null]]
const PREP = [['P1', 'prepared', true, 'yes'], ['P2', 'prepared', true, 'yes']]
const P1Y = [['P1', 'prepared', true, 'yes'], ['P2', 'working', true, null]]
const PREPARE = ['C>P1:PREPARE', 'C>P2:PREPARE']

describe('twoPhaseCommitSteps', () => {
  const steps = twoPhaseCommitSteps()

  it('has 14 steps with one done step', () => {
    expect(steps).toHaveLength(14)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
    expect(steps[13].done).toBe(true)
  })

  it('labels runs', () => {
    expect(steps.map((s) => s.run)).toEqual([...Array(6).fill('commit'), ...Array(8).fill('crash')])
  })

  it('traces the commit run', () => {
    expect(steps.slice(0, 6).map((s) => s.coordinator)).toEqual(['idle', 'waiting', 'waiting', 'waiting', 'committed', 'committed'])
    expect(steps.slice(0, 6).map(parts)).toEqual([
      INIT, INIT, P1Y, PREP, PREP,
      [['P1', 'committed', false, 'yes'], ['P2', 'committed', false, 'yes']],
    ])
    expect(steps.slice(0, 6).map(msgs)).toEqual([[], PREPARE, ['P1>C:YES'], ['P2>C:YES'], [], ['C>P1:COMMIT', 'C>P2:COMMIT']])
  })

  it('traces the crash run', () => {
    expect(steps.slice(6).map((s) => s.coordinator)).toEqual(['idle', 'waiting', 'waiting', 'waiting', 'down', 'down', 'aborted', 'aborted'])
    const ab = [['P1', 'aborted', false, 'yes'], ['P2', 'aborted', false, 'yes']]
    expect(steps.slice(6).map(parts)).toEqual([INIT, INIT, P1Y, PREP, PREP, PREP, ab, ab])
    expect(steps.slice(6).map(msgs)).toEqual([[], PREPARE, ['P1>C:YES'], ['P2>C:YES'], [], [], ['C>P1:ABORT', 'C>P2:ABORT'], []])
  })

  it('writes the captions', () => {
    expect(steps.map((s) => s.caption)).toEqual([
      'Commit run: one order touched two databases, and the coordinator had to commit both or neither',
      'The coordinator sent PREPARE to P1 and P2',
      'P1 wrote its changes durably, kept its locks and voted YES',
      'P2 wrote its changes durably, kept its locks and voted YES',
      'Both voted YES, so the coordinator logged COMMIT — the decision point',
      'P1 and P2 committed and released their locks',
      'Crash run: the same order, but the coordinator crashed after the votes',
      'The coordinator sent PREPARE to P1 and P2',
      'P1 wrote its changes durably, kept its locks and voted YES',
      'P2 wrote its changes durably, kept its locks and voted YES',
      'The coordinator crashed before logging a decision',
      'P1 and P2 stayed prepared and kept their locks: neither could commit or abort on its own',
      'The coordinator restarted, found no logged decision and sent ABORT; P1 and P2 rolled back and released their locks',
      'Done: 2PC kept both databases in agreement, but a coordinator crash left them blocked, holding locks, until it recovered',
    ])
  })
})
