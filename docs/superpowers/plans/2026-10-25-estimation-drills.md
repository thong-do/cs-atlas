# Estimation Drills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Learners practise back-of-the-envelope estimation in a new `estimate` exercise type. For each step of a scenario they type a number and pick a unit, and an answer counts when it is within ×tolerance of the reference. The PR also adds a System Design lesson that teaches the method, its quiz, and six drills.

**Architecture:**
- **Logic.** Pure functions in `src/lib/logic/estimate.ts` parse, scale, compare and format amounts. A new validator rule, V15, uses them to check drill files.
- **Content model.** `estimate` becomes a fourth member of the Velite `Exercise` union and of the app's `ExerciseMeta`/`ExerciseDoc` types. It flows through the content mapping, labels, the exercises table, ladders and the review queue.
- **Saving.** A new `EstimateWorkspace` records results through the existing `completeQuiz(slug, [], { correct, total })` store call, so mastery and review work without store or database changes.

**Tech Stack:** Velite + zod-like `s` schema, TypeScript, React (Next.js App Router, static export), Vitest (node environment, no component tests), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-25-estimation-drills-design.md`

## Global Constraints

- **Type name:** `type: estimate`. Files are `content/exercises/estimate-<topic>.yaml`, and the badge/label text is `Estimate`.
- **Steps:** each drill has 2–4 steps. Step ids are unique within a drill. `answer` is finite and > 0, in base units.
- **Tolerance:** the default is `2`. When given, it must be 1.5–10. A value counts when `max(v/a, a/v) <= tolerance`, so exactly ×tolerance counts.
- **Units and picker prefixes,** in this order. Byte prefixes are decimal (KB = 10³).
  - `bytes`: B, KB, MB, GB, TB, PB
  - `bytes/s`: B/s, KB/s, MB/s, GB/s
  - `bits/s`: bit/s, Kbit/s, Mbit/s, Gbit/s, Tbit/s
  - `requests/s`: /s, K/s, M/s
  - `count`: ×1, thousand, million, billion
  - `seconds`: ms, s, min, h, day
- **`formatAmount`:**
  - It uses the largest prefix that keeps the number ≥ 1, falling back to the smallest prefix.
  - It shows at most 3 significant figures (en-US grouping), then a space and the prefix label.
  - The `count` label `×1` is omitted, so the number stands alone.
- **V15:**
  - Each step's `work` contains `formatAmount(answer, unit)`.
  - `scenario` and `takeaway` are non-empty.
  - The unit is one of the six units above.
- **Saving:** `completeQuiz(slug, [], { correct, total }, now)`. No new store methods, no Supabase migration.
- **Copy:**
  - The step button is `Check`, and the final line is `N of M right`.
  - Results show `✓ Within range` or `✗ Outside range`, then `Within <tol>× counts`.
  - The reset button is `Try again`, and the success toast is `Saved to your progress`.
  - The Today card button is `Do the drill`.
- **The lesson:** `estimation`, titled "Back-of-the-envelope estimation". It is level beginner with prerequisites `[client-server-http]`, and is the 5th System Design Foundations lesson, after `sql-vs-nosql`.
- **Commits:** end every message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, or with the trailer naming your own model.
- **Scratch files:** never commit anything under `.superpowers/`.

## Review Focus

1. **Comma input.** `7,500` means 7500. `7,5` (a European decimal comma) must be rejected, not read as 75, so Check stays disabled and the learner retypes. Pinned in Task 1's `parseAmount` tests.
2. **Floating point at the band edge.** Exactly ×2 must count even when the value went through a prefix scale (e.g. `0.2` TB against 100 GB). Pinned in Task 1's tolerance tests, which use an epsilon.
3. **Today with a due estimate.** An `estimate` key must resolve to its own kind. The current fall-through to `design` would render the design review item with no rubric. Pinned in Task 2's `resolveDue` test.
4. **The unit picker on a phone.** The input, the select and Check must wrap without horizontal scroll at 375 px, including the longest prefix labels ("thousand", "Gbit/s"). Pinned by the layout spec entries in Task 4.
5. **Worked arithmetic that drifts from the answer.** If someone edits `answer` and forgets `work`, the build must fail. Pinned in Task 1's V15 test, and enforced for real content by `pretest` in Tasks 3 and 4.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/logic/estimate.ts` (create) | units, prefixes, `parseAmount`, `withinTolerance`, `stepCorrect`, `formatAmount`, `scoreEstimate` |
| `src/lib/logic/estimate.test.ts` (create) | unit tests for the above |
| `src/lib/types.ts` (modify) | `EstimateUnit`, `EstimateStep` (Task 1); `EstimateExercise`, `EstimateDoc`, union members (Task 2) |
| `src/lib/content/validate.ts`, `validate.test.ts` (modify) | the estimate input member; V15 |
| `velite.config.ts` (modify) | the `estimate` union member |
| `src/lib/content/index.ts` (modify) | meta and doc mapping |
| `src/lib/logic/exercise-label.ts`, `review-queue.ts` (+ test) (modify) | the label; the `'estimate'` due kind |
| `src/components/exercises/estimate-workspace.tsx` (create) | the drill UI |
| `src/components/exercises/exercise-workspace.tsx`, `exercises-table.tsx`, `src/components/lessons/ladder-list.tsx` (modify) | routing, filter, ladder caption |
| `src/components/today/estimate-review-item.tsx` (create), `today-view.tsx` (modify) | the due card |
| `CONTRIBUTING.md` (modify) | V15 row and authoring notes |
| `content/tracks/system-design/lessons/estimation.mdx`, `track.yaml`, `content/exercises/estimation-quiz.yaml` (create/modify) | lesson and quiz |
| `content/exercises/estimate-*.yaml` ×6 (create) | drills |
| `src/lib/content/index.test.ts` (modify) | inventory |
| `e2e/estimate.spec.ts` (create), `e2e/layout.spec.ts` (modify) | behaviour and layout |

---

### Task 1: Estimate logic and V15 validation

**Files:**
- Create: `src/lib/logic/estimate.ts`, `src/lib/logic/estimate.test.ts`
- Modify: `src/lib/types.ts` (add two exported types; do **not** touch the `ExerciseType`/`ExerciseMeta`/`ExerciseDoc` unions)
- Modify: `src/lib/content/validate.ts`, `src/lib/content/validate.test.ts`

**Interfaces:**
- Produces, used by Tasks 2–4:
  - **In `@/lib/types`:**
    - `type EstimateUnit = 'bytes' | 'bytes/s' | 'bits/s' | 'requests/s' | 'count' | 'seconds'`
    - `interface EstimateStep { id: string; ask: string; unit: EstimateUnit; answer: number; tolerance?: number; work: string }`
  - **In `@/lib/logic/estimate`:**
    - `ESTIMATE_UNITS: EstimateUnit[]`
    - `UNIT_PREFIXES: Record<EstimateUnit, { label: string; scale: number }[]>`
    - `DEFAULT_TOLERANCE = 2`
    - `parseAmount(text: string): number | null`
    - `withinTolerance(value: number, answer: number, tolerance: number): boolean`
    - `stepCorrect(step: Pick<EstimateStep, 'answer' | 'tolerance'>, value: number): boolean`
    - `formatAmount(base: number, unit: EstimateUnit): string`
    - `scoreEstimate(steps: Pick<EstimateStep, 'answer' | 'tolerance'>[], values: number[]): { correct: number; total: number }`
  - **In `validate.ts`:** a new `ExerciseInputDoc` member, `ExerciseCommon & { type: 'estimate'; scenario: string; steps: (Omit<EstimateStep, 'unit'> & { unit: string })[]; takeaway: string }`.

- [ ] **Step 1: Write the failing logic tests.** Create `src/lib/logic/estimate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatAmount, parseAmount, scoreEstimate, stepCorrect, UNIT_PREFIXES, withinTolerance } from './estimate'

describe('parseAmount', () => {
  it('reads plain, decimal, grouped and scientific numbers', () => {
    expect(parseAmount('7.5')).toBe(7.5)
    expect(parseAmount(' 230 ')).toBe(230)
    expect(parseAmount('7,500')).toBe(7500)
    expect(parseAmount('1,234,567.5')).toBe(1234567.5)
    expect(parseAmount('1e4')).toBe(10000)
    expect(parseAmount('2.5E-3')).toBe(0.0025)
    expect(parseAmount('.5')).toBe(0.5)
  })
  it('rejects empty, non-numeric, badly grouped and non-finite input', () => {
    for (const t of ['', '  ', 'abc', '7,5', '12,34', '1,2345', '7.5.1', '1e', 'Infinity', 'NaN', '1e400', '5 TB']) {
      expect(parseAmount(t), t).toBeNull()
    }
  })
  it('keeps zero and negatives so the UI can explain them', () => {
    expect(parseAmount('0')).toBe(0)
    expect(parseAmount('-3')).toBe(-3)
  })
})

describe('withinTolerance', () => {
  it('accepts values within ×tolerance either way, including the edge', () => {
    expect(withinTolerance(20, 10, 2)).toBe(true)
    expect(withinTolerance(5, 10, 2)).toBe(true)
    expect(withinTolerance(0.2 * 1e12, 1e11, 2)).toBe(true) // 0.2 TB vs 100 GB, through a scale
    expect(withinTolerance(3 * 0.1 * 1e9, 0.15e9, 2)).toBe(true) // float noise at the edge
  })
  it('rejects values just outside the band and non-positive values', () => {
    expect(withinTolerance(20.1, 10, 2)).toBe(false)
    expect(withinTolerance(4.9, 10, 2)).toBe(false)
    expect(withinTolerance(0, 10, 2)).toBe(false)
    expect(withinTolerance(-10, 10, 2)).toBe(false)
  })
})

describe('stepCorrect and scoreEstimate', () => {
  it('uses the default tolerance of 2 unless the step sets one', () => {
    expect(stepCorrect({ answer: 100 }, 199)).toBe(true)
    expect(stepCorrect({ answer: 100 }, 201)).toBe(false)
    expect(stepCorrect({ answer: 100, tolerance: 3 }, 290)).toBe(true)
  })
  it('counts correct steps', () => {
    expect(scoreEstimate([{ answer: 10 }, { answer: 100 }, { answer: 1000, tolerance: 1.5 }], [12, 500, 1400])).toEqual({ correct: 2, total: 3 })
  })
})

describe('formatAmount', () => {
  it('picks the largest prefix that keeps the number at least 1, with 3 significant figures', () => {
    expect(formatAmount(7.3e12, 'bytes')).toBe('7.3 TB')
    expect(formatAmount(1e13, 'bytes')).toBe('10 TB')
    expect(formatAmount(2.1949e13, 'bytes')).toBe('21.9 TB')
    expect(formatAmount(230, 'requests/s')).toBe('230 /s')
    expect(formatAmount(4.2e9, 'bits/s')).toBe('4.2 Gbit/s')
    expect(formatAmount(86400, 'seconds')).toBe('1 day')
    expect(formatAmount(5e6, 'count')).toBe('5 million')
    expect(formatAmount(750, 'count')).toBe('750')
    expect(formatAmount(2.5e18, 'bytes')).toBe('2,500 PB')
    expect(formatAmount(0.5, 'bytes')).toBe('0.5 B')
  })
  it('lists picker prefixes in ascending order for every unit', () => {
    for (const [unit, list] of Object.entries(UNIT_PREFIXES)) {
      expect(list.map((p) => p.scale), unit).toEqual([...list.map((p) => p.scale)].sort((a, b) => a - b))
    }
  })
})
```

- [ ] **Step 2: Run them and watch them fail.**
Run: `npx vitest run src/lib/logic/estimate.test.ts`
Expected: FAIL, because `./estimate` doesn't exist.

- [ ] **Step 3: Add the types.** Append to `src/lib/types.ts`:

```ts
export type EstimateUnit = 'bytes' | 'bytes/s' | 'bits/s' | 'requests/s' | 'count' | 'seconds'
export interface EstimateStep { id: string; ask: string; unit: EstimateUnit; answer: number; tolerance?: number; work: string }
```

- [ ] **Step 4: Implement `src/lib/logic/estimate.ts`:**

```ts
import type { EstimateStep, EstimateUnit } from '@/lib/types'

export const DEFAULT_TOLERANCE = 2

/** Picker options per unit, smallest first. Byte prefixes are decimal (KB = 10³), matching the estimation lesson. */
export const UNIT_PREFIXES: Record<EstimateUnit, { label: string; scale: number }[]> = {
  bytes: [{ label: 'B', scale: 1 }, { label: 'KB', scale: 1e3 }, { label: 'MB', scale: 1e6 }, { label: 'GB', scale: 1e9 }, { label: 'TB', scale: 1e12 }, { label: 'PB', scale: 1e15 }],
  'bytes/s': [{ label: 'B/s', scale: 1 }, { label: 'KB/s', scale: 1e3 }, { label: 'MB/s', scale: 1e6 }, { label: 'GB/s', scale: 1e9 }],
  'bits/s': [{ label: 'bit/s', scale: 1 }, { label: 'Kbit/s', scale: 1e3 }, { label: 'Mbit/s', scale: 1e6 }, { label: 'Gbit/s', scale: 1e9 }, { label: 'Tbit/s', scale: 1e12 }],
  'requests/s': [{ label: '/s', scale: 1 }, { label: 'K/s', scale: 1e3 }, { label: 'M/s', scale: 1e6 }],
  count: [{ label: '×1', scale: 1 }, { label: 'thousand', scale: 1e3 }, { label: 'million', scale: 1e6 }, { label: 'billion', scale: 1e9 }],
  seconds: [{ label: 'ms', scale: 1e-3 }, { label: 's', scale: 1 }, { label: 'min', scale: 60 }, { label: 'h', scale: 3600 }, { label: 'day', scale: 86400 }],
}
export const ESTIMATE_UNITS = Object.keys(UNIT_PREFIXES) as EstimateUnit[]

const PLAIN = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i
const GROUPED = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/

/** A typed amount, or null if it isn't a plain, comma-grouped or scientific number. Commas only group thousands. */
export function parseAmount(text: string): number | null {
  const t = text.trim()
  if (t.includes(',') ? !GROUPED.test(t) : !PLAIN.test(t)) return null
  const n = Number(t.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/** True when value is within ×tolerance of answer in either direction; the edge counts. */
export function withinTolerance(value: number, answer: number, tolerance: number): boolean {
  if (!(value > 0) || !(answer > 0)) return false
  return Math.max(value / answer, answer / value) <= tolerance * (1 + 1e-9)
}

export function stepCorrect(step: Pick<EstimateStep, 'answer' | 'tolerance'>, value: number): boolean {
  return withinTolerance(value, step.answer, step.tolerance ?? DEFAULT_TOLERANCE)
}

export function scoreEstimate(steps: Pick<EstimateStep, 'answer' | 'tolerance'>[], values: number[]): { correct: number; total: number } {
  return { correct: steps.filter((s, i) => stepCorrect(s, values[i])).length, total: steps.length }
}

const FORMAT = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 })

/** A base-unit amount with the largest prefix that keeps it at least 1, e.g. 7.3e12 bytes → "7.3 TB". */
export function formatAmount(base: number, unit: EstimateUnit): string {
  const prefixes = UNIT_PREFIXES[unit]
  const p = [...prefixes].reverse().find((x) => base / x.scale >= 1) ?? prefixes[0]
  const n = FORMAT.format(base / p.scale)
  return p.label === '×1' ? n : `${n} ${p.label}`
}
```

- [ ] **Step 5: Run the logic tests.**
Run: `npx vitest run src/lib/logic/estimate.test.ts`
Expected: PASS. If a `formatAmount` expectation fails because of float rounding (e.g. `21.9`), fix the implementation, not the expectation.

- [ ] **Step 6: Write the failing V15 tests.** In `src/lib/content/validate.test.ts`:
  - Add this fixture after `design`:

```ts
const estimate = (slug: string, lessons: string[], o: Record<string, unknown> = {}): ExerciseInput => ({
  slug, type: 'estimate', title: slug, lessons, ladderOrder: 1, path: `exercises/${slug}`,
  scenario: 's', takeaway: 't',
  steps: [
    { id: 'a', ask: 'a?', unit: 'bytes', answer: 1e13, work: '5 M × 2 MB = 10 TB/day' },
    { id: 'b', ask: 'b?', unit: 'requests/s', answer: 230, tolerance: 3, work: '20 M ÷ 86,400 ≈ 230 /s' },
  ],
  ...o,
} as ExerciseInput)
```

  - Add these tests inside `describe('validateContent', …)`:

```ts
  it('V15 accepts a well-formed estimation drill', () => {
    const c = valid()
    c.exercises.push(estimate('e1', ['aaa'], { ladderOrder: 9 }))
    expect(validateContent(c)).toEqual([])
  })

  it('V15: drill steps, units, answers, tolerances and worked arithmetic', () => {
    const c = valid()
    const step = (o: Record<string, unknown>) => ({ id: 'x', ask: 'x?', unit: 'bytes', answer: 1e9, work: '= 1 GB', ...o })
    c.exercises.push(
      estimate('e1', ['aaa'], { ladderOrder: 9, steps: [step({})] }),
      estimate('e2', ['aaa'], { ladderOrder: 10, steps: [step({}), step({}), step({ id: 'y' }), step({ id: 'z' }), step({ id: 'w' })] }),
      estimate('e3', ['aaa'], {
        ladderOrder: 11,
        steps: [
          step({ id: 'u', unit: 'furlongs' }),
          step({ id: 'n', answer: 0 }),
          step({ id: 't', tolerance: 20 }),
          step({ id: 'w', answer: 2e9 }),
        ],
        scenario: ' ', takeaway: '',
      }),
    )
    const errors = validateContent(c)
    expect(errors).toContain('[V15] content/exercises/e1.yaml: needs 2–4 steps, has 1')
    expect(errors).toContain('[V15] content/exercises/e2.yaml: needs 2–4 steps, has 5')
    expect(errors).toContain('[V15] content/exercises/e2.yaml: duplicate step id "x"')
    expect(errors).toContain('[V15] content/exercises/e3.yaml: step "u" has unknown unit "furlongs" (valid: bytes, bytes/s, bits/s, requests/s, count, seconds)')
    expect(errors).toContain('[V15] content/exercises/e3.yaml: step "n" answer must be a positive number')
    expect(errors).toContain('[V15] content/exercises/e3.yaml: step "t" tolerance 20 must be between 1.5 and 10')
    expect(errors).toContain('[V15] content/exercises/e3.yaml: step "w" work must show its answer "2 GB"')
    expect(errors).toContain('[V15] content/exercises/e3.yaml: scenario is empty')
    expect(errors).toContain('[V15] content/exercises/e3.yaml: takeaway is empty')
  })
```

- [ ] **Step 7: Run them and watch them fail.**
Run: `npx vitest run src/lib/content/validate.test.ts`
Expected: both V15 tests FAIL. Today an `estimate` exercise falls into the rubric branch and throws on the missing `rubric`.

- [ ] **Step 8: Implement V15** in `src/lib/content/validate.ts`:
  - **Imports:** add `EstimateStep` to the type import from `@/lib/types`, and `import { ESTIMATE_UNITS, formatAmount } from '@/lib/logic/estimate'`.
  - **Input type:** add this member to `ExerciseInputDoc`:

```ts
  | (ExerciseCommon & { type: 'estimate'; scenario: string; steps: (Omit<EstimateStep, 'unit'> & { unit: string })[]; takeaway: string })
```

  - **Check:** in the exercise loop, change the final `} else {` (the rubric branch) to `} else if (e.type === 'design-prompt') {`, and add this branch after it:

```ts
    } else if (e.type === 'estimate') {
      if (e.steps.length < 2 || e.steps.length > 4) err('V15', file, `needs 2–4 steps, has ${e.steps.length}`)
      const sids = new Set<string>()
      for (const st of e.steps) {
        if (sids.has(st.id)) err('V15', file, `duplicate step id "${st.id}"`)
        sids.add(st.id)
        const unit = ESTIMATE_UNITS.find((u) => u === st.unit)
        if (!unit) err('V15', file, `step "${st.id}" has unknown unit "${st.unit}" (valid: ${ESTIMATE_UNITS.join(', ')})`)
        if (!Number.isFinite(st.answer) || st.answer <= 0) err('V15', file, `step "${st.id}" answer must be a positive number`)
        else if (st.tolerance !== undefined && (st.tolerance < 1.5 || st.tolerance > 10)) {
          err('V15', file, `step "${st.id}" tolerance ${st.tolerance} must be between 1.5 and 10`)
        } else if (unit && !st.work.includes(formatAmount(st.answer, unit))) {
          err('V15', file, `step "${st.id}" work must show its answer "${formatAmount(st.answer, unit)}"`)
        }
      }
      if (!e.scenario.trim()) err('V15', file, 'scenario is empty')
      if (!e.takeaway.trim()) err('V15', file, 'takeaway is empty')
    }
```

  - **Header comment:** update the loop's comment from `// V5/V7/V11/V12/V13 — exercises` to `// V5/V7/V11/V12/V13/V15 — exercises`.

- [ ] **Step 9: Run the checks.**
Run: `npx vitest run src/lib/content/validate.test.ts src/lib/logic/estimate.test.ts && npm test && npm run typecheck && npm run lint`
Expected: everything passes. `velite.config.ts` doesn't produce estimate exercises yet, so the existing content is unaffected.

- [ ] **Step 10: Commit.**

```bash
git add src/lib/logic/estimate.ts src/lib/logic/estimate.test.ts src/lib/types.ts src/lib/content/validate.ts src/lib/content/validate.test.ts
git commit -m "feat(estimate): amount parsing, tolerance and formatting logic; V15 drill validation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Wire the `estimate` type through the app, plus the drill workspace

**Files:**
- Modify: `velite.config.ts` (the `exercises` discriminated union)
- Modify: `src/lib/types.ts`, `src/lib/content/index.ts`, `src/lib/logic/exercise-label.ts`
- Modify: `src/lib/logic/review-queue.ts`, `src/lib/logic/review-queue.test.ts`
- Create: `src/components/exercises/estimate-workspace.tsx`, `src/components/today/estimate-review-item.tsx`
- Modify: `src/components/exercises/exercise-workspace.tsx`, `src/components/exercises/exercises-table.tsx`, `src/components/lessons/ladder-list.tsx`, `src/components/today/today-view.tsx`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consumes, from Task 1: `EstimateStep`, `EstimateUnit`, `UNIT_PREFIXES`, `parseAmount`, `stepCorrect`, `formatAmount`, `scoreEstimate` and `DEFAULT_TOLERANCE`.
- Produces, used by Task 4's e2e test:
  - **Types:** `EstimateExercise { type: 'estimate'; stepCount: number }` and `EstimateDoc extends EstimateExercise { scenario; steps: EstimateStep[]; takeaway }`. The `DueItem` kind is `'estimate'`.
  - **Drill page:**
    - Each step is a `<section>` headed by an `<h2>` reading `<n>. <ask>`, and holds a text input labelled `Your estimate`, a select labelled `Unit`, and a `Check` button.
    - A checked step shows `✓ Within range` or `✗ Outside range`, a `Reference: … · Within <tol>× counts` line, and the `work` text.
    - At the end, a status line reads `N of M right`, followed by the takeaway and a `Try again` button.

This task has no component tests; the repo's Vitest runs in node and only covers `*.test.ts`. Its UI is exercised end-to-end in Task 4, once drill content exists. Verify here with typecheck, lint, unit tests and the build.

- [ ] **Step 1: Write the failing review-queue test.** In `src/lib/logic/review-queue.test.ts`:
  - Import `EstimateExercise`.
  - Add a fixture:

```ts
const drill: EstimateExercise = { slug: 'e', title: 'E', lessons: ['l'], ladderOrder: 4, type: 'estimate', stepCount: 3 }
```

  - Include it in `bySlug`: `[problem, quiz, design, drill]`.
  - Add the test:

```ts
  it('resolves estimation drills to their own kind, not design', () => {
    expect(resolveDue(['e'], bySlug, cards)).toEqual([{ kind: 'estimate', key: 'e', exercise: drill }])
  })
```

- [ ] **Step 2: Run it and watch it fail.**
Run: `npx vitest run src/lib/logic/review-queue.test.ts`
Expected: FAIL. Typecheck will also fail until Step 3.

- [ ] **Step 3: Extend the types.** In `src/lib/types.ts`:
  - `ExerciseType` becomes `'external-problem' | 'quiz' | 'design-prompt' | 'estimate'`.
  - Add, after `DesignExercise`:

```ts
export interface EstimateExercise extends ExerciseBase { type: 'estimate'; stepCount: number }
```

  - `ExerciseMeta` becomes `ProblemExercise | QuizExercise | DesignExercise | EstimateExercise`.
  - Add, after `DesignDoc`:

```ts
export interface EstimateDoc extends EstimateExercise { scenario: string; steps: EstimateStep[]; takeaway: string }
```

  - `ExerciseDoc` becomes `ProblemExercise | QuizDoc | DesignDoc | EstimateDoc`.

- [ ] **Step 4: Velite schema.** In `velite.config.ts`, add a fourth member to the `exercises` `s.discriminatedUnion('type', [...])`, after the design-prompt object:

```ts
    s.object({
      ...base,
      type: s.literal('estimate'),
      scenario: s.string(),
      steps: s.array(s.object({
        id,
        ask: s.string().min(1),
        unit: s.string(),
        answer: s.number(),
        tolerance: s.number().optional(),
        work: s.string().min(1),
      }).strict()).min(1),
      takeaway: s.string(),
    }).strict(),
```

V15 checks counts, units and ranges, so it can give file-specific messages; the schema stays loose on those.

- [ ] **Step 5: Content mapping.** In `src/lib/content/index.ts`:
  - Import `EstimateDoc` and `EstimateUnit` types.
  - In `toExerciseMeta`, add:

```ts
    case 'estimate':
      return { ...base, type: e.type, stepCount: e.steps.length }
```

  - In `getExerciseDoc`, add:

```ts
    case 'estimate': {
      const d: EstimateDoc = {
        slug: e.slug, title: e.title, lessons: e.lessons, ladderOrder: e.ladderOrder, type: e.type, stepCount: e.steps.length,
        scenario: e.scenario, takeaway: e.takeaway,
        steps: e.steps.map((st) => ({
          id: st.id, ask: st.ask, unit: st.unit as EstimateUnit, answer: st.answer, work: st.work,
          ...(st.tolerance !== undefined ? { tolerance: st.tolerance } : {}),
        })),
      }
      return d
    }
```

  - `velite.config.ts`'s `prepare` passes the raw `exercises` array straight to `validateContent`, so the new member reaches V15 with no mapping change. If typecheck complains that the Velite estimate type is not assignable to `ExerciseInput`, align the field types (e.g. `tolerance?: number`). Do not cast.

- [ ] **Step 6: Labels, table, ladder.**
  - **`src/lib/logic/exercise-label.ts`:** add `estimate: 'Estimate',` to `TYPE_LABEL`.
  - **`src/components/exercises/exercises-table.tsx`:**
    - Extend the `initialType` check with `|| initialType === 'estimate'`.
    - Add `<option value="estimate">Estimate</option>` after the Design option.
  - **`src/components/lessons/ladder-list.tsx`:** after the design-prompt caption line, add:

```tsx
          {p.type === 'estimate' && <span className="text-xs text-muted-foreground">{p.stepCount} steps</span>}
```

- [ ] **Step 7: Review queue and Today.**
  - **`src/lib/logic/review-queue.ts`:**
    - Import `EstimateExercise`.
    - Add `| { kind: 'estimate'; key: string; exercise: EstimateExercise }` to `DueItem`.
    - Replace the final `else items.push({ kind: 'design', … })` with:

```ts
    else if (e.type === 'estimate') items.push({ kind: 'estimate', key, exercise: e })
    else items.push({ kind: 'design', key, exercise: e })
```

  - **Create `src/components/today/estimate-review-item.tsx`:**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { exerciseHref } from '@/lib/content/hrefs'
import type { EstimateExercise } from '@/lib/types'

/** No rating buttons: finishing the drill records the review. */
export function EstimateReviewItem({ exercise }: { exercise: EstimateExercise }) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <p className="font-semibold">Redo {exercise.title} ({exercise.stepCount} steps)</p>
      <Button asChild><Link href={exerciseHref(exercise.slug)}>Do the drill</Link></Button>
    </article>
  )
}
```

  - **`src/components/today/today-view.tsx`:** import it, and in the reviews list, after the `item.kind === 'quiz'` block, add:

```tsx
                {item.kind === 'estimate' && <EstimateReviewItem exercise={item.exercise} />}
```

- [ ] **Step 8: The drill workspace.** Create `src/components/exercises/estimate-workspace.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Markdown } from '@/components/markdown'
import { StatusIcon } from '@/components/status-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEFAULT_TOLERANCE, formatAmount, parseAmount, scoreEstimate, stepCorrect, UNIT_PREFIXES } from '@/lib/logic/estimate'
import { exerciseStatus } from '@/lib/logic/filter'
import { useLive, useStore } from '@/lib/store/context'
import type { EstimateDoc, EstimateStep } from '@/lib/types'
import { LessonBadges } from './lesson-badges'
import { ReviewHistory } from './review-history'

const RESULT_LABEL = { alone: 'solved alone', hint: 'solved with help', solution: 'needs another try' } as const
const middle = (step: EstimateStep) => Math.floor((UNIT_PREFIXES[step.unit].length - 1) / 2)

export function EstimateWorkspace({ drill }: { drill: EstimateDoc }) {
  const store = useStore()
  const progress = useLive((s) => s.getProgress(drill.slug), [drill.slug])
  const fresh = () => drill.steps.map((st) => ({ text: '', prefix: middle(st) }))
  const [entries, setEntries] = useState(fresh)
  const [values, setValues] = useState<number[]>([]) // base-unit values of the checked steps, in order
  const resultRefs = useRef<(HTMLDivElement | null)[]>([])
  const summaryRef = useRef<HTMLParagraphElement>(null)
  const total = drill.steps.length
  const done = values.length === total
  const solved = progress?.status === 'solved'

  // Move focus to the newest result (the form it replaced is gone), but never on first mount.
  useEffect(() => {
    if (values.length === 0) return
    if (values.length === total) summaryRef.current?.focus()
    else resultRefs.current[values.length - 1]?.focus()
  }, [values.length, total])

  async function check(i: number) {
    const step = drill.steps[i]
    const n = parseAmount(entries[i].text)
    if (n === null || n <= 0) return
    const next = [...values, n * UNIT_PREFIXES[step.unit][entries[i].prefix].scale]
    setValues(next)
    if (next.length < total) return
    try {
      await store.completeQuiz(drill.slug, [], scoreEstimate(drill.steps, next), new Date())
      toast.success('Saved to your progress')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  function edit(i: number, patch: Partial<{ text: string; prefix: number }>) {
    setEntries((prev) => prev.map((e, k) => (k === i ? { ...e, ...patch } : e)))
  }

  const { correct } = scoreEstimate(drill.steps.slice(0, values.length), values)

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <StatusIcon status={exerciseStatus(progress)} /> {drill.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <LessonBadges lessons={drill.lessons} />
        </div>
        <p className="text-sm text-muted-foreground">
          {total} steps · an answer within the stated factor of the reference counts
          {solved && progress?.solveRating && <> · Last result: {RESULT_LABEL[progress.solveRating]}</>}
        </p>
      </header>

      <Markdown>{drill.scenario}</Markdown>

      <div className="space-y-4">
        {drill.steps.slice(0, Math.min(values.length + 1, total)).map((step, i) => {
          const headingId = `${step.id}-ask`
          if (i < values.length) {
            const ok = stepCorrect(step, values[i])
            return (
              <section key={step.id} aria-labelledby={headingId} className="space-y-2 rounded-lg border p-4">
                <h2 id={headingId} className="font-medium">{i + 1}. {step.ask}</h2>
                <div ref={(el) => { resultRefs.current[i] = el }} tabIndex={-1} className="space-y-1 text-sm break-words outline-none">
                  <p>
                    Your answer: {formatAmount(values[i], step.unit)} —{' '}
                    <span className={ok ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'font-medium text-destructive'}>
                      {ok ? '✓ Within range' : '✗ Outside range'}
                    </span>
                  </p>
                  <p>Reference: {formatAmount(step.answer, step.unit)} · Within {step.tolerance ?? DEFAULT_TOLERANCE}× counts</p>
                  <p className="text-muted-foreground">{step.work}</p>
                </div>
              </section>
            )
          }
          const n = parseAmount(entries[i].text)
          const errorId = `${step.id}-error`
          const nonPositive = n !== null && n <= 0
          return (
            <section key={step.id} aria-labelledby={headingId} className="space-y-3 rounded-lg border p-4">
              <h2 id={headingId} className="font-medium">{i + 1}. {step.ask}</h2>
              <form className="flex flex-wrap items-end gap-2" onSubmit={(ev) => { ev.preventDefault(); void check(i) }}>
                <label className="min-w-0 flex-1 space-y-1 text-sm">
                  <span className="block">Your estimate</span>
                  <Input
                    inputMode="decimal"
                    autoComplete="off"
                    value={entries[i].text}
                    onChange={(ev) => edit(i, { text: ev.target.value })}
                    aria-invalid={nonPositive || undefined}
                    aria-describedby={nonPositive ? errorId : undefined}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="block">Unit</span>
                  <select
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={entries[i].prefix}
                    onChange={(ev) => edit(i, { prefix: Number(ev.target.value) })}
                  >
                    {UNIT_PREFIXES[step.unit].map((p, k) => <option key={p.label} value={k}>{p.label}</option>)}
                  </select>
                </label>
                <Button type="submit" disabled={n === null || n <= 0}>Check</Button>
                {nonPositive && <p id={errorId} className="w-full text-sm text-destructive">Enter an amount above zero.</p>}
              </form>
            </section>
          )
        })}
      </div>

      {done && (
        <div className="space-y-3">
          <p ref={summaryRef} tabIndex={-1} role="status" className="font-medium outline-none">{correct} of {total} right</p>
          <p className="text-sm">{drill.takeaway}</p>
          <Button variant="outline" onClick={() => { setEntries(fresh()); setValues([]) }}>Try again</Button>
        </div>
      )}

      {solved && <ReviewHistory slug={drill.slug} />}
    </div>
  )
}
```

Check before using it:
- Confirm `@/components/ui/input` exports `Input`, and `@/components/markdown` exports `Markdown`. `design-workspace.tsx` already imports `Markdown` from there.
- If `exerciseStatus`, `useLive` or `getProgress` have different signatures, follow `quiz-workspace.tsx`, which uses the same calls.

- [ ] **Step 9: Route to it.** In `src/components/exercises/exercise-workspace.tsx`, import `EstimateWorkspace` and add before the final `return`:

```tsx
  if (exercise.type === 'estimate') return <EstimateWorkspace drill={exercise} />
```

- [ ] **Step 10: Document it.** In `CONTRIBUTING.md`:
  - Add a V15 row to the validation table, after V14:

```
| V15 | Estimation drills: 2–4 steps with unique ids; a known `unit` (bytes, bytes/s, bits/s, requests/s, count, seconds); `answer` > 0 in base units; `tolerance`, if set, 1.5–10 (default 2); each step's `work` shows its answer as the app formats it (e.g. "10 TB"); non-empty `scenario` and `takeaway` |
```

  - Add a short "Estimation drills" section next to the placement section. It covers:
    - the file shape: the YAML example from the spec's Content model;
    - that byte prefixes are decimal;
    - that answers are in base units;
    - that `work` must contain the formatted answer;
    - that scenario numbers must differ from the lessons' and design prompts' numbers.

- [ ] **Step 11: Run the checks.**
Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: everything passes. The build produces no estimate pages yet; that comes in Task 4.

- [ ] **Step 12: Commit.**

```bash
git add velite.config.ts src/lib/types.ts src/lib/content/index.ts src/lib/logic/exercise-label.ts src/lib/logic/review-queue.ts src/lib/logic/review-queue.test.ts src/components/exercises/estimate-workspace.tsx src/components/exercises/exercise-workspace.tsx src/components/exercises/exercises-table.tsx src/components/lessons/ladder-list.tsx src/components/today/estimate-review-item.tsx src/components/today/today-view.tsx CONTRIBUTING.md
git commit -m "feat(estimate): estimate exercise type, drill workspace, Today card and filters

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The estimation lesson and its quiz

**Files:**
- Create: `content/tracks/system-design/lessons/estimation.mdx`, `content/exercises/estimation-quiz.yaml`
- Modify: `content/tracks/system-design/track.yaml`, which puts `estimation` after `sql-vs-nosql` in `foundations`
- Modify: `src/lib/content/index.test.ts`: the System Design lesson-order assertion (currently line ~82), plus a new estimation test
- Modify: `e2e/layout.spec.ts`: insert `'/system-design/estimation/', '/exercises/estimation-quiz/'` after `'/exercises/design-orders-and-activity-storage/'`

**Interfaces:**
- Consumes: nothing from Tasks 1–2, though it lands after them.
- Produces, for Task 4:
  - The lesson slug `estimation`.
  - The quiz takes `ladderOrder: 1` in that lesson's ladder, so Task 4's drills use 2–7.
  - The lesson's numbers, which Task 4's drills must not reuse.

**Lesson requirements:**
- **Front matter:** like `sql-vs-nosql.mdx`: `slug: estimation`, `title: Back-of-the-envelope estimation`, `level: beginner`, `authors: [cs-atlas]`, `prerequisites: [client-server-http]`, and a one-line `summary`.
- **Sections:** `## Intuition`, `## Visual`, `## Example`, `## Pitfalls`, `## Tips & tricks`, in that order (V9). Match the tone and length of `sql-vs-nosql.mdx` and `caching.mdx`.
- **Intuition:**
  - Why rough numbers decide designs early: they tell you whether something fits on one machine, in RAM, or needs a cache, a CDN or sharding.
  - Why "within 2×" is the goal, not precision.
- **Visual:** a static reference ladder, as markdown tables. No visualizer.
  - Powers of two vs ten: 2¹⁰ ≈ 10³ (KB), 2²⁰ ≈ 10⁶ (MB), 2³⁰ ≈ 10⁹ (GB), 2⁴⁰ ≈ 10¹² (TB).
  - Latency orders of magnitude, given as rounded orders with no false precision:
    - L1 cache about 1 ns;
    - main memory about 100 ns;
    - SSD random read about 100 µs;
    - a round trip within a datacenter about 0.5 ms;
    - a cross-continent round trip about 100–150 ms.
  - Time: 86,400 s/day ≈ 10⁵; a month ≈ 2.6 M s; a year ≈ 3.15 × 10⁷ s.
  - The decimal-prefix convention, stated once: "On this site KB = 1,000 bytes; the 2.4% difference from 1,024 never matters at this precision".
- **Example:** one walk-through, from DAU to average QPS, peak QPS (stating the peak factor), storage/day and /year, and egress bandwidth.
  - Pick its own numbers.
  - Avoid: 2 M pastes × 10 KB, the 90% hit-ratio example from caching, and any figure in a `design-*.yaml` reference.
- **Pitfalls:** average vs peak, bits vs bytes (×8), forgetting the replication factor, counting metadata but not payload (or the reverse), and per-day vs per-second slips.
- **Tips & tricks:** round to one significant figure early, work in powers of ten, write units on every line, and sanity-check against a known system or a single machine's limits.

**Quiz requirements, `content/exercises/estimation-quiz.yaml`:**
- `slug: estimation-quiz`, `type: quiz`, `title: "Quiz: back-of-the-envelope estimation"` (match the title style of `sql-vs-nosql-quiz.yaml`), `lessons: [estimation]`, `ladderOrder: 1`.
- **4–5 questions,** each with 4 choices.
  - The correct choice is not the longest.
  - Answer positions vary, and no key appears three times in a row.
  - Each question is answerable from understanding the method, not from recalling the lesson's own numbers.
  - Show any arithmetic in the explanation.
- **6–8 flashcards** for the reference numbers: seconds per day, 2¹⁰ ≈ 10³, the latency orders, bits vs bytes, and the peak factor idea. Each `front` and `back` is ≤ 200 characters.
- **Duplicates:** don't repeat or closely paraphrase any existing `*-quiz.yaml` question or `content/placement/*.yaml` prompt. V14 catches exact repeats of placement prompts.

- [ ] **Step 1: Update the inventory test.**
  - In `src/lib/content/index.test.ts`, change the System Design lesson-order expectation to insert `'estimation'` after `'sql-vs-nosql'`.
  - Then add, next to the existing per-lesson System Design checks:

```ts
  it('has the estimation lesson in System Design Foundations with its quiz', () => {
    const { lessons, exercises } = getCatalog()
    expect(lessons.find((l) => l.slug === 'estimation')).toMatchObject({ track: 'system-design', prerequisites: ['client-server-http'], level: 'beginner' })
    expect(getLessonDoc('estimation')!.toc.map((t) => t.title)).toEqual(['Intuition', 'Visual', 'Example', 'Pitfalls', 'Tips & tricks'])
    expect(exercises.find((e) => e.slug === 'estimation-quiz')).toMatchObject({ type: 'quiz', lessons: ['estimation'], ladderOrder: 1 })
  })
```

- [ ] **Step 2: Run it and watch it fail.**
Run: `npx vitest run src/lib/content/index.test.ts`
Expected: FAIL. There is no `estimation` lesson yet.

- [ ] **Step 3: Write the lesson, the quiz and the `track.yaml` change** following the requirements above.

- [ ] **Step 4: Run the checks.**
Run: `npm test && npm run typecheck && npm run lint`
Expected: everything passes, including V9/V10 during `pretest`. The quiz satisfies V10 for the new lesson.

Then run the quiz length check and paste its output into your report. The correct choice must never be the longest.

```bash
node -e '
const y=require("js-yaml").load(require("fs").readFileSync("content/exercises/estimation-quiz.yaml","utf8"))
y.questions.forEach(q=>{const L=q.choices.map(c=>c.length);console.log(q.id,"key",q.answer,"len",L[q.answer],"max",Math.max(...L),L[q.answer]===Math.max(...L)?"<- LONGEST":"")})'
```

- [ ] **Step 5: Layout entries.** Add the two paths to `e2e/layout.spec.ts` as listed under Files, then run:
`npx playwright test e2e/layout.spec.ts -g "estimation"`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add content/tracks/system-design/lessons/estimation.mdx content/tracks/system-design/track.yaml content/exercises/estimation-quiz.yaml src/lib/content/index.test.ts e2e/layout.spec.ts
git commit -m "feat(estimate): Back-of-the-envelope estimation lesson and quiz

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Six estimation drills and their e2e test

**Files:**
- Create: `content/exercises/estimate-photo-storage.yaml`, `estimate-peak-qps.yaml`, `estimate-cache-memory.yaml`, `estimate-video-egress.yaml`, `estimate-shard-count.yaml`, `estimate-log-volume.yaml`
- Modify: `src/lib/content/index.test.ts`. Add the drill inventory, and update any existing assertion that lists the exercises of `sql-vs-nosql`, `load-balancing`, `caching`, `dns-cdn`, `replication-sharding` or `observability` (e.g. the `sql-vs-nosql` exercises list at ~line 95), since each drill also links one of those lessons.
- Create: `e2e/estimate.spec.ts`
- Modify: `e2e/layout.spec.ts`. Insert the six `/exercises/estimate-…/` paths right after `'/exercises/estimation-quiz/'`.

**Interfaces:**
- Consumes:
  - The drill page structure from Task 2: per-step `<h2>`, the "Your estimate" input, the "Unit" select, Check, the result lines, and "N of M right".
  - Task 3's lesson slug, with ladderOrder 1 taken by the quiz.
  - Task 1's V15 rules and `formatAmount` output format.
- Produces: nothing downstream.

**Drill plan.** Every drill has `lessons: [estimation, <also>]`, so all six share the `estimation` ladder and use `ladderOrder` 2–7 in this order:

| ladderOrder | slug | also links | steps (2–4) |
|---|---|---|---|
| 2 | `estimate-peak-qps` | load-balancing | DAU × actions per user → requests/day → average req/s → peak req/s (state the peak factor) |
| 3 | `estimate-photo-storage` | sql-vs-nosql | uploads/day × size → storage/day → per year → ×3 replication |
| 4 | `estimate-cache-memory` | caching | objects × size → total → hot fraction in RAM → cache nodes at a stated RAM per node (`count`) |
| 5 | `estimate-video-egress` | dns-cdn | concurrent viewers × bitrate → egress (`bits/s`) → origin egress at a stated CDN hit ratio |
| 6 | `estimate-shard-count` | replication-sharding | total data ÷ per-node capacity, write req/s ÷ per-node limit → shards = the larger (`count`) |
| 7 | `estimate-log-volume` | observability | events/s × bytes → bytes/day → retained total over a stated retention |

**Writing rules.** These are binding; an accuracy reviewer re-does every calculation.
- **YAML shape:**
  - Fields: `slug`, `type: estimate`, `title: "Estimate: <topic>"`, `lessons`, `ladderOrder`, `scenario` (markdown), `steps` (`id`, `ask`, `unit`, `answer` in base units, optional `tolerance`, `work`), and `takeaway` (1–2 sentences).
  - Use double-quoted strings except for the `scenario: |` block.
- **Answers.**
  - `answer` is the exact result of the stated arithmetic on the scenario's numbers, rounded to at most 3 significant figures.
  - `work` shows the arithmetic and contains `formatAmount(answer, unit)` verbatim, e.g. `"… = 10 TB/day"`. V15 fails the build otherwise.
  - To see the exact string, run `npx tsx -e 'import {formatAmount} from "./src/lib/logic/estimate"; console.log(formatAmount(1e13,"bytes"))'`, or read the function.
- **Self-contained steps.**
  - Each step uses only the scenario and earlier steps' reference answers.
  - The `ask` names any earlier result it builds on, e.g. "Using the daily figure, storage per year?".
  - The scenario states every assumption a step needs: peak factor, replication factor, hit ratio, RAM per node, retention.
- **Tolerance.** Keep the default of 2. Use 1.5 only for a step that is a pure count of a small number (e.g. shards); state that in the report.
- **Units.** Choose the unit that reads naturally: storage in `bytes`, rates in `requests/s`, network in `bits/s`, nodes/shards in `count`.
- **No reused numbers.**
  - Scenario numbers must differ from those in `estimation.mdx` (Task 3), every other lesson, and every `content/exercises/design-*.yaml` prompt or reference.
  - Grep for each headline number before using it.
  - No drill may compute a design prompt's headline figure.
- **Realism.** Numbers must be realistic for 2026 hardware and products. Examples: a cache node with 64–256 GB RAM, a database node holding a few TB, an HD stream at a few Mbit/s.

- [ ] **Step 1: Write the failing inventory test.** Append to `src/lib/content/index.test.ts`:

```ts
describe('estimation drills', () => {
  const DRILLS: [string, string][] = [
    ['estimate-peak-qps', 'load-balancing'], ['estimate-photo-storage', 'sql-vs-nosql'], ['estimate-cache-memory', 'caching'],
    ['estimate-video-egress', 'dns-cdn'], ['estimate-shard-count', 'replication-sharding'], ['estimate-log-volume', 'observability'],
  ]
  it('ships six drills in the estimation ladder, each also linking its topic lesson', () => {
    const { exercises } = getCatalog()
    for (const [i, [slug, also]] of DRILLS.entries()) {
      expect(exercises.find((e) => e.slug === slug), slug).toMatchObject({ type: 'estimate', lessons: ['estimation', also], ladderOrder: i + 2 })
    }
    expect(exercises.filter((e) => e.type === 'estimate')).toHaveLength(6)
  })
  it('gives every drill 2–4 steps with its answer shown in the worked arithmetic', () => {
    for (const [slug] of DRILLS) {
      const d = getExerciseDoc(slug) as EstimateDoc
      expect(d.steps.length, slug).toBeGreaterThanOrEqual(2)
      expect(d.steps.length, slug).toBeLessThanOrEqual(4)
      for (const st of d.steps) expect(st.work, `${slug}/${st.id}`).toContain(formatAmount(st.answer, st.unit))
    }
  })
})
```

  - Add the imports: `EstimateDoc` from `@/lib/types` and `formatAmount` from `@/lib/logic/estimate`. `getExerciseDoc` is already imported.

- [ ] **Step 2: Run it and watch it fail.**
Run: `npx vitest run src/lib/content/index.test.ts`
Expected: FAIL. There are no drills yet.

- [ ] **Step 3: Write the six drill files** following the drill plan and writing rules.
  - Update any existing per-lesson exercise-list assertions the new links break.
  - Re-run `npx vitest run src/lib/content/index.test.ts` until it passes.

- [ ] **Step 4: Write the e2e test.** Create `e2e/estimate.spec.ts`:

```ts
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

type Step = { id: string; ask: string; unit: string; answer: number; work: string }
type Drill = { slug: string; type: string; steps: Step[] }
const drill = (JSON.parse(readFileSync('.velite/exercises.json', 'utf8')) as Drill[])
  .find((e) => e.slug === 'estimate-photo-storage')!
// The picker's smallest prefix has scale 1 for every unit except seconds (ms), so typing the base value with that prefix is exact.
const BASE_LABEL: Record<string, string> = { bytes: 'B', 'bytes/s': 'B/s', 'bits/s': 'bit/s', 'requests/s': '/s', count: '×1' }

test('an estimation drill grades each step and records the attempt', async ({ page }) => {
  await page.goto('/exercises/estimate-photo-storage/')
  await expect(page.getByRole('heading', { level: 1, name: /Estimate: / })).toBeVisible()

  for (const [i, st] of drill.steps.entries()) {
    const section = page.getByRole('region', { name: `${i + 1}. ${st.ask}` })
    // Step 1 right; every later step 100× too big, far outside any tolerance.
    await section.getByLabel('Your estimate').fill(String(i === 0 ? st.answer : st.answer * 100))
    await section.getByLabel('Unit').selectOption({ label: BASE_LABEL[st.unit] })
    await section.getByRole('button', { name: 'Check' }).click()
    await expect(section.getByText(i === 0 ? '✓ Within range' : '✗ Outside range')).toBeVisible()
    await expect(section.getByText(st.work)).toBeVisible()
  }

  await expect(page.getByRole('status').filter({ hasText: 'right' })).toHaveText(`1 of ${drill.steps.length} right`)
  await expect(page.getByText('Saved to your progress')).toBeVisible()

  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('region', { name: `1. ${drill.steps[0].ask}` }).getByLabel('Your estimate')).toHaveValue('')
})

test('Check stays disabled for input that is not an amount, and explains zero', async ({ page }) => {
  await page.goto('/exercises/estimate-photo-storage/')
  const section = page.getByRole('region', { name: `1. ${drill.steps[0].ask}` })
  const check = section.getByRole('button', { name: 'Check' })
  await expect(check).toBeDisabled()
  await section.getByLabel('Your estimate').fill('7,5')
  await expect(check).toBeDisabled()
  await section.getByLabel('Your estimate').fill('0')
  await expect(check).toBeDisabled()
  await expect(section.getByText('Enter an amount above zero.')).toBeVisible()
  await section.getByLabel('Your estimate').fill('7,500')
  await expect(check).toBeEnabled()
})
```

Notes for the implementer:
- `estimate-photo-storage` must not use the `seconds` unit, because the test relies on the base label having scale 1. If you change which drill the test uses, keep that true.
- A `<section>` with `aria-labelledby` has the role `region`, which is what `getByRole('region')` relies on.
- If the "Saved to your progress" toast is flaky to catch, replace that line by checking that `/exercises/` shows the drill's status as attempted. Use whatever the existing practice e2e tests use to read status, and mention the change in your report.

- [ ] **Step 5: Layout entries.** Insert the six drill paths into `e2e/layout.spec.ts` as listed under Files.

- [ ] **Step 6: Run the checks.**
Run: `npm test && npm run typecheck && npm run lint && npx velite && npx playwright test e2e/estimate.spec.ts e2e/layout.spec.ts e2e/learning-loop.spec.ts`
Expected: everything passes. If local e2e times out because the machine is overloaded, rerun the failing spec alone before concluding anything.

- [ ] **Step 7: Commit.**

```bash
git add content/exercises/estimate-*.yaml src/lib/content/index.test.ts e2e/estimate.spec.ts e2e/layout.spec.ts
git commit -m "feat(estimate): six System Design estimation drills and e2e

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After the PR merges

`npm run check:deploy -- https://cs-atlas-hub.vercel.app` should report 269 pages: 261 + the lesson + its quiz + 6 drills.
