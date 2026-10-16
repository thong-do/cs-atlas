import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { DesignDoc, DesignExercise, QuizDoc, QuizExercise } from '@/lib/types'
import { isProblem } from '@/lib/types'
import { getCatalog, getExercise, getExerciseDoc, getLessonDoc } from './index'

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

  it('returns full quiz and design docs, and only the catalog fields in meta', () => {
    const quiz = getExerciseDoc('caching-quiz') as QuizDoc
    expect(quiz.type).toBe('quiz')
    expect(quiz.questions).toHaveLength(5)
    expect(quiz.questions[0]).toHaveProperty('choices')
    expect(quiz.questions[0]).toHaveProperty('answer')
    expect(getCatalog().exercises.find((e) => e.slug === 'caching-quiz')).toMatchObject({ questionCount: 5 })
    const metaQuiz = getCatalog().exercises.find((e) => e.slug === 'caching-quiz')!
    expect(metaQuiz).not.toHaveProperty('questions')
    expect((metaQuiz as QuizExercise).flashcardIds).toHaveLength(8)

    const design = getExerciseDoc('design-product-page-cache') as DesignDoc
    expect(design).toHaveProperty('reference')
    expect(design).toHaveProperty('hint')
    expect(design.rubricPoints).toHaveLength(5)
    const metaDesign = getCatalog().exercises.find((e) => e.slug === 'design-product-page-cache')!
    expect((metaDesign as DesignExercise).rubric).toHaveLength(5)
    expect(metaDesign).not.toHaveProperty('reference')
  })

  it('finds a lesson doc with compiled body and an exercise by slug', () => {
    expect(getLessonDoc('two-pointers')?.body.length).toBeGreaterThan(0)
    expect(getExercise('two-sum')).toMatchObject({ leetcodeId: 1 })
    expect(getExerciseDoc('two-sum')?.type).toBe('external-problem')
    expect(getExerciseDoc('missing')).toBeUndefined()
    expect(getExercise('two-sum')?.type).toBe('external-problem')
    expect(getExercise('missing')).toBeUndefined()
  })
})

describe('content inventory', () => {
  it('has a System Design track with the Caching lesson and coming-soon outline', () => {
    const { tracks, lessons, exercises } = getCatalog()
    expect(tracks.map((t) => t.slug)).toEqual(['algorithms', 'system-design'])
    const sd = tracks[1]
    expect(sd.modules.flatMap((m) => m.lessons)).toEqual(['client-server-http', 'dns-cdn', 'caching', 'sql-vs-nosql', 'load-balancing', 'replication-sharding', 'queues-streams', 'rate-limiting', 'url-shortener', 'news-feed', 'chat'])
    expect(sd.modules.flatMap((m) => m.comingSoon).length).toBeGreaterThan(0)
    expect(lessons.find((l) => l.slug === 'caching')).toMatchObject({ track: 'system-design', prerequisites: ['arrays-hashing', 'client-server-http'] })
    expect(getLessonDoc('caching')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks'])
    expect(lessons.find((l) => l.slug === 'client-server-http')).toMatchObject({ track: 'system-design', prerequisites: [] })
    expect(getLessonDoc('client-server-http')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks'])
    expect(exercises.filter((e) => e.lessons.includes('client-server-http')).map((e) => e.slug)).toEqual(['client-server-http-quiz'])
    expect(lessons.find((l) => l.slug === 'dns-cdn')).toMatchObject({ track: 'system-design', prerequisites: ['client-server-http'] })
    expect(getLessonDoc('dns-cdn')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks'])
    expect(exercises.filter((e) => e.lessons.includes('dns-cdn')).map((e) => e.slug).sort()).toEqual(['design-global-static-site', 'dns-cdn-quiz'])
    expect(exercises.filter((e) => e.lessons.includes('caching')).map((e) => e.slug).sort()).toEqual(['caching-quiz', 'design-product-page-cache', 'lru-cache', 'time-based-key-value-store'])
    expect(lessons.find((l) => l.slug === 'sql-vs-nosql')).toMatchObject({ track: 'system-design', prerequisites: ['client-server-http'] })
    expect(getLessonDoc('sql-vs-nosql')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks'])
    expect(exercises.filter((e) => e.lessons.includes('sql-vs-nosql')).map((e) => e.slug).sort()).toEqual(['design-orders-and-activity-storage', 'sql-vs-nosql-quiz'])
    expect(lessons.find((l) => l.slug === 'load-balancing')).toMatchObject({ track: 'system-design', prerequisites: ['client-server-http'] })
    expect(getLessonDoc('load-balancing')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks'])
    expect(exercises.filter((e) => e.lessons.includes('load-balancing')).map((e) => e.slug).sort()).toEqual(['design-checkout-load-balancing', 'load-balancing-quiz'])
    expect(lessons.find((l) => l.slug === 'replication-sharding')).toMatchObject({ track: 'system-design', prerequisites: ['sql-vs-nosql'] })
    expect(getLessonDoc('replication-sharding')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks'])
    expect(exercises.filter((e) => e.lessons.includes('replication-sharding')).map((e) => e.slug).sort()).toEqual(['design-message-store-sharding', 'replication-sharding-quiz'])
    expect(lessons.find((l) => l.slug === 'queues-streams')).toMatchObject({ track: 'system-design', prerequisites: ['client-server-http'] })
    expect(getLessonDoc('queues-streams')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks'])
    expect(exercises.filter((e) => e.lessons.includes('queues-streams')).map((e) => e.slug).sort()).toEqual(['design-order-email-pipeline', 'queues-streams-quiz'])
    expect(lessons.find((l) => l.slug === 'rate-limiting')).toMatchObject({ track: 'system-design', prerequisites: ['load-balancing'] })
    expect(getLessonDoc('rate-limiting')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks'])
    expect(exercises.filter((e) => e.lessons.includes('rate-limiting')).map((e) => e.slug).sort()).toEqual(['design-api-rate-limiter', 'rate-limiting-quiz'])
    expect(lessons.find((l) => l.slug === 'url-shortener')).toMatchObject({ track: 'system-design', prerequisites: ['caching', 'sql-vs-nosql'] })
    expect(getLessonDoc('url-shortener')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Requirements & estimates', 'Visual', 'Design walkthrough', 'Pitfalls', 'Tips & tricks'])
    expect(exercises.filter((e) => e.lessons.includes('url-shortener')).map((e) => e.slug).sort()).toEqual(['design-pastebin', 'url-shortener-quiz'])
    expect(lessons.find((l) => l.slug === 'news-feed')).toMatchObject({ track: 'system-design', prerequisites: ['caching', 'queues-streams'] })
    expect(getLessonDoc('news-feed')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Requirements & estimates', 'Visual', 'Design walkthrough', 'Pitfalls', 'Tips & tricks'])
    expect(exercises.filter((e) => e.lessons.includes('news-feed')).map((e) => e.slug).sort()).toEqual(['design-notification-inbox', 'news-feed-quiz'])
    expect(lessons.find((l) => l.slug === 'chat')).toMatchObject({ track: 'system-design', prerequisites: ['queues-streams', 'load-balancing'] })
    expect(getLessonDoc('chat')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Requirements & estimates', 'Visual', 'Design walkthrough', 'Pitfalls', 'Tips & tricks'])
    expect(exercises.filter((e) => e.lessons.includes('chat')).map((e) => e.slug).sort()).toEqual(['chat-quiz', 'design-live-comments'])
  })

  const { lessons, exercises: allExercises } = getCatalog()
  const exercises = allExercises.filter(isProblem)
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

  it('maps every quiz flashcard to its quiz and lesson by review key', () => {
    const { flashcards, exercises } = getCatalog()
    const expected = exercises.reduce((n, x) => n + (x.type === 'quiz' ? (x as QuizExercise).flashcardIds.length : 0), 0)
    expect(Object.keys(flashcards)).toHaveLength(expected)
    expect(flashcards['client-server-http-quiz#idempotent']).toMatchObject({ quiz: 'client-server-http-quiz', lesson: 'client-server-http' })
    expect(flashcards['dns-cdn-quiz#dns-ttl']).toMatchObject({ quiz: 'dns-cdn-quiz', lesson: 'dns-cdn' })
    expect(flashcards['sql-vs-nosql-quiz#index']).toMatchObject({ quiz: 'sql-vs-nosql-quiz', lesson: 'sql-vs-nosql' })
    expect(flashcards['caching-quiz#ttl']).toMatchObject({ quiz: 'caching-quiz', lesson: 'caching' })
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

it('ships contributor templates with the required sections and fields', () => {
  const lesson = readFileSync('templates/lesson.mdx', 'utf8')
  for (const h of ['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks']) expect(lesson).toContain(`\n## ${h}\n`)
  const exercise = readFileSync('templates/exercise.yaml', 'utf8')
  for (const f of ['slug', 'type', 'title', 'leetcodeId', 'url', 'difficulty', 'lessons', 'ladderOrder', 'recognitionPrompt', 'hint']) {
    expect(exercise).toMatch(new RegExp(`^${f}:`, 'm'))
  }
  const required: Record<string, string[]> = {
    'templates/quiz.yaml': ['slug', 'type', 'title', 'lessons', 'ladderOrder', 'questions', 'flashcards'],
    'templates/design-prompt.yaml': ['slug', 'type', 'title', 'lessons', 'ladderOrder', 'prompt', 'rubric', 'reference'],
  }
  for (const [file, fields] of Object.entries(required)) {
    const text = readFileSync(file, 'utf8')
    for (const f of fields) expect(text, `${file} ${f}`).toMatch(new RegExp(`^${f}:`, 'm'))
  }
  const entries = (file: string, key: string) => {
    const text = readFileSync(file, 'utf8')
    const body = text.split(new RegExp(`^${key}:.*$`, 'm'))[1]?.split(/^\S/m)[0] ?? ''
    return (body.match(/^\s+- id:/gm) ?? []).length
  }
  expect(entries('templates/quiz.yaml', 'questions')).toBeGreaterThanOrEqual(3)
  expect(entries('templates/design-prompt.yaml', 'rubric')).toBeGreaterThanOrEqual(3)
})
