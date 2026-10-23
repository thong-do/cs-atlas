import type { PlacementQuestion } from '@/lib/types'
import type { ContentInput } from './validate'

/** Modules nobody places out of: they apply the whole track. They must have no placement questions. */
export const PLACEMENT_EXEMPT_MODULES: Record<string, string[]> = { 'system-design': ['case-studies'] }
/** `/[track]/placement` is a static route, so no lesson may take this slug. */
const RESERVED_LESSON_SLUG = 'placement'

/** A placement file plus its path (relative to content/, no extension). */
export interface PlacementInput { track: string; path: string; questions: PlacementQuestion[] }

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1)

/** V14. Every message is "[V14] file: problem", like validateContent. */
export function validatePlacements(placements: PlacementInput[], { tracks, lessons, exercises }: ContentInput): string[] {
  const errors: string[] = []
  const err = (file: string, message: string) => errors.push(`[V14] ${file}: ${message}`)

  for (const l of lessons) {
    if (l.slug === RESERVED_LESSON_SLUG) err(`content/${l.path}.mdx`, 'the slug "placement" is reserved for the placement quiz route')
  }
  const quizPrompts = new Set(exercises.flatMap((e) => (e.type === 'quiz' ? e.questions.map((q) => norm(q.prompt)) : [])))
  const bySlug = new Map(tracks.map((t) => [t.slug, t]))
  const seen = new Set<string>()

  for (const p of placements) {
    const file = `content/${p.path}.yaml`
    const track = bySlug.get(p.track)
    if (!track) {
      err(file, `unknown track "${p.track}"`)
      continue
    }
    if (baseName(p.path) !== p.track) err(file, `file name "${baseName(p.path)}" must equal track "${p.track}"`)
    if (seen.has(p.track)) err(file, `track "${p.track}" already has a placement quiz`)
    seen.add(p.track)

    const counts = new Map<string, number>()
    p.questions.forEach((q, i) => {
      const n = i + 1
      if (!track.modules.some((m) => m.slug === q.module)) err(file, `question ${n} names unknown module "${q.module}"`)
      counts.set(q.module, (counts.get(q.module) ?? 0) + 1)
      if (q.choices.length !== 4) err(file, `question ${n} needs exactly 4 choices, has ${q.choices.length}`)
      if (new Set(q.choices.map(norm)).size !== q.choices.length) err(file, `question ${n} has duplicate choices`)
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) err(file, `question ${n} answer ${q.answer} is not one of its choices`)
      if (quizPrompts.has(norm(q.prompt))) err(file, `question ${n} repeats a lesson-quiz prompt`)
    })

    const exempt = PLACEMENT_EXEMPT_MODULES[p.track] ?? []
    for (const m of track.modules) {
      const count = counts.get(m.slug) ?? 0
      if (exempt.includes(m.slug) || m.lessons.length === 0) {
        if (count > 0) err(file, `module "${m.slug}" must have no placement questions`)
      } else if (count < 2 || count > 3) {
        err(file, `module "${m.slug}" has ${count} question(s); it needs 2–3`)
      }
    }
  }
  return errors
}
