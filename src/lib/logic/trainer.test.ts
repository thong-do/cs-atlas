import { describe, expect, it } from 'vitest'
import type { LessonMeta, ExerciseMeta, TrainAttempt } from '@/lib/types'
import { mulberry32, shuffle } from './rng'
import { buildQuestion, buildRound, pickDistractors, pickTrainExercises } from './trainer'

const p = (slug: string, confusedWith: string[] = []): LessonMeta => ({
  slug, track: 'algorithms', title: slug, summary: 's', level: 'beginner', authors: [], prerequisites: [], confusedWith, triggers: ['t'], complexity: 'O(n)',
})
const prob = (slug: string, pattern: string, prompt = 'a prompt'): ExerciseMeta => ({
  slug, type: 'external-problem', title: slug, leetcodeId: slug.length, url: 'https://leetcode.com/problems/x/', difficulty: 'easy',
  lessons: [pattern], ladderOrder: 1, recognitionPrompt: prompt, hint: 'h',
})
const lessons = [p('tp', ['sw', 'bs']), p('sw'), p('bs'), p('stack'), p('heap'), p('dp')]

describe('rng', () => {
  it('is deterministic per seed and shuffle keeps all items', () => {
    expect(mulberry32(7)()).toBe(mulberry32(7)())
    expect(shuffle([1, 2, 3, 4], mulberry32(1)).sort()).toEqual([1, 2, 3, 4])
  })
})

describe('pickDistractors', () => {
  it('returns 3 distinct non-correct patterns, preferring confusedWith', () => {
    for (let seed = 0; seed < 20; seed++) {
      const d = pickDistractors('tp', lessons, mulberry32(seed))
      expect(d).toHaveLength(3)
      expect(new Set(d).size).toBe(3)
      expect(d).not.toContain('tp')
      expect(d).toEqual(expect.arrayContaining(['sw', 'bs']))
    }
  })

  it('returns fewer when not enough patterns exist', () => {
    expect(pickDistractors('tp', [p('tp'), p('sw'), p('bs')], mulberry32(1))).toHaveLength(2)
    expect(pickDistractors('tp', [p('tp')], mulberry32(1))).toEqual([])
  })

  it('never returns duplicates when confusedWith repeats a slug', () => {
    const dupes = [p('tp', ['sw', 'sw', 'bs']), p('sw'), p('bs'), p('stack')]
    for (let seed = 0; seed < 20; seed++) {
      const d = pickDistractors('tp', dupes, mulberry32(seed))
      expect(new Set(d).size).toBe(d.length)
    }
  })

  it('ignores confusedWith slugs that are not in the pattern list', () => {
    expect(pickDistractors('tp', [p('tp', ['ghost']), p('sw')], mulberry32(1))).toEqual(['sw'])
  })
})

describe('buildQuestion', () => {
  it('includes the correct answer among shuffled distinct options', () => {
    const q = buildQuestion(prob('two-sum-ii', 'tp', 'sorted pair'), lessons, mulberry32(3))
    expect(q).toMatchObject({ problemSlug: 'two-sum-ii', prompt: 'sorted pair', correct: 'tp' })
    expect(q.options).toHaveLength(4)
    expect(q.options).toContain('tp')
    expect(new Set(q.options).size).toBe(4)
  })
})

describe('pickTrainExercises', () => {
  const exercises = [prob('a', 'tp'), prob('b', 'sw'), prob('c', 'bs'), prob('blank', 'tp', '  ')]

  it('picks unique problems with prompts, capped by pool size', () => {
    const picked = pickTrainExercises(exercises, [], 10, mulberry32(1))
    expect(picked.map((x) => x.slug).sort()).toEqual(['a', 'b', 'c'])
  })

  it('favours patterns with low accuracy', () => {
    const strong: TrainAttempt[] = Array.from({ length: 20 }, (_, i) => ({
      id: `${i}`, problemSlug: 'a', correctPattern: 'tp', chosenPattern: 'tp', correct: true, at: `2026-01-01T00:00:${String(i).padStart(2, '0')}Z`,
    }))
    const pool = [prob('a', 'tp'), prob('b', 'sw')]
    let weakPicks = 0
    for (let seed = 0; seed < 300; seed++) {
      if (pickTrainExercises(pool, strong, 1, mulberry32(seed))[0].slug === 'b') weakPicks++
    }
    // weights: tp = 2 - 1 = 1, sw = 2 - 0 = 2 → expect ~200/300
    expect(weakPicks).toBeGreaterThan(170)
    expect(weakPicks).toBeLessThan(230)
  })
})

describe('buildRound', () => {
  it('builds up to count questions and is shorter for a small pool', () => {
    expect(buildRound([prob('a', 'tp'), prob('b', 'sw')], lessons, [], 5, mulberry32(1))).toHaveLength(2)
  })

  it('only asks about algorithms exercises and offers algorithms lessons as answers', () => {
    const ls = [...lessons, { ...p('cache'), track: 'system-design' }]
    const exs = [prob('a', 'tp'), prob('lru', 'cache'), prob('b', 'sw')]
    for (let seed = 1; seed <= 20; seed++) {
      const round = buildRound(exs, ls, [], 5, mulberry32(seed))
      expect(round.map((q) => q.problemSlug)).not.toContain('lru')
      for (const q of round) expect(q.options).not.toContain('cache')
    }
  })
})
