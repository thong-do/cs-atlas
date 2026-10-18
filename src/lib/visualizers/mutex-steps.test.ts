import { describe, expect, it } from 'vitest'
import { mutexSteps } from './mutex-steps'

type S = 'ready' | 'running' | 'blocked' | 'done'
const th = (a: [number | null, S], b: [number | null, S]) => [['T1', a[0], a[1]], ['T2', b[0], b[1]]]

// run, counter, threads, owner, waiting, focus
const EXPECTED = [
  ['no-lock', 0, th([null, 'ready'], [null, 'ready']), null, [], null],
  ['no-lock', 0, th([0, 'running'], [null, 'ready']), null, [], 'T1'],
  ['no-lock', 0, th([0, 'running'], [0, 'running']), null, [], 'T2'],
  ['no-lock', 1, th([0, 'done'], [0, 'running']), null, [], 'T1'],
  ['no-lock', 1, th([0, 'done'], [0, 'done']), null, [], 'T2'],
  ['no-lock', 1, th([0, 'done'], [0, 'done']), null, [], null],
  ['mutex', 0, th([null, 'ready'], [null, 'ready']), null, [], null],
  ['mutex', 0, th([null, 'running'], [null, 'ready']), 'T1', [], 'T1'],
  ['mutex', 0, th([0, 'running'], [null, 'ready']), 'T1', [], 'T1'],
  ['mutex', 0, th([0, 'running'], [null, 'blocked']), 'T1', ['T2'], 'T2'],
  ['mutex', 1, th([0, 'running'], [null, 'blocked']), 'T1', ['T2'], 'T1'],
  ['mutex', 1, th([0, 'done'], [null, 'running']), 'T2', [], 'T2'],
  ['mutex', 1, th([0, 'done'], [1, 'running']), 'T2', [], 'T2'],
  ['mutex', 2, th([0, 'done'], [1, 'running']), 'T2', [], 'T2'],
  ['mutex', 2, th([0, 'done'], [1, 'done']), null, [], 'T2'],
  ['mutex', 2, th([0, 'done'], [1, 'done']), null, [], null],
]

const CAPTIONS = [
  'No lock: T1 and T2 each ran counter += 1, which is a read, an add and a write',
  'T1 read counter = 0',
  'T2 read counter = 0 before T1 wrote back',
  'T1 wrote 0 + 1 = 1',
  "T2 wrote 0 + 1 = 1, overwriting T1's update",
  'No lock: two increments left counter = 1 — one update was lost',
  'With a mutex: each thread had to hold the lock to read, add and write',
  'T1 acquired the lock',
  'T1 read counter = 0',
  'T2 tried to acquire the lock and blocked, because T1 held it',
  'T1 wrote 0 + 1 = 1',
  'T1 released the lock; T2 woke up and acquired it',
  'T2 read counter = 1',
  'T2 wrote 1 + 1 = 2',
  'T2 released the lock',
  'Done: without a lock one of two updates was lost; with the mutex counter = 2, at the cost of T2 waiting',
]

describe('mutexSteps', () => {
  const steps = mutexSteps()

  it('has 16 steps with one done step', () => {
    expect(steps).toHaveLength(16)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
    expect(steps[15].done).toBe(true)
  })

  it('pins state at every step', () => {
    expect(steps.map((s) => [s.run, s.counter, s.threads.map((t) => [t.id, t.local, t.state]), s.owner, s.waiting, s.focus])).toEqual(EXPECTED)
  })

  it('writes the captions', () => {
    expect(steps.map((s) => s.caption)).toEqual(CAPTIONS)
  })
})
