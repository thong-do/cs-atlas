import type { ContentInput } from './validate'

/** A solution file: its frontmatter, its path (relative to content/, no extension) and its raw MDX body. */
export interface SolutionInput {
  problem: string
  hook: string
  entry: string
  harness: 'function' | 'class' | 'custom'
  check?: string
  large?: unknown
  cases: unknown[]
  path: string
  raw: string
}

const MAX_HOOK_WORDS = 12
const MIN_CASES = 4
const APPROACHES = ['Brute force', 'Better', 'Optimal']
const SHAPES = [['Intuition', 'Brute force', 'Optimal'], ['Intuition', 'Brute force', 'Better', 'Optimal']]
const FENCE = /^\s*```/
const LIST_ITEM = /^\d+\.\s/
const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1)

/** Splits a body into its `##` sections, ignoring `##` lines inside code fences. Lines keep a flag for "inside a fence". */
function sections(raw: string) {
  const out: { title: string; lines: { text: string; code: boolean }[] }[] = []
  let fence = false
  for (const text of raw.split('\n')) {
    const isFence = FENCE.test(text)
    if (!fence && text.startsWith('## ')) out.push({ title: text.slice(3).trim(), lines: [] })
    else out.at(-1)?.lines.push({ text, code: fence || isFence })
    if (isFence) fence = !fence
  }
  return out
}

/** Opening fences in a section, as their language tags, with the block bodies. */
function codeBlocks(lines: { text: string }[]) {
  const blocks: { lang: string; body: string[] }[] = []
  let cur: { lang: string; body: string[] } | undefined
  for (const { text } of lines) {
    if (!cur && FENCE.test(text)) blocks.push((cur = { lang: text.trim().slice(3).trim().split(/\s/)[0], body: [] }))
    else if (cur && text.trim() === '```') cur = undefined
    else cur?.body.push(text)
  }
  return blocks
}

/** Top-level numbered lists: how many, and how many items in all. */
function numberedLists(lines: { text: string; code: boolean }[]) {
  let lists = 0, items = 0, inList = false
  for (const { text, code } of lines) {
    if (!code && LIST_ITEM.test(text)) {
      if (!inList) lists++
      inList = true
      items++
    } else if (code || (text.trim() !== '' && !/^\s/.test(text))) inList = false
  }
  return { lists, items }
}

const isTableDelimiter = (text: string) => {
  const cells = text.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')
  return text.includes('|') && cells.every((c) => /^\s*:?-+:?\s*$/.test(c))
}

/** V18: the structure of every solution file. Correctness is scripts/check-solutions.py's job. */
export function validateSolutions(solutions: SolutionInput[], { exercises }: ContentInput): string[] {
  const errors: string[] = []
  const types = new Map(exercises.map((e) => [e.slug, e.type]))
  const seen = new Set<string>()

  for (const s of solutions) {
    const err = (message: string) => errors.push(`[V18] content/${s.path}.mdx: ${message}`)
    const type = types.get(s.problem)
    if (!type) err(`unknown problem "${s.problem}"`)
    else if (type !== 'external-problem') err(`"${s.problem}" is not a LeetCode problem exercise`)
    if (seen.has(s.problem)) err(`problem "${s.problem}" already has a solution`)
    seen.add(s.problem)
    if (baseName(s.path) !== s.problem) err(`file name "${baseName(s.path)}" must equal problem "${s.problem}"`)

    const words = s.hook.trim().split(/\s+/).filter(Boolean).length
    if (words > MAX_HOOK_WORDS) err(`hook has ${words} words; keep it to ${MAX_HOOK_WORDS}`)
    if (s.cases.length < MIN_CASES) err(`needs at least ${MIN_CASES} cases, has ${s.cases.length}`)
    if (s.harness === 'custom' && !s.check) err('harness "custom" needs a check')
    if (s.harness !== 'custom' && s.check) err('only harness "custom" may have a check')
    if (s.harness !== 'function' && s.large) err('only harness "function" may have large')

    const secs = sections(s.raw)
    const titles = secs.map((x) => x.title)
    if (!SHAPES.some((shape) => shape.join('\n') === titles.join('\n'))) {
      err(`sections must be "## Intuition", "## Brute force", optionally "## Better", then "## Optimal" (found ${titles.map((t) => `"${t}"`).join(', ') || 'none'})`)
    }
    const cls = s.harness === 'class' ? s.entry : 'Solution'
    for (const { title, lines } of secs) {
      const blocks = codeBlocks(lines)
      if (title === 'Intuition' && blocks.length > 0) err('"## Intuition" must not contain a code block')
      if (!APPROACHES.includes(title)) continue
      const where = `"## ${title}"`
      const { lists, items } = numberedLists(lines)
      if (lists > 1) err(`${where} needs one numbered list of 2–5 steps, has ${lists} numbered lists`)
      else if (items < 2 || items > 5) err(`${where} needs one numbered list of 2–5 steps, has ${items} steps`)
      const python = blocks.filter((b) => b.lang === 'python')
      if (python.length !== 1) err(`${where} needs exactly one python code block, has ${python.length}`)
      else if (!new RegExp(`^class ${cls}\\b`, 'm').test(python[0].body.join('\n'))) err(`${where} code must define "class ${cls}"`)
      const prose = lines.filter((l) => !l.code).map((l) => l.text.trim())
      if (!prose.some(isTableDelimiter)) err(`${where} needs a trace table`)
      if (!prose.some((t) => t.startsWith('**Complexity:**'))) err(`${where} needs a "**Complexity:**" line`)
      if (title !== 'Optimal' && !prose.some((t) => /^\*\*What['’]s wasted:\*\*/.test(t))) err(`${where} needs a "**What's wasted:**" line`)
    }
  }
  return errors
}
