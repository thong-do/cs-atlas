export type PId = 'P1' | 'P2'
export type CoordState = 'idle' | 'waiting' | 'committed' | 'aborted' | 'down'
export type PState = 'working' | 'prepared' | 'committed' | 'aborted'
export type TpcMsg = { from: 'C' | PId; to: 'C' | PId; kind: 'PREPARE' | 'YES' | 'COMMIT' | 'ABORT' }
export interface TpcParticipant {
  id: PId
  state: PState
  locked: boolean
  vote: 'yes' | null
}
export interface TpcStep {
  run: 'commit' | 'crash'
  coordinator: CoordState
  participants: TpcParticipant[]
  messages: TpcMsg[]
  caption: string
  done?: boolean
}

export const TPC_IDS: PId[] = ['P1', 'P2']
export const TPC_NAMES: Record<PId, string> = { P1: 'Orders DB', P2: 'Payments DB' }

const list = (ids: string[]) => ids.join(' and ')

export function twoPhaseCommitSteps(): TpcStep[] {
  const steps: TpcStep[] = []

  function run(kind: TpcStep['run']) {
    let coordinator: CoordState = 'idle'
    const parts: TpcParticipant[] = TPC_IDS.map((id) => ({ id, state: 'working', locked: true, vote: null }))
    const push = (messages: TpcMsg[], caption: string, done?: boolean) => {
      steps.push({ run: kind, coordinator, participants: structuredClone(parts), messages, caption, ...(done ? { done: true } : {}) })
    }
    const ids = parts.map((p) => p.id)
    const to = (kind: TpcMsg['kind']): TpcMsg[] => ids.map((id) => ({ from: 'C', to: id, kind }))

    push([], kind === 'commit'
      ? 'Commit run: one order touched two databases, and the coordinator had to commit both or neither'
      : 'Crash run: the same order, but the coordinator crashed after the votes')

    coordinator = 'waiting'
    push(to('PREPARE'), `The coordinator sent PREPARE to ${list(ids)}`)

    for (const p of parts) {
      p.state = 'prepared'
      p.vote = 'yes'
      push([{ from: p.id, to: 'C', kind: 'YES' }], `${p.id} wrote its changes durably, kept its locks and voted YES`)
    }

    if (kind === 'commit') {
      const allYes = parts.every((p) => p.vote === 'yes')
      if (!allYes) throw new Error('commit run expects unanimous YES votes')
      coordinator = 'committed'
      push([], 'Both voted YES, so the coordinator logged COMMIT — the decision point')
      for (const p of parts) {
        p.state = 'committed'
        p.locked = false
      }
      push(to('COMMIT'), `${list(ids)} committed and released their locks`)
      return
    }

    coordinator = 'down'
    push([], 'The coordinator crashed before logging a decision')
    push([], `${list(ids)} stayed prepared and kept their locks: neither could commit or abort on its own`)
    coordinator = 'aborted'
    for (const p of parts) {
      p.state = 'aborted'
      p.locked = false
    }
    push(to('ABORT'), `The coordinator restarted, found no logged decision and sent ABORT; ${list(ids)} rolled back and released their locks`)
    push([], 'Done: 2PC kept both databases in agreement, but a coordinator crash left them blocked, holding locks, until it recovered', true)
  }

  run('commit')
  run('crash')
  return steps
}
