# Phase 0 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-track LeetCode trainer into the multi-track **CS Atlas** platform skeleton:
- tracks, modules, lessons and exercises
- a second track (System Design) with one complete lesson
- track pages and a cross-track roadmap
- a rebrand, redirects, open-source files and CI

All of this must keep v1 learners' data and URLs working.

**Architecture:**
- **Content:**
  - Content moves to `content/tracks/<track>/{track.yaml,lessons/*.mdx}` and `content/exercises/*.yaml`.
  - Velite gets three collections (`tracks`, `lessons`, `exercises`) and a rewritten `validateContent` with rules V1–V11.
  - The loader builds `Catalog = { tracks, lessons, exercises }` in global order.
- **Routes:**
  - Lessons move to `/[track]/[lesson]` and exercises to `/exercises/[slug]`.
  - Redirects for the old URLs live in `vercel.json`.
- **Unchanged storage:** the store layer, IndexedDB and the backup format are not touched.

**Tech Stack:**
- Next.js 15.5 (App Router, `output: 'export'`, `trailingSlash: true`), React 19 and TypeScript
- Tailwind v4 and shadcn/ui (Radix)
- Velite 0.2 (MDX/YAML, `strict: true`)
- Dexie and ts-fsrs
- Vitest with fake-indexeddb, and Playwright

**Spec:** `docs/superpowers/specs/2026-10-06-phase-0-foundations-design.md`. Read it, including the amendments made while planning (§3.4, §4.4, §4.5, §5).

## Global Constraints

- **Repo root:** `/Users/thongdo/IT/algorithms/leethub`, on branch `feat/phase-0`. Never commit to `main`.
- **Every commit message ends with:**

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```
- **Storage stays v1.** Do not modify any of these:
  - `src/lib/store/**` (except comments)
  - `ProblemProgress`, `Note`, `ReviewCard`, `ReviewLog`, `TrainAttempt` (`problemSlug`, `correctPattern`, `chosenPattern`), `UserData`, `Meta`, `SCHEMA_VERSION`
  - the IndexedDB name `leethub`, the `LeetHubDB` class, and the backup marker `app: 'leethub'`
- **No slug changes.** Lesson slugs (the 18 pattern slugs) and exercise slugs (the 138 problem slugs) keep their exact values.
- **Algorithms lesson order** must equal, exactly:

  ```
  arrays-hashing, two-pointers, stack, sliding-window, binary-search, linked-list, trees, tries, heap, backtracking, intervals, greedy, graphs, dp-1d, advanced-graphs, dp-2d, bit-manipulation, math-geometry
  ```
- **Move files with `git mv`** so history follows them.
- **UI copy:** "pattern" becomes "lesson" and "problem" becomes "exercise". The trainer is the exception and keeps "pattern", because it trains pattern recognition.
- **New visualizers** must have a constant figure height across steps and past-tense captions for events that already happened.
- **Before each commit, from the repo root:**
  - `npm test`, `npm run typecheck` and `npm run lint` must pass.
  - Tasks that change pages or routes must also pass `npm run e2e`.
- **Lessons need these `##` sections:** Intuition, Visual, Pitfalls and Tips & tricks, plus **Template** (algorithms) or **Example** (other tracks). Every lesson needs at least one exercise.

## Review Focus

1. **v1 data after the upgrade.** A returning learner's v1 IndexedDB data (solved exercises, due reviews) must still show as solved and due. *Pinned by Task 7, `e2e/upgrade.spec.ts`.*
2. **Old bookmarks.** A bookmarked `/patterns/two-pointers` or `/problems/3sum/` must land on the new page (308 redirect, then 200). *Pinned by Task 7, `scripts/check-deploy.mjs`, run against the deployment.*
3. **Contributor errors.** A contributor who forgets `## Pitfalls`, or links a lesson that doesn't exist, must get a build error naming the file and the rule. *Pinned by Task 1, `validate.test.ts` (one test per rule).*
4. **Existing mastery numbers.** These must not change. An algorithms exercise whose second lesson is also in algorithms must not count towards that second lesson. *Pinned by Task 2, `mastery.test.ts`.*
5. **Phone width.** The six-item bottom nav and the new pages must not scroll sideways at 375px. *Pinned by Task 4, `e2e/layout.spec.ts`, which gains `/tracks/`, `/algorithms/`, `/system-design/` and `/system-design/caching/`.*

---

## File map

| Area | Files |
|---|---|
| Content | `content/tracks/algorithms/track.yaml` (new), `content/tracks/algorithms/lessons/*.mdx` (moved from `content/patterns/`), `content/tracks/system-design/{track.yaml,lessons/caching.mdx}` (new), `content/exercises/*.yaml` (moved from `content/problems/`); `content/roadmap.yaml` deleted |
| Build | `velite.config.ts`, `vercel.json` (new), `package.json` (name) |
| Types and content API | `src/lib/types.ts`, `src/lib/content/{validate,index,catalog-context,hrefs}.ts(x)` |
| Logic | `src/lib/logic/{lessons,mastery,recommend,trainer,roadmap-layout,filter}.ts` (+ tests) |
| Visualizer | `src/lib/visualizers/cache-steps.ts` (+ test), `src/components/visualizers/{cache-view,visualizer}.tsx` |
| Routes | `src/app/[track]/page.tsx`, `src/app/[track]/[lesson]/page.tsx`, `src/app/tracks/page.tsx`, `src/app/exercises/{page,[slug]/page}.tsx`; `src/app/patterns` and `src/app/problems` deleted |
| Components | `src/components/lessons/*` (from `patterns/`), `src/components/exercises/*` (from `problems/`), `src/components/tracks/*` (new), plus the shell, palette, roadmap, today, train and stats views |
| Open source | `LICENSE`, `LICENSE-CONTENT`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `README.md`, `templates/*`, `.github/**` |
| Scripts | `scripts/check-deploy.mjs` |

---

### Task 1: Content model v2 (data layer, validator, mechanical rename and route moves)

This task changes no behaviour. Every page shows what it showed before, at its new URL.

**Files:**
- Move: `content/patterns/*.mdx` → `content/tracks/algorithms/lessons/`
- Move: `content/problems/*.yaml` → `content/exercises/`
- Create: `content/tracks/algorithms/track.yaml`
- Delete: `content/roadmap.yaml`
- Modify: `velite.config.ts`, `src/lib/types.ts`, `src/lib/content/validate.ts`, `src/lib/content/validate.test.ts`, `src/lib/content/index.ts`, `src/lib/content/index.test.ts`, `src/lib/content/catalog-context.tsx`
- Create: `src/lib/content/hrefs.ts`
- Move: `src/app/patterns/[slug]/page.tsx` → `src/app/[track]/[lesson]/page.tsx`
- Move: `src/app/problems/` → `src/app/exercises/`
- Move: `src/components/patterns/` → `src/components/lessons/`
- Move: `src/components/problems/` → `src/components/exercises/`
- Modify: every consumer listed in Step 9, and all unit and e2e tests that reference renamed identifiers or URLs

**Interfaces:**
- Produces (used by every later task):

```ts
// src/lib/types.ts (new and renamed; storage types unchanged)
export type Level = 'beginner' | 'intermediate' | 'advanced'
export interface ModuleMeta { slug: string; title: string; lessons: string[]; comingSoon: string[] }
export interface TrackMeta { slug: string; title: string; summary: string; order: number; modules: ModuleMeta[] }
export interface LessonMeta {
  slug: string; track: string; title: string; summary: string; level: Level; authors: string[]
  prerequisites: string[]; confusedWith: string[]; triggers: string[]; complexity?: string
}
export interface ExerciseMeta {
  slug: string; type: 'external-problem'; title: string; leetcodeId: number; url: string; difficulty: Difficulty
  /** First entry is the primary lesson (ladder placement + trainer answer). */
  lessons: string[]; ladderOrder: number; recognitionPrompt: string; hint: string
}
export interface Catalog { tracks: TrackMeta[]; lessons: LessonMeta[]; exercises: ExerciseMeta[] }
```

  - `getCatalog()`: tracks are sorted by `order`. Lessons follow the global order: tracks, then modules, then lessons. Exercises are sorted by the global rank of their primary lesson, then by `ladderOrder`.
  - Other loader functions: `getLessonDoc(slug)` and `getExercise(slug)`.
  - `useCatalog()` returns the catalog plus `trackBySlug`, `lessonBySlug` and `exerciseBySlug`.
  - `src/lib/content/hrefs.ts` exports `lessonHref`, `trackHref` and `exerciseHref`.
  - In `filter.ts`:
    - `exerciseStatus` and `ExerciseStatus`
    - `filterExercises(exercises, progress, f)`
    - `ExerciseFilter` with fields `{ q, lesson, difficulty, status }`
  - Logic renames:

    | Old | New |
    |---|---|
    | `patternMastery` | `lessonMastery` |
    | `recommendedPattern` | `recommendedLesson` |
    | `pickTrainProblems` | `pickTrainExercises` |

    Their signatures change only in the parameter types. Task 2 changes the behaviour.

- [ ] **Step 1: Move the content with git**

```bash
mkdir -p content/tracks/algorithms/lessons content/exercises
git mv content/patterns/*.mdx content/tracks/algorithms/lessons/
git mv content/problems/*.yaml content/exercises/
git rm -q content/roadmap.yaml
rmdir content/patterns content/problems
```

- [ ] **Step 2: Rewrite the frontmatter and YAML fields with one script**

For each of the 18 lessons, the script does three things:
- removes the `stub: …` line
- adds `level` from the table below
- adds `authors: [cs-atlas]`

For every exercise, it adds `type: external-problem` after the `slug:` line and renames `patterns:` to `lessons:`.

```bash
python3 - <<'EOF'
import pathlib, re
LEVEL = {**{s: 'beginner' for s in ['arrays-hashing','two-pointers','stack','sliding-window','binary-search','linked-list']},
         **{s: 'intermediate' for s in ['trees','tries','heap','backtracking','intervals','greedy','graphs','dp-1d','bit-manipulation','math-geometry']},
         **{s: 'advanced' for s in ['advanced-graphs','dp-2d']}}
for f in pathlib.Path('content/tracks/algorithms/lessons').glob('*.mdx'):
    t = f.read_text()
    t = re.sub(r'^stub: .*\n', '', t, flags=re.M)
    t = t.replace('\nsummary:', f'\nlevel: {LEVEL[f.stem]}\nauthors: [cs-atlas]\nsummary:', 1)
    f.write_text(t)
for f in pathlib.Path('content/exercises').glob('*.yaml'):
    t = f.read_text()
    t = re.sub(r'^(slug: .*\n)', r'\1type: external-problem\n', t, count=1, flags=re.M)
    t = re.sub(r'^patterns:', 'lessons:', t, count=1, flags=re.M)
    f.write_text(t)
EOF
grep -L '^level:' content/tracks/algorithms/lessons/*.mdx; grep -L '^type: external-problem' content/exercises/*.yaml; grep -l '^stub:\|^patterns:' -r content
```

Expected: all three `grep` commands print nothing.

- [ ] **Step 3: Create `content/tracks/algorithms/track.yaml`**

```yaml
slug: algorithms
title: Algorithms
summary: "Recognise the pattern, apply the template, remember it for good."
order: 1
modules:
  - slug: foundations
    title: Foundations
    lessons: [arrays-hashing, two-pointers, stack, sliding-window, binary-search, linked-list]
  - slug: trees-heaps
    title: Trees & Heaps
    lessons: [trees, tries, heap]
  - slug: search-greedy
    title: Search & Greedy
    lessons: [backtracking, intervals, greedy]
  - slug: graphs-dp
    title: Graphs & DP
    lessons: [graphs, dp-1d, advanced-graphs, dp-2d]
  - slug: math-bits
    title: Math & Bits
    lessons: [bit-manipulation, math-geometry]
```

- [ ] **Step 4: Update `src/lib/types.ts`**

Replace the `PatternMeta`, `ProblemMeta` and `Catalog` blocks (lines 5–34) with the **Interfaces → Produces** block above. Keep `Difficulty`, `SolveRating`, `ReviewRating` and everything from `StoredCard` down unchanged. Add this comment above `ProblemProgress`:

```ts
// Storage types keep their v1 names (problemSlug, correctPattern…) so existing IndexedDB data
// and backups stay valid. "Problem" here means "exercise"; "pattern" means "lesson".
```

- [ ] **Step 5: Write the failing validator tests**

Replace `src/lib/content/validate.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import type { ExerciseMeta } from '@/lib/types'
import { validateContent, type ContentInput, type LessonInput, type TrackInput } from './validate'

const ALGO_SECTIONS = ['Intuition', 'Visual', 'Template', 'Complexity', 'Pitfalls', 'Tips & tricks']
const OTHER_SECTIONS = ['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks']

const lesson = (slug: string, track = 'algorithms', o: Partial<LessonInput> = {}): LessonInput => ({
  slug, track, title: slug, summary: 's', level: 'beginner', authors: [], prerequisites: [], confusedWith: [],
  triggers: track === 'algorithms' ? ['t'] : [], complexity: track === 'algorithms' ? 'O(n)' : undefined,
  headings: track === 'algorithms' ? ALGO_SECTIONS : OTHER_SECTIONS, ...o,
})
const exercise = (slug: string, lessons: string[], o: Partial<ExerciseMeta> = {}): ExerciseMeta => ({
  slug, type: 'external-problem', title: slug, leetcodeId: slug.length * 100 + slug.charCodeAt(0),
  url: `https://leetcode.com/problems/${slug}/`, difficulty: 'easy', lessons, ladderOrder: 1,
  recognitionPrompt: 'prompt text', hint: 'hint', ...o,
})
const track = (slug: string, order: number, modules: TrackInput['modules'], folder = slug): TrackInput => ({ slug, folder, order, modules })

const valid = (): ContentInput => ({
  tracks: [
    track('algorithms', 1, [{ slug: 'm1', lessons: ['aaa', 'bbb'], comingSoon: [] }]),
    track('system-design', 2, [
      { slug: 'm1', lessons: ['ccc'], comingSoon: [] },
      { slug: 'm2', lessons: [], comingSoon: ['Later'] },
    ]),
  ],
  lessons: [
    lesson('aaa'),
    lesson('bbb', 'algorithms', { prerequisites: ['aaa'], confusedWith: ['aaa'] }),
    lesson('ccc', 'system-design', { prerequisites: ['aaa'] }),
  ],
  exercises: [
    exercise('p1', ['aaa']),
    exercise('p2', ['bbb', 'ccc'], { leetcodeId: 2 }),
  ],
})

describe('validateContent', () => {
  it('accepts valid content, including cross-track references', () => {
    expect(validateContent(valid())).toEqual([])
  })

  it('V1: track slug must match its folder, be unreserved, and have a unique order', () => {
    const c = valid()
    c.tracks[0] = track('algos', 1, c.tracks[0].modules, 'algorithms')
    c.tracks[1] = { ...c.tracks[1], order: 1 }
    c.tracks.push(track('stats', 3, [{ slug: 'm', lessons: [], comingSoon: ['x'] }]))
    const errors = validateContent(c)
    expect(errors).toContain('[V1] content/tracks/algorithms/track.yaml: slug "algos" must equal the folder name "algorithms"')
    expect(errors).toContain('[V1] content/tracks/system-design/track.yaml: order 1 is already used by another track')
    expect(errors).toContain('[V1] content/tracks/stats/track.yaml: slug "stats" is reserved for a site route')
  })

  it('V2: lesson slugs are unique across tracks', () => {
    const c = valid()
    c.lessons.push(lesson('aaa', 'system-design'))
    expect(validateContent(c)).toContain('[V2] content/tracks/system-design/lessons/aaa.mdx: slug "aaa" is already used in track "algorithms"')
  })

  it('V3: every lesson sits in exactly one module of its own track', () => {
    const c = valid()
    c.tracks[0].modules[0].lessons = ['aaa', 'aaa', 'ghost', 'ccc']
    const errors = validateContent(c)
    expect(errors).toContain('[V3] content/tracks/algorithms/track.yaml: module "m1" lists "ghost", which is not a lesson in this track')
    expect(errors).toContain('[V3] content/tracks/algorithms/track.yaml: module "m1" lists "ccc", which is not a lesson in this track')
    expect(errors).toContain('[V3] content/tracks/algorithms/lessons/aaa.mdx: lesson is listed 2 times in its track; list it once')
    expect(errors).toContain('[V3] content/tracks/algorithms/lessons/bbb.mdx: lesson is not listed in any module of track "algorithms"')
  })

  it('V3: a lesson folder needs a track.yaml', () => {
    const c = valid()
    c.lessons.push(lesson('ddd', 'orphan'))
    c.exercises.push(exercise('p3', ['ddd'], { leetcodeId: 3 }))
    expect(validateContent(c)).toContain('[V3] content/tracks/orphan/lessons/ddd.mdx: track folder "orphan" has no track.yaml')
  })

  it('V4: a module needs a lesson or a comingSoon title', () => {
    const c = valid()
    c.tracks[1].modules[1].comingSoon = []
    expect(validateContent(c)).toContain('[V4] content/tracks/system-design/track.yaml: module "m2" needs at least one lesson or comingSoon title')
  })

  it('V5: prerequisites, confusedWith and exercise lessons must exist', () => {
    const c = valid()
    c.lessons[1] = lesson('bbb', 'algorithms', { prerequisites: ['zzz'], confusedWith: ['yyy'] })
    c.exercises[0] = exercise('p1', ['aaa', 'nope'])
    const errors = validateContent(c)
    expect(errors).toContain('[V5] content/tracks/algorithms/lessons/bbb.mdx: unknown prerequisite "zzz"')
    expect(errors).toContain('[V5] content/tracks/algorithms/lessons/bbb.mdx: unknown confusedWith "yyy"')
    expect(errors).toContain('[V5] content/exercises/p1.yaml: unknown lesson "nope"')
  })

  it('V5: an exercise must list at least one lesson', () => {
    const c = valid()
    c.exercises.push(exercise('p9', [], { leetcodeId: 9 }))
    expect(validateContent(c)).toContain('[V5] content/exercises/p9.yaml: lists no lessons')
  })

  it('V6: rejects prerequisite cycles, including across tracks', () => {
    const c = valid()
    c.lessons[0] = lesson('aaa', 'algorithms', { prerequisites: ['ccc'] })
    expect(validateContent(c).some((e) => e.startsWith('[V6] content/tracks: prerequisite cycle '))).toBe(true)
  })

  it('V7: ladderOrder is unique per primary lesson only', () => {
    const c = valid()
    c.exercises.push(exercise('p3', ['aaa'], { leetcodeId: 3 }))
    expect(validateContent(c)).toContain('[V7] content/exercises/p3.yaml: ladderOrder 1 is already used in "aaa"')
    const ok = valid()
    ok.exercises.push(exercise('p4', ['bbb', 'aaa'], { leetcodeId: 4, ladderOrder: 2 }))
    expect(validateContent(ok)).toEqual([])
  })

  it('V8: algorithms lessons need triggers and a complexity; other tracks do not', () => {
    const c = valid()
    c.lessons[0] = lesson('aaa', 'algorithms', { triggers: [], complexity: undefined })
    const errors = validateContent(c)
    expect(errors).toContain('[V8] content/tracks/algorithms/lessons/aaa.mdx: algorithms lessons need at least one trigger')
    expect(errors).toContain('[V8] content/tracks/algorithms/lessons/aaa.mdx: algorithms lessons need a complexity')
  })

  it('V9: lessons need the quality-bar sections (Template for algorithms, Example elsewhere)', () => {
    const c = valid()
    c.lessons[0] = lesson('aaa', 'algorithms', { headings: ['Intuition', 'Visual', 'Template', 'Tips & tricks'] })
    c.lessons[2] = lesson('ccc', 'system-design', { prerequisites: ['aaa'], headings: ALGO_SECTIONS })
    const errors = validateContent(c)
    expect(errors).toContain('[V9] content/tracks/algorithms/lessons/aaa.mdx: missing section(s) "## Pitfalls"')
    expect(errors).toContain('[V9] content/tracks/system-design/lessons/ccc.mdx: missing section(s) "## Example"')
  })

  it('V10: every lesson needs at least one exercise', () => {
    const c = valid()
    c.exercises = [exercise('p1', ['aaa'])]
    const errors = validateContent(c)
    expect(errors).toContain('[V10] content/tracks/algorithms/lessons/bbb.mdx: no exercise lists this lesson')
    expect(errors).toContain('[V10] content/tracks/system-design/lessons/ccc.mdx: no exercise lists this lesson')
  })

  it('V11: exercise slugs and LeetCode ids are unique and URLs are on leetcode.com', () => {
    const c = valid()
    c.exercises.push(exercise('p1', ['aaa'], { leetcodeId: 2, ladderOrder: 9 }))
    c.exercises.push(exercise('p5', ['aaa'], { leetcodeId: 5, ladderOrder: 5, url: 'https://example.com/problems/p5/' }))
    const errors = validateContent(c)
    expect(errors).toContain('[V11] content/exercises/p1.yaml: duplicate exercise slug "p1"')
    expect(errors).toContain('[V11] content/exercises/p1.yaml: duplicate leetcodeId 2')
    expect(errors).toContain('[V11] content/exercises/p5.yaml: url must be on leetcode.com')
  })
})
```

Run `npx vitest run src/lib/content/validate.test.ts`. Expected: FAIL, because the `validate.ts` exports don't exist yet.

- [ ] **Step 6: Implement the validator**

Replace `src/lib/content/validate.ts` with:

```ts
import type { ExerciseMeta, LessonMeta } from '@/lib/types'

/** Track slugs become top-level routes, so they must not shadow a page or a redirected v1 path. */
export const RESERVED_TRACK_SLUGS = ['tracks', 'exercises', 'roadmap', 'train', 'stats', 'settings', 'patterns', 'problems', 'static']
export const REQUIRED_SECTIONS = ['Intuition', 'Visual', 'Pitfalls', 'Tips & tricks']
export const ALGORITHMS = 'algorithms'

export interface TrackInput {
  slug: string
  /** Folder name under content/tracks/. */
  folder: string
  order: number
  modules: { slug: string; lessons: string[]; comingSoon: string[] }[]
}
/** A lesson plus its top-level (`##`) headings. */
export type LessonInput = LessonMeta & { headings: string[] }
export interface ContentInput {
  tracks: TrackInput[]
  lessons: LessonInput[]
  exercises: ExerciseMeta[]
}

const trackFile = (folder: string) => `content/tracks/${folder}/track.yaml`
const lessonFile = (l: { track: string; slug: string }) => `content/tracks/${l.track}/lessons/${l.slug}.mdx`
const exerciseFile = (slug: string) => `content/exercises/${slug}.yaml`

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
  }

  // V5/V7/V11 — exercises
  const exerciseSlugs = new Set<string>()
  const ids = new Set<number>()
  const ladderKeys = new Set<string>()
  const practised = new Set<string>()
  for (const e of exercises) {
    const file = exerciseFile(e.slug)
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
```

Run `npx vitest run src/lib/content/validate.test.ts`. Expected: all 14 tests pass.

- [ ] **Step 7: Rewrite `velite.config.ts`**

Replace the three collections and the `prepare` hook. Keep `defineConfig` options other than `collections`/`prepare` unchanged. `s.path()` resolves to the file path relative to `content/` without its extension, e.g. `tracks/algorithms/lessons/two-pointers`.

```ts
const tracks = defineCollection({
  name: 'Track',
  pattern: 'tracks/*/track.yaml',
  schema: s
    .object({
      slug: s.string(),
      title: s.string(),
      summary: s.string(),
      order: s.number().int().positive(),
      modules: s
        .array(
          s.object({
            slug: s.string(),
            title: s.string(),
            lessons: s.array(s.string()).default([]),
            comingSoon: s.array(s.string()).default([]),
          }).strict(),
        )
        .min(1),
      path: s.path(),
    })
    .transform(({ path, ...t }) => ({ ...t, folder: path.split('/')[1] })),
})

const lessons = defineCollection({
  name: 'Lesson',
  pattern: 'tracks/*/lessons/*.mdx',
  schema: s
    .object({
      slug: s.slug('lessons'),
      title: s.string(),
      summary: s.string(),
      level: s.enum(['beginner', 'intermediate', 'advanced']),
      authors: s.array(s.string()).default([]),
      prerequisites: s.array(s.string()).default([]),
      confusedWith: s.array(s.string()).default([]),
      triggers: s.array(s.string()).default([]),
      complexity: s.string().optional(),
      path: s.path(),
      toc: s.toc(),
      body: s.mdx(),
    })
    .transform(({ path, ...l }) => ({ ...l, track: path.split('/')[1] })),
})

const exercises = defineCollection({
  name: 'Exercise',
  pattern: 'exercises/*.yaml',
  schema: s
    .object({
      slug: s.slug('exercises'),
      // Phase 2 turns this into a discriminated union when quiz and flashcard exercises arrive.
      type: s.literal('external-problem'),
      title: s.string(),
      leetcodeId: s.number().int().positive(),
      url: s.string().url(),
      difficulty: s.enum(['easy', 'medium', 'hard']),
      lessons: s.array(s.string()).min(1),
      ladderOrder: s.number().int().positive(),
      recognitionPrompt: s.string().min(10),
      hint: s.string().min(5),
    })
    .strict(), // unknown fields (e.g. a pasted solution) fail the build
})
```

Then use:

```ts
  collections: { tracks, lessons, exercises },
  // …mdx unchanged…
  prepare: ({ tracks, lessons, exercises }) => {
    const errors = validateContent({
      tracks: tracks.map((t) => ({ slug: t.slug, folder: t.folder, order: t.order, modules: t.modules })),
      lessons: lessons.map((l) => ({ ...l, headings: l.toc.map((h) => h.title) })),
      exercises,
    })
    if (errors.length > 0) {
      throw new Error(`Content validation failed:\n- ${errors.join('\n- ')}`)
    }
  },
```

Run `npx velite build --strict`. Expected: it succeeds, and `.velite/` contains `tracks.json`, `lessons.json` and `exercises.json`.

To check that validation really runs, temporarily delete `## Pitfalls` from `two-pointers.mdx` and rerun. It must fail with `[V9] content/tracks/algorithms/lessons/two-pointers.mdx: missing section(s) "## Pitfalls"`. Then restore the file with `git checkout -- content/tracks/algorithms/lessons/two-pointers.mdx`.

- [ ] **Step 8: Rewrite the loader, the catalog context and `hrefs`, test first**

Replace `src/lib/content/index.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import { getCatalog, getExercise, getLessonDoc } from './index'

const ALGORITHMS_ORDER = ['arrays-hashing', 'two-pointers', 'stack', 'sliding-window', 'binary-search', 'linked-list', 'trees', 'tries', 'heap', 'backtracking', 'intervals', 'greedy', 'graphs', 'dp-1d', 'advanced-graphs', 'dp-2d', 'bit-manipulation', 'math-geometry']
const SECTIONS = ['Intuition', 'Visual', 'Template', 'Complexity', 'Pitfalls', 'Tips & tricks']

describe('content accessors', () => {
  it('sorts tracks by order and lessons by track, module and position', () => {
    const { tracks, lessons } = getCatalog()
    expect(tracks.map((t) => t.order)).toEqual([...tracks.map((t) => t.order)].sort((a, b) => a - b))
    expect(lessons.map((l) => l.slug)).toEqual(tracks.flatMap((t) => t.modules.flatMap((m) => m.lessons)))
  })

  it('keeps the v1 algorithms order exactly', () => {
    expect(getCatalog().lessons.filter((l) => l.track === 'algorithms').map((l) => l.slug)).toEqual(ALGORITHMS_ORDER)
  })

  it('exposes slim lesson metadata with the track derived from the folder', () => {
    const l = getCatalog().lessons[0]
    expect(l).not.toHaveProperty('body')
    expect(l).not.toHaveProperty('toc')
    expect(l.track).toBe('algorithms')
    expect(getLessonDoc('two-pointers')?.track).toBe('algorithms')
  })

  it('sorts exercises by primary lesson order, then ladderOrder', () => {
    const { exercises, lessons } = getCatalog()
    const rank = new Map(lessons.map((l, i) => [l.slug, i]))
    const keys = exercises.map((e) => [rank.get(e.lessons[0])!, e.ladderOrder])
    expect(keys).toEqual([...keys].sort((a, b) => a[0] - b[0] || a[1] - b[1]))
  })

  it('finds a lesson doc with compiled body and an exercise by slug', () => {
    expect(getLessonDoc('two-pointers')?.body.length).toBeGreaterThan(0)
    expect(getExercise('two-sum')?.leetcodeId).toBe(1)
    expect(getExercise('two-sum')?.type).toBe('external-problem')
    expect(getExercise('missing')).toBeUndefined()
  })
})

describe('content inventory', () => {
  const { lessons, exercises } = getCatalog()
  const algorithms = lessons.filter((l) => l.track === 'algorithms')

  it('has 18 algorithms lessons with the six standard sections in order', () => {
    expect(algorithms).toHaveLength(18)
    for (const l of algorithms) expect(getLessonDoc(l.slug)!.toc.map((t) => t.title), l.slug).toEqual(SECTIONS)
  })

  it('has 138 exercises and every ladder is numbered 1..n', () => {
    expect(exercises).toHaveLength(138)
    for (const l of lessons) {
      const orders = exercises.filter((x) => x.lessons[0] === l.slug).map((x) => x.ladderOrder).sort((a, b) => a - b)
      expect(orders, l.slug).toEqual(orders.map((_, i) => i + 1))
    }
  })

  it('gives every algorithms lesson at least 5 ladder exercises', () => {
    for (const l of algorithms) {
      expect(exercises.filter((x) => x.lessons[0] === l.slug).length, l.slug).toBeGreaterThanOrEqual(5)
    }
  })

  it('uses https leetcode problem URLs', () => {
    for (const e of exercises) expect(e.url, e.slug).toMatch(/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/)
  })

  it('has URL slugs matching exercise slugs, except an explicit allow-list', () => {
    const ALLOWED: Record<string, string> = { 'two-sum-ii': 'two-sum-ii-input-array-is-sorted' }
    for (const e of exercises) {
      const urlSlug = e.url.match(/\/problems\/([a-z0-9-]+)\/$/)![1]
      expect(urlSlug, e.slug).toBe(ALLOWED[e.slug] ?? e.slug)
    }
  })
})
```

Replace `src/lib/content/index.ts` with:

```ts
import { exercises, lessons, tracks } from '#site/content'
import type { Catalog, ExerciseMeta, LessonMeta, TrackMeta } from '@/lib/types'

export interface TocEntry {
  title: string
  url: string
  items: TocEntry[]
}

export type LessonDoc = LessonMeta & { body: string; toc: TocEntry[] }

function toTrackMeta(t: TrackMeta): TrackMeta {
  return {
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    order: t.order,
    modules: t.modules.map((m) => ({ slug: m.slug, title: m.title, lessons: m.lessons, comingSoon: m.comingSoon })),
  }
}

function toLessonMeta(l: LessonMeta): LessonMeta {
  return {
    slug: l.slug,
    track: l.track,
    title: l.title,
    summary: l.summary,
    level: l.level,
    authors: l.authors,
    prerequisites: l.prerequisites,
    confusedWith: l.confusedWith,
    triggers: l.triggers,
    ...(l.complexity ? { complexity: l.complexity } : {}),
  }
}

export function getCatalog(): Catalog {
  const sortedTracks = [...tracks].sort((a, b) => a.order - b.order).map(toTrackMeta)
  const order = sortedTracks.flatMap((t) => t.modules.flatMap((m) => m.lessons))
  const rank = new Map(order.map((slug, i) => [slug, i]))
  return {
    tracks: sortedTracks,
    lessons: order.map((slug) => toLessonMeta(lessons.find((l) => l.slug === slug)!)),
    exercises: [...(exercises as ExerciseMeta[])].sort(
      (a, b) => rank.get(a.lessons[0])! - rank.get(b.lessons[0])! || a.ladderOrder - b.ladderOrder,
    ),
  }
}

export function getLessonDoc(slug: string): LessonDoc | undefined {
  return lessons.find((l) => l.slug === slug) as LessonDoc | undefined
}

export function getExercise(slug: string): ExerciseMeta | undefined {
  return (exercises as ExerciseMeta[]).find((e) => e.slug === slug)
}
```

Create `src/lib/content/hrefs.ts`:

```ts
export const trackHref = (track: string) => `/${track}/`
export const lessonHref = (lesson: { track: string; slug: string }) => `/${lesson.track}/${lesson.slug}/`
export const exerciseHref = (slug: string) => `/exercises/${slug}/`
```

In `src/lib/content/catalog-context.tsx`:
- Change `CatalogValue` to `Catalog & { trackBySlug: Map<string, TrackMeta>; lessonBySlug: Map<string, LessonMeta>; exerciseBySlug: Map<string, ExerciseMeta> }`.
- Build the three maps the same way the old ones were built.

Run `npx vitest run src/lib/content`. Expected: PASS.

- [ ] **Step 9: Mechanical rename in logic, routes and components**

Apply these renames across `src/` and `e2e/`. The type checker finds every remaining site.

| Old | New |
|---|---|
| `PatternMeta` / `ProblemMeta` | `LessonMeta` / `ExerciseMeta` |
| `catalog.patterns` / `catalog.problems` / `catalog.order` | `catalog.lessons` / `catalog.exercises` / `catalog.lessons.map((l) => l.slug)` |
| `patternBySlug` / `problemBySlug` | `lessonBySlug` / `exerciseBySlug` |
| `problem.patterns` (exercise meta) | `exercise.lessons` |
| `getPatternDoc` / `getProblem` / `PatternDoc` | `getLessonDoc` / `getExercise` / `LessonDoc` |
| `patternMastery` | `lessonMastery` (same body; first param stays a slug in this task) |
| `MasteryInput.problems` | `MasteryInput.exercises` |
| `recommendedPattern(order, patterns, m)` | `recommendedLesson(order, lessons, m)` (same body) |
| `pickTrainProblems` | `pickTrainExercises`; `buildRound(exercises, lessons, …)`, `buildQuestion(exercise, lessons, rng)` |
| `ProblemStatus` / `problemStatus` | `ExerciseStatus` / `exerciseStatus` |
| `ProblemFilter` (field `pattern`) / `filterProblems` | `ExerciseFilter` (field `lesson`) / `filterExercises` |
| `layoutRoadmap(order, patterns)` | `layoutRoadmap(order, lessons)` |
| `/patterns/${slug}/` links | `lessonHref(lessonBySlug.get(slug)!)`, or `lessonHref(lesson)` when you have the meta |
| `/problems/…` links | `exerciseHref(slug)`; the list page is `/exercises/` |
| `components/patterns/*` | `git mv` to `components/lessons/*` |
| `components/problems/*` | `git mv` to `components/exercises/*`; `problem-workspace.tsx` → `exercise-workspace.tsx` (`ExerciseWorkspace`, prop `exercise`); `problems-table.tsx` → `exercises-table.tsx` (`ExercisesTable`) |

`TrainQuestion.problemSlug` keeps its name, because it maps 1:1 to the stored `TrainAttempt.problemSlug`.

Routes:

```bash
mkdir -p 'src/app/[track]/[lesson]'
git mv 'src/app/patterns/[slug]/page.tsx' 'src/app/[track]/[lesson]/page.tsx'
git mv src/app/problems src/app/exercises
git mv src/components/patterns src/components/lessons
git mv src/components/problems src/components/exercises
git mv src/components/exercises/problem-workspace.tsx src/components/exercises/exercise-workspace.tsx
git mv src/components/exercises/problems-table.tsx src/components/exercises/exercises-table.tsx
rmdir src/app/patterns/'[slug]' src/app/patterns
```

`src/app/[track]/[lesson]/page.tsx` changes:
- Params become `Promise<{ track: string; lesson: string }>`.
- Use this `generateStaticParams`:

  ```ts
  export function generateStaticParams() {
    return getCatalog().lessons.map((l) => ({ track: l.track, lesson: l.slug }))
  }
  ```
- Call `notFound()` when `!doc || doc.track !== track`.
- The ladder becomes `exercises.filter((e) => e.lessons[0] === slug)`. Task 2 replaces this.
- Prerequisite and confused-with links use `lessonHref`.
- **Recognize it** renders only when `doc.triggers.length > 0`, and its TOC entry is added only then.
- **Typical cost** renders only when `doc.complexity` is set.
- The `doc.stub` branch is deleted: always render `<MDXContent>`.
- Copy changes:
  - The section heading becomes **Practice ladder** with id `practice-ladder` (TOC entry likewise).
  - The fallback page title becomes `'Lesson'`.

`src/app/exercises/[slug]/page.tsx` uses `getExercise`, `ExerciseWorkspace` and the title fallback `'Exercise'`. `src/app/exercises/page.tsx` has the heading **Exercises** and the metadata title `Exercises · LeetHub`.

UI copy in this task:

| Where | Old | New |
|---|---|---|
| Nav and palette pages | Problems | **Exercises** |
| Palette groups | Patterns / Problems | **Lessons** / **Exercises** |
| Palette input placeholder | | `Jump to a lesson or exercise…` |
| Palette description | | `Search lessons and exercises` |
| Palette item values | | `lesson …` / `exercise …` |
| Lesson filter select (`aria-label="Lesson"`) | All patterns | **All lessons** |
| Search box | | `aria-label="Search exercises"` |
| Count line | | `{rows.length} of {exercises.length} exercises` |
| Empty filter result | | `No exercises match these filters.` |
| Ladder list | | `No exercises in this ladder yet.` |
| Today button | Open pattern | **Open lesson** |
| Not-found search | | Form action `${base}/exercises/`, placeholder `Search exercises…`, aria-label `Search exercises` |

**Do not change** the trainer copy, its `Pattern options` group label, or the roadmap `aria-label` (Task 5 changes it).

- [ ] **Step 10: Update the unit test fixtures and e2e URLs**

- **Logic tests** (`mastery`, `recommend`, `trainer`, `filter`, `roadmap-layout`):
  - Lesson fixtures become `{ slug, track: 'algorithms', title: slug, summary: 's', level: 'beginner', authors: [], prerequisites, confusedWith, triggers: ['t'], complexity: 'O(n)' }`.
  - Exercise fixtures add `type: 'external-problem'` and rename `patterns` to `lessons`.
  - Rename the called functions. No assertion values change.
- **e2e:**
  - Replace `/patterns/` with `/algorithms/`, and `/problems/` with `/exercises/`. In `layout.spec.ts`, `'/problems/'` becomes `'/exercises/'`.
  - `smoke.spec.ts`: `PLACEHOLDER = 'Jump to a lesson or exercise…'`, and the URL expectation becomes `/\/exercises\/two-sum-ii\/$/`.
  - Update any label selectors that changed in Step 9.

- [ ] **Step 11: Verify nothing old is left, then run everything**

```bash
grep -rnE "PatternMeta|ProblemMeta|patternBySlug|problemBySlug|getPatternDoc|getProblem\b|filterProblems|/patterns/|/problems/|\.stub\b|roadmap\.order" src e2e velite.config.ts
```

Expected: no output.

```bash
npm test && npm run typecheck && npm run lint && npm run e2e
```

Expected: all green, with 23 e2e tests. The unit test count rises with the new validator tests.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: content model v2 — tracks, lessons and exercises

Move patterns to content/tracks/algorithms/lessons and problems to content/exercises,
add track.yaml modules, rewrite validation as rules V1-V11, and move routes to
/[track]/[lesson] and /exercises. Storage keeps its v1 names.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Cross-track logic (shared exercises, mastery, recommendation, trainer pool)

**Files:**
- Create: `src/lib/logic/lessons.ts`, `src/lib/logic/lessons.test.ts`
- Modify: `src/lib/logic/{mastery,recommend,trainer}.ts` and their tests, `src/lib/hooks/use-masteries.ts`, `src/app/[track]/[lesson]/page.tsx`, `src/components/today/today-view.tsx`, `src/components/roadmap/roadmap-view.tsx`, `src/components/train/train-view.tsx`

**Interfaces:**
- Consumes: `LessonMeta`, `ExerciseMeta` and `TrackMeta` from Task 1.
- Produces:

```ts
// lessons.ts
export const TRAINER_TRACK = 'algorithms'
export const DEFAULT_TRACK = 'algorithms'
export function trackLookup(lessons: LessonMeta[]): (slug: string) => string | undefined
export function lessonExercises(lesson: LessonMeta, exercises: ExerciseMeta[], trackOf: (slug: string) => string | undefined): ExerciseMeta[]
export function trackLessons(track: TrackMeta): string[]
export function trackMastery(track: TrackMeta, masteries: Map<string, number>): number
export function continueLesson(track: TrackMeta, masteries: Map<string, number>): string | null
export function startedTracks(exercises: ExerciseMeta[], solved: Set<string>, trackOf: (slug: string) => string | undefined): Set<string>
// mastery.ts
export interface MasteryInput { exercises: ExerciseMeta[]; lessons: LessonMeta[]; progress: ProblemProgress[]; cards: ReviewCard[]; attempts: TrainAttempt[]; now: Date }
export function lessonMastery(lesson: LessonMeta, input: MasteryInput): number
export function computeMasteries(lessons: LessonMeta[], input: MasteryInput): Map<string, number>
// recommend.ts
export function recommendedLesson(lessons: LessonMeta[], mastery: Map<string, number>, started: Set<string>): string | null
// trainer.ts
export function buildRound(exercises: ExerciseMeta[], lessons: LessonMeta[], attempts: TrainAttempt[], count: number, rng: Rng): TrainQuestion[] // draws from TRAINER_TRACK only
```

- [ ] **Step 1: Write the failing tests for `lessons.ts`**

Create `src/lib/logic/lessons.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { ExerciseMeta, LessonMeta, TrackMeta } from '@/lib/types'
import { continueLesson, lessonExercises, startedTracks, trackLessons, trackLookup, trackMastery } from './lessons'

const lesson = (slug: string, track: string): LessonMeta => ({
  slug, track, title: slug, summary: 's', level: 'beginner', authors: [], prerequisites: [], confusedWith: [], triggers: [],
})
const ex = (slug: string, lessons: string[]): ExerciseMeta => ({
  slug, type: 'external-problem', title: slug, leetcodeId: slug.length, url: 'https://leetcode.com/problems/x/',
  difficulty: 'easy', lessons, ladderOrder: 1, recognitionPrompt: 'prompt text', hint: 'hint',
})
const lessons = [lesson('ll', 'algorithms'), lesson('ah', 'algorithms'), lesson('cache', 'system-design')]
const trackOf = trackLookup(lessons)
const exercises = [ex('lru', ['ll', 'ah', 'cache']), ex('own', ['ah']), ex('reverse', ['ll'])]
const sd: TrackMeta = {
  slug: 'system-design', title: 'SD', summary: 's', order: 2,
  modules: [{ slug: 'a', title: 'A', lessons: ['cache', 'lb'], comingSoon: [] }, { slug: 'b', title: 'B', lessons: [], comingSoon: ['x'] }],
}

describe('lessonExercises', () => {
  it('returns the ladder (primary lesson) first', () => {
    expect(lessonExercises(lessons[0], exercises, trackOf).map((e) => e.slug)).toEqual(['lru', 'reverse'])
  })
  it('does not share an exercise with a second lesson in the same track', () => {
    expect(lessonExercises(lessons[1], exercises, trackOf).map((e) => e.slug)).toEqual(['own'])
  })
  it('shares an exercise with a lesson in another track', () => {
    expect(lessonExercises(lessons[2], exercises, trackOf).map((e) => e.slug)).toEqual(['lru'])
  })
})

describe('track helpers', () => {
  it('lists a track’s lessons in module order', () => {
    expect(trackLessons(sd)).toEqual(['cache', 'lb'])
  })
  it('averages lesson mastery over the track, rounding', () => {
    expect(trackMastery(sd, new Map([['cache', 85], ['lb', 20]]))).toBe(53)
    expect(trackMastery({ ...sd, modules: [] }, new Map())).toBe(0)
  })
  it('continues at the first lesson below mastery, else the first lesson', () => {
    expect(continueLesson(sd, new Map([['cache', 90]]))).toBe('lb')
    expect(continueLesson(sd, new Map([['cache', 90], ['lb', 80]]))).toBe('cache')
    expect(continueLesson({ ...sd, modules: [] }, new Map())).toBeNull()
  })
  it('marks a track started once any exercise listing one of its lessons is solved', () => {
    expect([...startedTracks(exercises, new Set(), trackOf)]).toEqual([])
    expect([...startedTracks(exercises, new Set(['reverse']), trackOf)]).toEqual(['algorithms'])
    expect([...startedTracks(exercises, new Set(['lru']), trackOf)].sort()).toEqual(['algorithms', 'system-design'])
  })
})
```

Run `npx vitest run src/lib/logic/lessons.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 2: Implement `src/lib/logic/lessons.ts`**

```ts
import type { ExerciseMeta, LessonMeta, TrackMeta } from '@/lib/types'
import { MASTERED } from './mastery'

/** The only track the pattern-recognition trainer covers. */
export const TRAINER_TRACK = 'algorithms'
/** Where a learner who hasn't started anything is pointed. */
export const DEFAULT_TRACK = 'algorithms'

export function trackLookup(lessons: LessonMeta[]): (slug: string) => string | undefined {
  const map = new Map(lessons.map((l) => [l.slug, l.track]))
  return (slug) => map.get(slug)
}

/**
 * Exercises that count for a lesson: its ladder (exercises whose primary lesson it is), then
 * exercises from other tracks that also list it. A second lesson in the same track does not
 * count, which keeps v1 algorithms mastery unchanged.
 */
export function lessonExercises(
  lesson: LessonMeta,
  exercises: ExerciseMeta[],
  trackOf: (slug: string) => string | undefined,
): ExerciseMeta[] {
  const ladder = exercises.filter((e) => e.lessons[0] === lesson.slug)
  const shared = exercises.filter(
    (e) => e.lessons[0] !== lesson.slug && e.lessons.includes(lesson.slug) && trackOf(e.lessons[0]) !== lesson.track,
  )
  return [...ladder, ...shared]
}

export function trackLessons(track: TrackMeta): string[] {
  return track.modules.flatMap((m) => m.lessons)
}

export function trackMastery(track: TrackMeta, masteries: Map<string, number>): number {
  const slugs = trackLessons(track)
  if (slugs.length === 0) return 0
  return Math.round(slugs.reduce((sum, s) => sum + (masteries.get(s) ?? 0), 0) / slugs.length)
}

export function continueLesson(track: TrackMeta, masteries: Map<string, number>): string | null {
  const slugs = trackLessons(track)
  return slugs.find((s) => (masteries.get(s) ?? 0) < MASTERED) ?? slugs[0] ?? null
}

export function startedTracks(
  exercises: ExerciseMeta[],
  solved: Set<string>,
  trackOf: (slug: string) => string | undefined,
): Set<string> {
  const started = new Set<string>()
  for (const e of exercises) {
    if (!solved.has(e.slug)) continue
    for (const slug of e.lessons) {
      const track = trackOf(slug)
      if (track) started.add(track)
    }
  }
  return started
}
```

`mastery.ts` must not import from `lessons.ts` at module top level in a way that creates a cycle problem. `lessons.ts` imports only the `MASTERED` constant, and `mastery.ts` imports functions. ES modules handle that, but if a cycle error appears, move `MASTERED` into `lessons.ts` and re-export it from `mastery.ts`.

Run the test again. Expected: PASS.

- [ ] **Step 3: Mastery uses `lessonExercises`; recognition applies only to the trainer track**

In `mastery.test.ts`:
- Update `base` to `{ exercises: [exercise('p1', ['tp'])], lessons: [L('tp'), L('other')], progress: [], cards: [], attempts: [], now }`, where `L(slug, track = 'algorithms')` builds a `LessonMeta`.
- Every `lessonMastery('tp', …)` call becomes `lessonMastery(L('tp'), …)`.
- Keep the existing test **"only counts problems whose primary pattern matches"**. Rename it to **"does not count a second lesson in the same track"**; it must still expect `0`.

Then add:

```ts
it('counts a shared exercise for a lesson in another track, without recognition weight', () => {
  const input = {
    ...base,
    lessons: [L('tp'), L('cache', 'system-design')],
    exercises: [exercise('p1', ['tp', 'cache'])],
    progress: [solved('p1', 'alone')],
    cards: [freshCard('p1')],
  }
  expect(lessonMastery(L('cache', 'system-design'), input)).toBe(100)
  expect(lessonMastery(L('tp'), input)).toBe(70)
})
```

Implement in `mastery.ts`:

```ts
export function lessonMastery(lesson: LessonMeta, input: MasteryInput): number {
  const exercises = lessonExercises(lesson, input.exercises, trackLookup(input.lessons))
  const progress = new Map(input.progress.map((p) => [p.slug, p]))
  const cards = new Map(input.cards.map((c) => [c.slug, c]))

  let exerciseScore = 0
  if (exercises.length > 0) {
    let sum = 0
    for (const exercise of exercises) {
      const p = progress.get(exercise.slug)
      if (p?.status !== 'solved' || !p.solveRating) continue
      const card = cards.get(exercise.slug)
      sum += SOLVE_WEIGHT[p.solveRating] * (card ? retrievability(card.card, input.now) : 1)
    }
    exerciseScore = sum / exercises.length
  }

  // Only the trainer's track has recognition data; elsewhere mastery is the exercise score alone.
  if (lesson.track !== TRAINER_TRACK) return Math.round(100 * exerciseScore)
  const recognitionScore = recognitionAccuracy(input.attempts, lesson.slug) ?? 0
  return Math.round(100 * (0.7 * exerciseScore + 0.3 * recognitionScore))
}

export function computeMasteries(lessons: LessonMeta[], input: MasteryInput): Map<string, number> {
  return new Map(lessons.map((l) => [l.slug, lessonMastery(l, input)]))
}
```

Update `use-masteries.ts` to pass `{ exercises, lessons, progress, cards, attempts, now }` and `computeMasteries(lessons, …)`.

- [ ] **Step 4: Recommendation follows the started tracks**

Replace `recommend.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import type { LessonMeta } from '@/lib/types'
import { recommendedLesson } from './recommend'

const p = (slug: string, prerequisites: string[] = [], track = 'algorithms'): LessonMeta => ({
  slug, track, title: slug, summary: 's', level: 'beginner', authors: [], prerequisites, confusedWith: [], triggers: ['t'], complexity: 'O(n)',
})
const lessons = [p('a'), p('b', ['a']), p('c', ['a']), p('d', ['b', 'c']), p('sd1', ['a'], 'system-design')]
const algo = new Set(['algorithms'])

describe('recommendedLesson', () => {
  it('starts with the first algorithms lesson when nothing is started', () => {
    expect(recommendedLesson(lessons, new Map(), new Set())).toBe('a')
  })
  it('moves on once a lesson is mastered', () => {
    expect(recommendedLesson(lessons, new Map([['a', 85]]), algo)).toBe('b')
  })
  it('skips lessons whose prerequisites are below 50', () => {
    expect(recommendedLesson(lessons, new Map([['a', 85], ['b', 30]]), algo)).toBe('c')
  })
  it('only recommends from started tracks, honouring cross-track prerequisites', () => {
    const sdOnly = new Set(['system-design'])
    expect(recommendedLesson(lessons, new Map(), sdOnly)).toBe('sd1')
    expect(recommendedLesson(lessons, new Map([['a', 60]]), sdOnly)).toBe('sd1')
  })
  it('returns null when every lesson in the started tracks is mastered', () => {
    expect(recommendedLesson(lessons, new Map(lessons.map((l) => [l.slug, 90])), algo)).toBeNull()
  })
})
```

Implement:

```ts
import type { LessonMeta } from '@/lib/types'
import { DEFAULT_TRACK } from './lessons'
import { MASTERED } from './mastery'

export const PREREQUISITE_READY = 50

export function recommendedLesson(lessons: LessonMeta[], mastery: Map<string, number>, started: Set<string>): string | null {
  const tracks = started.size > 0 ? started : new Set([DEFAULT_TRACK])
  const order = lessons.filter((l) => tracks.has(l.track))
  const m = (slug: string) => mastery.get(slug) ?? 0
  const ready = order.find((l) => m(l.slug) < MASTERED && l.prerequisites.every((pre) => m(pre) >= PREREQUISITE_READY))
  return (ready ?? order.find((l) => m(l.slug) < MASTERED))?.slug ?? null
}
```

- [ ] **Step 5: The trainer draws only from the trainer track**

Add to `trainer.test.ts`:

```ts
it('only asks about algorithms exercises and offers algorithms lessons as answers', () => {
  const lessons = [...patterns, { ...p('cache'), track: 'system-design' }]
  const exercises = [prob('a', 'tp'), prob('lru', 'cache'), prob('b', 'sw')]
  for (let seed = 1; seed <= 20; seed++) {
    const round = buildRound(exercises, lessons, [], 5, mulberry32(seed))
    expect(round.map((q) => q.problemSlug)).not.toContain('lru')
    for (const q of round) expect(q.options).not.toContain('cache')
  }
})
```

Implement in `buildRound`:

```ts
export function buildRound(exercises: ExerciseMeta[], lessons: LessonMeta[], attempts: TrainAttempt[], count: number, rng: Rng): TrainQuestion[] {
  const pool = lessons.filter((l) => l.track === TRAINER_TRACK)
  const inPool = new Set(pool.map((l) => l.slug))
  const eligible = exercises.filter((e) => inPool.has(e.lessons[0]))
  return pickTrainExercises(eligible, attempts, count, rng).map((e) => buildQuestion(e, pool, rng))
}
```

- [ ] **Step 6: Wire the consumers**

- **Lesson page:** `const ladder = lessonExercises(doc, exercises, trackLookup(lessons))`.
- **`today-view.tsx`:**
  - `const trackOf = trackLookup(lessons)`.
  - `const recommended = recommendedLesson(lessons, masteries, startedTracks(exercises, solved, trackOf))`.
  - `recLadder = recLesson ? lessonExercises(recLesson, exercises, trackOf) : []`.
  - The button links to `lessonHref(recLesson)`.
- **`roadmap-view.tsx`:** `count(slug)` uses `lessonExercises(lessonBySlug.get(slug)!, exercises, trackOf)`. `recommendedLesson` is called with `startedTracks(...)`, built from the `solved` set it already computes.
- **`train-view.tsx`:** call `buildRound(exercises, lessons, …)`. It filters internally.

Run `npm test && npm run typecheck && npm run lint && npm run e2e`. Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: cross-track mastery, recommendation and trainer pool

Exercises count for their primary lesson and for lessons in other tracks;
recognition weight applies only to the trainer track; recommendations follow
started tracks; the trainer draws from algorithms only.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: System Design track, Caching lesson and `cache-lru` visualizer

**Files:**
- Create: `content/tracks/system-design/track.yaml`, `content/tracks/system-design/lessons/caching.mdx`
- Modify: `content/exercises/lru-cache.yaml`, `content/exercises/time-based-key-value-store.yaml`
- Create: `src/lib/visualizers/cache-steps.ts`, `src/lib/visualizers/cache-steps.test.ts`, `src/components/visualizers/cache-view.tsx`
- Modify: `src/components/visualizers/visualizer.tsx`, `src/lib/content/index.test.ts`, `e2e/visualizers.spec.ts`

**Interfaces:**
- Consumes: `StepPlayer` (generic `S extends { caption: string; done?: boolean }`) and the `Visualizer` kind switch.
- Produces: `lruCacheSteps(capacity: number, requests: string[]): CacheStep[]` and the `VisualizerKind` value `'cache-lru'`.

- [ ] **Step 1: Write the failing hand-traced test**

Create `src/lib/visualizers/cache-steps.test.ts`. The expected sequence was traced by hand for capacity 3 and requests `A B C A D B E A`. Slots are listed from most to least recently used.

```ts
import { describe, expect, it } from 'vitest'
import { lruCacheSteps } from './cache-steps'

describe('lruCacheSteps', () => {
  const steps = lruCacheSteps(3, ['A', 'B', 'C', 'A', 'D', 'B', 'E', 'A'])

  it('matches the hand-traced LRU sequence', () => {
    expect(steps.map((s) => s.slots.join(''))).toEqual(['', 'A', 'BA', 'CBA', 'ACB', 'DAC', 'BDA', 'EBD', 'AEB', 'AEB'])
    expect(steps.map((s) => s.event ?? '-')).toEqual(['-', 'miss', 'miss', 'miss', 'hit', 'miss', 'miss', 'miss', 'miss', '-'])
    expect(steps.map((s) => s.evicted ?? '-')).toEqual(['-', '-', '-', '-', '-', 'B', 'C', 'A', 'D', '-'])
    expect(steps.map((s) => s.index ?? -1)).toEqual([-1, 0, 1, 2, 3, 4, 5, 6, 7, -1])
  })

  it('writes past-tense captions and a final summary', () => {
    expect(steps[0].caption).toBe('Empty cache with room for 3 items')
    expect(steps[1].caption).toBe('Read A: miss — loaded A from the database')
    expect(steps[4].caption).toBe('Read A: hit — moved A to the front')
    expect(steps[5].caption).toBe('Read D: miss — loaded D and evicted B, the least recently used')
    expect(steps.at(-1)!.caption).toBe('Done: 1 hit, 7 misses, 4 evictions')
    expect(steps.at(-1)!.done).toBe(true)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
  })

  it('counts hits and misses as it goes', () => {
    expect(steps.map((s) => `${s.hits}/${s.misses}`)).toEqual(['0/0', '0/1', '0/2', '0/3', '1/3', '1/4', '1/5', '1/6', '1/7', '1/7'])
  })
})
```

Run `npx vitest run src/lib/visualizers/cache-steps.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 2: Implement `src/lib/visualizers/cache-steps.ts`**

```ts
export interface CacheStep {
  /** Keys from most to least recently used. */
  slots: string[]
  capacity: number
  requests: string[]
  /** Index of the request this step handled; absent on the first and last steps. */
  index?: number
  event?: 'hit' | 'miss'
  evicted?: string
  hits: number
  misses: number
  caption: string
  done?: boolean
}

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`

export function lruCacheSteps(capacity: number, requests: string[]): CacheStep[] {
  const slots: string[] = []
  let hits = 0
  let misses = 0
  let evictions = 0
  const steps: CacheStep[] = [{ slots: [], capacity, requests, hits, misses, caption: `Empty cache with room for ${capacity} items` }]

  requests.forEach((key, index) => {
    const at = slots.indexOf(key)
    if (at >= 0) {
      hits++
      slots.splice(at, 1)
      slots.unshift(key)
      steps.push({ slots: [...slots], capacity, requests, index, event: 'hit', hits, misses, caption: `Read ${key}: hit — moved ${key} to the front` })
      return
    }
    misses++
    const evicted = slots.length === capacity ? slots.pop() : undefined
    if (evicted) evictions++
    slots.unshift(key)
    steps.push({
      slots: [...slots], capacity, requests, index, event: 'miss', evicted, hits, misses,
      caption: evicted
        ? `Read ${key}: miss — loaded ${key} and evicted ${evicted}, the least recently used`
        : `Read ${key}: miss — loaded ${key} from the database`,
    })
  })

  steps.push({
    slots: [...slots], capacity, requests, hits, misses, done: true,
    caption: `Done: ${plural(hits, 'hit')}, ${plural(misses, 'miss', 'misses')}, ${plural(evictions, 'eviction')}`,
  })
  return steps
}
```

Run the test. Expected: PASS.

- [ ] **Step 3: Create `src/components/visualizers/cache-view.tsx`**

The view always renders `capacity` slot boxes, the full request strip and a fixed-height status line, so its height never changes between steps.

```tsx
import type { CacheStep } from '@/lib/visualizers/cache-steps'
import { cn } from '@/lib/utils'

export function CacheView({ step }: { step: CacheStep }) {
  const { slots, capacity, requests, index, event, evicted, hits, misses } = step
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Requests</p>
        <div className="flex flex-wrap gap-1" aria-label={`Requests ${requests.join(' ')}`}>
          {requests.map((r, i) => (
            <div
              key={i}
              className={cn(
                'flex size-8 items-center justify-center rounded-md border font-mono text-sm',
                i === index && 'border-primary bg-primary/15 ring-2 ring-primary',
                index !== undefined && i < index && 'text-muted-foreground',
              )}
            >
              {r}
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Cache — most recent → least recent</p>
        <div className="flex gap-2" aria-label={`Cache [${slots.join(', ')}]`}>
          {Array.from({ length: capacity }, (_, i) => (
            <div
              key={i}
              className={cn(
                'flex size-12 items-center justify-center rounded-md border-2 font-mono text-lg',
                slots[i] === undefined && 'border-dashed text-muted-foreground',
                i === 0 && event === 'hit' && 'border-emerald-500 bg-emerald-500/15',
                i === 0 && event === 'miss' && 'border-amber-500 bg-amber-500/15',
              )}
            >
              {slots[i] ?? '·'}
            </div>
          ))}
        </div>
      </div>
      <p className="min-h-5 text-sm tabular-nums">
        Hits {hits} · Misses {misses}
        {evicted && <span className="text-muted-foreground"> · evicted {evicted}</span>}
      </p>
    </div>
  )
}
```

In `visualizer.tsx`:
- Import `lruCacheSteps` and `CacheView`.
- Extend `VisualizerKind` with `| 'cache-lru'`.
- Add this component and a `case 'cache-lru': return <CacheVisualizer />`:

```tsx
function CacheVisualizer() {
  const steps = useMemo(() => lruCacheSteps(3, ['A', 'B', 'C', 'A', 'D', 'B', 'E', 'A']), [])
  return <StepPlayer steps={steps} title="LRU cache with room for 3: read A B C A D B E A" render={(s) => <CacheView step={s} />} />
}
```

- [ ] **Step 4: Add the track, the lesson and the shared exercises**

`content/tracks/system-design/track.yaml`:

```yaml
slug: system-design
title: System Design
summary: "How real systems scale, stay fast and survive failures."
order: 2
modules:
  - slug: foundations
    title: Foundations
    lessons: [caching]
    comingSoon: ["Client–server & HTTP", "DNS & CDNs", "SQL vs NoSQL"]
  - slug: scaling
    title: Scaling
    lessons: []
    comingSoon: ["Load balancing", "Replication & sharding", "Queues & streams", "Rate limiting"]
  - slug: case-studies
    title: Case Studies
    lessons: []
    comingSoon: ["URL shortener", "News feed", "Chat"]
```

Exercise edits:
- `lru-cache.yaml`: `lessons: [linked-list, arrays-hashing, caching]`
- `time-based-key-value-store.yaml`: `lessons: [binary-search, arrays-hashing, caching]`

`content/tracks/system-design/lessons/caching.mdx`:

````mdx
---
slug: caching
title: Caching
level: beginner
authors: [cs-atlas]
prerequisites: [arrays-hashing]
summary: "Keep hot data close so most reads never touch the slow store."
---

## Intuition

You keep the books you use every week on your desk, and the rest in the library down the street. Most of the time the book you need is on the desk — a **hit** — and you save the walk. When it isn't — a **miss** — you fetch it, and since the desk is small, you return the book you haven't touched for the longest time.

That is a cache: a small, fast store in front of a large, slow one.

| Read from | Rough latency |
|---|---|
| Memory (in-process map) | ~100 ns |
| Redis on the same network | ~0.5 ms |
| Database query from disk | 5–50 ms |
| Another region | 50–150 ms |

The number that matters is the **hit rate**. At a 95% hit rate with a 1 ms cache and a 20 ms database, the average read costs `0.95 × 1 + 0.05 × 20 = 1.95 ms` — ten times faster than no cache, and the database sees only 5% of the traffic.

Every cache answers three questions:

- **What goes in?** Usually whatever was just read (read-through / cache-aside).
- **What comes out when it's full?** The **eviction policy** — most often *least recently used* (LRU).
- **When is it wrong?** When the source changed and the copy didn't — the **invalidation** problem.

## Visual

<Visualizer kind="cache-lru" />

```text
Cache-aside read:

  app ──get(k)──▶ cache ──hit──▶ return value
                    │
                   miss
                    ▼
                database ──value──▶ app ──set(k, value, ttl)──▶ cache
```

## Example

An LRU cache is the **LRU Cache** exercise: a hash map gives O(1) lookup, and a doubly linked list keeps keys in recency order so the least recent one is always at the tail.

```python
class Node:
    def __init__(self, key=0, val=0):
        self.key, self.val = key, val
        self.prev = self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.map: dict[int, Node] = {}
        self.head, self.tail = Node(), Node()          # sentinels: head.next is most recent
        self.head.next, self.tail.prev = self.tail, self.head

    def _remove(self, node: Node) -> None:
        node.prev.next, node.next.prev = node.next, node.prev

    def _push_front(self, node: Node) -> None:
        node.prev, node.next = self.head, self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.map:
            return -1                                  # miss
        node = self.map[key]
        self._remove(node)
        self._push_front(node)                         # hit: now the most recent
        return node.val

    def put(self, key: int, value: int) -> None:
        if key in self.map:
            self._remove(self.map[key])
        node = Node(key, value)
        self.map[key] = node
        self._push_front(node)
        if len(self.map) > self.cap:
            lru = self.tail.prev                       # least recently used
            self._remove(lru)
            del self.map[lru.key]
```

The same idea in a service, with a shared cache such as Redis in front of a database:

```python
def get_user(user_id: str) -> dict:
    key = f"user:{user_id}"
    cached = cache.get(key)
    if cached is not None:
        return cached                                  # hit
    user = db.fetch_user(user_id)                      # miss: go to the source
    cache.set(key, user, ttl=300 + random.randint(0, 60))
    return user


def update_user(user_id: str, fields: dict) -> None:
    db.update_user(user_id, fields)
    cache.delete(f"user:{user_id}")                    # invalidate; the next read refills it
```

**Time Based Key-Value Store** is the other half of the story: a versioned store where reads ask for "the latest value at or before time t" — the same question a cache asks when it must not serve data newer than a snapshot.

## Pitfalls

- **Stale data.** Updating the database without deleting (or updating) the cached copy serves old values until the TTL runs out. Delete *after* the write commits.
- **Thundering herd.** A hot key expires and a thousand requests miss at once, all hitting the database. Add jitter to TTLs, and let one request refill while the others wait (request coalescing).
- **Caching failures.** Storing an error or an empty result with a normal TTL hides a recovery. Cache negative results only briefly, and never cache exceptions.
- **Unbounded growth.** A cache with no size limit or eviction policy is a memory leak. Always set a capacity or a max memory with an eviction policy.
- **Caching per-user data under a shared key** leaks one user's data to another. Put every input that changes the answer into the key.

## Tips & tricks

- **Write strategies:** *cache-aside* (the app reads and fills the cache — the default), *write-through* (writes go to cache and database together; reads are always warm), *write-back* (writes go to the cache and reach the database later; fast but can lose data).
- **Eviction:** LRU suits most workloads; LFU keeps long-term favourites; a TTL alone is fine when data naturally expires.
- **Measure** the hit rate, the p99 latency of hits and misses, and the eviction rate. A low hit rate means the wrong things are cached or the cache is too small.
- **Cache close to the reader:** browser → CDN → service memory → shared cache → database. Each layer absorbs traffic before the next.
- In interviews, say what you cache, the key, the TTL, how you invalidate, and what happens when the cache is down.
````

- [ ] **Step 5: Extend the inventory tests and the e2e visualizer spec**

Add to `index.test.ts`, in `content inventory`:

```ts
it('has a System Design track with the Caching lesson and coming-soon outline', () => {
  const { tracks, lessons, exercises } = getCatalog()
  expect(tracks.map((t) => t.slug)).toEqual(['algorithms', 'system-design'])
  const sd = tracks[1]
  expect(sd.modules.flatMap((m) => m.lessons)).toEqual(['caching'])
  expect(sd.modules.flatMap((m) => m.comingSoon).length).toBeGreaterThan(0)
  expect(lessons.find((l) => l.slug === 'caching')).toMatchObject({ track: 'system-design', prerequisites: ['arrays-hashing'] })
  expect(getLessonDoc('caching')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks'])
  expect(exercises.filter((e) => e.lessons.includes('caching')).map((e) => e.slug).sort()).toEqual(['lru-cache', 'time-based-key-value-store'])
})
```

In `e2e/visualizers.spec.ts`, change `PAGES` to carry a path:

```ts
const PAGES = [
  { path: '/algorithms/heap/', final: 'Done: popped 1, 3 — heap is [4, 5, 8]' },
  { path: '/algorithms/dp-2d/', final: 'LCS length = 3' },
  { path: '/algorithms/dp-1d/', final: 'Best total = 12' },
  { path: '/algorithms/backtracking/', final: 'All 8 subsets found' },
  { path: '/system-design/caching/', final: 'Done: 1 hit, 7 misses, 4 evictions' },
]
```

Then:
- Loop over `{ path, final }`.
- Name each test `` `${path} visualizer steps to the end at ${vp.width}px` ``.
- Call `page.goto(path)`.

Run `npm test && npm run typecheck && npm run lint && npm run e2e`. Expected: all green, with 2 new e2e tests for Caching.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: System Design track with the Caching lesson and LRU visualizer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Track pages, navigation and the command palette

**Files:**
- Create: `src/app/tracks/page.tsx`, `src/app/[track]/page.tsx`, `src/components/tracks/tracks-overview.tsx`, `src/components/tracks/track-home.tsx`, `e2e/tracks.spec.ts`
- Modify: `src/app/[track]/[lesson]/page.tsx` (breadcrumb), `src/components/app-shell.tsx`, `src/components/command-palette.tsx`, `e2e/layout.spec.ts`

**Interfaces:**
- Consumes: `trackMastery`, `continueLesson` and `trackLessons` (Task 2); `trackHref`, `lessonHref`; `useMasteries()`; and `MASTERED`.
- Produces: the routes `/tracks/` and `/[track]/`.

- [ ] **Step 1: Write the failing e2e spec `e2e/tracks.spec.ts`**

```ts
import { expect, test } from '@playwright/test'

test('tracks page lists both tracks and links to their homes', async ({ page }) => {
  await page.goto('/tracks/')
  await expect(page.getByRole('heading', { level: 1, name: 'Tracks' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Algorithms/ })).toBeVisible()
  await page.getByRole('link', { name: /System Design/ }).click()
  await expect(page).toHaveURL(/\/system-design\/$/)
})

test('a track home shows modules, lessons and coming-soon titles', async ({ page }) => {
  await page.goto('/system-design/')
  await expect(page.getByRole('heading', { level: 1, name: 'System Design' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Foundations' })).toBeVisible()
  await expect(page.getByText('Load balancing')).toBeVisible()
  await expect(page.getByText('Coming soon').first()).toBeVisible()
  await page.getByRole('link', { name: 'Caching' }).click()
  await expect(page).toHaveURL(/\/system-design\/caching\/$/)
  await expect(page.getByRole('link', { name: 'System Design' }).first()).toBeVisible()
})

test('Continue opens the first lesson that is not mastered', async ({ page }) => {
  await page.goto('/algorithms/')
  await page.getByRole('link', { name: /^Continue/ }).click()
  await expect(page).toHaveURL(/\/algorithms\/arrays-hashing\/$/)
})

test('the palette groups lessons by track', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+k')
  await page.getByPlaceholder('Jump to a lesson or exercise…').fill('caching')
  await expect(page.getByRole('group', { name: 'System Design' })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/system-design\/caching\/$/)
})
```

Add `'/tracks/'`, `'/algorithms/'`, `'/system-design/'` and `'/system-design/caching/'` to `PAGES` in `e2e/layout.spec.ts`.

Run `npx playwright test e2e/tracks.spec.ts`. Expected: FAIL (404s).

- [ ] **Step 2: Build the pages**

`src/app/tracks/page.tsx`:

```tsx
import { TracksOverview } from '@/components/tracks/tracks-overview'

export const metadata = { title: 'Tracks · LeetHub' }

export default function TracksPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tracks</h1>
      <TracksOverview />
    </div>
  )
}
```

`src/components/tracks/tracks-overview.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { useCatalog } from '@/lib/content/catalog-context'
import { trackHref } from '@/lib/content/hrefs'
import { useMasteries } from '@/lib/hooks/use-masteries'
import { trackLessons, trackMastery } from '@/lib/logic/lessons'

export function TracksOverview() {
  const { tracks } = useCatalog()
  const masteries = useMasteries() ?? new Map<string, number>()
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {tracks.map((t) => {
        const value = trackMastery(t, masteries)
        const lessons = trackLessons(t).length
        return (
          <li key={t.slug}>
            <Link href={trackHref(t.slug)} className="block space-y-3 rounded-lg border p-4 hover:bg-muted">
              <h2 className="text-lg font-semibold">{t.title}</h2>
              <p className="text-sm text-muted-foreground">{t.summary}</p>
              <p className="text-xs text-muted-foreground">{lessons} lesson{lessons === 1 ? '' : 's'} · {value}% mastered</p>
              <Progress value={value} className="h-2" aria-label={`${t.title} mastery`} />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
```

`src/app/[track]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TrackHome } from '@/components/tracks/track-home'
import { getCatalog } from '@/lib/content'

export const dynamicParams = false

export function generateStaticParams() {
  return getCatalog().tracks.map((t) => ({ track: t.slug }))
}

type Params = Promise<{ track: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { track } = await params
  return { title: `${getCatalog().tracks.find((t) => t.slug === track)?.title ?? 'Track'} · LeetHub` }
}

export default async function TrackPage({ params }: { params: Params }) {
  const { track } = await params
  if (!getCatalog().tracks.some((t) => t.slug === track)) notFound()
  return <TrackHome slug={track} />
}
```

`src/components/tracks/track-home.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/lib/content/catalog-context'
import { lessonHref } from '@/lib/content/hrefs'
import { useMasteries } from '@/lib/hooks/use-masteries'
import { continueLesson, trackMastery } from '@/lib/logic/lessons'
import { MASTERED } from '@/lib/logic/mastery'

export function TrackHome({ slug }: { slug: string }) {
  const { trackBySlug, lessonBySlug } = useCatalog()
  const masteries = useMasteries() ?? new Map<string, number>()
  const track = trackBySlug.get(slug)!
  const next = continueLesson(track, masteries)

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">{track.title}</h1>
        <p className="text-lg text-muted-foreground">{track.summary}</p>
        <p className="text-sm text-muted-foreground">{trackMastery(track, masteries)}% mastered</p>
        {next && (
          <Button asChild>
            <Link href={lessonHref(lessonBySlug.get(next)!)}>Continue: {lessonBySlug.get(next)!.title}</Link>
          </Button>
        )}
      </header>

      {track.modules.map((m) => (
        <section key={m.slug} className="space-y-3">
          <h2 className="text-xl font-semibold">{m.title}</h2>
          <ul className="divide-y rounded-lg border">
            {m.lessons.map((s) => {
              const lesson = lessonBySlug.get(s)!
              const value = masteries.get(s) ?? 0
              return (
                <li key={s} className="flex items-center gap-3 px-3 py-2">
                  <Link href={lessonHref(lesson)} className="min-w-0 flex-1 truncate hover:underline">{lesson.title}</Link>
                  <Badge variant="secondary" className="capitalize">{lesson.level}</Badge>
                  <span className={value >= MASTERED ? 'w-10 text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400' : 'w-10 text-right text-sm tabular-nums'}>{value}%</span>
                </li>
              )
            })}
            {m.comingSoon.map((title) => (
              <li key={title} className="flex items-center gap-3 px-3 py-2 text-muted-foreground">
                <span className="min-w-0 flex-1 truncate">{title}</span>
                <span className="text-xs">Coming soon</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
```

The lesson page breadcrumb becomes:

```tsx
<Link href={trackHref(doc.track)} className="hover:underline">{getCatalog().tracks.find((t) => t.slug === doc.track)!.title}</Link> / {doc.title}
```

- [ ] **Step 3: Navigation and palette**

**`app-shell.tsx`:**
- Insert `{ href: '/tracks/', label: 'Tracks', icon: Library }` after Today (import `Library` from `lucide-react`).
- Change the mobile bottom nav from `grid-cols-5` to `grid-cols-6`.
- `isActive` must treat a track or lesson URL as active for **Tracks**. Add this before the generic rule:

```ts
const { tracks } = useCatalog()
const trackSlugs = new Set(tracks.map((t) => t.slug))
const isActive = (href: string) => {
  const h = trim(href)
  if (h === '/tracks' && trackSlugs.has(pathname.split('/')[1])) return true
  return h === '/' ? pathname === '/' : pathname === h || pathname.startsWith(`${h}/`)
}
```

**`command-palette.tsx`:**
- Add `{ href: '/tracks/', label: 'Tracks' }` to `PAGES` after Today.
- Replace the single **Lessons** group with one group per track. Exercises remain one group.

```tsx
{tracks.map((t) => (
  <CommandGroup key={t.slug} heading={t.title}>
    {lessons.filter((l) => l.track === t.slug).map((l) => (
      <CommandItem key={l.slug} value={`lesson ${l.title} ${l.slug} ${t.title}`} onSelect={() => go(lessonHref(l))}>{l.title}</CommandItem>
    ))}
  </CommandGroup>
))}
```

Run `npm test && npm run typecheck && npm run lint && npm run e2e`. Expected: all green, including `tracks.spec.ts` and the four new layout pages at 375px.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: track pages, Tracks nav item and palette grouped by track

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Cross-track roadmap

**Files:**
- Modify: `src/lib/logic/roadmap-layout.ts`, `src/lib/logic/roadmap-layout.test.ts`, `src/components/roadmap/roadmap-view.tsx`, `src/app/roadmap/page.tsx`, `e2e/roadmap.spec.ts`

**Interfaces:**
- Consumes: `layoutRoadmap(order, lessons)` (unchanged), plus `TrackMeta` and `LessonMeta`.
- Produces:

```ts
export interface RoadmapBand { track: string; title: string; layout: RoadmapLayout }
export interface CrossEdge { from: string; to: string }
export function layoutBands(tracks: TrackMeta[], lessons: LessonMeta[]): { bands: RoadmapBand[]; crossEdges: CrossEdge[]; maxRow: number }
```

- [ ] **Step 1: Write the failing test**

Add to `roadmap-layout.test.ts`:

```ts
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
```

Import `layoutBands` and the `TrackMeta` type in the test file. Run it. Expected: FAIL.

- [ ] **Step 2: Implement `layoutBands`**

Append to `roadmap-layout.ts`:

```ts
export interface RoadmapBand { track: string; title: string; layout: RoadmapLayout }
export interface CrossEdge { from: string; to: string }

/** One band per track; levels use in-track prerequisites, and cross-track prerequisites become cross edges. */
export function layoutBands(tracks: TrackMeta[], lessons: LessonMeta[]): { bands: RoadmapBand[]; crossEdges: CrossEdge[]; maxRow: number } {
  const trackOf = new Map(lessons.map((l) => [l.slug, l.track]))
  const bands = tracks.map((t) => {
    const order = t.modules.flatMap((m) => m.lessons)
    const own = lessons.filter((l) => l.track === t.slug)
    return { track: t.slug, title: t.title, layout: layoutRoadmap(order, own) }
  })
  const crossEdges = lessons.flatMap((l) =>
    l.prerequisites.filter((pre) => trackOf.has(pre) && trackOf.get(pre) !== l.track).map((from) => ({ from, to: l.slug })),
  )
  return { bands, crossEdges, maxRow: Math.max(0, ...bands.map((b) => b.layout.maxRow)) }
}
```

`layoutRoadmap` already ignores prerequisites that aren't in its `lessons` argument, so cross-track prerequisites don't affect levels. Run the test. Expected: PASS.

- [ ] **Step 3: Render the bands**

In `roadmap-view.tsx`:
- Replace `layoutRoadmap` with `layoutBands(tracks, lessons)`.
- Each band gets a title row of 44px, then `levels * ROW`. Let `top[i]` be the running sum of the earlier band heights, where a band's height is `44 + levels * ROW + 20`.
- Node positions use the global `maxRow` for width:

  ```ts
  x = PAD + ((maxRow - n.rowSize) * COL) / 2 + n.index * COL + COL / 2
  y = top[i] + 44 + n.level * ROW + 40
  ```
- **Band titles:** render each as `<g transform={`translate(${PAD} ${top[i] + 24})`}><text className="fill-foreground text-[15px] font-semibold">{band.title}</text></g>`. Wrapping it in a `<g>` with a transform keeps the label-overlap test's `closest('g')` valid. Draw a separating `<line>` above every band except the first.
- **Edges:** in-band edges use the existing curve. Cross edges use the same curve plus `strokeDasharray="6 4"`. Every edge `<path>` gets `data-from` and `data-to` attributes.
- Node links use `lessonHref(lessonBySlug.get(n.slug)!)`.
- Set the SVG `aria-label` to `"Roadmap"`, and the height to the sum of the band heights plus 10.

In `src/app/roadmap/page.tsx`, the intro copy becomes:

> Each track is a band, and each ring shows your mastery. Dashed lines link lessons across tracks. The dashed ring marks what to learn next, but every lesson is open, so jump anywhere.

In `e2e/roadmap.spec.ts`, change the locator to `svg[aria-label="Roadmap"]` and add:

```ts
test('roadmap shows both tracks and the cross-track prerequisite', async ({ page }) => {
  await page.goto('/roadmap/')
  const svg = page.locator('svg[aria-label="Roadmap"]')
  await expect(svg.getByText('Algorithms', { exact: true })).toBeVisible()
  await expect(svg.getByText('System Design', { exact: true })).toBeVisible()
  await expect(svg.locator('path[data-from="arrays-hashing"][data-to="caching"]')).toHaveCount(1)
  await svg.getByRole('link', { name: /^Caching:/ }).click()
  await expect(page).toHaveURL(/\/system-design\/caching\/$/)
})
```

Run `npm test && npm run typecheck && npm run lint && npm run e2e`. Expected: all green. The existing label-overlap test must still pass with two bands.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: cross-track roadmap with one band per track

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Stats per track and a track filter on exercises

**Files:**
- Modify: `src/lib/logic/filter.ts`, `src/lib/logic/filter.test.ts`, `src/components/exercises/exercises-table.tsx`, `src/components/stats/stats-view.tsx`, `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `trackLookup`, `trackMastery`, `TRAINER_TRACK`.
- Produces: `ExerciseFilter` gains a `track: string` field (`'all'` or a track slug). The signature becomes `filterExercises(exercises, progress, f, trackOf)`.

- [ ] **Step 1: Write the failing filter test**

In `filter.test.ts`:
- Add `track: 'all'` to the `all` filter object.
- Pass `trackOf` to every `filterExercises` call, where `trackOf` maps every lesson used by the fixtures to `'algorithms'` except `'cache'`, which maps to `'system-design'`.
- Add an exercise fixture `prob('lru', 'LRU Cache', 146, ['ll', 'cache'], 'medium')`. If any existing count assertions change, adjust them by exactly that one extra row.

Then add:

```ts
it('filters by track: an exercise matches every track one of its lessons belongs to', () => {
  expect(slugs({ track: 'system-design' })).toEqual(['lru'])
  expect(slugs({ track: 'algorithms' })).toContain('lru')
})
```

Run it. Expected: FAIL.

- [ ] **Step 2: Implement it**

```ts
export interface ExerciseFilter {
  q: string
  track: string
  lesson: string
  difficulty: 'all' | Difficulty
  status: 'all' | ExerciseStatus | 'resolve'
}

export function filterExercises(
  exercises: ExerciseMeta[],
  progress: Map<string, ProblemProgress>,
  f: ExerciseFilter,
  trackOf: (slug: string) => string | undefined,
): ExerciseMeta[] {
  const q = f.q.trim().toLowerCase()
  return exercises.filter((e) => {
    const pr = progress.get(e.slug)
    if (q && !e.title.toLowerCase().includes(q) && !String(e.leetcodeId).startsWith(q)) return false
    if (f.track !== 'all' && !e.lessons.some((l) => trackOf(l) === f.track)) return false
    if (f.lesson !== 'all' && !e.lessons.includes(f.lesson)) return false
    if (f.difficulty !== 'all' && e.difficulty !== f.difficulty) return false
    if (f.status === 'resolve') return !!pr?.needsResolve
    if (f.status !== 'all' && exerciseStatus(pr) !== f.status) return false
    return true
  })
}
```

- [ ] **Step 3: Update the table and the stats page**

**`exercises-table.tsx`:**
- Initialise `track` from `params.get('track') ?? 'all'`. If the URL names a track that doesn't exist, fall back to `'all'`.
- Add a `<select aria-label="Track">`: **All tracks**, then each track title.
- The **Lesson** select shows `<optgroup label={track.title}>` per track. When a track is selected, it shows only that track's lessons.
- Change the filter grid from `sm:grid-cols-4` to `sm:grid-cols-5`.

**`stats-view.tsx`:**
- The **Mastery** section renders one block per track:
  - an `<h3 className="font-medium">` with `{track.title} · {trackMastery(track, masteries)}%`
  - that track's lessons in the existing three-column grid
- **Recognition accuracy** iterates only over `lessons.filter((l) => l.track === TRAINER_TRACK)`.

Add to `e2e/smoke.spec.ts`:

```ts
test('exercises can be filtered by track from the URL', async ({ page }) => {
  await page.goto('/exercises/?track=system-design')
  await expect(page.getByLabel('Track')).toHaveValue('system-design')
  await expect(page.getByText('2 of 138 exercises')).toBeVisible()
})
```

Run `npm test && npm run typecheck && npm run lint && npm run e2e`. Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: per-track mastery in stats and a track filter on exercises

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Rebrand, redirects, upgrade safety and the deploy check

**Files:**
- Create: `vercel.json`, `scripts/check-deploy.mjs`, `e2e/upgrade.spec.ts`
- Modify: every user-visible "LeetHub" string (titles in `src/app/**`, `src/app/layout.tsx`, `src/components/app-shell.tsx`), `src/lib/logic/transfer.ts` and its test (messages only), `src/components/command-palette.tsx` (event name), `package.json` (`"name": "cs-atlas"`)

**Interfaces:**
- Consumes: the routes from Tasks 1 and 4.
- Produces: `node scripts/check-deploy.mjs <baseUrl>`, which exits non-zero on any failure.

- [ ] **Step 1: Write the failing upgrade-safety e2e test**

Create `e2e/upgrade.spec.ts`. It writes v1-shaped rows straight into IndexedDB, the way an existing v1 learner's browser holds them.

```ts
import { expect, test } from '@playwright/test'

const V1_PROGRESS = {
  slug: '3sum', status: 'solved', solveRating: 'alone', firstSolvedAt: '2026-09-01T09:00:00.000Z',
  needsResolve: false, updatedAt: '2026-09-01T09:00:00.000Z',
}
const V1_CARD = {
  slug: '3sum',
  due: '2026-09-05T09:00:00.000Z',
  updatedAt: '2026-09-01T09:00:00.000Z',
  card: {
    due: '2026-09-05T09:00:00.000Z', stability: 3, difficulty: 5, elapsed_days: 0, scheduled_days: 4,
    learning_steps: 0, reps: 1, lapses: 0, state: 2, last_review: '2026-09-01T09:00:00.000Z',
  },
}

test('v1 local progress survives the upgrade: solved and due', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-07T09:00:00') })
  await page.goto('/')
  await expect(page.locator('h1').first()).toBeVisible()
  await page.evaluate(async ({ progress, card }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('leethub')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['progress', 'cards'], 'readwrite')
      tx.objectStore('progress').put(progress)
      tx.objectStore('cards').put(card)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, { progress: V1_PROGRESS, card: V1_CARD })

  await page.reload()
  await expect(page.getByRole('heading', { name: '3Sum', exact: true })).toBeVisible()

  await page.goto('/exercises/?q=3sum')
  await expect(page.getByRole('img', { name: 'Solved alone' }).first()).toBeVisible()
  await page.goto('/exercises/3sum/')
  await expect(page.getByText('Next review:')).toBeVisible()
})
```

Run `npx playwright test e2e/upgrade.spec.ts`. Expected: PASS already, because storage is unchanged; this test guards that.

If it fails, compare the field names with `src/lib/types.ts`. **Do not change storage.** Fix the fixture only when the fixture itself is wrong.

- [ ] **Step 2: Rebrand**

```bash
grep -rn "LeetHub" src e2e README.md package.json
```

- **Change every user-visible occurrence to `CS Atlas`:**
  - page `metadata` titles (`· LeetHub` → `· CS Atlas`)
  - the shell header links
  - the root `title`
  - `transfer.ts`'s two error messages and the matching assertions in `transfer.test.ts`: `Not a CS Atlas backup`, `newer version of CS Atlas`
- **Change these two as well:**
  - Root `description`: `'Learn algorithms, system design and CS fundamentals — and remember what you learn.'`
  - The palette event name: `'csatlas:open-palette'`
- **Do not change** `LeetHubDB`, `new LeetHubDB()`, the DB name `'leethub'`, or `app: 'leethub'` / `z.literal('leethub')` in `transfer.ts`.
- Add this comment above `export const` in `transfer.ts`:

  ```ts
  // `app: 'leethub'` is the v1 backup marker; it stays so every existing backup keeps importing.
  ```

- Set `"name": "cs-atlas"` in `package.json`, then run `npm install --package-lock-only` to update the lockfile name.

Verify:

```bash
grep -rn "LeetHub" src e2e | grep -v "LeetHubDB"
```

Expected: no output. `README.md` is rewritten in Task 8.

- [ ] **Step 3: Add the redirects in `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    { "source": "/patterns/:slug", "destination": "/algorithms/:slug/", "permanent": true },
    { "source": "/patterns/:slug/", "destination": "/algorithms/:slug/", "permanent": true },
    { "source": "/problems", "destination": "/exercises/", "permanent": true },
    { "source": "/problems/", "destination": "/exercises/", "permanent": true },
    { "source": "/problems/:slug", "destination": "/exercises/:slug/", "permanent": true },
    { "source": "/problems/:slug/", "destination": "/exercises/:slug/", "permanent": true }
  ]
}
```

- [ ] **Step 4: Write `scripts/check-deploy.mjs`**

```js
#!/usr/bin/env node
// Usage: node scripts/check-deploy.mjs https://leethub-nine.vercel.app
// Checks the v1 redirects (308 → new URL → 200) and that every lesson, track and exercise page returns 200.
import { readdirSync } from 'node:fs'
import { basename, join } from 'node:path'

const base = (process.argv[2] ?? '').replace(/\/+$/, '')
if (!base) {
  console.error('Usage: node scripts/check-deploy.mjs <baseUrl>')
  process.exit(2)
}

const root = new URL('../content/', import.meta.url).pathname
const tracks = readdirSync(join(root, 'tracks'))
const lessonPaths = tracks.flatMap((t) =>
  readdirSync(join(root, 'tracks', t, 'lessons')).filter((f) => f.endsWith('.mdx')).map((f) => `/${t}/${basename(f, '.mdx')}/`),
)
const exercisePaths = readdirSync(join(root, 'exercises')).filter((f) => f.endsWith('.yaml')).map((f) => `/exercises/${basename(f, '.yaml')}/`)
const pages = ['/', '/tracks/', '/roadmap/', '/exercises/', '/train/', '/stats/', '/settings/', ...tracks.map((t) => `/${t}/`), ...lessonPaths, ...exercisePaths]

const REDIRECTS = [
  ['/patterns/two-pointers', '/algorithms/two-pointers/'],
  ['/patterns/two-pointers/', '/algorithms/two-pointers/'],
  ['/problems', '/exercises/'],
  ['/problems/', '/exercises/'],
  ['/problems/3sum', '/exercises/3sum/'],
  ['/problems/3sum/', '/exercises/3sum/'],
]

const failures = []

for (const [from, to] of REDIRECTS) {
  let url = base + from
  const hops = []
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { redirect: 'manual' })
    hops.push(res.status)
    if (res.status < 300 || res.status >= 400) break
    url = new URL(res.headers.get('location'), url).href
  }
  const finalPath = new URL(url).pathname
  const ok = hops.slice(0, -1).every((s) => s === 308) && hops.at(-1) === 200 && finalPath === to
  if (!ok) failures.push(`redirect ${from}: hops ${hops.join(' → ')}, ended at ${finalPath} (want 308 → ${to} → 200)`)
}

const BATCH = 10
for (let i = 0; i < pages.length; i += BATCH) {
  await Promise.all(
    pages.slice(i, i + BATCH).map(async (path) => {
      const res = await fetch(base + path)
      if (res.status !== 200) failures.push(`${path}: ${res.status}`)
    }),
  )
}

console.log(`Checked ${REDIRECTS.length} redirects and ${pages.length} pages on ${base}`)
if (failures.length > 0) {
  console.error(`FAIL (${failures.length}):\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log('PASS')
```

Add `"check:deploy": "node scripts/check-deploy.mjs"` to the `package.json` scripts.

Run `npm test && npm run typecheck && npm run lint && npm run e2e`. Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: rebrand to CS Atlas, redirect v1 URLs, guard v1 data on upgrade

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Open-source files, CI and README

**Files:**
- Create: `LICENSE`, `LICENSE-CONTENT`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `templates/lesson.mdx`, `templates/exercise.yaml`, `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/content-error.yml`, `.github/ISSUE_TEMPLATE/lesson-request.yml`, `.github/ISSUE_TEMPLATE/bug.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/workflows/ci.yml`
- Modify: `README.md`, `src/lib/content/index.test.ts` (template check)

**Interfaces:**
- Consumes: the rule IDs V1–V11 and their messages (Task 1); `npm run check:deploy` (Task 7).

- [ ] **Step 1: Licences and the code of conduct**

`LICENSE`:

```
MIT License

Copyright (c) 2026 CS Atlas contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

`LICENSE-CONTENT`: a header, then the official legal code text.

```bash
{
  printf 'The content in content/ (lessons, exercises and track outlines) is licensed under\n'
  printf 'the Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0).\n'
  printf 'Code everywhere else in this repository is licensed under the MIT License (see LICENSE).\n\n'
  curl -fsSL https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt
} > LICENSE-CONTENT
grep -c "Attribution-ShareAlike 4.0" LICENSE-CONTENT
```

Expected: a count of at least 2.

`CODE_OF_CONDUCT.md`:

```bash
curl -fsSL https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md -o CODE_OF_CONDUCT.md
grep -n "\[INSERT CONTACT METHOD\]" CODE_OF_CONDUCT.md
```

Replace `[INSERT CONTACT METHOD]` with:

```
the maintainers, privately, through the contact details on https://github.com/thong-do
```

Then confirm with `grep` that no `[INSERT` remains. If either `curl` fails because there's no network access, stop and report BLOCKED. Do not write these legal texts from memory.

- [ ] **Step 2: Templates, with a test that keeps them valid**

`templates/lesson.mdx`:

```mdx
---
slug: your-lesson-slug            # lowercase-with-dashes, unique across all tracks
title: Your Lesson Title
level: beginner                   # beginner | intermediate | advanced
authors: [your-github-username]
prerequisites: []                 # lesson slugs from any track, e.g. [arrays-hashing]
summary: "One sentence: what this lets the learner do."
# Algorithms lessons also need:
# triggers: ["a phrase in a problem statement that hints at this lesson"]
# complexity: "Usually O(n)"
# confusedWith: [another-lesson]
---

## Intuition

Explain the idea with an everyday analogy before any jargon. Why does it work?

## Visual

A diagram in a ```text block, or an interactive <Visualizer kind="…" /> if one fits.

## Example

Worked code or a worked scenario. (Algorithms lessons use "## Template" instead.)

## Pitfalls

- The mistakes people actually make, and how to avoid each one.

## Tips & tricks

- Shortcuts, variations and what to say in an interview.
```

`templates/exercise.yaml`:

```yaml
slug: problem-slug-from-the-leetcode-url
type: external-problem
title: "Problem Title"
leetcodeId: 1
url: https://leetcode.com/problems/problem-slug-from-the-leetcode-url/
difficulty: easy                 # easy | medium | hard
lessons: [primary-lesson]        # first = the ladder it belongs to; add lessons from other tracks after it
ladderOrder: 1                   # next free number in the primary lesson's ladder
recognitionPrompt: "Describe the problem in your own words — never paste LeetCode's text."
hint: "One nudge toward the approach, not the solution."
```

Add to `index.test.ts`:

```ts
import { readFileSync } from 'node:fs'

it('ships contributor templates with the required sections and fields', () => {
  const lesson = readFileSync('templates/lesson.mdx', 'utf8')
  for (const h of ['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks']) expect(lesson).toContain(`\n## ${h}\n`)
  const exercise = readFileSync('templates/exercise.yaml', 'utf8')
  for (const f of ['slug', 'type', 'title', 'leetcodeId', 'url', 'difficulty', 'lessons', 'ladderOrder', 'recognitionPrompt', 'hint']) {
    expect(exercise).toMatch(new RegExp(`^${f}:`, 'm'))
  }
})
```

- [ ] **Step 3: `CONTRIBUTING.md`**

````markdown
# Contributing to CS Atlas

Thanks for helping people learn computer science in a way that lasts. You can fix a typo, improve a lesson, add an exercise or write a whole new lesson. Everything goes through a pull request, and every pull request gets a live preview link.

## Quick start

```bash
git clone https://github.com/thong-do/leethub.git cs-atlas && cd cs-atlas
npm install
npm run dev          # http://localhost:3000
```

Before you open a PR, run:

```bash
npm test             # builds content (with validation) and runs unit tests
npm run typecheck
npm run lint
npm run e2e          # optional locally; CI runs it
```

## How content is organised

```
content/
  tracks/<track>/track.yaml        # modules and the order of lessons
  tracks/<track>/lessons/<slug>.mdx
  exercises/<slug>.yaml
```

- A **track** (Algorithms, System Design, …) has **modules**; a module lists **lessons** in order and may list `comingSoon` titles.
- An **exercise** links to a problem on LeetCode and lists the lessons it practises. The first lesson is its primary lesson: the exercise appears in that lesson's ladder. Lessons from **other tracks** can share it.

## Add a lesson

1. Copy `templates/lesson.mdx` to `content/tracks/<track>/lessons/<slug>.mdx` and fill it in.
2. Add the slug to a module's `lessons` in `content/tracks/<track>/track.yaml`.
3. Make sure at least one exercise lists it (add one if needed).
4. Run `npm run dev` and open `/<track>/<slug>/`.

## Add an exercise

1. Copy `templates/exercise.yaml` to `content/exercises/<slug>.yaml`. The slug must match the LeetCode URL.
2. Set `ladderOrder` to the next free number in the primary lesson's ladder.
3. Write `recognitionPrompt` and `hint` **in your own words**. Never paste a problem statement or a solution.

## The quality bar (checked by the build)

Every lesson must have these `##` sections: **Intuition**, **Visual**, **Pitfalls**, **Tips & tricks**, plus **Template** (Algorithms) or **Example** (other tracks). Every lesson needs at least one exercise.

If something is wrong, `npm test` and `npm run build` fail with a message like:

```
[V9] content/tracks/system-design/lessons/caching.mdx: missing section(s) "## Pitfalls"
```

| Rule | Checks |
|---|---|
| V1 | A track's `slug` equals its folder, isn't a reserved route name, and its `order` is unique |
| V2 | Lesson slugs are unique across all tracks |
| V3 | Every lesson is listed exactly once in a module of its own track |
| V4 | Each module has a lesson or a `comingSoon` title |
| V5 | Prerequisites, `confusedWith` and exercise `lessons` point to real lessons |
| V6 | Prerequisites have no cycles |
| V7 | `ladderOrder` is unique within a primary lesson |
| V8 | Algorithms lessons have `triggers` and `complexity` |
| V9 | Required sections are present |
| V10 | Every lesson has at least one exercise |
| V11 | Exercise slugs and LeetCode ids are unique; URLs are on leetcode.com |

## Writing style

- Intuition before jargon: start from an everyday analogy.
- Short sentences, concrete numbers, and one idea per paragraph.
- Code is Python unless the topic needs another language.

## Pull requests

- Keep each PR to one topic.
- Vercel posts a **preview link** on the PR. Open your page there and check it on a phone-sized window.
- CI must be green: lint, typecheck, unit tests, build and e2e.

## Licence of contributions

By contributing, you agree that:
- content under `content/` is licensed under **CC BY-SA 4.0** (`LICENSE-CONTENT`)
- code is licensed under **MIT** (`LICENSE`)

Only contribute work you have the right to share.

## Code of conduct

Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
````

- [ ] **Step 4: GitHub templates and CI**

`.github/pull_request_template.md`:

```markdown
## What and why

<!-- One or two sentences. Link an issue if there is one. -->

## Checklist

- [ ] `npm test`, `npm run typecheck` and `npm run lint` pass locally
- [ ] Lessons have Intuition, Visual, Template/Example, Pitfalls and Tips & tricks, and at least one exercise
- [ ] No problem statements or solutions copied from LeetCode or elsewhere
- [ ] I opened the Vercel preview and checked the changed pages, including at phone width
```

`.github/ISSUE_TEMPLATE/content-error.yml`:

```yaml
name: Content error
description: Something in a lesson or exercise is wrong or unclear
labels: [content]
body:
  - type: input
    id: url
    attributes:
      label: Page URL
      placeholder: https://…/algorithms/two-pointers/
    validations:
      required: true
  - type: textarea
    id: problem
    attributes:
      label: What is wrong?
      description: Quote the sentence or code, and say what it should be.
    validations:
      required: true
```

`.github/ISSUE_TEMPLATE/lesson-request.yml`:

```yaml
name: Lesson request
description: Suggest a lesson or a topic for a track
labels: [lesson-request]
body:
  - type: dropdown
    id: track
    attributes:
      label: Track
      options: [Algorithms, System Design, CS Fundamentals, Technologies, Other]
    validations:
      required: true
  - type: input
    id: topic
    attributes:
      label: Topic
    validations:
      required: true
  - type: textarea
    id: why
    attributes:
      label: What should a learner be able to do afterwards?
  - type: checkboxes
    id: write
    attributes:
      label: Contribution
      options:
        - label: I'd like to write this lesson myself
```

`.github/ISSUE_TEMPLATE/bug.yml`:

```yaml
name: Bug
description: Something in the app doesn't work
labels: [bug]
body:
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: What did you expect, and what happened?
    validations:
      required: true
  - type: input
    id: browser
    attributes:
      label: Browser and device
```

`.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: true
```

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run typecheck
      - run: npm run lint
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
        env:
          CI: 'true'
```

`npm test` runs first because its `pretest` step generates `.velite/`, and the typecheck needs it.

- [ ] **Step 5: Rewrite `README.md`**

````markdown
# CS Atlas

An open, community-built place to learn computer science — algorithms, system design and more — in a way that lasts.

**Live:** https://leethub-nine.vercel.app · **Roadmap:** [docs/roadmap.md](docs/roadmap.md) · **Contribute:** [CONTRIBUTING.md](CONTRIBUTING.md)

## What's inside

- **Tracks**: Algorithms (18 lessons, 138 exercises) and System Design (growing), each with modules and a "continue" button
- **Lessons**: intuition first, step-through visualizers, templates or worked examples, pitfalls and tips
- **Exercises**: practice ladders linked to LeetCode, with notes in your own words
- **Spaced repetition** (FSRS) on the Today page, so you review just before you'd forget
- **Pattern-recognition trainer** for algorithms
- **Cross-track roadmap** with your mastery on every lesson
- Progress stays in your browser (IndexedDB); export a backup from Settings

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # content validation + unit tests (Vitest)
npm run e2e        # end-to-end (Playwright)
npm run build      # static site in out/
```

## Deploy

Hosted on Vercel: every push to `main` deploys to production, and pull requests get preview deployments. `vercel.json` redirects v1 URLs (`/patterns/*`, `/problems/*`). After a deploy, run `npm run check:deploy -- <url>` to verify the redirects and every page.

## Licence

Code: [MIT](LICENSE). Content in `content/`: [CC BY-SA 4.0](LICENSE-CONTENT).
````

Run `npm test && npm run typecheck && npm run lint`. Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: licences, contributing guide, templates, issue forms and CI

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After all tasks (controller, not a subagent task)

1. **Verify:** run the full suite once more, then push `feat/phase-0`.
2. **Open the PR:**
   - Wait for the Vercel preview and the new CI check to pass.
   - Run `npm run check:deploy -- <preview-url>`. If preview protection blocks it, note that it will run after merge.
   - Check the preview by hand at 375px and 1280px: `/tracks/`, `/system-design/`, `/system-design/caching/` and `/roadmap/`.
3. **After the owner approves the merge:**
   - Run `npm run check:deploy -- https://leethub-nine.vercel.app` against production.
   - Hand over the owner checklist from spec §8: rename the repo, rename the Vercel project, optionally add the `csatlas.io` domain, make the repo public, and make CI a required check.
