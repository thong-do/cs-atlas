import type { Element, ElementContent, Root, RootContent } from 'hast'
import { SECTION_STEPS } from './solution-sections'

const text = (n: RootContent): string =>
  n.type === 'text' ? n.value : 'children' in n ? (n.children as RootContent[]).map(text).join('') : ''
const STEPS = Object.keys(SECTION_STEPS).map((t) => `"${t}"`).join(', ')

/**
 * Wraps each top-level `h2` and the siblings after it, up to the next `h2`, in `<section data-step>`.
 * Throws (failing the Velite build) when the rendered structure would hide or show text wrongly:
 * an `h2` that isn't a step (setext, indented or JSX headings slip past V18's line check), any `h1` (Velite's toc would
 * nest the steps under it and hide the solution), or content before the first `h2`.
 */
export function rehypeSolutionSections() {
  return (tree: Root, file?: { path?: string }) => {
    const fail = (message: string): never => {
      throw new Error(`${file?.path ?? 'solution'}: ${message}`)
    }
    const children: RootContent[] = []
    let section: Element | undefined
    for (const node of tree.children) {
      const jsx = node as { type: string; name?: string | null }
      if (jsx.type === 'mdxJsxFlowElement' && jsx.name === 'h2') fail('use a "## " heading, not <h2>')
      if (jsx.type === 'mdxJsxFlowElement' && jsx.name === 'h1') fail('remove <h1>; a solution has only its "## " step headings')
      if (node.type === 'element' && node.tagName === 'h1') {
        fail(`remove "# ${text(node).trim()}"; a solution has only its "## " step headings, and an h1 would hide them`)
      }
      if (node.type === 'element' && node.tagName === 'h2') {
        const title = text(node).trim()
        const step = (Object.hasOwn(SECTION_STEPS, title) ? SECTION_STEPS[title] : undefined) ?? fail(`heading "${title}" is not a step (${STEPS})`)
        section = { type: 'element', tagName: 'section', properties: { dataStep: step }, children: [] }
        children.push(section)
      } else if (!section && !(node.type === 'text' && node.value.trim() === '')) {
        fail('content before the first "## " heading would show before any step is opened')
      }
      if (section) section.children.push(node as ElementContent)
      else children.push(node)
    }
    tree.children = children
  }
}
