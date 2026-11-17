# Problem Solutions, PR 1 (Platform + Arrays & Hashing pilot) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the solutions platform (content format, V18, CI code checker, step-by-step reveal, review-card hook) with step-by-step guides for the 10 Arrays & Hashing problems.

**Architecture:** One MDX file per problem in `content/solutions/`, compiled by a new Velite collection whose MDX gets a rehype plugin that wraps each `##` section in `<section data-step>`. The exercise page renders the body on the server and hands it to a client stepper that shows sections in order via `data-open` CSS. A standard-library Python script reads `.velite/solutions.json` and runs every approach's code against the file's cases.

**Tech Stack:** Next.js static export, Velite, MDX + rehype (hast), React, Vitest, Playwright, Python 3.12 (stdlib only).

**Spec:** `docs/superpowers/specs/2026-11-14-problem-solutions-design.md`. PR 1 only; PRs 2–8 are content-only and reuse Task 3's process.

## Global Constraints

- Code is Python, LeetCode-style: `class Solution` with the LeetCode method name (or `class <entry>` for `harness: class`).
- Section headings, exactly and in order: `Intuition`, `Brute force`, optional `Better`, `Optimal`. Step ids: `intuition`, `brute-force`, `better`, `optimal`.
- Each approach section: one ordered list of 2–5 items, exactly one `python` block, at least one table, a `**Complexity:**` line; Brute force and Better also `**What's wasted:**`. Intuition has no code block.
- `hook` ≤ 12 words; `cases` ≥ 4.
- Harnesses: `function` | `class` | `custom`. Types: `plain` | `listnode` | `treenode`; `returns` also `inplace:<i>`. Compare: `exact` (default) | `unordered` | `unordered-deep` | `float` (1e-5).
- Each case: 2-second timeout per approach. `large` (optional): only Better/Optimal must pass, within 2 seconds.
- Rating defaults: nothing opened → "Solved it alone" (`alone`); Hint or Intuition → "Needed a hint" (`hint`); Brute force or later → "Looked at the solution" (`solution`). Applied each time the dialog opens; the learner can change it.
- Our own words only; never copy a statement, editorial or someone else's code.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `.superpowers/` must never be committed (`git ls-files .superpowers` empty).
- Wide tables and code scroll inside themselves; the 320px and 375px layout checks keep passing.

## Rulings on the spec

- **One "Show next" button instead of one button per row.** The spec's mock lists every step with its own button, each appearing only after the previous step opens. A single button labelled with the next step ("Show brute force"), placed after the last open section, gives the same order and gating with one MDX render. Cost if wrong: a layout change in one component.
- **Server-rendered body.** `ExerciseWorkspace` (a server component) renders `<MDXContent>` and passes it as a React node to the client `ProblemWorkspace`, so the compiled MDX string is never evaluated in the browser.

## Review Focus

1. **Arguments shared across approaches.** A brute force that mutates its input must not corrupt the case for the optimal run: the checker deep-copies `args` for every approach and case (test in Task 1).
2. **A hanging or exponential approach.** An infinite loop must fail that case with a timeout message, not hang CI (test in Task 1).
3. **Problems without a solution file.** The page shows only Hint and the review card shows no "Remember it" line (tests in Task 4).
4. **Pilot pages on a 320px phone.** Long Python lines and trace tables scroll inside themselves (pilot pages join the layout list in Task 4).
5. **Learner overrides the default rating.** Choosing "Solved it alone" after opening Optimal saves `alone`; reopening the dialog re-applies the default (test in Task 4).

---

### Task 1: Solution checker (`scripts/check-solutions.py`)

**Files:**
- Create: `scripts/check-solutions.py`
- Create: `scripts/test_check_solutions.py`
- Create: `scripts/check-solutions-fixtures/` (JSON fixtures)

**Interfaces:**
- Consumes: nothing.
- Produces: `python3 scripts/check-solutions.py <solutions.json>`. Input is a JSON array of entries `{ problem, path, entry, harness, args?, returns?, compare?, cases, large?, check?, raw }` (Velite's output in Task 2; `raw` is the MDX body without frontmatter). Exits 0 when every approach passes every case; otherwise prints one line per failure, `FAIL <path> [<Section>] case <n>: expected <e>, got <a>` (or `timed out after 2s`, or the exception), and exits 1. Prints `OK <N> solutions, <M> approaches` on success.

- [ ] **Step 1: Write failing tests** in `scripts/test_check_solutions.py` (`unittest`), each building an in-memory entry and calling `check_entry(entry) -> list[str]` (failures):
  - `test_function_pass`: two-sum-like entry, Brute force and Optimal both correct → `[]`.
  - `test_function_wrong_answer`: Optimal returns `[1, 0]` with `compare: exact` → one failure naming `[Optimal] case 1`.
  - `test_unordered` and `test_unordered_deep`: `[[1,2],[0]]` vs `[[0],[2,1]]` passes `unordered-deep`, fails `unordered`.
  - `test_float`: `0.3333334` vs `1/3` passes.
  - `test_listnode_and_treenode`: reverse a linked list (`args: [listnode]`, `returns: listnode`); invert a tree with `null` holes (`[4,2,7,1,3,null,9]`).
  - `test_inplace`: `returns: inplace:0`, rotate a matrix in place.
  - `test_class_harness`: a `MinStack` op sequence with `null` expects.
  - `test_custom_harness`: a `check` defining `run(Solution)` that asserts.
  - `test_args_deep_copied`: Brute force sorts `nums` in place; Optimal relies on original order → passes.
  - `test_timeout`: an approach with `while True: pass` → failure containing `timed out after 2s`, test finishes in under 10 s.
  - `test_large_skips_brute_force`: a `large` case that brute force would time out on is run for Optimal only.
  - `test_main_exit_codes`: `main([fixture_ok])` returns 0, `main([fixture_bad])` returns 1 (fixtures in `scripts/check-solutions-fixtures/ok.json` and `bad.json`).

- [ ] **Step 2: Run to verify they fail**

Run: `python3 -m unittest scripts/test_check_solutions.py -v`
Expected: errors (module has no `check_entry`).

- [ ] **Step 3: Implement `check_entry(entry: dict) -> list[str]` and `main(argv: list[str]) -> int`**
  - Split `raw` into `##` sections; the approach sections are `Brute force`, `Better`, `Optimal`; take the single ```` ```python ```` block in each.
  - Exec each block in a fresh namespace pre-populated with `from typing import *`, `collections`, `heapq`, `math`, `functools`, `itertools`, `bisect`, and LeetCode's `ListNode(val=0, next=None)` / `TreeNode(val=0, left=None, right=None)`.
  - Run each case in a child process (`multiprocessing`, `fork` start method) joined with a 2 s timeout; `copy.deepcopy` the args per run.
  - Converters: `listnode` list↔chain; `treenode` LeetCode level order with `None` holes, trailing `None`s trimmed on output.
  - `large.args` is a Python expression evaluated in the harness namespace.
  - The import-time module name is `check_solutions`; load the hyphenated file in tests via `importlib.util.spec_from_file_location`.

- [ ] **Step 4: Run to verify they pass**

Run: `python3 -m unittest scripts/test_check_solutions.py -v`
Expected: all OK.

- [ ] **Step 5: Commit** (`feat(solutions): add the solution code checker`).

---

### Task 2: `solutions` collection, section plugin, V18, wiring

**Files:**
- Create: `src/lib/content/solution-sections.ts`, `src/lib/content/rehype-solution-sections.ts` (+ `.test.ts`)
- Create: `src/lib/content/validate-solutions.ts` (+ `.test.ts`)
- Modify: `velite.config.ts` (new collection, prepare)
- Modify: `package.json` (script `check:solutions`), `.github/workflows/ci.yml` (setup-python + step)
- Create: `templates/solution.mdx`; Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consumes: Task 1's CLI.
- Produces:
  - `SECTION_STEPS: Record<string, SolutionSectionStep>` mapping `'Intuition' → 'intuition'`, `'Brute force' → 'brute-force'`, `'Better' → 'better'`, `'Optimal' → 'optimal'`, and `export type SolutionSectionStep = 'intuition' | 'brute-force' | 'better' | 'optimal'`.
  - `rehypeSolutionSections()`: a rehype plugin that wraps each `h2` and its following siblings (until the next `h2`) in `<section data-step="<id>">`, using `SECTION_STEPS` on the heading's text.
  - `validateSolutions(solutions: SolutionInput[], content: ContentInput): string[]`, messages `[V18] content/solutions/<file>.mdx: <problem>`, with `export interface SolutionInput { problem: string; hook: string; entry: string; harness: 'function' | 'class' | 'custom'; check?: string; cases: unknown[]; path: string; raw: string }`.
  - Velite collection `solutions` (pattern `solutions/*.mdx`, `.strict()`), fields: `problem, hook, entry, harness, args?, returns?, compare?, cases, large?, check?, path (s.path()), raw (s.raw()), toc (s.toc()), body`. Imported as `solutions` from `#site/content`.

- [ ] **Step 1: Write failing tests**
  - `rehype-solution-sections.test.ts`: a hast root `[h2 "Intuition", p, h2 "Brute force", p, pre]` becomes two `section` elements with `data-step` `intuition` and `brute-force`, children intact; content before the first `h2` is left outside.
  - `validate-solutions.test.ts`: a valid fixture (Intuition, Brute force, Optimal; problem `two-sum` present as `external-problem` in the content input) returns `[]`; one test per rule returns exactly one `[V18]` message mentioning the rule: unknown problem; problem that is a quiz; duplicate problem; hook of 13 words; 3 cases; extra heading `## Notes`; `Better` after `Optimal`; code block in Intuition; approach with 6 steps; approach with 2 python blocks; no table; no `**Complexity:**`; Brute force without `**What's wasted:**`; code without `class Solution`; `harness: custom` without `check`; `harness: function` with `check`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/content/rehype-solution-sections.test.ts src/lib/content/validate-solutions.test.ts`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement** the three modules. In `velite.config.ts`: add the collection with `body: s.mdx(...)` carrying `rehypeSolutionSections` in addition to the global `rehypeSlug` and Shiki plugins (verify per-field options merge with or replace the global `mdx.rehypePlugins`; if they replace, list all three). In `prepare`, call `validateSolutions` alongside the existing validators; keep `raw`, `cases` and friends in the emitted `solutions.json` (server-only: `#site/content` is imported only by `src/lib/content/index.ts`).

- [ ] **Step 4: Wire the checker.** `package.json`: `"check:solutions": "velite build && python3 scripts/check-solutions.py .velite/solutions.json"`. CI `check` job: after `npm ci`, add `actions/setup-python@v5` with `python-version: '3.12'`, then `python3 -m unittest scripts/test_check_solutions.py` and `npm run check:solutions`, before e2e.

- [ ] **Step 5: Docs.** `templates/solution.mdx`: a filled skeleton (frontmatter with every field commented, the four sections with placeholder prose that names what goes there). `CONTRIBUTING.md`: a "Writing a solution" section (shape, writing bar copied from the spec, harness/compare table, `npm run check:solutions`); change "Never paste a problem statement or a solution" to "Never paste a problem statement, an editorial or anyone else's solution code; solutions here are written by us."

- [ ] **Step 6: Verify**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build && npm run check:solutions`
Expected: tests pass; build succeeds with zero solution files; checker prints `OK 0 solutions, 0 approaches`.

- [ ] **Step 7: Commit** (`feat(solutions): add the solutions collection, section plugin and V18`).

---

### Task 3: Pilot content, the 10 Arrays & Hashing solutions

**Files:**
- Create: `content/solutions/{contains-duplicate,valid-anagram,two-sum,majority-element,group-anagrams,top-k-frequent-elements,product-of-array-except-self,valid-sudoku,subarray-sum-equals-k,longest-consecutive-sequence}.mdx`

**Interfaces:**
- Consumes: Task 2's format, V18 and `npm run check:solutions`.
- Produces: 10 solution files that later tasks' e2e tests use (`two-sum` must have Intuition, Brute force and Optimal, no Better; at least one pilot file must have a Better section).

- [ ] **Step 1: Write each file** following the spec's Guide shape and Writing bar, with `templates/solution.mdx` as the start. Per file: ≥ 4 cases including edge cases (empty or single element where the problem allows, duplicates, negatives); `compare: unordered` or `unordered-deep` where LeetCode accepts any order (group-anagrams, top-k-frequent-elements); a `large` case wherever brute force and optimal differ in complexity class. Use a Better section only where it is a genuine step (for example sorting in contains-duplicate or longest-consecutive-sequence).

- [ ] **Step 2: Check every trace by running the code** on the trace's input and comparing each row; fix the trace, not the code, when they differ.

- [ ] **Step 3: Verify**

Run: `npm run build && npm run check:solutions`
Expected: build passes V18; `OK 10 solutions, <N> approaches` where N is 20 plus the number of Better sections.

- [ ] **Step 4: Commit** (`feat(content): add step-by-step solutions for the Arrays & Hashing problems`).

---

### Task 4: Stepper, rating default, review hook, docs

**Files:**
- Create: `src/lib/logic/solution-steps.ts` (+ `.test.ts`)
- Create: `src/components/exercises/solution-steps.tsx`
- Modify: `src/lib/types.ts`, `src/lib/content/index.ts`, `src/components/exercises/exercise-workspace.tsx`, `src/components/exercises/problem-workspace.tsx`, `src/components/exercises/mark-solved-dialog.tsx`, `src/components/today/review-item.tsx`, `src/app/globals.css`
- Modify: `src/lib/content/index.test.ts`; Create: `e2e/solutions.spec.ts`; Modify: `e2e/layout.spec.ts` (add `/exercises/two-sum/` and one pilot page with a Better section)
- Modify: `docs/roadmap.md`

**Interfaces:**
- Consumes: `solutions` from `#site/content`, `SECTION_STEPS`/`SolutionSectionStep` (Task 2), pilot files (Task 3).
- Produces:
  - `types.ts`: `export type SolutionStep = 'hint' | SolutionSectionStep`; `ProblemExercise` gains `hook?: string`; `export interface ProblemDoc extends ProblemExercise { solution?: { hook: string; steps: SolutionSectionStep[]; body: string } }`; `ExerciseDoc` uses `ProblemDoc` instead of `ProblemExercise`.
  - `solution-steps.ts`: `ratingForStep(furthest: SolutionStep | null): SolveRating` and `nextStep(steps: SolutionStep[], opened: number): SolutionStep | null` (steps always start with `'hint'`).
  - `MarkSolvedDialog` gains `defaultRating?: SolveRating` (default `'alone'`), applied on each open.

- [ ] **Step 1: Write failing unit tests**
  - `solution-steps.test.ts`: `ratingForStep(null) === 'alone'`; `'hint'` and `'intuition'` → `'hint'`; `'brute-force'`, `'better'`, `'optimal'` → `'solution'`. `nextStep(['hint','intuition','brute-force','optimal'], 0) === 'hint'`, `(…, 4) === null`.
  - `index.test.ts`: `getCatalog()` problem `two-sum` has a non-empty `hook`, and a problem without a file (`3sum`) has none; `getExerciseDoc('two-sum').solution.steps` equals `['intuition','brute-force','optimal']`; the catalog JSON contains no solution body text (assert `JSON.stringify(getCatalog())` does not include a distinctive sentence from the two-sum Intuition).

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/logic/solution-steps.test.ts src/lib/content/index.test.ts`

- [ ] **Step 3: Implement**
  - `content/index.ts`: `toExerciseMeta` adds `hook` for problems that have a solution; `getExerciseDoc` attaches `solution` with `steps` from the file's `toc` headings via `SECTION_STEPS`.
  - `ExerciseWorkspace` passes `solutionBody={doc.solution ? <MDXContent code={doc.solution.body} /> : undefined}` to `ProblemWorkspace`.
  - `SolutionSteps` (client) props `{ hint: string; steps: SolutionSectionStep[]; body?: ReactNode; hook?: string; pattern?: string; onFurthestChange: (s: SolutionStep | null) => void }`. It renders the Hint box, then the body inside `<div data-solution data-open="<space-separated opened ids>">`, then "Remember it: <hook>" and "Pattern: <pattern>" once `optimal` is open, then one button `Show <label>` for `nextStep` (labels: hint, intuition, brute force, better approach, optimal). Without a body only the Hint step exists.
  - `globals.css`: `[data-solution] section[data-step] { display: none }` and one `display: block` rule per id under `[data-solution][data-open~="<id>"]`.
  - `ProblemWorkspace` keeps the furthest step and passes `defaultRating={ratingForStep(furthest)}` to the dialog.
  - `ReviewItem`: after Reveal, `Remember it: <hook>` under the insight when `exercise.hook` exists.
  - `docs/roadmap.md`: a Phase Q row before "Try it with people": "**Solutions for all 150 Algorithms problems:** step-by-step guides (intuition, brute force, optimal) with code checked in CI | In progress (PR 1 of 8)", renumbering the rows after it.

- [ ] **Step 4: Write e2e tests** in `e2e/solutions.spec.ts`:
  - `/exercises/two-sum/`: only "Show hint" is visible; clicking through shows Hint, Intuition, Brute force, Optimal in order; "Show optimal" is absent until Brute force is open; the hook text and "Pattern: Arrays & Hashing" appear only after Optimal.
  - Opening up to Brute force, then "Mark solved": the "Looked at the solution" radio is checked. Choosing "Solved it alone", closing, reopening: "Looked at the solution" is checked again.
  - `/exercises/3sum/` (no file): the hint can be shown and no "Show intuition" button ever appears.
  - Review card: use the clock pattern from `e2e/learning-loop.spec.ts` (mark two-sum and `3sum` (no solution file) solved on a day-1 page with `page.clock.install`, then open Today on a page weeks later). After Reveal, the two-sum card shows "Remember it:" and its hook; the 3sum card shows no "Remember it:".

- [ ] **Step 5: Verify**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npx playwright test e2e/solutions.spec.ts e2e/layout.spec.ts`
Expected: all pass.

- [ ] **Step 6: Commit** (`feat(solutions): reveal solutions step by step and show the hook on review cards`).
