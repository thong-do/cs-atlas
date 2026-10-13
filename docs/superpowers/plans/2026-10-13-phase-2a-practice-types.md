# Phase 2a — Quizzes, Flashcards and Design Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `quiz` exercises (which contain flashcards) and `design-prompt` exercises beside today's `external-problem`. They work with mastery and the FSRS review queue in both stores. The Caching lesson gets one of each to prove them.

**Architecture:**
- **Content and validation.** The exercise collection becomes a discriminated union. The validator gains rules V12 (quiz) and V13 (design prompt). The catalog stays slim but includes a flashcard map; full quiz and design content loads only on the exercise page.
- **Store writes.** The pure write rules in `mutations.ts` gain `quizWrites` and `designWrites`, and `WriteSet` can carry several cards. `Store` gains `completeQuiz` and `completeDesign`, implemented in `DexieStore` and `SupabaseStore` with the same rules.
- **UI.** The exercise page, lists and Today render by exercise type.
- **No storage changes.** There are no storage-schema, Supabase-migration or backup changes.

**Tech Stack:**
- Next.js 15 (static export), React 19, TypeScript
- Velite (Zod schemas), Dexie and Supabase stores, ts-fsrs
- react-markdown with remark-gfm
- shadcn/ui (Radix)
- Vitest and Playwright

**Spec:** `docs/superpowers/specs/2026-10-13-phase-2a-practice-types-design.md`

## Global Constraints

- **Working copy.** The repo root is `/Users/thongdo/IT/algorithms/leethub`, on branch `feat/phase-2a`. Never commit to `main` and never push.
- **Commit trailer.** Every commit message ends with:

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```
- **Storage stays unchanged.** That means:
  - the IndexedDB name `leethub` and the `LeetHubDB` schema
  - the storage types in `src/lib/types.ts` (`ProblemProgress`, `Note`, `ReviewCard`, `ReviewLog`, `TrainAttempt`, `Activity`, `Meta`, `UserData`)
  - the backup format
  - `supabase/migrations/*`

  New review keys are plain strings in `ReviewCard.slug`.
- **Review keys.** A card's key is the exercise slug for problem, quiz and design-prompt cards, and `"<quiz-slug>#<card-id>"` for flashcards. They are built and parsed only by `src/lib/content/review-keys.ts`.
- **Score mappings.** Use integer arithmetic, `correct * 100 >= threshold * total`, never floats:
  - Solve rating: ≥ 80% `alone`; 50–79% `hint`; < 50% `solution`.
  - Review rating: 100% `easy`; 80–99% `good`; 50–79% `hard`; < 50% `again`.
  - Flashcard initial rating: `good` if ≥ 80%, otherwise `again`.
- **One activity bump per write.** `apply_changes` requires at most one increment per date.
- **Layer boundaries.** UI reads data only through `useStore()` and `useLive()`. The store never imports content. Callers pass the flashcard ids.
- **Markdown.** Rendering uses `react-markdown` with `remark-gfm`, and never with raw HTML (no `rehype-raw`).
- **No regressions.** Every existing LeetCode flow (solve, review, trainer, list, ladder, palette) behaves exactly as before.
- **Before each commit:** `npm test`, `npm run typecheck` and `npm run lint` pass. Tasks touching UI or routes also run `npm run e2e`.

## Review Focus

1. **Retaking a quiz.** The quiz is retaken twice, or after new flashcards were added to it. Expected: existing flashcard cards keep their schedule, and only the missing ones are created. *Pinned by Task 2 (`mutations.test.ts`, contract suite).*
2. **Score boundaries.** The score is exactly at a threshold (4/5, 1/2, 0/3). Expected: the documented ratings, with no float rounding surprises. *Pinned by Task 2 (`mutations.test.ts`).*
3. **Design prompt with a two-line insight.** Expected: the "single line" validation error, and nothing saved. *Pinned by Task 2 (contract suite).*
4. **A due card whose quiz or flashcard was deleted from content.** Expected: it is skipped on Today, not a crash. *Pinned by Task 6 (`review-queue.test.ts`).*
5. **A signed-in learner completes a quiz.** Expected: one `apply_changes` call carrying the quiz card plus all new flashcard cards and a single activity increment. *Pinned by Task 2 (`supabase-store.test.ts`).*

---

## File map

| Area | Files |
|---|---|
| Content | `velite.config.ts`, `src/lib/types.ts` (exercise types only), `src/lib/content/{index,validate,review-keys}.ts`, `templates/{quiz,design-prompt}.yaml`, `CONTRIBUTING.md`, `content/exercises/{caching-quiz,design-product-page-cache}.yaml` |
| Store | `src/lib/store/{mutations,types,dexie-store,supabase-store,null-store,store-contract}.ts` |
| Logic | `src/lib/logic/{filter,trainer}.ts`, `src/lib/logic/review-queue.ts` (new) |
| UI | `src/components/markdown.tsx`, `src/components/exercises/{exercise-workspace,problem-workspace,quiz-workspace,design-workspace,exercise-type-badge}.tsx`, `src/components/exercises/exercises-table.tsx`, `src/components/lessons/ladder-list.tsx`, `src/components/command-palette.tsx`, `src/components/today/{today-view,review-item,flashcard-review-item,design-review-item,quiz-review-item}.tsx`, `src/app/exercises/[slug]/page.tsx` |
| Tests | `*.test.ts` beside each module, `e2e/practice.spec.ts` |

---

### Task 1: Exercise union, validation, catalog and review keys

At the end of this task the schema supports the new types, but there is no quiz or design content yet. Behaviour is unchanged.

**Files:**
- Modify: `velite.config.ts`, `src/lib/types.ts`, `src/lib/content/index.ts`, `src/lib/content/validate.ts`, `src/lib/content/validate.test.ts`, `src/lib/content/index.test.ts`, `src/lib/logic/trainer.ts`, `src/lib/logic/filter.ts`
- Modify: the UI files that read problem-only fields, so they typecheck (narrowing only, no new UI): `exercise-workspace.tsx`, `exercises-table.tsx`, `ladder-list.tsx`, `command-palette.tsx`, `today/review-item.tsx`, `today/today-view.tsx`, `src/app/exercises/[slug]/page.tsx`
- Create: `src/lib/content/review-keys.ts`, `src/lib/content/review-keys.test.ts`, `templates/quiz.yaml`, `templates/design-prompt.yaml`
- Modify: `CONTRIBUTING.md` (rule table and templates)

**Interfaces — Produces:**

```ts
// types.ts
export type ExerciseType = 'external-problem' | 'quiz' | 'design-prompt'
interface ExerciseBase { slug: string; title: string; lessons: string[]; ladderOrder: number }
export interface ProblemExercise extends ExerciseBase {
  type: 'external-problem'; leetcodeId: number; url: string; difficulty: Difficulty; recognitionPrompt: string; hint: string
}
export interface QuizExercise extends ExerciseBase { type: 'quiz'; questionCount: number; flashcardIds: string[] }
export interface DesignExercise extends ExerciseBase { type: 'design-prompt'; rubric: string[] }   // rubric point texts, for Today's reveal
export type ExerciseMeta = ProblemExercise | QuizExercise | DesignExercise
export interface QuizQuestion { id: string; prompt: string; choices: string[]; answer: number; explanation: string }
export interface Flashcard { id: string; front: string; back: string }
export interface RubricPoint { id: string; point: string }
export interface QuizDoc extends QuizExercise { questions: QuizQuestion[]; flashcards: Flashcard[] }
export interface DesignDoc extends Omit<DesignExercise, 'rubric'> { prompt: string; rubricPoints: RubricPoint[]; rubric: string[]; reference: string; hint?: string }
export type ExerciseDoc = ProblemExercise | QuizDoc | DesignDoc
export interface FlashcardEntry { front: string; back: string; quiz: string; lesson: string }
export interface Catalog { tracks: TrackMeta[]; lessons: LessonMeta[]; exercises: ExerciseMeta[]; flashcards: Record<string, FlashcardEntry> }
export const isProblem = (e: ExerciseMeta | ExerciseDoc): e is ProblemExercise => e.type === 'external-problem'

// content/index.ts
export function getCatalog(): Catalog            // + flashcards map
export function getExercise(slug: string): ExerciseMeta | undefined   // slim (unchanged role)
export function getExerciseDoc(slug: string): ExerciseDoc | undefined // full, for the exercise page (server only)

// content/review-keys.ts
export function flashcardKey(quizSlug: string, cardId: string): string    // `${quizSlug}#${cardId}`
export type ReviewKey = { kind: 'exercise'; slug: string } | { kind: 'flashcard'; quiz: string; card: string }
export function parseReviewKey(key: string): ReviewKey
```

`ExerciseMeta` is now a union, so `useCatalog()` consumers keep working wherever they only read common fields.

- [ ] **Step 1: Write the failing tests for review keys**

`src/lib/content/review-keys.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { flashcardKey, parseReviewKey } from './review-keys'

describe('review keys', () => {
  it('builds and parses flashcard keys', () => {
    expect(flashcardKey('caching-quiz', 'ttl')).toBe('caching-quiz#ttl')
    expect(parseReviewKey('caching-quiz#ttl')).toEqual({ kind: 'flashcard', quiz: 'caching-quiz', card: 'ttl' })
  })
  it('treats any key without # as an exercise slug', () => {
    expect(parseReviewKey('two-sum')).toEqual({ kind: 'exercise', slug: 'two-sum' })
  })
  it('splits on the first # only', () => {
    expect(parseReviewKey('q#a#b')).toEqual({ kind: 'flashcard', quiz: 'q', card: 'a#b' })
  })
})
```

Then implement `review-keys.ts` to match. Run it. Expected: PASS.

- [ ] **Step 2: Make the Velite schema a discriminated union**

In `velite.config.ts`, replace the `exercises` schema:

```ts
const id = s.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'ids are lowercase-with-dashes')
const base = {
  slug: s.slug('exercises'),
  title: s.string(),
  lessons: s.array(s.string()).min(1),
  ladderOrder: s.number().int().positive(),
  path: s.path(),
}

const exercises = defineCollection({
  name: 'Exercise',
  pattern: 'exercises/*.yaml',
  schema: s.discriminatedUnion('type', [
    s.object({
      ...base,
      type: s.literal('external-problem'),
      leetcodeId: s.number().int().positive(),
      url: s.string().url(),
      difficulty: s.enum(['easy', 'medium', 'hard']),
      recognitionPrompt: s.string().min(10),
      hint: s.string().min(5),
    }).strict(),
    s.object({
      ...base,
      type: s.literal('quiz'),
      questions: s.array(s.object({
        id,
        prompt: s.string().min(1),
        choices: s.array(s.string().min(1)).min(2).max(5),
        answer: s.number().int().min(0),
        explanation: s.string().min(1),
      }).strict()).min(3).max(8),
      flashcards: s.array(s.object({
        id,
        front: s.string().min(1).max(200),
        back: s.string().min(1).max(200),
      }).strict()).max(20).default([]),
    }).strict(),
    s.object({
      ...base,
      type: s.literal('design-prompt'),
      prompt: s.string().min(1),
      rubric: s.array(s.object({ id, point: s.string().min(1) }).strict()).min(3).max(8),
      reference: s.string().min(1),
      hint: s.string().min(1).optional(),
    }).strict(),
  ]), // unknown fields (e.g. a pasted solution) fail the build
})
```

If Velite's `s` lacks `discriminatedUnion` or rejects `s.path()`/`s.slug()` inside a union member, use `s.union([...])` with the same members. Report which one worked.

In the `prepare` hook, pass every exercise to the validator as before.

- [ ] **Step 3: Update the types and the loader**

- In `src/lib/types.ts`, replace `ExerciseMeta` and `Catalog` with the **Produces** block. Leave everything else untouched.
- In `src/lib/content/index.ts`:
  - `toExerciseMeta(e)` returns the slim meta by type:
    - problem: as today
    - quiz: `{ …base, type, questionCount: e.questions.length, flashcardIds: e.flashcards.map(f => f.id) }`
    - design: `{ …base, type, rubric: e.rubric.map(r => r.point) }`
  - `getCatalog()` adds `flashcards`. For every quiz, for every card, it sets `flashcardKey(quiz.slug, card.id)` to `{ front, back, quiz: quiz.slug, lesson: quiz.lessons[0] }`.
  - Add `getExerciseDoc(slug)`, which returns the full doc without `path`:
    - problem: as today
    - quiz: `{ …meta, questions, flashcards }`
    - design: `{ …base, type, prompt, rubric: points, rubricPoints: e.rubric, reference, hint? }`

- [ ] **Step 4: Validator — narrow V11 and add V12 and V13 (TDD)**

In `validate.ts`, `ContentInput.exercises` becomes `(ExerciseInputDoc & { path: string })[]`, where `ExerciseInputDoc` is the raw Velite shape:
- the problem fields
- or the quiz fields with `questions` and `flashcards`
- or the design fields with `rubric: RubricPoint[]`

Export the type.

Add these tests to `validate.test.ts`, with fixtures `quiz(slug, lessons, o)` and `design(slug, lessons, o)`:

```ts
it('V11 applies to LeetCode problems only', () => {
  const c = valid()
  c.exercises.push(quiz('q1', ['aaa'], { ladderOrder: 7 }), design('d1', ['aaa'], { ladderOrder: 8 }))
  expect(validateContent(c)).toEqual([])
})

it('V12: quiz ids are unique and answers point at a choice', () => {
  const c = valid()
  c.exercises.push(quiz('q1', ['aaa'], {
    ladderOrder: 7,
    questions: [
      { id: 'a', prompt: 'p', choices: ['x', 'y'], answer: 2, explanation: 'e' },
      { id: 'a', prompt: 'p', choices: ['x', 'y'], answer: 0, explanation: 'e' },
      { id: 'b', prompt: 'p', choices: ['x', 'y'], answer: 1, explanation: 'e' },
    ],
    flashcards: [{ id: 'f', front: 'x', back: 'y' }, { id: 'f', front: 'x', back: 'y' }],
  }))
  const errors = validateContent(c)
  expect(errors).toContain('[V12] content/exercises/q1.yaml: question "a" answer 2 is not one of its 2 choices')
  expect(errors).toContain('[V12] content/exercises/q1.yaml: duplicate question id "a"')
  expect(errors).toContain('[V12] content/exercises/q1.yaml: duplicate flashcard id "f"')
})

it('V13: design rubric ids are unique', () => {
  const c = valid()
  c.exercises.push(design('d1', ['aaa'], {
    ladderOrder: 8,
    rubric: [{ id: 'r', point: 'x' }, { id: 'r', point: 'y' }, { id: 's', point: 'z' }],
  }))
  expect(validateContent(c)).toContain('[V13] content/exercises/d1.yaml: duplicate rubric id "r"')
})

it('V10 is satisfied by a quiz', () => {
  const c = valid()
  c.exercises = c.exercises.filter((e) => !e.lessons.includes('ccc'))
  c.exercises.push(quiz('q2', ['ccc'], { ladderOrder: 1 }))
  expect(validateContent(c).filter((e) => e.startsWith('[V10]'))).toEqual([])
})
```

Fixture defaults:
- `quiz()`: three valid questions with ids `q1`, `q2` and `q3`, and `flashcards: []`.
- `design()`: three rubric points with ids `r1`, `r2` and `r3`, plus `prompt: 'p'` and `reference: 'r'`.

Both take `path: \`exercises/${slug}\``.

Implement:
- V11 (unique `leetcodeId`, leetcode.com URL) runs only when `e.type === 'external-problem'`.
- V12 and V13 use exactly the messages above.
- Every other rule (V5, V7, V10, and the V2/V11 file-name check) applies to all types.

Run `npx vitest run src/lib/content`. Expected: PASS.

- [ ] **Step 5: Narrow the problem-only consumers so everything typechecks with no behaviour change**

| File | Change |
|---|---|
| `trainer.ts` | `buildRound` keeps only `isProblem` exercises before picking. Its internal types use `ProblemExercise`. |
| `filter.ts` | The search matches `leetcodeId` only for problems. `difficulty !== 'all'` matches only problems with that difficulty. (The `type` filter arrives in Task 5.) |
| `exercises-table.tsx`, `ladder-list.tsx`, `command-palette.tsx`, `today-view.tsx` (next-up list) | Render the LeetCode number, difficulty badge and ↗ link only when `isProblem(e)`. |
| `today/review-item.tsx` | Its prop type is `ProblemExercise`. `today-view.tsx` passes only problems to it (other kinds come in Task 6, so for now skip non-problem due cards). |
| `exercise-workspace.tsx` | Rename to `problem-workspace.tsx` (`ProblemWorkspace`, prop `ProblemExercise`). Create a new `exercise-workspace.tsx` that renders `ProblemWorkspace` for problems and, for now, a placeholder `<p>Coming soon</p>` for other types (Task 4 replaces it). |
| `src/app/exercises/[slug]/page.tsx` | Uses `getExerciseDoc(slug)` and passes the doc to `ExerciseWorkspace`. |

- [ ] **Step 6: Inventory tests, templates and docs**

- `index.test.ts`:
  - The 138 count and the LeetCode URL tests filter to `isProblem` (`exercises.filter(isProblem)`). Keep the 138 for problems.
  - Add a test that `getCatalog().flashcards` is `{}` while no quiz exists. Task 3 updates it.
  - Keep the template test, and extend it to check that `templates/quiz.yaml` and `templates/design-prompt.yaml` contain their required top-level keys.
- `templates/quiz.yaml`:

  ```yaml
  slug: lesson-slug-quiz
  type: quiz
  title: "Lesson Title — quiz"
  lessons: [lesson-slug]
  ladderOrder: 1                  # next free number in the lesson's ladder
  questions:                      # 3–8 questions, one correct answer each
    - id: first-question
      prompt: "A question that checks understanding, not trivia."
      choices: ["Right answer", "Plausible wrong answer", "Another plausible wrong answer"]
      answer: 0                   # index of the correct choice (0-based)
      explanation: "Why the right answer is right, in one or two sentences."
  flashcards:                     # 0–20 cards; each side at most 200 characters
    - id: key-term
      front: "Term or question"
      back: "Short answer in your own words"
  ```

- `templates/design-prompt.yaml`:

  ```yaml
  slug: design-something
  type: design-prompt
  title: "Design: something"
  lessons: [lesson-slug]
  ladderOrder: 1
  prompt: |
    The scenario, with concrete numbers (traffic, data size, freshness).
  rubric:                         # 3–8 points a good answer covers
    - id: first-point
      point: "One thing a strong design addresses."
  reference: |
    A reference answer in Markdown, about 200–300 words.
  hint: "Optional nudge."
  ```

- `CONTRIBUTING.md`:
  - Rule table: V11 becomes "LeetCode exercises: unique slugs, LeetCode ids and leetcode.com URLs". Add **V12** ("Quiz: unique question and flashcard ids; each answer is one of its choices") and **V13** ("Design prompt: unique rubric ids").
  - "Add an exercise" mentions the two new templates.

- [ ] **Step 7: Verify and commit**

Run `npm test && npm run typecheck && npm run lint && npm run e2e`. Expected: all green, with no behaviour change.

```bash
git add -A
git commit -m "feat: exercise union with quiz and design-prompt types, V12/V13, review keys

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Quiz and design writes in both stores

**Files:**
- Modify: `src/lib/store/mutations.ts`, `src/lib/store/mutations.test.ts`, `src/lib/store/types.ts`, `src/lib/store/dexie-store.ts`, `src/lib/store/supabase-store.ts`, `src/lib/store/null-store.ts`, `src/lib/store/store-contract.ts`, `src/lib/store/supabase-store.test.ts`

**Interfaces:**
- Consumes: `flashcardKey` (Task 1).
- Produces:

```ts
// mutations.ts
export interface WriteSet { progress?; note?; cards?: ReviewCard[]; log?; attempt?; bump? }   // `card` → `cards`
export function solveRatingFromScore(correct: number, total: number): SolveRating
export function reviewRatingFromScore(correct: number, total: number): ReviewRating
export function quizWrites(
  prev: { progress?: ProblemProgress; card?: ReviewCard; existingCardKeys: Set<string> },
  slug: string, flashcardIds: string[], result: { correct: number; total: number }, now: Date, desiredRetention: number,
): WriteSet
export interface DesignAnswer { design: string; insight: string; covered: number; total: number }
export function designWrites(
  prev: { progress?: ProblemProgress; note?: Note; card?: ReviewCard },
  slug: string, answer: DesignAnswer, now: Date, desiredRetention: number,
): WriteSet
// store types.ts — added to Store
completeQuiz(slug: string, flashcardIds: string[], result: { correct: number; total: number }, now: Date): Promise<void>
completeDesign(slug: string, answer: DesignAnswer, now: Date): Promise<void>
```

- [ ] **Step 1: Write the failing mutation tests**

Add to `mutations.test.ts`. Also update the existing `solveWrites` and `reviewWrites` tests from `w.card` to `w.cards![0]`.

```ts
import { flashcardKey } from '@/lib/content/review-keys'
import { designWrites, quizWrites, reviewRatingFromScore, solveRatingFromScore } from './mutations'

describe('score mappings', () => {
  it('maps to solve ratings with integer thresholds', () => {
    expect(solveRatingFromScore(4, 5)).toBe('alone')
    expect(solveRatingFromScore(79, 100)).toBe('hint')
    expect(solveRatingFromScore(1, 2)).toBe('hint')
    expect(solveRatingFromScore(49, 100)).toBe('solution')
    expect(solveRatingFromScore(0, 3)).toBe('solution')
  })
  it('maps to review ratings', () => {
    expect(reviewRatingFromScore(5, 5)).toBe('easy')
    expect(reviewRatingFromScore(99, 100)).toBe('good')
    expect(reviewRatingFromScore(4, 5)).toBe('good')
    expect(reviewRatingFromScore(1, 2)).toBe('hard')
    expect(reviewRatingFromScore(49, 100)).toBe('again')
  })
})

describe('quizWrites', () => {
  const empty = { existingCardKeys: new Set<string>() }
  it('first completion: progress, quiz card, one card per flashcard, solve log and bump', () => {
    const w = quizWrites(empty, 'caching-quiz', ['ttl', 'lru'], { correct: 5, total: 5 }, now, 0.9)
    expect(w.progress).toMatchObject({ slug: 'caching-quiz', status: 'solved', solveRating: 'alone', needsResolve: false })
    expect(w.cards!.map((c) => c.slug)).toEqual(['caching-quiz', flashcardKey('caching-quiz', 'ttl'), flashcardKey('caching-quiz', 'lru')])
    expect(w.log).toMatchObject({ slug: 'caching-quiz', kind: 'solve' })
    expect(w.bump).toEqual({ date: localDate(now), field: 'solves' })
  })
  it('retake: reviews the quiz card, never duplicates flashcards, bumps reviews', () => {
    const first = quizWrites(empty, 'q', ['a', 'b'], { correct: 2, total: 5 }, now, 0.9)
    const later = new Date(2026, 9, 20, 9)
    const prev = { progress: first.progress, card: first.cards![0], existingCardKeys: new Set(['q#a', 'q#b']) }
    const w = quizWrites(prev, 'q', ['a', 'b', 'c'], { correct: 5, total: 5 }, later, 0.9)
    expect(w.cards!.map((c) => c.slug)).toEqual(['q', 'q#c'])
    expect(w.log).toMatchObject({ kind: 'review', rating: 'easy' })
    expect(w.progress?.firstSolvedAt).toBe(first.progress?.firstSolvedAt)
    expect(w.bump?.field).toBe('reviews')
  })
  it('schedules new flashcards as again below 80% and good at 80%+', () => {
    const low = quizWrites(empty, 'q', ['a'], { correct: 3, total: 5 }, now, 0.9).cards![1]
    const high = quizWrites(empty, 'q', ['a'], { correct: 4, total: 5 }, now, 0.9).cards![1]
    expect(Date.parse(high.due)).toBeGreaterThan(Date.parse(low.due))
  })
  it('rejects impossible results', () => {
    expect(() => quizWrites(empty, 'q', [], { correct: 1, total: 0 }, now, 0.9)).toThrow('Quiz result must have at least one question.')
    expect(() => quizWrites(empty, 'q', [], { correct: 6, total: 5 }, now, 0.9)).toThrow('Quiz result is out of range.')
  })
})

describe('designWrites', () => {
  it('saves the design as the note approach and scores the rubric', () => {
    const prevNote = { slug: 'd', insight: 'old', approach: 'old', complexity: 'O(1)', mistakes: 'm', code: '', updatedAt: '2026-01-01T00:00:00.000Z' }
    const w = designWrites({ note: prevNote }, 'd', { design: '  cache-aside with TTL  ', insight: ' TTL plus delete on write ', covered: 3, total: 5 }, now, 0.9)
    expect(w.note).toMatchObject({ approach: 'cache-aside with TTL', insight: 'TTL plus delete on write', complexity: 'O(1)', mistakes: 'm' })
    expect(w.progress?.solveRating).toBe('hint')
    expect(w.cards!.map((c) => c.slug)).toEqual(['d'])
    expect(w.log?.kind).toBe('solve')
  })
  it('validates the insight and the design', () => {
    expect(() => designWrites({}, 'd', { design: 'x', insight: 'a\nb', covered: 1, total: 3 }, now, 0.9)).toThrow('single line')
    expect(() => designWrites({}, 'd', { design: '   ', insight: 'ok insight', covered: 1, total: 3 }, now, 0.9)).toThrow('Write your design first.')
  })
})
```

Run them. Expected: FAIL.

- [ ] **Step 2: Implement in `mutations.ts`**

- Change `WriteSet.card` to `cards?: ReviewCard[]`. `solveWrites` and `reviewWrites` return `cards: [card]`.
- Add:

```ts
const atLeast = (correct: number, total: number, pct: number) => correct * 100 >= pct * total

function checkScore(correct: number, total: number, what: string): void {
  if (!(total > 0)) throw new Error(`${what} must have at least one question.`)
  if (!(correct >= 0 && correct <= total && Number.isInteger(correct) && Number.isInteger(total))) throw new Error(`${what} is out of range.`)
}

export function solveRatingFromScore(correct: number, total: number): SolveRating {
  return atLeast(correct, total, 80) ? 'alone' : atLeast(correct, total, 50) ? 'hint' : 'solution'
}

export function reviewRatingFromScore(correct: number, total: number): ReviewRating {
  return correct === total ? 'easy' : atLeast(correct, total, 80) ? 'good' : atLeast(correct, total, 50) ? 'hard' : 'again'
}

/** Shared by quizzes and design prompts: progress + the exercise's own card + one log + one bump. */
function scoredWrites(
  prev: { progress?: ProblemProgress; card?: ReviewCard },
  slug: string, correct: number, total: number, now: Date, desiredRetention: number,
): WriteSet {
  const at = now.toISOString()
  const solveRating = solveRatingFromScore(correct, total)
  const first = !prev.card
  const rating = first ? initialReviewRating(solveRating) : reviewRatingFromScore(correct, total)
  const card = scheduleReview(prev.card?.card ?? newCard(now), rating, now, desiredRetention)
  return {
    progress: { slug, status: 'solved', solveRating, firstSolvedAt: prev.progress?.firstSolvedAt ?? at, needsResolve: false, updatedAt: at },
    cards: [{ slug, card, due: card.due, updatedAt: at }],
    log: { id: crypto.randomUUID(), slug, rating, reviewedAt: at, kind: first ? 'solve' : 'review' },
    bump: { date: localDate(now), field: first ? 'solves' : 'reviews' },
  }
}

export function quizWrites(prev, slug, flashcardIds, result, now, desiredRetention): WriteSet {
  checkScore(result.correct, result.total, 'Quiz result')
  const w = scoredWrites(prev, slug, result.correct, result.total, now, desiredRetention)
  const at = now.toISOString()
  const rating: ReviewRating = atLeast(result.correct, result.total, 80) ? 'good' : 'again'
  for (const id of flashcardIds) {
    const key = flashcardKey(slug, id)
    if (prev.existingCardKeys.has(key)) continue
    const card = scheduleReview(newCard(now), rating, now, desiredRetention)
    w.cards!.push({ slug: key, card, due: card.due, updatedAt: at })
  }
  return w
}

export function designWrites(prev, slug, answer, now, desiredRetention): WriteSet {
  const insight = checkedInsight(answer.insight)
  const design = answer.design.trim()
  if (!design) throw new Error('Write your design first.')
  checkScore(answer.covered, answer.total, 'Rubric score')
  const w = scoredWrites(prev, slug, answer.covered, answer.total, now, desiredRetention)
  w.note = { ...(prev.note ?? emptyNote(slug)), approach: design, insight, updatedAt: now.toISOString() }
  return w
}
```

The error messages of `designWrites` start with "Rubric score". The test for quizzes uses "Quiz result", so the shared helper takes the label as a parameter. Keep `checkScore`'s messages exactly as written. Add the parameter types from the **Interfaces** block.

Run the tests. Expected: PASS.

- [ ] **Step 3: Apply `cards[]` in both stores and add the two methods**

- **`DexieStore.apply`:** `if (w.cards?.length) await db.cards.bulkPut(w.cards)`.
- **`SupabaseStore`:**
  - `applyWriteSet` upserts each card.
  - `changesFromWriteSet` sends `c.cards = w.cards`.
- **`DexieStore.completeQuiz`:** in one `rw` transaction over `[progress, cards, reviewLogs, activity]`:
  1. Read `progress` and `card` for `slug`.
  2. Read the existing flashcard cards with `db.cards.bulkGet(keys)` and build `existingCardKeys` from the found ones.
  3. Call `quizWrites(...)` with the stored `desiredRetention`.
  4. `apply` the result.
- **`DexieStore.completeDesign`:** in one `rw` transaction over `[progress, notes, cards, reviewLogs, activity]`, read prev, then `designWrites`, then `apply`.
- **`SupabaseStore`:** the same `prev` is read from `this.data`, then `commit(w, changesFromWriteSet(w))`.
- **`NullStore`:** `completeQuiz = fail` and `completeDesign = fail`.
- **`Store` interface:** add the two methods. Import `DesignAnswer` from `mutations`.

- [ ] **Step 4: Contract tests (run against both stores)**

Add to `store-contract.ts`:

```ts
it('completeQuiz creates the quiz card and missing flashcards, and retakes review', async () => {
  const store = await makeStore()
  await store.completeQuiz('q', ['a', 'b'], { correct: 5, total: 5 }, day(3))
  expect(await store.getProgress('q')).toMatchObject({ status: 'solved', solveRating: 'alone' })
  expect((await store.listCards()).map((c) => c.slug).sort()).toEqual(['q', 'q#a', 'q#b'])
  const aDue = (await store.getCard('q#a'))!.due
  await store.completeQuiz('q', ['a', 'b', 'c'], { correct: 2, total: 5 }, day(9))
  expect((await store.listCards()).map((c) => c.slug).sort()).toEqual(['q', 'q#a', 'q#b', 'q#c'])
  expect((await store.getCard('q#a'))!.due).toBe(aDue)
  expect((await store.listReviewLogs('q')).map((l) => l.kind)).toEqual(['solve', 'review'])
  expect((await store.getProgress('q'))?.solveRating).toBe('solution')
  const activity = await store.listActivity()
  expect(activity.find((a) => a.date === localDate(day(3)))?.solves).toBe(1)
  expect(activity.find((a) => a.date === localDate(day(9)))?.reviews).toBe(1)
})

it('completeQuiz rejects an empty result without writing', async () => {
  const store = await makeStore()
  await expect(store.completeQuiz('q', ['a'], { correct: 0, total: 0 }, day(3))).rejects.toThrow('at least one question')
  expect(await store.listCards()).toEqual([])
})

it('completeDesign saves the note and progress', async () => {
  const store = await makeStore()
  await store.completeDesign('d', { design: 'cache-aside, TTL 60s with jitter', insight: 'delete on write, TTL as backstop', covered: 4, total: 5 }, day(3))
  expect(await store.getNote('d')).toMatchObject({ approach: 'cache-aside, TTL 60s with jitter', insight: 'delete on write, TTL as backstop' })
  expect((await store.getProgress('d'))?.solveRating).toBe('alone')
  expect(await store.getCard('d')).toBeDefined()
})

it('completeDesign rejects a multi-line insight without writing', async () => {
  const store = await makeStore()
  await expect(store.completeDesign('d', { design: 'x', insight: 'a\nb', covered: 1, total: 3 }, day(3))).rejects.toThrow('single line')
  expect(await store.getProgress('d')).toBeUndefined()
})
```

Add to `supabase-store.test.ts`, for Review Focus 5:

```ts
it('completeQuiz sends one apply_changes with every new card and one increment', async () => {
  const remote = new FakeRemoteApi('user-1')
  const spy = vi.spyOn(remote, 'applyChanges')
  const store = make(remote)
  await store.completeQuiz('q', ['a', 'b'], { correct: 4, total: 5 }, day(3))
  expect(spy).toHaveBeenCalledTimes(1)
  const changes = spy.mock.calls[0][0]
  expect(changes.cards?.map((c) => c.slug)).toEqual(['q', 'q#a', 'q#b'])
  expect(changes.activityIncrements).toHaveLength(1)
})
```

- [ ] **Step 5: Verify and commit**

Run `npm test && npm run typecheck && npm run lint`. Expected: green.

```bash
git add -A
git commit -m "feat: completeQuiz and completeDesign in both stores with shared write rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Proof content for the Caching lesson

**Files:**
- Create: `content/exercises/caching-quiz.yaml`, `content/exercises/design-product-page-cache.yaml`
- Modify: `src/lib/content/index.test.ts`

- [ ] **Step 1: Create `content/exercises/caching-quiz.yaml`**

```yaml
slug: caching-quiz
type: quiz
title: "Caching — quiz"
lessons: [caching]
ladderOrder: 1
questions:
  - id: hit-rate-math
    prompt: "A cache answers in 1 ms and the database in 20 ms. At a 95% hit rate, what is the average read time?"
    choices: ["About 1.95 ms", "About 10.5 ms", "About 19 ms", "Exactly 1 ms"]
    answer: 0
    explanation: "0.95 × 1 ms + 0.05 × 20 ms = 0.95 + 1.0 = 1.95 ms — about ten times faster than no cache."
  - id: eviction-choice
    prompt: "The cache is full and must make room. Which key does an LRU policy evict?"
    choices: ["The key that was used least recently", "The key that was used least often", "The oldest key ever written", "A random key"]
    answer: 0
    explanation: "LRU tracks recency of use, not frequency (that's LFU) or insertion time (that's FIFO)."
  - id: invalidation-order
    prompt: "With cache-aside, what should a write do to keep readers from seeing stale data?"
    choices: ["Update the database, then delete the cached key", "Delete the cached key, then update the database", "Only update the cache", "Nothing — wait for the TTL"]
    answer: 0
    explanation: "Deleting after the write commits means the next read refills from fresh data. Deleting first lets a concurrent read refill the cache with the old value."
  - id: thundering-herd
    prompt: "A hot key expires and thousands of requests miss at once. Which change helps most?"
    choices: ["Add random jitter to TTLs and let one request refill while others wait", "Make the TTL shorter", "Disable the cache for that key", "Retry the database faster"]
    answer: 0
    explanation: "Jitter spreads expiries apart, and request coalescing makes one request do the refill instead of all of them."
  - id: write-strategies
    prompt: "Which write strategy can lose data if the cache node crashes?"
    choices: ["Write-back", "Write-through", "Cache-aside", "Read-through"]
    answer: 0
    explanation: "Write-back acknowledges the write once it's in the cache and writes to the database later, so a crash before the flush loses it."
flashcards:
  - id: hit
    front: "Cache hit"
    back: "The requested data was already in the cache, so the slow store wasn't touched."
  - id: miss
    front: "Cache miss"
    back: "The data wasn't cached: read it from the source, then (usually) store it in the cache."
  - id: ttl
    front: "TTL (time to live)"
    back: "How long a cached entry stays valid before it expires — a backstop against stale data."
  - id: lru
    front: "LRU eviction"
    back: "When full, remove the entry used least recently. Hash map + doubly linked list gives O(1)."
  - id: cache-aside
    front: "Cache-aside"
    back: "The app reads the cache, falls back to the database on a miss, and fills the cache itself."
  - id: write-through
    front: "Write-through"
    back: "Writes go to the cache and the database together, so reads are always warm but writes are slower."
  - id: write-back
    front: "Write-back"
    back: "Writes land in the cache and reach the database later — fast, but data can be lost on a crash."
  - id: stampede
    front: "Cache stampede (thundering herd)"
    back: "Many requests miss the same expired key at once and overload the source. Fix: TTL jitter and request coalescing."
```

- [ ] **Step 2: Create `content/exercises/design-product-page-cache.yaml`**

```yaml
slug: design-product-page-cache
type: design-prompt
title: "Design: cache a product-details API"
lessons: [caching]
ladderOrder: 2
prompt: |
  A product-details API serves **5,000 reads/s** and **50 writes/s** (price and stock updates).
  The database handles the writes fine, but reads are slowing it down.

  Add a cache in front of it. **Prices must never be more than 60 seconds stale.**
  Describe what you cache and under which key, how entries expire and get invalidated,
  what happens when a popular product's entry expires, and what you would measure.
hint: "Start from cache-aside. Then ask: what can make a reader see an old price, and for how long?"
rubric:
  - id: key-and-value
    point: "Caches the product-details response under a key that includes every input that changes it (e.g. product id, currency, locale)."
  - id: ttl-jitter
    point: "Sets a TTL at or below 60 s and adds random jitter so popular keys don't all expire together."
  - id: invalidate-on-write
    point: "Deletes (or updates) the cached entry after a price or stock write commits, so most reads see changes immediately; the TTL is only the backstop."
  - id: stampede
    point: "Protects hot keys from a stampede: one request refills while others wait or get the stale value briefly."
  - id: measure
    point: "Measures hit rate, read latency for hits and misses, and database load, and alerts when the hit rate drops."
reference: |
  **Pattern.** Use cache-aside with a shared cache such as Redis. On a read, look up
  `product:{id}:{currency}:{locale}`. On a hit, return it; on a miss, read the database,
  store the result, and return it.

  **Freshness.** Give each entry a TTL of 45–60 s, chosen randomly per write (jitter),
  so the 60 s staleness limit holds even if an invalidation is missed. The TTL is a backstop,
  not the main mechanism: after a price or stock update commits, the writer deletes every key
  for that product, so the next read refills with the new data. At 50 writes/s that's cheap.

  **Hot keys.** When a popular product's entry expires, thousands of requests could miss together.
  Use request coalescing (a short lock per key so one request refills while others wait a few
  milliseconds), or serve the expired value for a second while one request refreshes it in the background.

  **Sizing.** 5,000 reads/s at a 95% hit rate leaves about 250 reads/s for the database — a 20×
  reduction. Size memory for the hot set (often a few thousand products), with an LRU eviction policy.

  **Measure.** Hit rate, p50/p99 latency for hits and misses, database read QPS, eviction rate,
  and invalidation failures. Alert if the hit rate drops sharply — it usually means a bad key or a deploy that changed the key format.
```

- [ ] **Step 3: Update the inventory tests**

In `index.test.ts`:
- The System Design inventory test expects `exercises.filter(e => e.lessons.includes('caching')).map(e => e.slug).sort()` to equal `['caching-quiz', 'design-product-page-cache', 'lru-cache', 'time-based-key-value-store']`.
- The flashcard map test from Task 1 now expects `Object.keys(getCatalog().flashcards).length === 8` and `getCatalog().flashcards['caching-quiz#ttl']` to match `{ quiz: 'caching-quiz', lesson: 'caching' }`.
- `getExerciseDoc('caching-quiz')` has 5 questions, and `getExerciseDoc('design-product-page-cache')` has 5 rubric points.
- Ladder numbering: the "every ladder 1..n" test still passes, because Caching's own ladder is now 1 (the quiz) and 2 (the design prompt).

Run `npm test && npm run typecheck && npm run lint`. Expected: green.

```bash
git add -A
git commit -m "content: Caching quiz with flashcards and a product-page cache design prompt

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Quiz and design-prompt pages

**Files:**
- Create: `src/components/markdown.tsx`, `src/components/exercises/quiz-workspace.tsx`, `src/components/exercises/design-workspace.tsx`, `e2e/practice.spec.ts`
- Modify: `src/components/exercises/exercise-workspace.tsx`

**Interfaces:**
- Consumes: `QuizDoc` and `DesignDoc` (Task 1); `useStore().completeQuiz` and `completeDesign` (Task 2); `solveRatingFromScore` (Task 2); `NoteEditor` and `ReviewHistory` (existing).

- [ ] **Step 1: Write the failing e2e tests (`e2e/practice.spec.ts`)**

```ts
import { expect, test } from '@playwright/test'

test('taking the Caching quiz shows results, explanations and flashcards', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (e) => errors.push(e))
  await page.goto('/exercises/caching-quiz/')
  await expect(page.getByRole('heading', { level: 1, name: 'Caching — quiz' })).toBeVisible()
  const check = page.getByRole('button', { name: 'Check answers' })
  await expect(check).toBeDisabled()
  const n = await page.locator('fieldset').count()
  expect(n).toBe(5)
  for (let i = 0; i < n; i++) await page.locator('fieldset').nth(i).getByRole('radio').first().click()
  await check.click()
  await expect(page.getByText('5 of 5 correct')).toBeVisible()
  await expect(page.getByText('0.95 × 1 ms + 0.05 × 20 ms')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Flashcards — in your reviews' })).toBeVisible()
  const card = page.getByRole('button', { name: /TTL \(time to live\)/ })
  await card.click()
  await expect(page.getByText('How long a cached entry stays valid')).toBeVisible()
  await page.getByRole('button', { name: 'Retake' }).click()
  await expect(check).toBeDisabled()
  expect(errors.map((e) => e.message)).toEqual([])
})

test('completing the design prompt saves the design as a note', async ({ page }) => {
  await page.goto('/exercises/design-product-page-cache/')
  await expect(page.getByRole('heading', { level: 1, name: 'Design: cache a product-details API' })).toBeVisible()
  await page.getByLabel('Your design').fill('Cache-aside in Redis keyed by product id; TTL 50s with jitter; delete on write.')
  await page.getByLabel('Key insight').fill('Delete on write, TTL as the staleness backstop')
  await page.getByRole('button', { name: 'Compare with reference' }).click()
  await expect(page.getByText('request coalescing')).toBeVisible()
  const boxes = page.getByRole('checkbox')
  await expect(boxes).toHaveCount(5)
  for (let i = 0; i < 4; i++) await boxes.nth(i).check()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved — 4 of 5 rubric points')).toBeVisible()
  await expect(page.getByLabel('Approach')).toHaveValue(/Cache-aside in Redis/)
})
```

The first answer of every Caching question is the correct one, so clicking the first radio of each scores 5 of 5. That's deliberate for the test. The quiz UI shuffles nothing.

Add `'/exercises/caching-quiz/'` and `'/exercises/design-product-page-cache/'` to `e2e/layout.spec.ts`. Check the label used by the existing `NoteEditor` for the approach field, and use exactly that label in the test (`Approach` is assumed).

Run `npx playwright test e2e/practice.spec.ts`. Expected: FAIL.

- [ ] **Step 2: Build `markdown.tsx`**

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Renders trusted-format Markdown from content files. Raw HTML is never rendered. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
```

- [ ] **Step 3: Build `QuizWorkspace` (client)**

Props: `{ quiz: QuizDoc }`.

**State:** `answers: Record<string, number>` and `checked: boolean`.

**Reads:**
- `useLive((s) => s.getProgress(quiz.slug), [quiz.slug])`
- `useLive(async (s) => (await Promise.all(quiz.flashcards.map((f) => s.getCard(flashcardKey(quiz.slug, f.id))))).filter(Boolean).length, [quiz.slug])`, the number of flashcards in review

**Header:**
- the lesson breadcrumb (badge links, as in `ProblemWorkspace`)
- an h1 with `quiz.title`
- "{n} questions"
- the status icon, plus a "Last score" note derived from progress when solved

**Questions:** each renders as `<fieldset>` with a `<legend>` (prompt) and one radio per choice. Native `<input type="radio">` with labels is fine.
- After checking, the correct choice is marked "✓ Correct answer", and a wrong pick is marked "✗ Your answer".
- The explanation shows in a muted paragraph.

**Check answers:**
- It's disabled until every question has an answer.
- On click:
  1. Compute `correct`.
  2. Call `store.completeQuiz(quiz.slug, quiz.flashcards.map((f) => f.id), { correct, total }, new Date())`.
  3. Set `checked`.
  4. Show the summary `"{correct} of {total} correct"`, and a toast: "Saved to your progress".
- On error, show `toast.error(message)` and keep the answers.

**Retake:** shown when `checked`. It clears `answers` and `checked`.

**Flashcards:** when `progress?.status === 'solved'` (or right after the first check), show an h2 **Flashcards — in your reviews**. Each card is a `<button>` with `aria-pressed`, showing the front and toggling to the back on click. Enter and Space work because it's a native button.

- [ ] **Step 4: Build `DesignWorkspace` (client)**

Props: `{ design: DesignDoc }`.

**State:** `draft`, `insight`, `compared` (boolean) and `covered: Set<string>`. Read the note with `useLive((s) => s.getNote(design.slug), [design.slug])` and the progress the same way.

**Before comparing:**
- the header (lesson badges and h1)
- `<Markdown>{design.prompt}</Markdown>`
- the optional hint in `<details>`
- a `<textarea>` labelled **Your design**, with about 10 rows
- an `<input>` labelled **Key insight**
- **Compare with reference**, disabled until both fields are non-empty after trimming

**After comparing:**
- an h2 **Reference answer** with `<Markdown>{design.reference}</Markdown>`
- an h2 **Rubric**: one checkbox per `rubricPoints` item, labelled with the point and grouped under "I covered this"
- **Save**, which calls `store.completeDesign(design.slug, { design: draft, insight, covered: covered.size, total: rubricPoints.length }, new Date())`. On success it shows `"Saved — {covered} of {total} rubric points"`. On error, `toast.error`.

**Saved state:** when progress is solved, also render the existing `<NoteEditor slug={design.slug} />` and `<ReviewHistory slug={design.slug} />` below. The reference and rubric stay visible on later visits whenever a note exists.

`exercise-workspace.tsx` switches on `exercise.type` to `ProblemWorkspace`, `QuizWorkspace` or `DesignWorkspace`, and the placeholder from Task 1 goes away.

- [ ] **Step 5: Verify and commit**

Run `npm test && npm run typecheck && npm run lint && npm run e2e`. Expected: green, including `practice.spec.ts` and the 375px layout checks for both pages.

```bash
git add -A
git commit -m "feat: quiz and design-prompt exercise pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Type badges and the Type filter

**Files:**
- Create: `src/components/exercises/exercise-type-badge.tsx`
- Modify: `src/lib/logic/filter.ts`, `src/lib/logic/filter.test.ts`, `src/components/exercises/exercises-table.tsx`, `src/components/lessons/ladder-list.tsx`, `src/components/command-palette.tsx`, `src/components/today/today-view.tsx`, `e2e/practice.spec.ts`

- [ ] **Step 1: Write the failing filter test**

`ExerciseFilter` gains `type: 'all' | ExerciseType`. Add to `filter.test.ts`, extending the fixtures with a quiz `qz` (lessons `['cache']`) and a design `dz`:

```ts
it('filters by type, and a difficulty filter only matches problems', () => {
  expect(slugs({ type: 'quiz' })).toEqual(['qz'])
  expect(slugs({ type: 'design-prompt' })).toEqual(['dz'])
  expect(slugs({ difficulty: 'easy' })).not.toContain('qz')
})
```

Adjust existing count expectations only by the added rows. Then implement it.

- [ ] **Step 2: Badge and UI**

**`ExerciseTypeBadge({ type })`:** an outline `Badge` reading **LeetCode**, **Quiz** or **Design**.

**`exercises-table.tsx`:**
- Add `<select aria-label="Type">` (All types / LeetCode / Quiz / Design), initialised from `?type=` when it's a valid type.
- Each row shows the type badge.
- The difficulty select stays, but is labelled "All difficulties (LeetCode)".

**`ladder-list.tsx`:**
- Every row shows the type badge.
- Problems keep their difficulty and ↗ link.
- Quiz rows show "{n} questions", and design rows show "Self-graded".

**`command-palette.tsx`:** problems show "{id}." as today; other types show their badge text before the title.

**`today-view.tsx` next-up:** uses the type badge for non-problems.

- [ ] **Step 3: e2e**

Add to `practice.spec.ts`:

```ts
test('the Caching ladder and the Exercises list show type badges and filter by type', async ({ page }) => {
  await page.goto('/system-design/caching/')
  const ladder = page.locator('#practice-ladder')
  await expect(ladder.getByText('Quiz', { exact: true })).toBeVisible()
  await expect(ladder.getByText('Design', { exact: true })).toBeVisible()
  await page.goto('/exercises/?type=quiz')
  await expect(page.getByLabel('Type')).toHaveValue('quiz')
  await expect(page.getByText('1 of 140 exercises')).toBeVisible()
})
```

Run `npm test && npm run typecheck && npm run lint && npm run e2e`. Expected: green.

```bash
git add -A
git commit -m "feat: exercise type badges and a Type filter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Flashcards, design prompts and quizzes on Today

**Files:**
- Create: `src/lib/logic/review-queue.ts`, `src/lib/logic/review-queue.test.ts`, `src/components/today/flashcard-review-item.tsx`, `src/components/today/design-review-item.tsx`, `src/components/today/quiz-review-item.tsx`
- Modify: `src/components/today/today-view.tsx`, `src/components/today/review-item.tsx` (rename the prop only if needed), `e2e/practice.spec.ts`

**Interfaces — Produces:**

```ts
export type DueItem =
  | { kind: 'problem'; key: string; exercise: ProblemExercise }
  | { kind: 'quiz'; key: string; exercise: QuizExercise }
  | { kind: 'design'; key: string; exercise: DesignExercise }
  | { kind: 'flashcard'; key: string; card: FlashcardEntry }
export function resolveDue(keys: string[], exerciseBySlug: Map<string, ExerciseMeta>, flashcards: Record<string, FlashcardEntry>): DueItem[]
```

- [ ] **Step 1: Write the failing `review-queue.test.ts`**

It covers:
- Each kind resolves.
- Order is preserved.
- An unknown exercise slug is dropped.
- A flashcard key whose card was deleted from content is dropped (Review Focus 4).
- A malformed key such as `#x` is dropped.

Implement it using `parseReviewKey`.

- [ ] **Step 2: Review item components**

All three share the rating buttons with the existing `ReviewItem`. Extract `RatingButtons({ onRate, busy })` from it, with the same labels and the same `aria-label="How well did you remember?"` group.

- **`FlashcardReviewItem({ card, lessonTitle, onRate })`:**
  - Shows an article with a small "Flashcard · {lessonTitle}" eyebrow and the front in large text.
  - **Reveal** shows the back, then the rating buttons.
- **`DesignReviewItem({ exercise, insight, onRate })`:**
  - Shows the title (linking to the exercise) and "Recall your design, then reveal."
  - **Reveal** shows the learner's saved insight in a blockquote, then the rubric points (`exercise.rubric`) as a list, then the rating buttons.
- **`QuizReviewItem({ exercise, lessonTitle })`:**
  - Shows "Retake the {lessonTitle} quiz ({questionCount} questions)", with a button-link **Take the quiz** to the exercise page.
  - It has no rating buttons: finishing the quiz records the review.

In `today-view.tsx`, build the due list with `resolveDue(data.due.map(d => d.card.slug), exerciseBySlug, flashcards)` and render by kind. Notes are fetched only for problem and design items, as today. Ratings call the existing `rate(key, rating)`.

- [ ] **Step 3: e2e with a controlled clock**

Add to `practice.spec.ts`:

```ts
test('after the quiz, flashcards come due on Today and can be reviewed', async ({ browser }) => {
  const context = await browser.newContext()
  const day1 = await context.newPage()
  await day1.clock.install({ time: new Date('2026-10-13T09:00:00') })
  await day1.goto('/exercises/caching-quiz/')
  const n = await day1.locator('fieldset').count()
  for (let i = 0; i < n; i++) await day1.locator('fieldset').nth(i).getByRole('radio').nth(1).click()
  await day1.getByRole('button', { name: 'Check answers' }).click()
  await expect(day1.getByText('0 of 5 correct')).toBeVisible()
  await day1.close()

  const later = await context.newPage()
  await later.clock.install({ time: new Date('2026-10-20T09:00:00') })
  await later.goto('/')
  const cards = later.locator('article', { hasText: 'Flashcard · Caching' })
  await expect(cards.first()).toBeVisible()
  const before = await cards.count()
  await cards.first().getByRole('button', { name: 'Reveal' }).click()
  await cards.first().getByRole('button', { name: 'Good', exact: true }).click()
  await expect(cards).toHaveCount(before - 1)
  await expect(later.getByRole('link', { name: 'Take the quiz' })).toBeVisible()
})
```

A 0/5 score schedules every flashcard and the quiz with `again`, so all of them are due a week later.

Run `npm test && npm run typecheck && npm run lint && npm run e2e`. Expected: green.

```bash
git add -A
git commit -m "feat: flashcard, design and quiz reviews on Today

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After all tasks (controller and owner)

1. **Open the PR.** Push `feat/phase-2a`, open the PR, and wait for `check`, `db` and the Vercel preview.
2. **Owner's manual check on the preview,** once as a guest and once signed in:
   1. Take the Caching quiz and see the flashcards appear.
   2. Complete the design prompt and see the saved note.
3. **After merge:** run `npm run check:deploy -- https://cs-atlas-hub.vercel.app`. The two new exercise pages are included automatically.
