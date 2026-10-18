export type Tid = 'T1' | 'T2'
export type ThreadState = 'ready' | 'running' | 'blocked' | 'done'
export interface MutexThread {
  id: Tid
  local: number | null
  state: ThreadState
}
export interface MutexStep {
  run: 'no-lock' | 'mutex'
  counter: number
  threads: MutexThread[]
  owner: Tid | null
  waiting: Tid[]
  focus: Tid | null
  caption: string
  done?: boolean
}

export const MUTEX_IDS: Tid[] = ['T1', 'T2']

export function mutexSteps(): MutexStep[] {
  const steps: MutexStep[] = []

  function run(kind: MutexStep['run']) {
    let counter = 0
    let owner: Tid | null = null
    let waiting: Tid[] = []
    const threads: MutexThread[] = MUTEX_IDS.map((id) => ({ id, local: null, state: 'ready' }))
    const get = (id: Tid) => threads.find((t) => t.id === id)!
    const push = (focus: Tid | null, caption: string, done?: boolean) => {
      steps.push({ run: kind, counter, threads: structuredClone(threads), owner, waiting: [...waiting], focus, caption, ...(done ? { done: true } : {}) })
    }
    const guard = (id: Tid, what: string) => {
      if (kind === 'mutex' && owner !== id) throw new Error(`${id} cannot ${what} without holding the lock (owner: ${owner ?? 'none'})`)
    }
    const acquire = (id: Tid) => {
      if (owner !== null) throw new Error(`${id} cannot acquire a lock held by ${owner}`)
      owner = id
      get(id).state = 'running'
    }
    const read = (id: Tid) => {
      guard(id, 'read')
      const t = get(id)
      t.local = counter
      t.state = 'running'
      return t.local
    }
    const write = (id: Tid) => {
      guard(id, 'write')
      const t = get(id)
      counter = t.local! + 1
      return `${id} wrote ${t.local} + 1 = ${counter}`
    }
    const finish = (id: Tid) => {
      get(id).state = 'done'
    }

    if (kind === 'no-lock') {
      push(null, 'No lock: T1 and T2 each ran counter += 1, which is a read, an add and a write')
      push('T1', `T1 read counter = ${read('T1')}`)
      push('T2', `T2 read counter = ${read('T2')} before T1 wrote back`)
      const w1 = write('T1')
      finish('T1')
      push('T1', w1)
      const w2 = write('T2')
      finish('T2')
      push('T2', `${w2}, overwriting T1's update`)
      push(null, `No lock: two increments left counter = ${counter} — one update was lost`)
      return
    }

    push(null, 'With a mutex: each thread had to hold the lock to read, add and write')
    acquire('T1')
    push('T1', 'T1 acquired the lock')
    push('T1', `T1 read counter = ${read('T1')}`)
    if (owner === null) throw new Error('lock unexpectedly free')
    get('T2').state = 'blocked'
    waiting = ['T2']
    push('T2', `T2 tried to acquire the lock and blocked, because ${owner} held it`)
    push('T1', write('T1'))
    finish('T1')
    owner = null
    const next = waiting.shift()!
    acquire(next)
    push(next, `T1 released the lock; ${next} woke up and acquired it`)
    push('T2', `T2 read counter = ${read('T2')}`)
    push('T2', write('T2'))
    finish('T2')
    owner = null
    push('T2', 'T2 released the lock')
    push(null, `Done: without a lock one of two updates was lost; with the mutex counter = ${counter}, at the cost of T2 waiting`, true)
  }

  run('no-lock')
  run('mutex')
  return steps
}
