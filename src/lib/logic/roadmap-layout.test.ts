import { describe, expect, it } from 'vitest'
import type { LessonMeta } from '@/lib/types'
import { layoutRoadmap } from './roadmap-layout'

const p = (slug: string, prerequisites: string[] = []): LessonMeta => ({
  slug, track: 'algorithms', title: slug, summary: 's', level: 'beginner', authors: [], prerequisites, confusedWith: [], triggers: ['t'], complexity: 'O(n)',
})

describe('layoutRoadmap', () => {
  it('levels nodes by longest prerequisite chain and keeps roadmap order within a level', () => {
    const lessons = [p('a'), p('c', ['a']), p('b', ['a']), p('d', ['b', 'c']), p('e', ['a', 'd'])]
    const layout = layoutRoadmap(['a', 'b', 'c', 'd', 'e'], lessons)
    const at = (slug: string) => layout.nodes.find((n) => n.slug === slug)!
    expect(at('a')).toEqual({ slug: 'a', level: 0, index: 0, rowSize: 1 })
    expect(at('b')).toEqual({ slug: 'b', level: 1, index: 0, rowSize: 2 })
    expect(at('c')).toEqual({ slug: 'c', level: 1, index: 1, rowSize: 2 })
    expect(at('e').level).toBe(3)
    expect(layout.levels).toBe(4)
    expect(layout.maxRow).toBe(2)
    expect(layout.edges).toContainEqual({ from: 'b', to: 'd' })
    expect(layout.edges).toHaveLength(6)
  })

  it('handles an empty roadmap', () => {
    expect(layoutRoadmap([], [])).toEqual({ nodes: [], edges: [], levels: 0, maxRow: 0 })
  })
})
