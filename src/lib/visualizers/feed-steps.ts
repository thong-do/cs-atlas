export type Follower = 'F1' | 'F2' | 'F3' | 'F4' | 'F5'

export interface FeedStep {
  mode: 'push' | 'hybrid'
  /** Newest first. */
  feeds: Record<Follower, string[]>
  /** Posts stored only in Cel's timeline (hybrid only). */
  celebTimeline: string[]
  /** A post id ('p1'..) or follower id ('F1'). */
  focus: string | null
  /** Feeds written (or read) in this step. */
  touched: Follower[]
  /** Feed writes so far in this mode. */
  writes: number
  /** Lookups so far in this mode. */
  reads: number
  caption: string
  done?: boolean
}

export const FOLLOWERS: Follower[] = ['F1', 'F2', 'F3', 'F4', 'F5']
export const FEED_AUTHORS = ['Ana', 'Ben', 'Cel'] as const
export type FeedAuthor = (typeof FEED_AUTHORS)[number]

/** Who posted each post, in posting order. */
export const FEED_POSTS: { id: string; author: FeedAuthor }[] = [
  { id: 'p1', author: 'Ana' },
  { id: 'p2', author: 'Cel' },
  { id: 'p3', author: 'Ben' },
]

const CELEB: FeedAuthor = 'Cel'
const FOLLOWS: Record<Follower, FeedAuthor[]> = {
  F1: ['Ana', 'Cel'],
  F2: ['Ana', 'Cel'],
  F3: ['Ben', 'Cel'],
  F4: ['Cel'],
  F5: ['Cel'],
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function feedFanoutSteps(): FeedStep[] {
  const steps: FeedStep[] = []
  const totals = { push: { writes: 0, reads: 0 }, hybrid: { writes: 0, reads: 0 } }

  for (const mode of ['push', 'hybrid'] as const) {
    const feeds = Object.fromEntries(FOLLOWERS.map((f) => [f, [] as string[]])) as Record<Follower, string[]>
    const celebTimeline: string[] = []
    let writes = 0
    let reads = 0
    const emit = (focus: string | null, touched: Follower[], caption: string) =>
      steps.push({
        mode,
        feeds: Object.fromEntries(FOLLOWERS.map((f) => [f, [...feeds[f]]])) as Record<Follower, string[]>,
        celebTimeline: [...celebTimeline],
        focus,
        touched,
        writes,
        reads,
        caption,
      })

    emit(
      null,
      [],
      mode === 'push'
        ? "Push: each post was copied into every follower's feed when it was written"
        : "Hybrid: Cel's posts were pulled at read time; everyone else's were still pushed",
    )

    for (const post of FEED_POSTS) {
      if (mode === 'hybrid' && post.author === CELEB) {
        celebTimeline.unshift(post.id)
        emit(post.id, [], `${post.author} posted ${post.id} — it was stored once in Cel's timeline, not in any feed`)
        continue
      }
      const targets = FOLLOWERS.filter((f) => FOLLOWS[f].includes(post.author))
      for (const f of targets) feeds[f].unshift(post.id)
      writes += targets.length
      emit(post.id, targets, `${post.author} posted ${post.id} — it was written to ${plural(targets.length, 'feed', 'feeds')} (${targets.join(', ')})`)
    }

    // F1 reads: its own feed, plus Cel's timeline when Cel is not fanned out.
    const pulls = mode === 'hybrid' && FOLLOWS.F1.includes(CELEB)
    reads += pulls ? 2 : 1
    const order = new Map(FEED_POSTS.map((p, i) => [p.id, i]))
    const merged = [...feeds.F1, ...(pulls ? celebTimeline : [])].sort((a, b) => order.get(b)! - order.get(a)!)
    emit(
      'F1',
      ['F1'],
      pulls
        ? `F1 read its feed and Cel's timeline in ${plural(reads, 'lookup', 'lookups')} and merged them: ${merged.join(', ')}`
        : `F1 read its feed in ${plural(reads, 'lookup', 'lookups')}: ${merged.join(', ')}`,
    )
    totals[mode] = { writes, reads }

    if (mode === 'hybrid') {
      const { push, hybrid } = totals
      const last = steps[steps.length - 1]
      steps.push({
        ...last,
        feeds: Object.fromEntries(FOLLOWERS.map((f) => [f, [...last.feeds[f]]])) as Record<Follower, string[]>,
        celebTimeline: [...last.celebTimeline],
        focus: null,
        touched: [],
        caption: `Done: push made ${plural(push.writes, 'feed write', 'feed writes')} and ${plural(push.reads, 'read', 'reads')}; hybrid made ${plural(hybrid.writes, 'write', 'writes')} and ${plural(hybrid.reads, 'read', 'reads')} — with millions of followers, skipping the celebrity's fan-out saves the most`,
        done: true,
      })
    }
  }
  return steps
}
