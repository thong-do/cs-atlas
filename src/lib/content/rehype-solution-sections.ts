import type { Element, ElementContent, Root, RootContent } from 'hast'
import { SECTION_STEPS } from './solution-sections'

const text = (n: RootContent): string =>
  n.type === 'text' ? n.value : 'children' in n ? (n.children as RootContent[]).map(text).join('') : ''

/** Wraps each top-level `h2` and the siblings after it, up to the next `h2`, in `<section data-step>`. */
export function rehypeSolutionSections() {
  return (tree: Root) => {
    const children: RootContent[] = []
    let section: Element | undefined
    for (const node of tree.children) {
      if (node.type === 'element' && node.tagName === 'h2') {
        const step = SECTION_STEPS[text(node).trim()]
        section = { type: 'element', tagName: 'section', properties: step ? { dataStep: step } : {}, children: [] }
        children.push(section)
      }
      if (section) section.children.push(node as ElementContent)
      else children.push(node)
    }
    tree.children = children
  }
}
