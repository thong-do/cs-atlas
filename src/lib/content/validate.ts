import type { ExerciseMeta, LessonMeta } from '@/lib/types'
import { VISUALIZER_KINDS } from '@/lib/visualizers/kinds'

/** Track slugs become top-level routes, so they must not shadow a page or a redirected v1 path. */
export const RESERVED_TRACK_SLUGS = ['tracks', 'exercises', 'roadmap', 'train', 'stats', 'settings', 'patterns', 'problems', 'static', '404']
export const REQUIRED_SECTIONS = ['Intuition', 'Visual', 'Pitfalls', 'Tips & tricks']
export const ALGORITHMS = 'algorithms'

export interface TrackInput {
  slug: string
  /** Folder name under content/tracks/. */
  folder: string
  order: number
  modules: { slug: string; lessons: string[]; comingSoon: string[] }[]
}
/** A lesson plus its top-level (`##`) headings, its file path (relative to content/, no extension) and raw MDX source. */
export type LessonInput = LessonMeta & { headings: string[]; path: string; raw: string }
/** An exercise plus its file path (relative to content/, no extension). */
export type ExerciseInput = ExerciseMeta & { path: string }
export interface ContentInput {
  tracks: TrackInput[]
  lessons: LessonInput[]
  exercises: ExerciseInput[]
}

const trackFile = (folder: string) => `content/tracks/${folder}/track.yaml`
const lessonFile = (l: { path: string }) => `content/${l.path}.mdx`
const exerciseFile = (e: { path: string }) => `content/${e.path}.yaml`
const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1)

/** Every message is "[rule] file: problem" so a contributor can fix it without reading code. */
export function validateContent({ tracks, lessons, exercises }: ContentInput): string[] {
  const errors: string[] = []
  const err = (rule: string, file: string, message: string) => errors.push(`[${rule}] ${file}: ${message}`)

  // V1 — tracks
  const orders = new Set<number>()
  for (const t of tracks) {
    if (t.slug !== t.folder) err('V1', trackFile(t.folder), `slug "${t.slug}" must equal the folder name "${t.folder}"`)
    if (RESERVED_TRACK_SLUGS.includes(t.slug)) err('V1', trackFile(t.folder), `slug "${t.slug}" is reserved for a site route`)
    if (orders.has(t.order)) err('V1', trackFile(t.folder), `order ${t.order} is already used by another track`)
    orders.add(t.order)
  }
  const trackFolders = new Set(tracks.map((t) => t.folder))

  // V2 — lesson slugs unique across tracks
  const bySlug = new Map<string, LessonInput>()
  for (const l of lessons) {
    if (baseName(l.path) !== l.slug) err('V2', lessonFile(l), `file name "${baseName(l.path)}" must equal slug "${l.slug}"`)
    const first = bySlug.get(l.slug)
    if (first) err('V2', lessonFile(l), `slug "${l.slug}" is already used in track "${first.track}"`)
    else bySlug.set(l.slug, l)
  }
  const known = (slug: string) => bySlug.has(slug)

  // V3/V4 — modules
  const placements = new Map<string, number>()
  for (const t of tracks) {
    for (const m of t.modules) {
      if (m.lessons.length === 0 && m.comingSoon.length === 0) {
        err('V4', trackFile(t.folder), `module "${m.slug}" needs at least one lesson or comingSoon title`)
      }
      for (const slug of m.lessons) {
        const l = bySlug.get(slug)
        if (!l || l.track !== t.folder) {
          err('V3', trackFile(t.folder), `module "${m.slug}" lists "${slug}", which is not a lesson in this track`)
        } else {
          placements.set(slug, (placements.get(slug) ?? 0) + 1)
        }
      }
    }
  }
  for (const l of bySlug.values()) {
    if (!trackFolders.has(l.track)) {
      err('V3', lessonFile(l), `track folder "${l.track}" has no track.yaml`)
      continue
    }
    const n = placements.get(l.slug) ?? 0
    if (n === 0) err('V3', lessonFile(l), `lesson is not listed in any module of track "${l.track}"`)
    if (n > 1) err('V3', lessonFile(l), `lesson is listed ${n} times in its track; list it once`)
  }

  // V5 — lesson references
  for (const l of lessons) {
    for (const ref of l.prerequisites) if (!known(ref)) err('V5', lessonFile(l), `unknown prerequisite "${ref}"`)
    for (const ref of l.confusedWith) if (!known(ref)) err('V5', lessonFile(l), `unknown confusedWith "${ref}"`)
  }

  // V6 — no prerequisite cycles
  const cycle = findCycle(lessons)
  if (cycle) err('V6', 'content/tracks', `prerequisite cycle ${cycle.join(' -> ')}`)

  // V8/V9 — per-track requirements and the quality bar
  for (const l of lessons) {
    if (l.track === ALGORITHMS) {
      if (l.triggers.length === 0) err('V8', lessonFile(l), 'algorithms lessons need at least one trigger')
      if (!l.complexity) err('V8', lessonFile(l), 'algorithms lessons need a complexity')
    }
    const required = [...REQUIRED_SECTIONS, l.track === ALGORITHMS ? 'Template' : 'Example']
    const missing = required.filter((h) => !l.headings.includes(h))
    if (missing.length > 0) err('V9', lessonFile(l), `missing section(s) ${missing.map((h) => `"## ${h}"`).join(', ')}`)
    for (const m of l.raw.matchAll(/<Visualizer\s[^>]*?\bkind=["']([^"']*)["']/g)) {
      if (!(VISUALIZER_KINDS as readonly string[]).includes(m[1])) {
        err('V9', lessonFile(l), `unknown visualizer kind "${m[1]}" (valid: ${VISUALIZER_KINDS.join(', ')})`)
      }
    }
  }

  // V5/V7/V11 — exercises
  const exerciseSlugs = new Set<string>()
  const ids = new Set<number>()
  const ladderKeys = new Set<string>()
  const practised = new Set<string>()
  for (const e of exercises) {
    const file = exerciseFile(e)
    if (baseName(e.path) !== e.slug) err('V11', file, `file name "${baseName(e.path)}" must equal slug "${e.slug}"`)
    if (exerciseSlugs.has(e.slug)) err('V11', file, `duplicate exercise slug "${e.slug}"`)
    exerciseSlugs.add(e.slug)
    if (ids.has(e.leetcodeId)) err('V11', file, `duplicate leetcodeId ${e.leetcodeId}`)
    ids.add(e.leetcodeId)
    if (!/^https:\/\/leetcode\.com\//.test(e.url)) err('V11', file, 'url must be on leetcode.com')
    if (e.lessons.length === 0) {
      err('V5', file, 'lists no lessons')
      continue
    }
    for (const ref of e.lessons) {
      if (known(ref)) practised.add(ref)
      else err('V5', file, `unknown lesson "${ref}"`)
    }
    const key = `${e.lessons[0]}#${e.ladderOrder}`
    if (ladderKeys.has(key)) err('V7', file, `ladderOrder ${e.ladderOrder} is already used in "${e.lessons[0]}"`)
    ladderKeys.add(key)
  }

  // V10 — every lesson is practised
  for (const l of bySlug.values()) if (!practised.has(l.slug)) err('V10', lessonFile(l), 'no exercise lists this lesson')

  return errors
}

function findCycle(lessons: LessonMeta[]): string[] | null {
  const bySlug = new Map(lessons.map((l) => [l.slug, l]))
  const state = new Map<string, 'visiting' | 'done'>()
  const path: string[] = []

  const visit = (slug: string): string[] | null => {
    if (state.get(slug) === 'done') return null
    if (state.get(slug) === 'visiting') return [...path.slice(path.indexOf(slug)), slug]
    state.set(slug, 'visiting')
    path.push(slug)
    for (const pre of bySlug.get(slug)?.prerequisites ?? []) {
      if (!bySlug.has(pre)) continue
      const found = visit(pre)
      if (found) return found
    }
    path.pop()
    state.set(slug, 'done')
    return null
  }

  for (const l of lessons) {
    const found = visit(l.slug)
    if (found) return found
  }
  return null
}
