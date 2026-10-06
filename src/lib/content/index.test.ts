import { describe, expect, it } from 'vitest'
import { getCatalog, getExercise, getLessonDoc } from './index'

const ALGORITHMS_ORDER = ['arrays-hashing', 'two-pointers', 'stack', 'sliding-window', 'binary-search', 'linked-list', 'trees', 'tries', 'heap', 'backtracking', 'intervals', 'greedy', 'graphs', 'dp-1d', 'advanced-graphs', 'dp-2d', 'bit-manipulation', 'math-geometry']
const SECTIONS = ['Intuition', 'Visual', 'Template', 'Complexity', 'Pitfalls', 'Tips & tricks']

describe('content accessors', () => {
  it('sorts tracks by order and lessons by track, module and position', () => {
    const { tracks, lessons } = getCatalog()
    expect(tracks.map((t) => t.order)).toEqual([...tracks.map((t) => t.order)].sort((a, b) => a - b))
    expect(lessons.map((l) => l.slug)).toEqual(tracks.flatMap((t) => t.modules.flatMap((m) => m.lessons)))
  })

  it('keeps the v1 algorithms order exactly', () => {
    expect(getCatalog().lessons.filter((l) => l.track === 'algorithms').map((l) => l.slug)).toEqual(ALGORITHMS_ORDER)
  })

  it('exposes slim lesson metadata with the track derived from the folder', () => {
    const l = getCatalog().lessons[0]
    expect(l).not.toHaveProperty('body')
    expect(l).not.toHaveProperty('toc')
    expect(l.track).toBe('algorithms')
    expect(getLessonDoc('two-pointers')?.track).toBe('algorithms')
  })

  it('sorts exercises by primary lesson order, then ladderOrder', () => {
    const { exercises, lessons } = getCatalog()
    const rank = new Map(lessons.map((l, i) => [l.slug, i]))
    const keys = exercises.map((e) => [rank.get(e.lessons[0])!, e.ladderOrder])
    expect(keys).toEqual([...keys].sort((a, b) => a[0] - b[0] || a[1] - b[1]))
  })

  it('finds a lesson doc with compiled body and an exercise by slug', () => {
    expect(getLessonDoc('two-pointers')?.body.length).toBeGreaterThan(0)
    expect(getExercise('two-sum')?.leetcodeId).toBe(1)
    expect(getExercise('two-sum')?.type).toBe('external-problem')
    expect(getExercise('missing')).toBeUndefined()
  })
})

describe('content inventory', () => {
  it('has a System Design track with the Caching lesson and coming-soon outline', () => {
    const { tracks, lessons, exercises } = getCatalog()
    expect(tracks.map((t) => t.slug)).toEqual(['algorithms', 'system-design'])
    const sd = tracks[1]
    expect(sd.modules.flatMap((m) => m.lessons)).toEqual(['caching'])
    expect(sd.modules.flatMap((m) => m.comingSoon).length).toBeGreaterThan(0)
    expect(lessons.find((l) => l.slug === 'caching')).toMatchObject({ track: 'system-design', prerequisites: ['arrays-hashing'] })
    expect(getLessonDoc('caching')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks'])
    expect(exercises.filter((e) => e.lessons.includes('caching')).map((e) => e.slug).sort()).toEqual(['lru-cache', 'time-based-key-value-store'])
  })

  const { lessons, exercises } = getCatalog()
  const algorithms = lessons.filter((l) => l.track === 'algorithms')

  it('has 18 algorithms lessons with the six standard sections in order', () => {
    expect(algorithms).toHaveLength(18)
    for (const l of algorithms) expect(getLessonDoc(l.slug)!.toc.map((t) => t.title), l.slug).toEqual(SECTIONS)
  })

  it('has 138 exercises and every ladder is numbered 1..n', () => {
    expect(exercises).toHaveLength(138)
    for (const l of lessons) {
      const orders = exercises.filter((x) => x.lessons[0] === l.slug).map((x) => x.ladderOrder).sort((a, b) => a - b)
      expect(orders, l.slug).toEqual(orders.map((_, i) => i + 1))
    }
  })

  it('gives every algorithms lesson at least 5 ladder exercises', () => {
    for (const l of algorithms) {
      expect(exercises.filter((x) => x.lessons[0] === l.slug).length, l.slug).toBeGreaterThanOrEqual(5)
    }
  })

  it('uses https leetcode problem URLs', () => {
    for (const e of exercises) expect(e.url, e.slug).toMatch(/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/)
  })

  it('has URL slugs matching exercise slugs, except an explicit allow-list', () => {
    const ALLOWED: Record<string, string> = { 'two-sum-ii': 'two-sum-ii-input-array-is-sorted' }
    for (const e of exercises) {
      const urlSlug = e.url.match(/\/problems\/([a-z0-9-]+)\/$/)![1]
      expect(urlSlug, e.slug).toBe(ALLOWED[e.slug] ?? e.slug)
    }
  })
})
