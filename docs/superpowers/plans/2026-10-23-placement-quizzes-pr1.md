# Placement Quizzes (PR 1: platform + CS Fundamentals) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Learners can take a 5-minute placement quiz for a track. Its result is saved in settings, and Continue, Today and Roadmap then skip the modules the learner placed out of. This PR ships the CS Fundamentals placement content.

**Architecture:**
- Placement content is one YAML file per track, in a new Velite collection, `placements`. A new validator, V14, checks it.
- Pure logic in `src/lib/logic/placement.ts` scores answers and turns a saved `Placement` into a set of skipped lessons.
- `continueLesson` and `recommendedLesson` gain an optional `skipped` set.
- The result is stored in `Settings.placements`. Settings is already JSON in both stores, so no migration is needed. Export/import and guest-to-account moves are taught to keep it.
- A static route, `/[track]/placement`, hosts the quiz, and the track home gets a card and "Placed out" badges.

**Tech Stack:** Next.js App Router (static export params), Velite, zod (transfer), Dexie/Supabase stores, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-23-placement-quizzes-design.md`

## Global Constraints

- **Pass rule:** a module is passed only when every one of its questions is answered correctly.
- **What a pass changes:** the start point only. Mastery and flashcards are unchanged, and every lesson stays open.
- **Skipping:** every passed module is skipped, even when an earlier module failed.
- **Questions per module:** 2–3 for each module that has lessons. Modules in `PLACEMENT_EXEMPT_MODULES = { 'system-design': ['case-studies'] }` and modules without lessons have 0.
- **Question format:** exactly 4 distinct choices; `answer` is 0–3.
- **No repeats:** no placement prompt equals a lesson-quiz prompt, after normalising whitespace and case.
- **Reserved slug:** no lesson may have the slug `placement`.
- **Storage:** `Settings.placements?: Record<trackSlug, { passedModules: string[]; takenAt: ISO string }>`. No Supabase migration.
- **Card copy:**
  - Before a placement: "Already know some of this? Take the 5-minute placement quiz". The link text is exactly "Take the 5-minute placement quiz".
  - After a placement: "Placement taken <date> · Retake · Clear".
- **Badge text:** "Placed out" (text, not colour alone).
- **Results screen:** the heading is "Your placement", and the primary link is "Start at <lesson title>".
- **Commits:** end every message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Scratch files:** never commit anything under `.superpowers/`.

## Review Focus

1. **Settings must not be lost on save.** A learner with a dark theme and 0.85 retention takes a placement, and the theme and retention survive. `withPlacement` merges into the current settings, and the quiz won't accept answers until settings have loaded. This is tested in Task 1 and wired in Task 5.
2. **Guest placements move on sign-in.** A guest who only took a placement, with no other progress, signs in and keeps the placement. `first-sync` must not treat their settings as default. Tested in Task 2.
3. **A merge import keeps the newest placement per track.** Importing a backup in merge mode must not drop the backup's placements, or a newer local one. Tested in Task 2.
4. **Stale module slugs are ignored.** A saved placement naming a module that no longer exists skips nothing for that slug and doesn't crash. Tested in Task 1.
5. **Prerequisites in a placed-out module count as ready.** A lesson whose prerequisite was placed out is still recommended. Tested in Task 1.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/types.ts` (modify) | `Placement`, `PlacementQuestion`, `PlacementDoc`; `Settings.placements` |
| `src/lib/logic/placement.ts` (create) | `scorePlacement`, `skippedLessons`, `allSkippedLessons`, `withPlacement` |
| `src/lib/logic/lessons.ts`, `recommend.ts` (modify) | optional `skipped` parameter |
| `src/lib/logic/transfer.ts`, `src/lib/store/first-sync.ts` (modify) | keep placements through import, merge and guest move |
| `src/lib/store/store-contract.ts` (modify) | round-trip settings with placements on both stores |
| `velite.config.ts` (modify) | `placements` collection, validation call |
| `src/lib/content/validate-placement.ts` (create) | V14 rules |
| `src/lib/content/index.ts` (modify) | `getPlacement`, `placementTracks` |
| `content/placement/cs-fundamentals.yaml` (create) | 12 questions |
| `src/lib/hooks/use-placements.ts` (create) | live `placements` from settings |
| `src/app/[track]/placement/page.tsx` (create) | static route |
| `src/components/tracks/placement-quiz.tsx` (create) | one-question-at-a-time quiz and results |
| `src/components/tracks/track-home.tsx`, `src/app/[track]/page.tsx` (modify) | card, badges, skip-aware Continue |
| `src/components/today/today-view.tsx`, `src/components/roadmap/roadmap-view.tsx` (modify) | skip-aware recommendation |
| `scripts/check-deploy.mjs` (modify) | check placement pages |
| `e2e/placement.spec.ts` (create), `e2e/layout.spec.ts` (modify) | behaviour and layout |

---

### Task 1: Placement logic and skip-aware recommendations

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/logic/placement.ts`, `src/lib/logic/placement.test.ts`
- Modify: `src/lib/logic/lessons.ts` (`continueLesson`), `src/lib/logic/recommend.ts`
- Test: `src/lib/logic/lessons.test.ts`, `src/lib/logic/recommend.test.ts`

**Interfaces:**
- Produces:
  - **Types:**
    - `Placement { passedModules: string[]; takenAt: string }`
    - `PlacementQuestion { module: string; prompt: string; choices: string[]; answer: number; explanation: string }`
    - `PlacementDoc { track: string; questions: PlacementQuestion[] }`
    - `Settings.placements?: Record<string, Placement>`
  - **Logic:**
    - `scorePlacement(track: TrackMeta, questions: PlacementQuestion[], answers: number[]): PlacementScore`
    - `skippedLessons(track: TrackMeta, placement: Placement | undefined): Set<string>`
    - `allSkippedLessons(tracks: TrackMeta[], placements: Record<string, Placement> | undefined): Set<string>`
    - `withPlacement(settings: Settings, track: string, placement: Placement | null): Settings`
  - **Skip-aware recommendations:**
    - `continueLesson(track, masteries, skipped?: Set<string>)`
    - `recommendedLesson(lessons, mastery, started, skipped?: Set<string>)`

- [ ] **Step 1: Add the types** to `src/lib/types.ts`. Put them next to the quiz types and in `Settings`:

```ts
export interface PlacementQuestion { module: string; prompt: string; choices: string[]; answer: number; explanation: string }
export interface PlacementDoc { track: string; questions: PlacementQuestion[] }
/** A saved placement result for one track. Only the start point moves; mastery is untouched. */
export interface Placement { passedModules: string[]; takenAt: string }
```

and change `Settings` to:

```ts
export interface Settings {
  desiredRetention: number
  theme: 'system' | 'light' | 'dark'
  /** Placement results keyed by track slug. Absent until the learner takes one. */
  placements?: Record<string, Placement>
}
```

- [ ] **Step 2: Write the failing tests** in `src/lib/logic/placement.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type PlacementQuestion, type TrackMeta } from '@/lib/types'
import { allSkippedLessons, scorePlacement, skippedLessons, withPlacement } from './placement'

const track: TrackMeta = {
  slug: 't', title: 'T', summary: 's', order: 1,
  modules: [
    { slug: 'm1', title: 'M1', lessons: ['a', 'b'], comingSoon: [] },
    { slug: 'm2', title: 'M2', lessons: ['c'], comingSoon: [] },
    { slug: 'm3', title: 'M3', lessons: ['d', 'e'], comingSoon: [] },
  ],
}
const q = (module: string, answer: number): PlacementQuestion => ({ module, prompt: `${module}?`, choices: ['w', 'x', 'y', 'z'], answer, explanation: 'e' })
// m3's questions come first to prove passedModules follows track order, not question order.
const questions = [q('m3', 0), q('m3', 1), q('m1', 2), q('m1', 3), q('m2', 0), q('m2', 1)]

describe('scorePlacement', () => {
  it('passes a module only when every one of its questions is right, in track order', () => {
    const s = scorePlacement(track, questions, [0, 1, 2, 3, 0, 2])
    expect(s.passedModules).toEqual(['m1', 'm3'])
    expect(s.byModule).toEqual({ m1: { correct: 2, total: 2 }, m2: { correct: 1, total: 2 }, m3: { correct: 2, total: 2 } })
  })
  it('treats a missing answer as wrong', () => {
    expect(scorePlacement(track, questions, [0, 1]).passedModules).toEqual(['m3'])
  })
})

describe('skippedLessons', () => {
  it('returns the lessons of every passed module, even after a failed one', () => {
    expect(skippedLessons(track, { passedModules: ['m1', 'm3'], takenAt: '2026-10-23T00:00:00.000Z' })).toEqual(new Set(['a', 'b', 'd', 'e']))
  })
  it('is empty without a placement and ignores unknown module slugs', () => {
    expect(skippedLessons(track, undefined)).toEqual(new Set())
    expect(skippedLessons(track, { passedModules: ['gone', 'm2'], takenAt: '2026-10-23T00:00:00.000Z' })).toEqual(new Set(['c']))
  })
  it('combines every track that has a placement', () => {
    const other: TrackMeta = { ...track, slug: 'u', modules: [{ slug: 'm1', title: 'M1', lessons: ['x'], comingSoon: [] }] }
    const placements = { t: { passedModules: ['m2'], takenAt: 'x' }, u: { passedModules: ['m1'], takenAt: 'x' } }
    expect(allSkippedLessons([track, other], placements)).toEqual(new Set(['c', 'x']))
    expect(allSkippedLessons([track, other], undefined)).toEqual(new Set())
  })
})

describe('withPlacement', () => {
  const p = { passedModules: ['m1'], takenAt: '2026-10-23T00:00:00.000Z' }
  it('adds or replaces one track and keeps every other setting', () => {
    const base = { desiredRetention: 0.85, theme: 'dark' as const, placements: { u: p } }
    const next = withPlacement(base, 't', p)
    expect(next).toEqual({ desiredRetention: 0.85, theme: 'dark', placements: { u: p, t: p } })
    expect(base.placements).toEqual({ u: p })
  })
  it('clears one track, and drops the field when none remain', () => {
    const one = withPlacement(DEFAULT_SETTINGS, 't', p)
    expect(withPlacement(one, 't', null)).toEqual(DEFAULT_SETTINGS)
    expect('placements' in withPlacement(one, 't', null)).toBe(false)
  })
})
```

Append to `src/lib/logic/lessons.test.ts`, reusing that file's existing track fixture style. If the file has no suitable fixture, define this local one inside the new `describe`:

```ts
describe('continueLesson with placed-out lessons', () => {
  const t: TrackMeta = {
    slug: 't', title: 'T', summary: 's', order: 1,
    modules: [
      { slug: 'm1', title: 'M1', lessons: ['a', 'b'], comingSoon: [] },
      { slug: 'm2', title: 'M2', lessons: ['c'], comingSoon: [] },
    ],
  }
  it('skips placed-out lessons', () => {
    expect(continueLesson(t, new Map(), new Set(['a', 'b']))).toBe('c')
  })
  it('falls back to the first unmastered lesson when everything left is skipped', () => {
    expect(continueLesson(t, new Map([['c', 90]]), new Set(['a', 'b']))).toBe('a')
  })
  it('behaves as before without a skipped set', () => {
    expect(continueLesson(t, new Map([['a', 90]]))).toBe('b')
  })
})
```

Append inside the existing `describe('recommendedLesson', …)` in `src/lib/logic/recommend.test.ts`:

```ts
  it('skips placed-out lessons and treats their prerequisites as satisfied', () => {
    // a is placed out, so b (needs a) is ready even though a has 0 mastery.
    expect(recommendedLesson(lessons, new Map(), algo, new Set(['a']))).toBe('b')
  })
  it('falls back to skipped lessons once everything else is mastered', () => {
    const m = new Map(lessons.filter((l) => l.slug !== 'a').map((l) => [l.slug, 90]))
    expect(recommendedLesson(lessons, m, algo, new Set(['a']))).toBe('a')
  })
```

Add `import type { TrackMeta } from '@/lib/types'` to `lessons.test.ts` if it isn't already imported.

- [ ] **Step 3: Run the tests and watch them fail.**
Run: `npx vitest run src/lib/logic/placement.test.ts src/lib/logic/lessons.test.ts src/lib/logic/recommend.test.ts`
Expected: FAIL, because `./placement` can't be resolved and the new assertions don't hold yet.

- [ ] **Step 4: Implement.** Create `src/lib/logic/placement.ts`:

```ts
import type { Placement, PlacementQuestion, Settings, TrackMeta } from '@/lib/types'

export interface PlacementScore {
  /** Modules where every question was answered correctly, in track order. */
  passedModules: string[]
  byModule: Record<string, { correct: number; total: number }>
}

export function scorePlacement(track: TrackMeta, questions: PlacementQuestion[], answers: number[]): PlacementScore {
  const byModule: PlacementScore['byModule'] = {}
  questions.forEach((q, i) => {
    const score = (byModule[q.module] ??= { correct: 0, total: 0 })
    score.total += 1
    if (answers[i] === q.answer) score.correct += 1
  })
  const passedModules = track.modules
    .map((m) => m.slug)
    .filter((slug) => byModule[slug] !== undefined && byModule[slug].correct === byModule[slug].total)
  return { passedModules, byModule }
}

/** Lessons in every passed module. Unknown module slugs (renamed or removed content) are ignored. */
export function skippedLessons(track: TrackMeta, placement: Placement | undefined): Set<string> {
  if (!placement) return new Set()
  const passed = new Set(placement.passedModules)
  return new Set(track.modules.filter((m) => passed.has(m.slug)).flatMap((m) => m.lessons))
}

export function allSkippedLessons(tracks: TrackMeta[], placements: Record<string, Placement> | undefined): Set<string> {
  return new Set(tracks.flatMap((t) => [...skippedLessons(t, placements?.[t.slug])]))
}

/** New settings with one track's placement set (or cleared with null); every other field is kept. */
export function withPlacement(settings: Settings, track: string, placement: Placement | null): Settings {
  const { placements, ...rest } = settings
  const next = { ...placements }
  if (placement) next[track] = placement
  else delete next[track]
  return Object.keys(next).length > 0 ? { ...rest, placements: next } : rest
}
```

Replace `continueLesson` in `src/lib/logic/lessons.ts`:

```ts
/** First lesson that is neither mastered nor placed out; then the first unmastered one; then the first lesson. */
export function continueLesson(track: TrackMeta, masteries: Map<string, number>, skipped: Set<string> = new Set()): string | null {
  const slugs = trackLessons(track)
  const open = (s: string) => (masteries.get(s) ?? 0) < MASTERED
  return slugs.find((s) => open(s) && !skipped.has(s)) ?? slugs.find(open) ?? slugs[0] ?? null
}
```

Replace `recommendedLesson` in `src/lib/logic/recommend.ts`:

```ts
export function recommendedLesson(
  lessons: LessonMeta[],
  mastery: Map<string, number>,
  started: Set<string>,
  skipped: Set<string> = new Set(),
): string | null {
  const tracks = started.size > 0 ? started : new Set([DEFAULT_TRACK])
  const order = lessons.filter((l) => tracks.has(l.track))
  const m = (slug: string) => mastery.get(slug) ?? 0
  const open = (l: LessonMeta) => m(l.slug) < MASTERED
  // A placed-out prerequisite counts as ready: the learner showed they know it.
  const ready = (l: LessonMeta) => open(l) && l.prerequisites.every((pre) => skipped.has(pre) || m(pre) >= PREREQUISITE_READY)
  const fresh = order.filter((l) => !skipped.has(l.slug))
  return (fresh.find(ready) ?? fresh.find(open) ?? order.find(open))?.slug ?? null
}
```

- [ ] **Step 5: Run the tests and watch them pass.**
Run: `npx vitest run src/lib/logic && npm run typecheck`
Expected: every test passes, and there are no type errors.

- [ ] **Step 6: Commit.**

```bash
git add src/lib/types.ts src/lib/logic/placement.ts src/lib/logic/placement.test.ts src/lib/logic/lessons.ts src/lib/logic/lessons.test.ts src/lib/logic/recommend.ts src/lib/logic/recommend.test.ts
git commit -m "feat(placement): scoring, skipped lessons and skip-aware recommendations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Placements survive sync, import, merge and the guest move

**Files:**
- Modify: `src/lib/logic/transfer.ts` (the zod `settings` schema, `mergeUserData`)
- Modify: `src/lib/store/first-sync.ts` (`isDefault`)
- Modify: `src/lib/store/store-contract.ts`
- Test: `src/lib/logic/transfer.test.ts`, `src/lib/store/first-sync.test.ts`

**Interfaces:**
- Consumes: `Placement` and `Settings.placements` from Task 1.
- Produces: no new exports.

- [ ] **Step 1: Write the failing tests.**

In `src/lib/store/store-contract.ts`:
- Add `DEFAULT_SETTINGS` to the `@/lib/types` import, as a value import.
- Add this test inside the `describe`:

```ts
      it('saves and reads back settings with placements', async () => {
        const settings = {
          ...DEFAULT_SETTINGS, theme: 'dark' as const,
          placements: { 'cs-fundamentals': { passedModules: ['foundations'], takenAt: day(3).toISOString() } },
        }
        await store.saveSettings(settings)
        expect((await store.getMeta()).settings).toEqual(settings)
      })
```

In `src/lib/logic/transfer.test.ts`, reuse its existing `UserData` fixture and builders; read the file first. Add:
- **Round trip:** `parseExport(JSON.stringify(buildExport(dataWithPlacements, now)))` returns `meta.settings.placements` equal to the input.
- **Merge, newest wins:** `mergeUserData(local, incoming)` keeps the newer `takenAt` for a track both sides have, and keeps tracks that only one side has. Use local `{ a: {takenAt: '2026-10-01…'}, b: {…} }` and incoming `{ a: {takenAt: '2026-10-05…'}, c: {…} }`. The expected result is `a` from incoming, plus `b` and `c`.
- **Merge without placements:** when neither side has placements, the merged settings have no `placements` key. Use `expect('placements' in merged.meta.settings).toBe(false)`.

In `src/lib/store/first-sync.test.ts`, add a case following its existing pattern:
- The guest has no rows, but settings are `{ ...DEFAULT_SETTINGS, placements: { t: { passedModules: ['m1'], takenAt: '…' } } }`.
- The guest's data is moved, i.e. uploaded, the same way the file's existing "non-default settings" case is.
- Read the file to find that exact assertion and copy its shape.

- [ ] **Step 2: Run the tests and watch them fail.**
Run: `npx vitest run src/lib/logic/transfer.test.ts src/lib/store`
Expected:
- The round trip loses `placements`, because zod strips unknown keys.
- The merge drops incoming placements.
- `first-sync` treats the guest as empty.
- The contract test may already pass on both stores; that's fine, it pins the behaviour.

- [ ] **Step 3: Implement.**

In `src/lib/logic/transfer.ts`, extend the settings schema:

```ts
      settings: z.object({
        desiredRetention: z.number().min(0.7).max(0.97),
        theme: z.enum(['system', 'light', 'dark']),
        placements: z.record(z.string(), z.object({ passedModules: z.array(z.string()), takenAt: iso })).optional(),
      }),
```

Add this helper above `mergeUserData`, importing `Placement` and `Settings` types from `@/lib/types` as needed:

```ts
/** Per track, the placement with the later takenAt wins. */
function mergeSettings(local: Settings, incoming: Settings): Settings {
  const placements: Record<string, Placement> = { ...local.placements }
  for (const [track, p] of Object.entries(incoming.placements ?? {})) {
    if (!placements[track] || p.takenAt > placements[track].takenAt) placements[track] = p
  }
  const { placements: _drop, ...rest } = local
  void _drop
  return Object.keys(placements).length > 0 ? { ...rest, placements } : rest
}
```

and change `settings: local.meta.settings,` in `mergeUserData` to `settings: mergeSettings(local.meta.settings, incoming.meta.settings),`.

If `@typescript-eslint/no-unused-vars` still flags `_drop` after `void _drop`, write `const rest = { ...local }; delete rest.placements` instead.

In `src/lib/store/first-sync.ts`:

```ts
const isDefault = (s: UserData['meta']['settings']) =>
  s.desiredRetention === DEFAULT_SETTINGS.desiredRetention && s.theme === DEFAULT_SETTINGS.theme && !s.placements
```

- [ ] **Step 4: Run the tests and watch them pass.**
Run: `npx vitest run src/lib && npm run typecheck && npm run lint`
Expected: everything passes.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/logic/transfer.ts src/lib/logic/transfer.test.ts src/lib/store/first-sync.ts src/lib/store/first-sync.test.ts src/lib/store/store-contract.ts
git commit -m "feat(placement): keep placements through export, merge import and guest move

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Placement content pipeline and validation (V14)

**Files:**
- Create: `src/lib/content/validate-placement.ts`, `src/lib/content/validate-placement.test.ts`
- Modify: `velite.config.ts`
- Modify: `src/lib/content/index.ts`

**Interfaces:**
- Consumes: `PlacementQuestion` and `PlacementDoc` from Task 1, plus `ContentInput` from `./validate`.
- Produces:
  - **Validator:**
    - `validatePlacements(placements: PlacementInput[], content: ContentInput): string[]`
    - `PLACEMENT_EXEMPT_MODULES`
    - `PlacementInput = { track: string; path: string; questions: PlacementQuestion[] }`
  - **Content API:**
    - `getPlacement(track: string): PlacementDoc | undefined`
    - `placementTracks(): string[]`
  - **Velite:** the collection key `placements` emits `.velite/placements.json`.

- [ ] **Step 1: Write the failing tests** in `src/lib/content/validate-placement.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { PlacementQuestion } from '@/lib/types'
import type { ContentInput } from './validate'
import { validatePlacements, type PlacementInput } from './validate-placement'

const content = (): ContentInput => ({
  tracks: [
    { slug: 'cs', folder: 'cs', order: 1, modules: [
      { slug: 'm1', lessons: ['a'], comingSoon: [] },
      { slug: 'm2', lessons: ['b'], comingSoon: [] },
      { slug: 'later', lessons: [], comingSoon: ['Soon'] },
    ] },
    { slug: 'system-design', folder: 'system-design', order: 2, modules: [
      { slug: 'm1', lessons: ['c'], comingSoon: [] },
      { slug: 'case-studies', lessons: ['d'], comingSoon: [] },
    ] },
  ],
  lessons: [],
  exercises: [{
    slug: 'a-quiz', type: 'quiz', title: 'q', lessons: ['a'], ladderOrder: 1, path: 'exercises/a-quiz', flashcards: [],
    questions: [{ id: 'q1', prompt: 'Which  Structure is FAST?', choices: ['x', 'y'], answer: 0, explanation: 'e' }],
  }],
} as unknown as ContentInput)
let n = 0
const q = (module: string, o: Partial<PlacementQuestion> = {}): PlacementQuestion =>
  ({ module, prompt: `prompt ${++n}`, choices: ['w', 'x', 'y', 'z'], answer: 1, explanation: 'e', ...o })
const file = (track: string, questions: PlacementQuestion[], path = `placement/${track}`): PlacementInput => ({ track, path, questions })
const ok = () => file('cs', [q('m1'), q('m1'), q('m2'), q('m2'), q('m2')])

describe('validatePlacements', () => {
  it('accepts a valid file, and tracks without a file', () => {
    expect(validatePlacements([ok()], content())).toEqual([])
    expect(validatePlacements([], content())).toEqual([])
  })
  it('rejects an unknown track, a mismatched file name and a second file for one track', () => {
    expect(validatePlacements([file('nope', [])], content())).toEqual(['[V14] content/placement/nope.yaml: unknown track "nope"'])
    expect(validatePlacements([{ ...ok(), path: 'placement/other' }], content())[0]).toContain('file name "other" must equal track "cs"')
    expect(validatePlacements([ok(), ok()], content())).toContain('[V14] content/placement/cs.yaml: track "cs" already has a placement quiz')
  })
  it('rejects unknown modules and wrong question counts', () => {
    const errors = validatePlacements([file('cs', [q('m1'), q('m2'), q('m2'), q('zzz')])], content())
    expect(errors).toContain('[V14] content/placement/cs.yaml: question 4 names unknown module "zzz"')
    expect(errors).toContain('[V14] content/placement/cs.yaml: module "m1" has 1 question(s); it needs 2–3')
    expect(validatePlacements([file('cs', [q('m1'), q('m1'), q('m1'), q('m1'), q('m2'), q('m2')])], content()))
      .toContain('[V14] content/placement/cs.yaml: module "m1" has 4 question(s); it needs 2–3')
  })
  it('requires 0 questions for exempt modules and modules without lessons', () => {
    expect(validatePlacements([file('cs', [...ok().questions, q('later')])], content()))
      .toContain('[V14] content/placement/cs.yaml: module "later" must have no placement questions')
    expect(validatePlacements([file('system-design', [q('m1'), q('m1')])], content())).toEqual([])
    expect(validatePlacements([file('system-design', [q('m1'), q('m1'), q('case-studies')])], content()))
      .toContain('[V14] content/placement/system-design.yaml: module "case-studies" must have no placement questions')
  })
  it('rejects bad choices and answers', () => {
    const errors = validatePlacements([file('cs', [
      q('m1', { choices: ['w', 'x', 'y'] }), q('m1', { choices: ['w', 'W ', 'y', 'z'] }),
      q('m2', { answer: 4 }), q('m2'),
    ])], content())
    expect(errors).toContain('[V14] content/placement/cs.yaml: question 1 needs exactly 4 choices, has 3')
    expect(errors).toContain('[V14] content/placement/cs.yaml: question 2 has duplicate choices')
    expect(errors).toContain('[V14] content/placement/cs.yaml: question 3 answer 4 is not one of its choices')
  })
  it('rejects a prompt that repeats a lesson-quiz question', () => {
    expect(validatePlacements([file('cs', [q('m1', { prompt: 'which structure is  fast?' }), q('m1'), q('m2'), q('m2')])], content()))
      .toContain('[V14] content/placement/cs.yaml: question 1 repeats a lesson-quiz prompt')
  })
  it('reserves the lesson slug "placement"', () => {
    const c = content()
    c.lessons = [{ slug: 'placement', path: 'tracks/cs/lessons/placement' } as ContentInput['lessons'][number]]
    expect(validatePlacements([], c)).toEqual(['[V14] content/tracks/cs/lessons/placement.mdx: the slug "placement" is reserved for the placement quiz route'])
  })
})
```

- [ ] **Step 2: Run the tests and watch them fail.**
Run: `npx vitest run src/lib/content/validate-placement.test.ts`
Expected: FAIL, because the module can't be resolved.

- [ ] **Step 3: Implement** `src/lib/content/validate-placement.ts`:

```ts
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
```

Note: the unknown-module error for `zzz` is reported, and `zzz` gets no count error because the count loop only walks the track's own modules. That matches the test.

- [ ] **Step 4: Wire up Velite** in `velite.config.ts`.

Add the collection after `exercises`:

```ts
const placements = defineCollection({
  name: 'Placement',
  pattern: 'placement/*.yaml',
  schema: s.object({
    track: s.string(),
    questions: s.array(s.object({
      module: s.string(),
      prompt: s.string().min(1),
      choices: s.array(s.string().min(1)),
      answer: s.number().int(),
      explanation: s.string().min(1),
    }).strict()).min(1),
    path: s.path(),
  }),
})
```

The choice count and answer range are left to V14, so a contributor gets the friendly message.

- Change `collections: { tracks, lessons, exercises }` to `collections: { tracks, lessons, exercises, placements }`.
- In `prepare`:
  - Destructure `placements`.
  - Build the content input once.
  - Run both validators:

```ts
  prepare: ({ tracks, lessons, exercises, placements }) => {
    const content = {
      tracks: tracks.map((t) => ({ slug: t.slug, folder: t.folder, order: t.order, modules: t.modules })),
      lessons: lessons.map((l) => ({ ...l, headings: l.toc.map((h) => h.title) })),
      exercises,
    }
    const errors = [...validateContent(content), ...validatePlacements(placements, content)]
```

- Keep the existing throw and the `delete` loops.
- Add `for (const p of placements) delete (p as { path?: string }).path`.
- Import `validatePlacements` from `./src/lib/content/validate-placement`.

If Velite fails when `content/placement/` has no files, that's a known Velite behaviour. In that case create `content/placement/.gitkeep`; if it still fails, report BLOCKED rather than inventing content. Task 4 adds the real file.

- [ ] **Step 5: Add the content API** to `src/lib/content/index.ts`:
- Change the import to `import { exercises, lessons, placements, tracks } from '#site/content'`.
- Add `PlacementDoc` to the types import.
- Add:

```ts
/** A track's placement quiz, answers included. Server only, like getExerciseDoc. */
export function getPlacement(track: string): PlacementDoc | undefined {
  const p = placements.find((x) => x.track === track)
  return p && {
    track: p.track,
    questions: p.questions.map(({ module, prompt, choices, answer, explanation }) => ({ module, prompt, choices, answer, explanation })),
  }
}

/** Slugs of tracks that have a placement quiz. */
export function placementTracks(): string[] {
  return placements.map((p) => p.track)
}
```

- [ ] **Step 6: Run the checks.**
Run: `npx velite build --strict && npx vitest run src/lib/content && npm run typecheck && npm run lint`
Expected: the build succeeds with zero placement files, every test passes, and typecheck and lint are clean.

- [ ] **Step 7: Commit.**

```bash
git add velite.config.ts src/lib/content/validate-placement.ts src/lib/content/validate-placement.test.ts src/lib/content/index.ts
git commit -m "feat(placement): placements collection and V14 validation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

If you created `content/placement/.gitkeep`, add it too.

---

### Task 4: CS Fundamentals placement content

**Files:**
- Create: `content/placement/cs-fundamentals.yaml` (delete `content/placement/.gitkeep` if Task 3 created it)
- Test: `src/lib/content/index.test.ts`

**Interfaces:**
- Consumes: `getPlacement` from Task 3.
- Produces: 12 questions that Task 5's e2e test reads from `.velite/placements.json`.

**Question plan.** There are 12 questions in module order. Each line gives the concept to test. The writer picks the scenario and wording.

| # | module | concept to test (prior knowledge, not our lesson's wording) |
|---|---|---|
| 1 | foundations | Growth rate of a loop over n items that does a binary search inside each iteration (O(n log n)) |
| 2 | foundations | Why indexing `arr[i]` is O(1) for an array but O(i) for a singly linked list (contiguous memory vs pointer chasing) |
| 3 | operating-systems | What threads of one process share that two separate processes don't (the address space/heap) |
| 4 | operating-systems | The four conditions for deadlock, asked as "which change makes deadlock impossible here": two locks taken in opposite orders → fixed global lock order |
| 5 | networking | Which transport guarantees in-order, reliable delivery, and what an app gives up for it (TCP; latency on loss) |
| 6 | networking | What a TLS server certificate proves to the client (that the server holds the private key for a name a trusted CA vouched for), not encryption strength |
| 7 | databases | Which query a composite index on `(last_name, first_name)` can serve with an index seek (`WHERE last_name = ?`, not `WHERE first_name = ?`) |
| 8 | databases | What atomicity guarantees when a transaction crashes midway (all or nothing) |
| 9 | databases | Why a planner may pick a full table scan over an index for a predicate matching most rows (random I/O per row costs more than a sequential read) |
| 10 | machine-math | Why traversing a 2D array row by row beats column by column in C (spatial locality, using whole cache lines) |
| 11 | machine-math | Why `0.1 + 0.2 == 0.3` is false in binary floating point (0.1 has no exact binary representation) |
| 12 | machine-math | How many distinct values 16 bits can hold, and the range of a signed 16-bit two's complement integer (−32768 to 32767) |

**Writing rules.** These are binding; reviewers will check every one.
- Use this YAML shape: `track`, then `questions:` with `module`, `prompt`, `choices` (4), `answer` (0-based) and `explanation` (1–2 sentences).
- **Prior knowledge only.** Each question must be answerable by a developer who knows the topic, without reading any CS Atlas lesson. Don't reuse a lesson's examples, numbers or phrasing. Read the 16 lessons under `content/tracks/cs-fundamentals/lessons/` to check this.
- **No pre-solving.** Read every `content/exercises/diagnose-*.yaml` listing a cs-fundamentals lesson, both prompt and reference. No question may state or strongly hint at any prompt's root cause. In particular, avoid:
  - false sharing (counters-dont-scale);
  - integers above 2^53 losing precision in doubles or JSON (broken-order-links);
  - modulo bias (skewed-coupon-codes);
  - check-then-insert races and write skew (double-booking);
  - index maintenance cost during bulk inserts (slowing-bulk-import);
  - anything else those files' references name.
- **No repeats.** No prompt may repeat or closely paraphrase a question in any `content/exercises/*-quiz.yaml`. V14 catches exact repeats; you must also avoid near-repeats.
- **Plausible distractors.** Distractors must be plausible, must not contradict the stem, must not be absurd, and must not be secretly correct under an unstated default, such as a different language, isolation level or architecture. State the setting in the stem where it matters, e.g. "in C", "in IEEE 754 double precision".
- **Answer length.** The correct choice is neither the longest nor the shortest choice, by character count, in at least 10 of the 12 questions.
- **Answer keys.** Over the 12 questions, use each of 0–3 at least twice. Never put the same key on three consecutive questions.
- **Arithmetic.** Where a question involves arithmetic, show it in the explanation.

- [ ] **Step 1: Write the inventory test.** Append to `src/lib/content/index.test.ts`, importing `getPlacement` and `placementTracks`:

```ts
describe('placement quizzes', () => {
  it('ships CS Fundamentals with 2–3 questions per module', () => {
    expect(placementTracks()).toEqual(['cs-fundamentals'])
    const doc = getPlacement('cs-fundamentals')!
    const counts: Record<string, number> = {}
    for (const q of doc.questions) counts[q.module] = (counts[q.module] ?? 0) + 1
    expect(counts).toEqual({ foundations: 2, 'operating-systems': 2, networking: 2, databases: 3, 'machine-math': 3 })
    expect(getPlacement('algorithms')).toBeUndefined()
  })
  it('varies answer positions with no run of three', () => {
    const keys = getPlacement('cs-fundamentals')!.questions.map((q) => q.answer)
    for (const k of [0, 1, 2, 3]) expect(keys.filter((x) => x === k).length).toBeGreaterThanOrEqual(2)
    for (let i = 2; i < keys.length; i++) expect(keys[i] === keys[i - 1] && keys[i] === keys[i - 2]).toBe(false)
  })
})
```

- [ ] **Step 2: Run it and watch it fail.**
Run: `npm test -- src/lib/content/index.test.ts`
Expected: FAIL, because `placementTracks()` is `[]`.

- [ ] **Step 3: Write `content/placement/cs-fundamentals.yaml`** following the question plan and writing rules.

- [ ] **Step 4: Run the checks.**
Run: `npm test && npm run typecheck`
Expected: everything passes, including V14 during `pretest`. Also, for each question, print the correct choice's character length next to the minimum and maximum lengths of its choices, and count the questions where the correct choice is the longest or the shortest. There must be no more than 2. Paste that table into your report.

- [ ] **Step 5: Commit.**

```bash
git add content/placement/cs-fundamentals.yaml src/lib/content/index.test.ts
git rm --cached -q content/placement/.gitkeep 2>/dev/null; rm -f content/placement/.gitkeep
git commit -m "feat(placement): CS Fundamentals placement questions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Placement route, quiz UI, track-home card and skip-aware views

**Files:**
- Create: `src/lib/hooks/use-placements.ts`
- Create: `src/app/[track]/placement/page.tsx`
- Create: `src/components/tracks/placement-quiz.tsx`
- Modify: `src/app/[track]/page.tsx`, `src/components/tracks/track-home.tsx`
- Modify: `src/components/today/today-view.tsx`, `src/components/roadmap/roadmap-view.tsx`
- Modify: `scripts/check-deploy.mjs`
- Create: `e2e/placement.spec.ts`; Modify: `e2e/layout.spec.ts`

**Interfaces:**
- Consumes:
  - From Task 1: `scorePlacement`, `skippedLessons`, `allSkippedLessons`, `withPlacement`, and the skip-aware `continueLesson` and `recommendedLesson`.
  - From Task 3: `getPlacement`, `placementTracks`.
  - From existing code: `useLive` and `useStore` (`@/lib/store/context`), `useCatalog`, `useMasteries`, `lessonHref`, and `formatDay` (`@/lib/format`).
- Produces: `usePlacements(): Record<string, Placement> | undefined`.

- [ ] **Step 1: Write the failing e2e test**, `e2e/placement.spec.ts`:

```ts
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

type Q = { module: string; choices: string[]; answer: number }
const csf = (JSON.parse(readFileSync('.velite/placements.json', 'utf8')) as { track: string; questions: Q[] }[])
  .find((p) => p.track === 'cs-fundamentals')!

test('placing out of the first two modules moves Continue, and clearing restores it', async ({ page }) => {
  await page.goto('/cs-fundamentals/')
  await page.getByRole('link', { name: 'Take the 5-minute placement quiz' }).click()
  await expect(page).toHaveURL(/\/cs-fundamentals\/placement\/$/)
  await expect(page.getByRole('heading', { level: 1, name: 'CS Fundamentals placement' })).toBeVisible()

  for (const [i, q] of csf.questions.entries()) {
    await expect(page.getByText(`Question ${i + 1} of ${csf.questions.length}`)).toBeVisible()
    const pass = q.module === 'foundations' || q.module === 'operating-systems'
    await page.getByRole('button', { name: q.choices[pass ? q.answer : (q.answer + 1) % 4], exact: true }).click()
  }

  await expect(page.getByRole('heading', { name: 'Your placement' })).toBeVisible()
  await expect(page.getByText('Placed out')).toHaveCount(2)
  await page.getByRole('link', { name: 'Start at The TCP/IP stack' }).click()
  await expect(page).toHaveURL(/\/cs-fundamentals\/tcp-ip-stack\/$/)

  await page.goto('/cs-fundamentals/')
  await expect(page.getByText('Placed out')).toHaveCount(2)
  await page.getByRole('link', { name: /^Continue/ }).click()
  await expect(page).toHaveURL(/\/cs-fundamentals\/tcp-ip-stack\/$/)

  await page.goto('/cs-fundamentals/')
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByRole('link', { name: 'Take the 5-minute placement quiz' })).toBeVisible()
  await expect(page.getByText('Placed out')).toHaveCount(0)
  await page.getByRole('link', { name: /^Continue/ }).click()
  await expect(page).toHaveURL(/\/cs-fundamentals\/complexity\/$/)
})

test('tracks without a placement quiz show no placement card', async ({ page }) => {
  await page.goto('/algorithms/')
  await expect(page.getByRole('heading', { level: 1, name: 'Algorithms' })).toBeVisible()
  await expect(page.getByText('placement quiz')).toHaveCount(0)
})
```

The title of `tcp-ip-stack` is "The TCP/IP stack". Confirm it in its front matter, and use the exact title.

In `e2e/layout.spec.ts`, add `'/cs-fundamentals/placement/'` to `PAGES`, right after `'/cs-fundamentals/'`.

Ruling: the layout spec runs at 375 px only. The spec's "320, 375 and 1280 px" was a carry-over from the visualizer rule, and the layout spec is the project's single page-width check.

Run: `npm run build && npx playwright test e2e/placement.spec.ts`
Expected: FAIL, because there's no placement link.

- [ ] **Step 2: Create the hook**, `src/lib/hooks/use-placements.ts`:

```ts
'use client'

import { useLive } from '@/lib/store/context'
import type { Placement } from '@/lib/types'

/** Saved placement results keyed by track slug; undefined while settings load. */
export function usePlacements(): Record<string, Placement> | undefined {
  const meta = useLive((s) => s.getMeta())
  return meta && (meta.settings.placements ?? {})
}
```

- [ ] **Step 3: Create the route**, `src/app/[track]/placement/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PlacementQuiz } from '@/components/tracks/placement-quiz'
import { getCatalog, getPlacement, placementTracks } from '@/lib/content'

export const dynamicParams = false

export function generateStaticParams() {
  return placementTracks().map((track) => ({ track }))
}

type Params = Promise<{ track: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { track } = await params
  return { title: `${getCatalog().tracks.find((t) => t.slug === track)?.title ?? 'Track'} placement · CS Atlas` }
}

export default async function PlacementPage({ params }: { params: Params }) {
  const { track } = await params
  const placement = getPlacement(track)
  if (!placement) notFound()
  return <PlacementQuiz placement={placement} />
}
```

- [ ] **Step 4: Create the quiz component**, `src/components/tracks/placement-quiz.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/lib/content/catalog-context'
import { lessonHref } from '@/lib/content/hrefs'
import { useMasteries } from '@/lib/hooks/use-masteries'
import { continueLesson } from '@/lib/logic/lessons'
import { scorePlacement, skippedLessons, withPlacement, type PlacementScore } from '@/lib/logic/placement'
import { useLive, useStore } from '@/lib/store/context'
import type { Placement, PlacementDoc } from '@/lib/types'

export function PlacementQuiz({ placement }: { placement: PlacementDoc }) {
  const store = useStore()
  const { trackBySlug, lessonBySlug } = useCatalog()
  const masteries = useMasteries() ?? new Map<string, number>()
  const meta = useLive((s) => s.getMeta())
  const track = trackBySlug.get(placement.track)!
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ score: PlacementScore; saved: Placement } | null>(null)
  const total = placement.questions.length

  async function choose(choice: number) {
    if (!meta) return
    const next = [...answers, choice]
    setAnswers(next)
    if (next.length < total) return
    const score = scorePlacement(track, placement.questions, next)
    const saved: Placement = { passedModules: score.passedModules, takenAt: new Date().toISOString() }
    setResult({ score, saved })
    try {
      await store.saveSettings(withPlacement(meta.settings, track.slug, saved))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  if (result) {
    const start = continueLesson(track, masteries, skippedLessons(track, result.saved))
    const wrong = placement.questions.filter((q, i) => answers[i] !== q.answer)
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{track.title} placement</h1>
        <h2 className="text-xl font-semibold">Your placement</h2>
        <ul className="divide-y rounded-lg border">
          {track.modules.filter((m) => result.score.byModule[m.slug]).map((m) => {
            const s = result.score.byModule[m.slug]
            const passed = result.saved.passedModules.includes(m.slug)
            return (
              <li key={m.slug} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">{m.title}</span>
                <span className="text-sm tabular-nums">{s.correct}/{s.total}</span>
                <Badge variant={passed ? 'secondary' : 'outline'}>{passed ? 'Placed out' : 'Study this'}</Badge>
              </li>
            )
          })}
        </ul>
        {start && (
          <Button asChild>
            <Link href={lessonHref(lessonBySlug.get(start)!)}>Start at {lessonBySlug.get(start)!.title}</Link>
          </Button>
        )}
        {wrong.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Questions to revisit</h2>
            {wrong.map((q) => (
              <div key={q.prompt} className="space-y-1 rounded-lg border p-3 text-sm">
                <p className="font-medium">{q.prompt}</p>
                <p>Answer: {q.choices[q.answer]}</p>
                <p className="text-muted-foreground">{q.explanation}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    )
  }

  const q = placement.questions[answers.length]
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{track.title} placement</h1>
      <p className="text-sm text-muted-foreground">
        Answer what you can; a module is placed out only when every question in it is right. Nothing is marked mastered.
      </p>
      <p className="text-sm tabular-nums">Question {answers.length + 1} of {total}</p>
      <fieldset className="space-y-3">
        <legend className="text-lg font-medium">{q.prompt}</legend>
        {q.choices.map((c, i) => (
          <Button key={`${answers.length}-${i}`} variant="outline" className="h-auto w-full justify-start whitespace-normal text-left"
            disabled={!meta} onClick={() => void choose(i)}>
            {c}
          </Button>
        ))}
      </fieldset>
    </div>
  )
}
```

`key` includes the question index so React remounts the buttons between questions. That stops a focused or hover state carrying over.

- [ ] **Step 5: Update the track home.**

In `src/app/[track]/page.tsx`:
- Import `placementTracks`.
- Render `<TrackHome slug={track} hasPlacement={placementTracks().includes(track)} />`.

In `src/components/tracks/track-home.tsx`:
- Change the signature to `TrackHome({ slug, hasPlacement }: { slug: string; hasPlacement: boolean })`.
- Add the imports: `useStore` and `useLive` from `@/lib/store/context`, `usePlacements`, `skippedLessons` and `withPlacement`, and `formatDay` from `@/lib/format`.
- Then add:

```tsx
  const store = useStore()
  const meta = useLive((s) => s.getMeta())
  const placement = usePlacements()?.[slug]
  const next = continueLesson(track, masteries, skippedLessons(track, placement))

  async function clearPlacement() {
    if (meta) await store.saveSettings(withPlacement(meta.settings, slug, null))
  }
```

Replace the existing `const next = continueLesson(track, masteries)` with the line above. Place the card in the header, after the Continue button:

```tsx
        {hasPlacement && (
          <p className="text-sm text-muted-foreground">
            {placement ? (
              <>
                Placement taken {formatDay(placement.takenAt)} ·{' '}
                <Link href={`/${slug}/placement/`} className="underline">Retake</Link> ·{' '}
                <button type="button" className="underline" onClick={() => void clearPlacement()}>Clear</button>
              </>
            ) : (
              <>Already know some of this? <Link href={`/${slug}/placement/`} className="underline">Take the 5-minute placement quiz</Link></>
            )}
          </p>
        )}
```

Change each module heading to show the badge:

```tsx
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
            {m.title}
            {placement?.passedModules.includes(m.slug) && <Badge variant="outline">Placed out</Badge>}
          </h2>
```

Before using `formatDay`, check its signature in `src/lib/format.ts`. It takes an ISO string; if it formats differently than "Oct 23, 2026", use it anyway, because consistency with the rest of the app wins.

- [ ] **Step 6: Make Today and Roadmap skip-aware.** In both `today-view.tsx` and `roadmap-view.tsx`:
- Import `usePlacements` and `allSkippedLessons`.
- Get `tracks` from `useCatalog()` if it isn't already destructured.
- Replace the `recommendedLesson(...)` call:

```ts
  const placements = usePlacements()
  // A placement counts as starting a track, so Today recommends from it before any exercise is solved.
  const started = new Set([...startedTracks(exercises, solved, trackOf), ...Object.keys(placements ?? {})])
  const recommended = recommendedLesson(lessons, masteries, started, allSkippedLessons(tracks, placements))
```

In `roadmap-view.tsx`:
- Keep its existing `masteries ? … : null` guard around the call.
- Call `usePlacements()` at the top level of the component, alongside the other hooks, never inside a condition.
- Do the same in `today-view.tsx`: the hook must come before the `if (!data || !masteries) return …` early return.

- [ ] **Step 7: Check placement pages on deploy.** In `scripts/check-deploy.mjs`:
- Add `existsSync` to the `node:fs` import.
- Next to `lessonPaths`, add:

```js
const placementDir = join(root, 'placement')
const placementPaths = existsSync(placementDir)
  ? readdirSync(placementDir).filter((f) => f.endsWith('.yaml')).map((f) => `/${basename(f, '.yaml')}/placement/`)
  : []
```

- Add `...placementPaths` to `pages`.
- Read the file first and match its existing variable names, e.g. `root`.

- [ ] **Step 8: Run the full checks.**
Run: `npm test && npm run typecheck && npm run lint && npm run build && npx playwright test e2e/placement.spec.ts e2e/layout.spec.ts e2e/tracks.spec.ts e2e/learning-loop.spec.ts`
Expected: everything passes. If the machine is overloaded and e2e times out, rerun the failing file alone before calling it a failure.

- [ ] **Step 9: Commit.**

```bash
git add src/lib/hooks/use-placements.ts "src/app/[track]/placement/page.tsx" src/components/tracks/placement-quiz.tsx "src/app/[track]/page.tsx" src/components/tracks/track-home.tsx src/components/today/today-view.tsx src/components/roadmap/roadmap-view.tsx scripts/check-deploy.mjs e2e/placement.spec.ts e2e/layout.spec.ts
git commit -m "feat(placement): placement quiz route, track-home card and skip-aware recommendations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
