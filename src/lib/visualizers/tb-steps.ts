export const TB_CAPACITY = 5
export const TB_REFILL_PER_SECOND = 1
export const TB_SECONDS = 6
/** Requests arriving at t = 0…5. */
const ARRIVALS = [8, 1, 1, 2, 0, 1]

export interface TbStep {
  t: number
  kind: 'start' | 'refill' | 'request' | 'done'
  request: number | null
  allowed: boolean | null
  tokens: number
  allowedCount: number
  rejectedCount: number
  caption: string
  done?: boolean
}

const tokens = (n: number) => `${n} ${n === 1 ? 'token' : 'tokens'}`

export function tokenBucketSteps(): TbStep[] {
  let bucket = TB_CAPACITY
  let allowedCount = 0
  let rejectedCount = 0
  let n = 0
  const steps: TbStep[] = []
  const push = (s: Omit<TbStep, 'tokens' | 'allowedCount' | 'rejectedCount'>) =>
    steps.push({ ...s, tokens: bucket, allowedCount, rejectedCount })

  push({ t: 0, kind: 'start', request: null, allowed: null, caption: `The bucket started full: ${TB_CAPACITY} tokens, refilling ${TB_REFILL_PER_SECOND} per second` })

  ARRIVALS.forEach((count, t) => {
    if (t > 0) {
      bucket = Math.min(TB_CAPACITY, bucket + TB_REFILL_PER_SECOND)
      push({ t, kind: 'refill', request: null, allowed: null, caption: `t=${t}: 1 token was added — ${bucket} left` })
    }
    for (let i = 0; i < count; i++) {
      n++
      const allowed = bucket > 0
      if (allowed) {
        bucket--
        allowedCount++
      } else {
        rejectedCount++
      }
      push({
        t, kind: 'request', request: n, allowed,
        caption: allowed ? `t=${t}: request ${n} was allowed — ${tokens(bucket)} left` : `t=${t}: request ${n} was rejected with 429 — the bucket was empty`,
      })
    }
  })

  push({
    t: TB_SECONDS - 1, kind: 'done', request: null, allowed: null, done: true,
    caption: `Done: ${allowedCount} requests allowed, ${rejectedCount} rejected — bursts drained the bucket, steady traffic refilled it`,
  })
  return steps
}
