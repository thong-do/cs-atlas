export interface CacheStep {
  /** Keys from most to least recently used. */
  slots: string[]
  capacity: number
  requests: string[]
  /** Index of the request this step handled; absent on the first and last steps. */
  index?: number
  event?: 'hit' | 'miss'
  evicted?: string
  hits: number
  misses: number
  caption: string
  done?: boolean
}

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`

export function lruCacheSteps(capacity: number, requests: string[]): CacheStep[] {
  const slots: string[] = []
  let hits = 0
  let misses = 0
  let evictions = 0
  const steps: CacheStep[] = [{ slots: [], capacity, requests, hits, misses, caption: `Empty cache with room for ${capacity} items` }]

  requests.forEach((key, index) => {
    const at = slots.indexOf(key)
    if (at >= 0) {
      hits++
      slots.splice(at, 1)
      slots.unshift(key)
      steps.push({ slots: [...slots], capacity, requests, index, event: 'hit', hits, misses, caption: `Read ${key}: hit — moved ${key} to the front` })
      return
    }
    misses++
    const evicted = slots.length === capacity ? slots.pop() : undefined
    if (evicted) evictions++
    slots.unshift(key)
    steps.push({
      slots: [...slots], capacity, requests, index, event: 'miss', evicted, hits, misses,
      caption: evicted
        ? `Read ${key}: miss — loaded ${key} and evicted ${evicted}, the least recently used`
        : `Read ${key}: miss — loaded ${key} from the database`,
    })
  })

  steps.push({
    slots: [...slots], capacity, requests, hits, misses, done: true,
    caption: `Done: ${plural(hits, 'hit')}, ${plural(misses, 'miss', 'misses')}, ${plural(evictions, 'eviction')}`,
  })
  return steps
}
