import { FEED_AUTHORS, FEED_POSTS, FOLLOWERS, type FeedAuthor, type FeedStep } from '@/lib/visualizers/feed-steps'
import { cn } from '@/lib/utils'

const SLOTS = 3
const AUTHOR_COLOR: Record<FeedAuthor, string> = { Ana: 'bg-[#2563eb]', Ben: 'bg-[#b45309]', Cel: 'bg-[#9333ea]' }
const authorOf = (id: string) => FEED_POSTS.find((p) => p.id === id)!.author

function Slots({ posts }: { posts: string[] }) {
  return (
    <div className="flex flex-1 gap-1.5">
      {Array.from({ length: SLOTS }, (_, i) => {
        const id = posts[i]
        return id ? (
          <span key={i} className={cn('flex h-7 min-w-0 flex-1 items-center justify-center rounded-md px-1 font-mono text-xs font-medium text-white', AUTHOR_COLOR[authorOf(id)])}>
            {id} {authorOf(id)}
          </span>
        ) : (
          <span key={i} className="h-7 min-w-0 flex-1 rounded-md border border-dashed border-muted-foreground/40" />
        )
      })}
    </div>
  )
}

export function FeedView({ step }: { step: FeedStep }) {
  const { mode, feeds, celebTimeline, focus, touched, writes, reads } = step
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-md border px-2 py-1 text-xs font-semibold">{mode === 'push' ? 'Push' : 'Hybrid'}</span>
        <p className="text-sm tabular-nums">Feed writes {writes} · Reads {reads}</p>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {FEED_AUTHORS.map((a) => (
          <li key={a} className="flex items-center gap-1">
            <span className={cn('size-3 rounded-sm', AUTHOR_COLOR[a])} />
            {a}&apos;s post
          </li>
        ))}
      </ul>
      <div className="space-y-1.5">
        {FOLLOWERS.map((f) => (
          <div
            key={f}
            className={cn('flex items-center gap-2 rounded-md border p-1.5', touched.includes(f) && 'border-primary bg-primary/10 ring-2 ring-primary', focus === f && 'font-medium')}
          >
            <span className="w-7 shrink-0 font-mono text-xs">{f}</span>
            <Slots posts={feeds[f]} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-md border border-dashed p-1.5">
        <span className="w-16 shrink-0 text-xs leading-4">Cel&apos;s timeline</span>
        {mode === 'push' ? (
          <span className="flex h-7 flex-1 items-center text-xs text-muted-foreground">not used in push mode</span>
        ) : (
          <Slots posts={celebTimeline} />
        )}
      </div>
    </div>
  )
}
