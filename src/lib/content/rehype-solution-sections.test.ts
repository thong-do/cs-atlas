import type { Element, Root } from 'hast'
import { describe, expect, it } from 'vitest'
import { rehypeSolutionSections } from './rehype-solution-sections'

const el = (tagName: string, text: string): Element => ({ type: 'element', tagName, properties: {}, children: [{ type: 'text', value: text }] })

describe('rehypeSolutionSections', () => {
  it('wraps each h2 and what follows it in a section tagged with its step', () => {
    const intro = el('p', 'intro')
    const body = [el('h2', 'Intuition'), el('p', 'picture'), el('h2', 'Brute force'), el('p', 'idea'), el('pre', 'code')]
    const tree: Root = { type: 'root', children: [intro, ...body] }
    rehypeSolutionSections()(tree)
    expect(tree.children).toHaveLength(3)
    expect(tree.children[0]).toBe(intro)
    const [a, b] = tree.children.slice(1) as Element[]
    expect(a).toMatchObject({ tagName: 'section', properties: { dataStep: 'intuition' } })
    expect(a.children).toEqual(body.slice(0, 2))
    expect(b).toMatchObject({ tagName: 'section', properties: { dataStep: 'brute-force' } })
    expect(b.children).toEqual(body.slice(2))
  })
})
