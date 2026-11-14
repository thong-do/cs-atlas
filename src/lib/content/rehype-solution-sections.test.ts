import { compile } from '@mdx-js/mdx'
import type { Element, Root } from 'hast'
import { describe, expect, it } from 'vitest'
import { rehypeSolutionSections } from './rehype-solution-sections'

const el = (tagName: string, text: string): Element => ({ type: 'element', tagName, properties: {}, children: [{ type: 'text', value: text }] })
const file = { path: 'content/solutions/two-sum.mdx' }
const mdx = (value: string) => compile({ value, path: file.path }, { rehypePlugins: [rehypeSolutionSections] })

describe('rehypeSolutionSections', () => {
  it('wraps each h2 and what follows it in a section tagged with its step', () => {
    const body = [el('h2', 'Intuition'), el('p', 'picture'), el('h2', 'Brute force'), el('p', 'idea'), el('pre', 'code')]
    const tree: Root = { type: 'root', children: [{ type: 'text', value: '\n' }, ...body] }
    rehypeSolutionSections()(tree, file)
    expect(tree.children).toHaveLength(3)
    expect(tree.children[0]).toEqual({ type: 'text', value: '\n' })
    const [a, b] = tree.children.slice(1) as Element[]
    expect(a).toMatchObject({ tagName: 'section', properties: { dataStep: 'intuition' } })
    expect(a.children).toEqual(body.slice(0, 2))
    expect(b).toMatchObject({ tagName: 'section', properties: { dataStep: 'brute-force' } })
    expect(b.children).toEqual(body.slice(2))
  })
  it('throws on content before the first h2', () => {
    const tree: Root = { type: 'root', children: [el('p', 'intro'), el('h2', 'Intuition')] }
    expect(() => rehypeSolutionSections()(tree, file)).toThrow('content/solutions/two-sum.mdx: content before the first "## " heading')
  })
  it('throws on any h2 that is not a step, however MDX produced it', async () => {
    await expect(mdx('## Intuition\n\nx\n\n## Optimal\n\ny\n')).resolves.toBeDefined()
    await expect(mdx('## Intuition\n\nx\n\nNotes\n---\n')).rejects.toThrow('content/solutions/two-sum.mdx: heading "Notes" is not a step')
    await expect(mdx('## Intuition\n\nx\n\n  ## Notes\n')).rejects.toThrow('heading "Notes" is not a step')
    await expect(mdx('## Intuition\n\nx\n\n<h2>Optimal</h2>\n')).rejects.toThrow('use a "## " heading, not <h2>')
    await expect(mdx('Intro.\n\n## Intuition\n\nx\n')).rejects.toThrow('content before the first "## " heading')
  })
})
