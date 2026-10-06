import { describe, expect, it } from 'vitest'
import type { LessonMeta, TrackMeta } from '@/lib/types'
import { layoutBands, layoutRoadmap } from './roadmap-layout'

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

describe('layoutBands', () => {
  const L = (slug: string, track: string, prerequisites: string[] = []): LessonMeta => ({
    slug, track, title: slug, summary: 's', level: 'beginner', authors: [], prerequisites, confusedWith: [], triggers: [],
  })
  const T = (slug: string, order: number, lessons: string[]): TrackMeta => ({
    slug, title: slug.toUpperCase(), summary: 's', order, modules: [{ slug: 'm', title: 'M', lessons, comingSoon: [] }],
  })

  it('lays out one band per track, levelling only by in-track prerequisites', () => {
    const lessons = [L('a', 'algo'), L('b', 'algo', ['a']), L('c', 'sd', ['a']), L('d', 'sd', ['c'])]
    const { bands, crossEdges, maxRow } = layoutBands([T('algo', 1, ['a', 'b']), T('sd', 2, ['c', 'd'])], lessons)
    expect(bands.map((b) => [b.track, b.title])).toEqual([['algo', 'ALGO'], ['sd', 'SD']])
    expect(bands[1].layout.nodes.map((n) => [n.slug, n.level])).toEqual([['c', 0], ['d', 1]])
    expect(bands[1].layout.edges).toEqual([{ from: 'c', to: 'd' }])
    expect(crossEdges).toEqual([{ from: 'a', to: 'c' }])
    expect(maxRow).toBe(1)
  })
})
