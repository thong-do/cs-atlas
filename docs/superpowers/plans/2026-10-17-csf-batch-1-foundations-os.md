# CS Fundamentals Batch 1 (Platform, Foundations, Operating Systems) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `cs-fundamentals` track with its first two modules (6 lessons), the `page-table` and `mutex` visualizers, and the `kind: diagnose` variant of design prompts.

**Architecture:** Content lives in `content/` and is validated by Velite and `src/lib/content/validate.ts`. The track is served by the existing `[track]` route. The only code changes are:
- an optional `kind` field on design-prompt exercises, which flows through the types to the badge and workspace labels;
- two new step-through visualizers built on the existing pattern.

**Tech Stack:** Next.js (App Router), Velite, TypeScript, Vitest, Playwright, MDX, YAML.

**Spec:** `docs/superpowers/specs/2026-10-17-cs-fundamentals-track-design.md`

## Global Constraints

### Branch and commits

- Work on branch `feat/csf-foundations-os`. Never commit to main, never push, and never dispatch subagents or reviewers.
- Make one commit per task. Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stage files explicitly. Never commit anything under `.superpowers/`, and check `git status` first.
- Before committing a task, run `npm test`, `npm run typecheck`, `npm run lint` and `npm run e2e`. Write the e2e output to `/private/tmp/claude-501/-Users-thongdo-IT-algorithms/0211fe1a-3ec8-4ddf-9510-c5acc4d9fb5e/scratchpad/e2e-csf-<task>.log` and read its tail. If the only failures are browser-launch or `webServer` timeouts on pages you didn't touch, re-run just those specs and say so.

### Track design

- **No cross-track prerequisites.** Lessons link to System Design and Algorithms lessons with the existing link format, e.g. `[Caching](/system-design/caching/)`, but never list them in `prerequisites`.

### Lesson file (`content/tracks/cs-fundamentals/lessons/<slug>.mdx`)

- **Frontmatter:** exactly `slug`, `title`, `level`, `authors: [cs-atlas]`, `prerequisites`, and a one-sentence `summary`.
- **Sections:** exactly these `##` sections, in order: Intuition, Visual, Example, Pitfalls, Tips & tricks.
  - Intuition opens with an everyday analogy.
  - Visual has a ```text diagram, plus the `<Visualizer>` line if the task names one.
  - The Example is worked and its code is valid (Python preferred unless the task says otherwise).
  - Pitfalls are bullets, each with its fix.
  - Tips & tricks give rules of thumb, interview phrasing, and what to measure.
- **Length:** about 1,100–1,400 words by `wc -w`, with a hard ceiling of 1,400.
- **Voice:** working developers filling CS gaps. Explain what the machine or OS does underneath their code, and the bugs and performance effects that follow. Match the tone of `content/tracks/system-design/lessons/replication-sharding.mdx` and `queues-streams.mdx`.

### Accuracy rules

Each of these caught a real error in earlier batches.

- Hedge figures that vary by hardware, OS or version, and never invent statistics.
- Show and check every piece of arithmetic.
- Name OS, kernel and language behaviour only when you are sure of it, and add "(varies by OS / version)" where it does.
- Keep layers straight: a language property isn't an OS property, and an OS property isn't a hardware property.
- Examples must follow the lesson's own advice.
- Don't pre-solve the diagnose prompt.
  - Each task lists what the lesson must NOT discuss.
  - Use different numbers and scenarios in the lesson.
  - Before committing, grep the lesson for each rubric remedy.
- Don't refer to "a later lesson" unless a `comingSoon` title or an existing lesson names it. Link to existing lessons instead.

### Quiz (`content/exercises/<slug>-quiz.yaml`)

- **Header:** `type: quiz`, `lessons: [<slug>]`, `ladderOrder: 1`.
- **Questions:** 5 judgement questions, each with 4 choices.
  - Use numbers and scenarios that differ from the lesson's examples, so a question can't be answered by recalling one.
  - Distractors must be confident, plausible, related-but-wrong mechanisms of similar specificity.
  - A distractor must never label its own mistake, never state an absurd rule, and never be secretly correct.
  - The correct choice must not be the only one that echoes the lesson's keywords.
- **Choice lengths:** the correct choice must be neither the longest nor the shortest in at least 4 of the 5 questions. Measure this and put a table in your report.
- **Explanations:** 1–2 sentences each, describing the distractors accurately.
- **Answer key:**
  - Use at least 3 distinct indexes, in no obvious sequence.
  - It must not match any existing key. List the existing keys with:
    `for f in content/exercises/*-quiz.yaml; do grep 'answer:' $f | awk '{print $2}' | tr '\n' ','; echo; done | sort`
- **Flashcards:** 8, with each side ≤200 characters and lowercase-with-dashes ids. No front may duplicate one anywhere in `content/exercises`. Check with `grep -h "front:" content/exercises/*.yaml`.

### Diagnose prompt (`content/exercises/<prompt-slug>.yaml`)

- **Fields:** `type: design-prompt`, `kind: diagnose`, `lessons: [<slug>]`, `ladderOrder: 2`.
- **`prompt`:** a concrete symptom with numbers, asking the learner to explain the cause, show how to confirm it, and give fixes.
- **`hint`:** one nudge.
- **`rubric`:** 5 points.
- **`reference`:** ≤300 words by `wc -w` on the reference block only. It must:
  - match the rubric point by point;
  - show all its arithmetic, correctly;
  - be internally consistent: any stored state a later step changes says how it is updated.

### Wiring

Each lesson task does the following:
- appends its slug to its module in `content/tracks/cs-fundamentals/track.yaml`;
- extends the CS Fundamentals inventory assertions in `src/lib/content/index.test.ts`: the track lesson order, the lesson's table of contents and prerequisites, and its exercises;
- adds `/cs-fundamentals/<slug>/` and both exercise pages to `PAGES` in `e2e/layout.spec.ts`;
- if the lesson embeds a visualizer, adds `{ path, final }` to `PAGES` in `e2e/visualizers.spec.ts`.

## Review Focus

1. **Existing design prompts must look exactly as before.** All existing design prompts have no `kind`, so they must still say "Design" and "Your design". Task 1 pins this with a catalog test and a unit test.
2. **A diagnose prompt shows "Diagnose" everywhere a type label appears:** the exercises table, the lesson ladder, Today and the command palette. Task 1's unit test covers the label function. Task 3's e2e test covers the table and the page.
3. **Modules with no lessons yet must render their `comingSoon` titles.** Networking, Databases and Machine & math are lesson-less in this batch. The track page must not crash or show "Continue" into an empty module. Task 3's e2e test opens `/cs-fundamentals/` and checks the coming-soon titles.
4. **The roadmap must fit three bands.** With three tracks, labels must stay inside the viewBox and must not overlap. The existing roadmap layout e2e test covers this, and Task 3 extends its "shows the tracks" test to all three.
5. **"Continue" on the new track starts at `complexity`.** It must not jump into a lesson whose prerequisites are unmet. Task 3 adds this e2e check.

---

### Task 1: `kind: diagnose` for design prompts

**Files:**
- Modify: `velite.config.ts` (design-prompt schema, around line 93)
- Modify: `src/lib/types.ts` (around lines 12–29)
- Modify: `src/lib/content/index.ts` (`toExerciseMeta` around line 50, the design doc builder around line 96)
- Create: `src/lib/logic/exercise-label.ts`
- Create: `src/lib/logic/exercise-label.test.ts`
- Modify: `src/components/exercises/exercise-type-badge.tsx`
- Modify: the callers of `ExerciseTypeBadge` / `TYPE_LABEL`: `src/components/exercises/exercises-table.tsx`, `src/components/lessons/ladder-list.tsx`, `src/components/today/today-view.tsx`, `src/components/command-palette.tsx`
- Modify: `src/components/exercises/design-workspace.tsx` (the two "Your design" labels)
- Test: `src/lib/content/index.test.ts`

**Interfaces:**
- Produces:
  - `type PromptKind = 'design' | 'diagnose'`
  - `DesignExercise.kind: PromptKind`
  - `DesignDoc.kind: PromptKind`
  - `exerciseLabel(e: { type: ExerciseType; kind?: PromptKind }): string`
  - `TYPE_LABEL` moves to `src/lib/logic/exercise-label.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/logic/exercise-label.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { exerciseLabel } from './exercise-label'

describe('exerciseLabel', () => {
  it('labels each exercise type', () => {
    expect(exerciseLabel({ type: 'external-problem' })).toBe('LeetCode')
    expect(exerciseLabel({ type: 'quiz' })).toBe('Quiz')
    expect(exerciseLabel({ type: 'design-prompt', kind: 'design' })).toBe('Design')
  })
  it('labels diagnose prompts separately', () => {
    expect(exerciseLabel({ type: 'design-prompt', kind: 'diagnose' })).toBe('Diagnose')
  })
})
```

In `src/lib/content/index.test.ts`, inside the `content inventory` describe:
```ts
  it('defaults design prompts to the design kind', () => {
    const { exercises } = getCatalog()
    const designs = exercises.filter((x) => x.type === 'design-prompt')
    expect(designs.length).toBeGreaterThan(0)
    expect(designs.every((x) => x.type === 'design-prompt' && x.kind === 'design')).toBe(true)
  })
```

- [ ] **Step 2: Run the tests and check they fail**

Run `npx vitest run src/lib/logic/exercise-label.test.ts src/lib/content/index.test.ts`. Expected: FAIL. The module isn't found, and `kind` is undefined.

- [ ] **Step 3: Implement**

`velite.config.ts`, design-prompt object. Add after `hint`:
```ts
      kind: s.enum(['design', 'diagnose']).default('design'),
```

`src/lib/types.ts`:
```ts
export type PromptKind = 'design' | 'diagnose'
export interface DesignExercise extends ExerciseBase { type: 'design-prompt'; kind: PromptKind; rubric: string[] } // rubric point texts, for Today's reveal
```
`DesignDoc` gets `kind` through `Omit<DesignExercise, 'rubric'>`, so it needs no change.

`src/lib/content/index.ts`:
```ts
    case 'design-prompt':
      return { ...base, type: e.type, kind: e.kind, rubric: e.rubric.map((r) => r.point) }
```
In the doc builder, add `kind: e.kind,` after `type: e.type,`.

`src/lib/logic/exercise-label.ts`:
```ts
import type { ExerciseType, PromptKind } from '@/lib/types'

export const TYPE_LABEL: Record<ExerciseType, string> = {
  'external-problem': 'LeetCode',
  quiz: 'Quiz',
  'design-prompt': 'Design',
}

/** Badge text for an exercise. Diagnose prompts share the design-prompt type but read differently. */
export function exerciseLabel(e: { type: ExerciseType; kind?: PromptKind }): string {
  return e.type === 'design-prompt' && e.kind === 'diagnose' ? 'Diagnose' : TYPE_LABEL[e.type]
}
```

`src/components/exercises/exercise-type-badge.tsx`:
```tsx
import { Badge } from '@/components/ui/badge'
import { exerciseLabel } from '@/lib/logic/exercise-label'
import type { ExerciseType, PromptKind } from '@/lib/types'

export function ExerciseTypeBadge({ exercise }: { exercise: { type: ExerciseType; kind?: PromptKind } }) {
  return <Badge variant="outline">{exerciseLabel(exercise)}</Badge>
}
```

Callers:
- `exercises-table.tsx`, `ladder-list.tsx` and `today-view.tsx`: change `<ExerciseTypeBadge type={p.type} />` to `<ExerciseTypeBadge exercise={p} />`.
- `command-palette.tsx`: change `{TYPE_LABEL[p.type]}` to `{exerciseLabel(p)}`, importing from `@/lib/logic/exercise-label`.
- If any caller's `p` is a narrower type without `kind` (e.g. a palette item built from the catalog), add `kind` where that item is built, so diagnose prompts carry it.

`src/components/exercises/design-workspace.tsx`: inside `DesignWorkspace`, add `const noun = design.kind === 'diagnose' ? 'answer' : 'design'`. Replace both visible `Your design` strings with `Your {noun}`. Keep the ids, such as `design-draft`, unchanged.

- [ ] **Step 4: Run the tests and check they pass**

Run `npx vitest run src/lib/logic/exercise-label.test.ts src/lib/content/index.test.ts`. Expected: PASS. Then run `npm test`, `npm run typecheck`, `npm run lint` and `npm run e2e`. All must pass, and the existing design-prompt e2e still sees "Your design".

- [ ] **Step 5: Commit**

```bash
git add velite.config.ts src/lib/types.ts src/lib/content/index.ts src/lib/content/index.test.ts src/lib/logic/exercise-label.ts src/lib/logic/exercise-label.test.ts src/components/exercises/exercise-type-badge.tsx src/components/exercises/exercises-table.tsx src/components/lessons/ladder-list.tsx src/components/today/today-view.tsx src/components/command-palette.tsx src/components/exercises/design-workspace.tsx
git commit -m "feat(exercises): diagnose kind for design prompts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `page-table` and `mutex` visualizers

**Files:**
- Create: `src/lib/visualizers/pt-steps.ts`, `pt-steps.test.ts`, `mutex-steps.ts`, `mutex-steps.test.ts`
- Create: `src/components/visualizers/pt-view.tsx`, `mutex-view.tsx`
- Modify: `src/lib/visualizers/kinds.ts`, `src/components/visualizers/visualizer.tsx`

**Interfaces:**
- Produces `pageTableSteps(): PtStep[]` and `mutexSteps(): MutexStep[]`.
- Produces the kinds `page-table` and `mutex`.
- The final captions below are consumed by Tasks 7 and 8 (in the e2e spec).

**Pattern.** Follow the existing visualizers exactly: `src/lib/visualizers/{raft-steps,tpc-steps,feed-steps}.ts` with their tests, and `src/components/visualizers/{raft-view,tpc-view,feed-view}.tsx`.
- Each generator is pure and returns steps with a `caption`. The last step has `done: true`.
- Captions are in the past tense. Counts and plurals are derived from state.
- The figure height is constant at 320, 375 and 1280px, with no sideways scroll. If the final caption wraps, use `captionClassName`, as `feed-fanout` does.
- State is shown as text as well as colour. White text uses blue-600 `#2563eb`, amber-700 `#b45309`, emerald-700 `#047857`, purple-600 `#9333ea`, red-700 `#b91c1c` or slate-600 `#475569`. Red text in dark mode gets `dark:text-red-400`.
- Put one dynamic `aria-label` on a `role="img"` container that summarises all the state. Put no `aria-label` on children or on plain elements, and no unlabeled `role="group"`.

#### `page-table`

Constants:
- Page size 4,096 bytes.
- Page table: page 0 maps to frame 5, page 1 to frame 2, page 2 is not present (it is on disk), and page 3 maps to frame 7.
- Frame 3 is free.
- The TLB has capacity 2 with LRU eviction and starts holding page 0 → frame 5.
- The accesses are virtual addresses 291, 4,100 and 8,200.

```ts
interface PtStep {
  va: number | null; page: number | null; offset: number | null
  tlb: { page: number; frame: number }[]            // most recently used last
  table: { page: number; frame: number | null; present: boolean }[]
  pa: number | null
  hits: number; misses: number; faults: number
  focus: 'tlb' | 'table' | 'disk' | null
  caption: string; done?: boolean
}
```

Pin every step in the test: captions, `tlb` (with order), `table`, `pa`, the counters and `focus`.

| # | change | caption |
|---|---|---|
| 0 | initial state | `Pages were 4,096 bytes, and the TLB already cached page 0 → frame 5` |
| 1 | va 291, page 0, offset 291 | `Address 291 split into page 0, offset 291` |
| 2 | TLB hit; page 0 moves to MRU; pa 20,771; hits 1; focus tlb | `TLB hit: page 0 was in frame 5, so the physical address was 5 × 4,096 + 291 = 20,771` |
| 3 | va 4,100, page 1, offset 4; pa null | `Address 4,100 split into page 1, offset 4` |
| 4 | misses 1; focus table | `TLB miss: page 1 was not cached, so the page table was walked` |
| 5 | TLB becomes [0→5, 1→2]; pa 8,196 | `The page table mapped page 1 to frame 2; the TLB cached it and the address became 2 × 4,096 + 4 = 8,196` |
| 6 | va 8,200, page 2, offset 8; pa null | `Address 8,200 split into page 2, offset 8` |
| 7 | misses 2; focus table | `TLB miss: page 2 was not cached, so the page table was walked` |
| 8 | faults 1; focus disk | `Page fault: page 2 was not in memory, so the OS took over` |
| 9 | table page 2 becomes frame 3, present | `The OS read page 2 from disk into free frame 3 and updated the page table` |
| 10 | TLB evicts page 0 (LRU) and becomes [1→2, 2→3]; pa 12,296 | `The access was retried: the TLB cached page 2, evicting page 0, and the address became 3 × 4,096 + 8 = 12,296` |
| 11 | `done: true` | `Done: 1 TLB hit, 2 misses and 1 page fault — the fault needed a disk read, far slower than any memory access` |

Compute it: split the address with integer division and modulo, choose the LRU victim from the order, take the free frame from a free list, and derive the final counts from the counters.

**View.**
- Show the address split as `page | offset`.
- Show a TLB box with 2 fixed slots, a page-table box with 4 fixed rows (page, frame or "on disk", a present marker in text), and a disk box.
- Show the result line `physical address = …` or `—`, and the counters `Hits h · Misses m · Faults f`.
- Highlight the focused box.

**Title:** `"Virtual memory: a TLB hit, a TLB miss and a page fault"`

#### `mutex`

A shared `counter` starts at 0. Threads T1 and T2 each run `counter += 1` as three steps: read, add, then write.

```ts
type Tid = 'T1' | 'T2'
interface MutexStep {
  run: 'no-lock' | 'mutex'
  counter: number
  threads: { id: Tid; local: number | null; state: 'ready' | 'running' | 'blocked' | 'done' }[]
  owner: Tid | null; waiting: Tid[]
  focus: Tid | null
  caption: string; done?: boolean
}
```

Pin every step:

| # | run | change | caption |
|---|---|---|---|
| 0 | no-lock | counter 0, both ready | `No lock: T1 and T2 each ran counter += 1, which is a read, an add and a write` |
| 1 | no-lock | T1 running, local 0 | `T1 read counter = 0` |
| 2 | no-lock | T2 running, local 0 | `T2 read counter = 0 before T1 wrote back` |
| 3 | no-lock | counter 1, T1 done | `T1 wrote 0 + 1 = 1` |
| 4 | no-lock | counter 1, T2 done | `T2 wrote 0 + 1 = 1, overwriting T1's update` |
| 5 | no-lock | none | `No lock: two increments left counter = 1 — one update was lost` |
| 6 | mutex | reset: counter 0, both ready with local null, owner null | `With a mutex: each thread had to hold the lock to read, add and write` |
| 7 | mutex | owner T1, T1 running | `T1 acquired the lock` |
| 8 | mutex | T1 local 0 | `T1 read counter = 0` |
| 9 | mutex | T2 blocked, waiting [T2] | `T2 tried to acquire the lock and blocked, because T1 held it` |
| 10 | mutex | counter 1 | `T1 wrote 0 + 1 = 1` |
| 11 | mutex | T1 done; owner T2; waiting []; T2 running | `T1 released the lock; T2 woke up and acquired it` |
| 12 | mutex | T2 local 1 | `T2 read counter = 1` |
| 13 | mutex | counter 2 | `T2 wrote 1 + 1 = 2` |
| 14 | mutex | owner null, T2 done | `T2 released the lock` |
| 15 | mutex | `done: true` | `Done: without a lock one of two updates was lost; with the mutex counter = 2, at the cost of T2 waiting` |

Throw if a thread acquires a held lock, or writes while the lock is held by another thread in the mutex run.

**View.**
- Show a run badge, a large `counter` value, and two thread cards. Each card shows its id, its state in text and `local = …`.
- Show a lock box with `owner: T1 / free` and `waiting: T2 / none`.
- Highlight the focused thread. A blocked thread is marked in text.

**Title:** `"Mutex: two threads increment a counter, without and with a lock"`

- [ ] **Step 1: Write the failing tests.** Each test pins every step in the tables above, including the length check of 12 and 16 steps.
- [ ] **Step 2: Run them and check they fail.** Run `npx vitest run src/lib/visualizers/pt-steps.test.ts src/lib/visualizers/mutex-steps.test.ts`. Expected: FAIL, because the modules are missing.
- [ ] **Step 3: Implement** the generators, the views and the wiring (`kinds.ts`, plus the components and switch cases in `visualizer.tsx`).
- [ ] **Step 4: Verify.**
  - Run `npm test`, `npm run typecheck` and `npm run lint`; all must pass.
  - Render both visualizers on a throwaway page and check with Playwright. Don't commit the page.
  - Measure the height at every step at 320, 375 and 1280px, and confirm it is constant with no sideways scroll.
  - Save the screenshots `pt-375.png`, `pt-1280.png`, `mutex-375.png` and `mutex-1280.png` to the scratchpad.
- [ ] **Step 5: Commit.** Use the message `feat(visualizers): page-table and mutex step-through visualizers` with the trailer.

---

### Task 3: Track scaffold + `complexity`

**Files:**
- Create: `content/tracks/cs-fundamentals/track.yaml`
- Create: `content/tracks/cs-fundamentals/lessons/complexity.mdx`
- Create: `content/exercises/complexity-quiz.yaml`
- Create: `content/exercises/diagnose-slow-growth.yaml`
- Modify: `src/lib/content/index.test.ts` (track list → `['algorithms', 'system-design', 'cs-fundamentals']`, plus the inventory assertions)
- Modify: `src/lib/logic/lessons.test.ts:48`, only if it changes
- Modify: `e2e/layout.spec.ts`, `e2e/tracks.spec.ts`, `e2e/roadmap.spec.ts`

**`track.yaml`:**
```yaml
slug: cs-fundamentals
title: CS Fundamentals
summary: "What the machine, the OS, the network and the database do underneath your code."
order: 3
modules:
  - slug: foundations
    title: Foundations
    lessons: [complexity]
  - slug: operating-systems
    title: Operating systems
    lessons: []
  - slug: networking
    title: Networking
    lessons: []
    comingSoon: ["The TCP/IP stack", "TCP vs UDP", "TLS", "HTTP/1.1, HTTP/2 and HTTP/3"]
  - slug: databases
    title: Databases
    lessons: []
    comingSoon: ["Indexes & B-trees", "Transactions & isolation levels", "Query planning"]
  - slug: machine-math
    title: Machine & math
    lessons: []
    comingSoon: ["The memory hierarchy", "Number representation", "Discrete math essentials"]
```
If an empty `operating-systems` module fails validation or rendering, give it `comingSoon: ["Processes & threads", "CPU scheduling", "Virtual memory", "Concurrency primitives"]` and have each later task remove its own title. Check how `case-studies` handled this in git history (`git log -p --all -S "lessons: []" -- content/tracks/system-design/track.yaml`).

**Lesson `complexity`:** "Complexity & Big-O", `level: beginner`, `prerequisites: []`.
- **Cover:**
  - What n means, and that size isn't value. Give a hedged note on pseudo-polynomial running time.
  - Big-O as an upper bound, informally, plus Θ and Ω in one line each.
  - The common classes, with a growth table at n = 1,000 and n = 1,000,000. Show the arithmetic, e.g. n log₂ n ≈ 2 × 10⁷ at 10⁶.
  - Best, worst and average cases.
  - Amortized cost, using dynamic-array doubling: the total copies stay below 2n, with the arithmetic shown.
  - Space complexity.
  - Why constants and memory access still matter (link the "The memory hierarchy" coming-soon title by name only).
  - Log bases don't matter in Big-O.
  - A hedged, illustrative "operations per second" heuristic for back-of-envelope checks.
  - Link the Algorithms track: `[Arrays & hashing](/algorithms/arrays-hashing/)` and `[Binary search](/algorithms/binary-search/)`.
- **Visual:** a text growth chart or table.
- **Example:** estimate whether de-duplicating 200,000 records by comparing every pair fits a 1 s budget. Count the pairs, 200,000 × 199,999 ÷ 2 ≈ 2 × 10¹⁰. Then compare a sort-then-scan approach, with Python for both.
- **Diagnose prompt `diagnose-slow-growth`:**
  - The scenario: an export endpoint takes 0.2 s for an account with 2,000 orders but times out at 30 s for one with 60,000. The code checks each order's customer id with `if cid in seen_list` against a list it appends to.
  - Ask the learner to estimate the work at both sizes, name the complexity, explain why 30× the data gives about 900× the time, propose a fix and its memory cost, and say how to confirm it with a profiler.
- **The lesson must NOT discuss:** membership tests against a list inside a loop, list vs set lookups, or profiling.
- **Extra e2e (Review Focus 3 and 5):**
  - In `tracks.spec.ts`, check that the tracks page lists all three tracks.
  - Check that `/cs-fundamentals/` shows the module headings and at least one "Coming soon" title.
  - Check that "Continue" on `/cs-fundamentals/` opens `/cs-fundamentals/complexity/`.
- **Extra e2e (Review Focus 4):** in `roadmap.spec.ts`, rename the tracks test to cover all three tracks and check that "CS Fundamentals" is visible.
- **Extra e2e (Review Focus 2):** in `/exercises/`, the row for the diagnose prompt shows "Diagnose", and its page shows "Your answer".
- **Commit:** `feat(cs-fundamentals): track scaffold and complexity lesson`.

---

### Task 4: `data-in-memory`

**Lesson:** "Data in memory", `level: beginner`, `prerequisites: [complexity]`. Append it to `foundations`.
- **Cover:**
  - Bits, bytes and addresses.
  - Arrays are contiguous, so index arithmetic is `base + i × size`. Linked nodes are scattered and joined by pointers.
  - Stack vs heap: lifetimes and what goes where. Hedge, because languages differ.
  - Value vs reference semantics: copying vs aliasing.
  - Alignment and padding. Use a C struct example and show the `sizeof` arithmetic, hedged on the ABI (typical x86-64).
  - Endianness, in one paragraph.
  - Strings as bytes: UTF-8 length in bytes vs characters, with an example.
  - Hedged object overhead in managed languages: "a small Python int is far larger than 4 bytes; exact sizes vary by version".
  - Locality as a teaser, linking the "The memory hierarchy" title by name.
- **Example:** lay out `struct { char a; int b; char c; }` vs a reordered version on typical x86-64. That's 12 vs 8 bytes; show the padding. Then show how a 10-million-element array of each differs in memory: 120 MB vs 80 MB.
- **Diagnose prompt `diagnose-shared-mutation`:**
  - The scenario: after a refactor, about 3% of API responses contain another user's items. A "template" response object built once at startup is copied with a shallow copy per request, then each handler appends to its nested `items` list.
  - Ask the learner to explain the bug in terms of references, why it's intermittent and concurrency-dependent, how to confirm it, and the fixes: a deep copy, an immutable template, or building fresh per request. Ask for the cost of each.
- **The lesson must NOT discuss:** shallow vs deep copies of nested structures, shared template objects, or mutable default arguments. The lesson may say that "assignment copies a reference, not the object" and nothing more about copying strategies.
- **Commit:** `feat(cs-fundamentals): data in memory lesson`.

---

### Task 5: `processes-threads`

**Lesson:** "Processes & threads", `level: beginner`, `prerequisites: [data-in-memory]`. Append it to `operating-systems`, and remove its `comingSoon` title if one was used.
- **Cover:**
  - A process is an address space plus resources. A thread is an execution context (registers, stack) that shares its process's address space.
  - User mode vs kernel mode, and system calls.
  - What a context switch saves. A process switch also changes the address space. Hedge the cost as "microseconds, varies".
  - fork/exec, briefly (Unix).
  - Isolation vs sharing: crash blast radius and memory.
  - Threads vs an event loop for I/O-bound work.
  - CPython's GIL, hedged: it limits CPU-bound parallelism in the default build, and free-threaded builds exist in recent versions.
  - Thread-pool sizing rules of thumb: CPU-bound ≈ number of cores; I/O-bound needs more. Give only that qualitative rule.
  - Link `[Load balancing](/system-design/load-balancing/)` where per-server concurrency comes up.
- **Example:** compare three ways to serve 1,000 concurrent slow clients: process per connection, a thread pool, and an event loop. Use hedged, illustrative per-unit memory with the arithmetic shown, and say that the default thread stack is a virtual reservation, not resident memory.
- **Diagnose prompt `diagnose-thread-pool-starvation`:**
  - The scenario: a service has a fixed pool of 16 worker threads. Each request makes a blocking 200 ms call to a downstream API. At 60 req/s p99 is 220 ms; at 100 req/s p99 climbs past 5 s while CPU stays at 15%.
  - Ask the learner to apply Little's law: 100 × 0.2 = 20 busy threads needed against 16 available. Then ask them to explain queueing growth, confirm it with pool metrics or a thread dump, and give fixes (a bigger pool within limits, async I/O, timeouts, backpressure) with trade-offs.
- **The lesson must NOT discuss:** Little's law, sizing a pool from arrival rate × latency, or queueing delay growth near saturation.
- **Commit:** `feat(cs-fundamentals): processes and threads lesson`.

---

### Task 6: `cpu-scheduling`

**Lesson:** "CPU scheduling", `level: intermediate`, `prerequisites: [processes-threads]`. Append it to `operating-systems`.
- **Cover:**
  - Thread states: running, ready and blocked. The run queue.
  - Preemption and time slices.
  - FIFO, round-robin, priority scheduling, and the MLFQ idea.
  - Linux's CFS and its virtual runtime, hedged: since Linux 6.6 the default is EEVDF, and both aim at fair sharing.
  - CPU-bound vs I/O-bound threads, and why interactive work gets favoured.
  - Linux load average, hedged: it counts runnable threads and threads in uninterruptible sleep.
  - Context-switch overhead.
  - Priority inversion, in one paragraph, linking the "Concurrency primitives" lesson by title.
  - Why "CPU 40%" can still mean queueing at peaks.
- **Example:** three jobs, A = 30 ms, B = 10 ms and C = 5 ms, all arriving at t = 0.
  - Compute the completion times under FIFO in that order: 30, 40 and 45 ms, a mean of 38.3 ms.
  - Compute them under shortest-job-first: 5, 15 and 45 ms, a mean of 21.7 ms.
  - Compute them under round-robin with a 5 ms slice, showing the timeline.
  - Show all the arithmetic.
- **Diagnose prompt `diagnose-cpu-throttling`:**
  - The scenario: a container has a CPU limit of 1 CPU, enforced as a 100 ms quota per 100 ms period. A request handler fans out to 4 threads that each burn 25 ms of CPU. Average CPU is 40%, but p99 jumps to about 100 ms+ in bursts.
  - Ask the learner to explain quota throttling: 4 threads × 25 ms = 100 ms of quota used in 25 ms of wall time, then a wait until the next period. Ask how to confirm it (the throttled-periods counter in cgroup stats), and for fixes: raise the limit, reduce parallelism, or remove the limit and use requests (hedged by platform).
- **The lesson must NOT discuss:** container CPU limits, cgroup quotas or periods, or throttling.
- **Commit:** `feat(cs-fundamentals): CPU scheduling lesson`.

---

### Task 7: `virtual-memory`

**Lesson:** "Virtual memory", `level: intermediate`, `prerequisites: [processes-threads]`. Append it to `operating-systems`.

**Visual:**
- `<Visualizer kind="page-table" />`, plus a text diagram of address translation (virtual address → page | offset → page table → frame | offset).
- The lesson must describe the visualizer's scenario exactly:
  - 4,096-byte pages.
  - A TLB of size 2 holding page 0 → 5.
  - Accesses to 291 (a hit, giving 20,771), 4,100 (a miss through frame 2, giving 8,196) and 8,200 (a miss and a page fault, loaded into frame 3, giving 12,296, which evicts page 0 from the TLB).
- Add `{ path: '/cs-fundamentals/virtual-memory/', final: 'Done: 1 TLB hit, 2 misses and 1 page fault — the fault needed a disk read, far slower than any memory access' }` to `e2e/visualizers.spec.ts`.

**Cover:**
- Every process sees its own address space.
- Pages and frames.
- Page tables, and why they are multi-level (x86-64 typically uses 4 levels for 48-bit addresses; hedge it).
- The TLB.
- Minor vs major page faults, and demand paging.
- Copy-on-write after fork, as a general mechanism.
- Memory-mapped files.
- Virtual size vs resident size (VIRT vs RES).
- Swapping, hedged.
- Overcommit and the Linux OOM killer, hedged.

**Example:** translate two addresses by hand with 4 KiB pages, showing the arithmetic. Then explain a process showing 2 GB virtual size but 200 MB resident.

**Diagnose prompt `diagnose-prefork-memory`:**
- The scenario: a pre-fork web server loads a 400 MB in-memory catalog in the parent, then forks 8 workers. Right after startup the machine's used memory is about 600 MB in total, even though each worker's RSS already reads about 420 MB, because shared pages count in every process's RSS. After an hour of traffic, used memory nears the box's 4 GB limit, although the catalog is never written.
- Ask the learner to:
  - explain copy-on-write;
  - explain why reading Python objects still writes to their pages (reference counts, GC bookkeeping; hedge per runtime);
  - show how to confirm it (shared vs private memory via `smaps`/PSS);
  - give fixes (load after fork, freeze objects before forking where the runtime supports it, keep the data in a non-object format such as mmap'd arrays, or use fewer workers).
- Ask for arithmetic on the memory saved.

**The lesson must NOT discuss:** reference counting or GC writes breaking copy-on-write sharing, PSS/`smaps`, or pre-fork servers.

**Commit:** `feat(cs-fundamentals): virtual memory lesson`.

---

### Task 8: `concurrency-primitives`

**Lesson:** "Concurrency primitives", `level: intermediate`, `prerequisites: [processes-threads]`. Append it to `operating-systems`.

**Visual:**
- `<Visualizer kind="mutex" />`, plus a text diagram of the lost-update interleaving.
- The lesson must describe the visualizer's scenario exactly. Without a lock, T1 and T2 both read 0 and both write 1. With the mutex, T2 blocks while T1 holds the lock, and the counter ends at 2.
- Add `{ path: '/cs-fundamentals/concurrency-primitives/', final: 'Done: without a lock one of two updates was lost; with the mutex counter = 2, at the cost of T2 waiting' }` to `e2e/visualizers.spec.ts`.

**Cover:**
- Race conditions and critical sections, and why `count += 1` is not atomic.
- Mutexes.
- Spinning vs blocking, hedged.
- Condition variables: always wait in a loop, because of spurious wakeups.
- Counting semaphores, for bounding concurrency.
- Read-write locks.
- Atomics and compare-and-swap.
- Deadlock: the four Coffman conditions, and lock ordering.
- Livelock and starvation.
- Memory visibility, hedged: locks also publish writes to other threads.
- Link `[Distributed transactions](/system-design/distributed-transactions/)` for locks held across machines, and `[Consensus with Raft](/system-design/consensus-raft/)` for distributed locks, by name.

**Example:** a bounded buffer with `threading.Condition` in valid Python: a producer, a consumer, and `while` loops around `wait()`. Then a two-mutex deadlock in code, fixed by a global lock order.

**Diagnose prompt `diagnose-service-hang`:**
- The scenario: under load, 2 of 50 instances of a service stop responding while their CPU sits at 0%. A thread dump shows thread A holding the cache-refresh lock and waiting for a database connection from a pool of 10. All 10 connections are held by request threads, and each of them is waiting for the cache-refresh lock.
- Ask the learner to:
  - identify the deadlock and map it to the four conditions;
  - explain why only some instances hang (timing);
  - show how to confirm it;
  - give fixes: never hold a lock across I/O or pool acquisition, add timeouts, use a consistent acquisition order, and use refresh-ahead without the lock.

**The lesson must NOT discuss:** connection pools or other resource pools as lock-like resources, holding a lock across I/O, or thread dumps.

**Commit:** `feat(cs-fundamentals): concurrency primitives lesson`.
