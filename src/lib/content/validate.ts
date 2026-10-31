import type { EstimateStep, Flashcard, LessonMeta, ProblemExercise, QuizQuestion, RubricPoint } from '@/lib/types'
import { ESTIMATE_UNITS, formatAmount } from '@/lib/logic/estimate'
import { VISUALIZER_KINDS } from '@/lib/visualizers/kinds'

/** Track slugs become top-level routes, so they must not shadow a page or a redirected v1 path. */
export const RESERVED_TRACK_SLUGS = ['tracks', 'exercises', 'roadmap', 'train', 'stats', 'settings', 'patterns', 'problems', 'static', '404']
export const REQUIRED_SECTIONS = ['Intuition', 'Visual', 'Pitfalls', 'Tips & tricks']
const CASE_STUDIES = 'case-studies'
const CASE_STUDY_SECTIONS = ['Requirements & estimates', 'Design walkthrough']
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
type ExerciseCommon = { slug: string; title: string; lessons: string[]; ladderOrder: number }
/** The raw Velite exercise shape, one member per exercise type. */
export type ExerciseInputDoc =
  | ProblemExercise
  | (ExerciseCommon & { type: 'quiz'; questions: QuizQuestion[]; flashcards: Flashcard[] })
  | (ExerciseCommon & { type: 'design-prompt'; prompt: string; rubric: RubricPoint[]; reference: string; hint?: string })
  | (ExerciseCommon & { type: 'estimate'; scenario: string; steps: (Omit<EstimateStep, 'unit'> & { unit: string })[]; takeaway: string })
/** An exercise plus its file path (relative to content/, no extension). */
export type ExerciseInput = ExerciseInputDoc & { path: string }
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
    for (const ref of l.background) {
      if (!known(ref)) err('V5', lessonFile(l), `unknown background "${ref}"`)
      else if (bySlug.get(ref)?.track === l.track) err('V5', lessonFile(l), `background "${ref}" is in the same track; use prerequisites`)
    }
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
    // Lessons in a module with slug "case-studies" use the case-study structure; other non-algorithms lessons need Example.
    const isCaseStudy = tracks.some((t) => t.slug === l.track && t.modules.some((m) => m.slug === CASE_STUDIES && m.lessons.includes(l.slug)))
    const required = l.track === ALGORITHMS
      ? [...REQUIRED_SECTIONS, 'Template']
      : isCaseStudy ? [...REQUIRED_SECTIONS, ...CASE_STUDY_SECTIONS] : [...REQUIRED_SECTIONS, 'Example']
    const missing = required.filter((h) => !l.headings.includes(h))
    if (missing.length > 0) err('V9', lessonFile(l), `missing section(s) ${missing.map((h) => `"## ${h}"`).join(', ')}`)
    for (const m of l.raw.matchAll(/<Visualizer\s[^>]*?\bkind=["']([^"']*)["']/g)) {
      if (!(VISUALIZER_KINDS as readonly string[]).includes(m[1])) {
        err('V9', lessonFile(l), `unknown visualizer kind "${m[1]}" (valid: ${VISUALIZER_KINDS.join(', ')})`)
      }
    }
  }

  // V5/V7/V11/V12/V13/V15 — exercises
  const exerciseSlugs = new Set<string>()
  const ids = new Set<number>()
  const ladderKeys = new Set<string>()
  const practised = new Set<string>()
  for (const e of exercises) {
    const file = exerciseFile(e)
    if (baseName(e.path) !== e.slug) err('V11', file, `file name "${baseName(e.path)}" must equal slug "${e.slug}"`)
    if (exerciseSlugs.has(e.slug)) err('V11', file, `duplicate exercise slug "${e.slug}"`)
    exerciseSlugs.add(e.slug)
    if (e.type === 'external-problem') {
      if (ids.has(e.leetcodeId)) err('V11', file, `duplicate leetcodeId ${e.leetcodeId}`)
      ids.add(e.leetcodeId)
      if (!/^https:\/\/leetcode\.com\//.test(e.url)) err('V11', file, 'url must be on leetcode.com')
    } else if (e.type === 'quiz') {
      const qids = new Set<string>()
      for (const q of e.questions) {
        if (qids.has(q.id)) err('V12', file, `duplicate question id "${q.id}"`)
        qids.add(q.id)
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) {
          err('V12', file, `question "${q.id}" answer ${q.answer} is not one of its ${q.choices.length} choices`)
        }
      }
      const fids = new Set<string>()
      for (const f of e.flashcards) {
        if (fids.has(f.id)) err('V12', file, `duplicate flashcard id "${f.id}"`)
        fids.add(f.id)
      }
    } else if (e.type === 'design-prompt') {
      const rids = new Set<string>()
      for (const r of e.rubric) {
        if (rids.has(r.id)) err('V13', file, `duplicate rubric id "${r.id}"`)
        rids.add(r.id)
      }
    } else if (e.type === 'estimate') {
      if (e.steps.length < 2 || e.steps.length > 4) err('V15', file, `needs 2–4 steps, has ${e.steps.length}`)
      const sids = new Set<string>()
      for (const st of e.steps) {
        if (sids.has(st.id)) err('V15', file, `duplicate step id "${st.id}"`)
        sids.add(st.id)
        const unit = ESTIMATE_UNITS.find((u) => u === st.unit)
        if (!unit) err('V15', file, `step "${st.id}" has unknown unit "${st.unit}" (valid: ${ESTIMATE_UNITS.join(', ')})`)
        const answerOk = Number.isFinite(st.answer) && st.answer > 0
        if (!answerOk) err('V15', file, `step "${st.id}" answer must be a positive number`)
        if (st.tolerance !== undefined && !(st.tolerance >= 1.5 && st.tolerance <= 10)) {
          err('V15', file, `step "${st.id}" tolerance ${st.tolerance} must be between 1.5 and 10`)
        }
        // formatAmount needs a known unit and a positive finite answer.
        if (unit && answerOk && !st.work.includes(formatAmount(st.answer, unit))) {
          err('V15', file, `step "${st.id}" work must show its answer "${formatAmount(st.answer, unit)}"`)
        }
      }
      if (!e.scenario.trim()) err('V15', file, 'scenario is empty')
      if (!e.takeaway.trim()) err('V15', file, 'takeaway is empty')
    }
    if (e.lessons.length === 0) {
      err('V5', file, 'lists no lessons')
      continue
    }
    for (const ref of e.lessons) {
      if (!known(ref)) err('V5', file, `unknown lesson "${ref}"`)
    }
    practised.add(e.lessons[0])
    const key = `${e.lessons[0]}#${e.ladderOrder}`
    if (ladderKeys.has(key)) err('V7', file, `ladderOrder ${e.ladderOrder} is already used in "${e.lessons[0]}"`)
    ladderKeys.add(key)
  }

  // V10 — every lesson has an exercise that counts for its mastery
  for (const l of bySlug.values()) if (!practised.has(l.slug)) err('V10', lessonFile(l), 'no exercise has this lesson first')

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
