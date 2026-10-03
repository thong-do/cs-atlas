'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { DifficultyBadge } from '@/components/difficulty-badge'
import { StatusIcon } from '@/components/status-icon'
import { Input } from '@/components/ui/input'
import { useCatalog } from '@/lib/content/catalog-context'
import { filterProblems, problemStatus, type ProblemFilter } from '@/lib/logic/filter'
import { useLive } from '@/lib/store/context'

const selectClass = 'h-9 rounded-md border bg-background px-2 text-sm'

export function ProblemsTable() {
  const { problems, patterns, patternBySlug } = useCatalog()
  const params = useSearchParams()
  const [filter, setFilter] = useState<ProblemFilter>({
    q: params.get('q') ?? '', pattern: 'all', difficulty: 'all', status: 'all',
  })
  // Follow `?q=` changes (404 search, back/forward) while mounted, without clobbering manual typing.
  const urlQ = params.get('q') ?? ''
  const [seenUrlQ, setSeenUrlQ] = useState(urlQ)
  if (urlQ !== seenUrlQ) {
    setSeenUrlQ(urlQ)
    setFilter((f) => ({ ...f, q: urlQ }))
  }
  const progressList = useLive((s) => s.listProgress())
  const progress = useMemo(() => new Map((progressList ?? []).map((p) => [p.slug, p])), [progressList])
  const rows = filterProblems(problems, progress, filter)
  const set = <K extends keyof ProblemFilter>(key: K, value: ProblemFilter[K]) => setFilter((f) => ({ ...f, [key]: value }))

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <Input value={filter.q} onChange={(e) => set('q', e.target.value)} placeholder="Search title or #id" aria-label="Search problems" />
        <select aria-label="Pattern" className={selectClass} value={filter.pattern} onChange={(e) => set('pattern', e.target.value)}>
          <option value="all">All patterns</option>
          {patterns.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
        </select>
        <select aria-label="Difficulty" className={selectClass} value={filter.difficulty} onChange={(e) => set('difficulty', e.target.value as ProblemFilter['difficulty'])}>
          <option value="all">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select aria-label="Status" className={selectClass} value={filter.status} onChange={(e) => set('status', e.target.value as ProblemFilter['status'])}>
          <option value="all">Any status</option>
          <option value="unsolved">Unsolved</option>
          <option value="helped">Solved with help</option>
          <option value="alone">Solved alone</option>
          <option value="resolve">Needs re-solve</option>
        </select>
      </div>

      <p className="text-sm text-muted-foreground">{rows.length} of {problems.length} problems</p>

      <ul className="divide-y rounded-lg border">
        {rows.map((p) => (
          <li key={p.slug} className="flex items-center gap-3 px-3 py-2">
            <StatusIcon status={problemStatus(progress.get(p.slug))} />
            <Link href={`/problems/${p.slug}/`} className="min-w-0 flex-1 truncate hover:underline">
              <span className="text-muted-foreground">{p.leetcodeId}.</span> {p.title}
            </Link>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {p.patterns.map((s) => patternBySlug.get(s)?.title ?? s).join(', ')}
            </span>
            <DifficultyBadge difficulty={p.difficulty} />
            <a href={p.url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground" aria-label={`Open ${p.title} on LeetCode`}>↗</a>
          </li>
        ))}
        {rows.length === 0 && <li className="px-3 py-6 text-center text-muted-foreground">No problems match these filters.</li>}
      </ul>
    </div>
  )
}
