# Problem Solutions: Design

**Status:** design approved in chat on 2026-11-14. This spec adds a solution and step-by-step guide to every Algorithms LeetCode problem (150 `external-problem` exercises).

## Goal

A learner who is stuck on a problem can take exactly as much help as they need, in order: a hint, then the intuition, then the brute force, then the optimal solution. Each guide is easy to follow and easy to recall weeks later.

- **Easy to understand.** Every guide follows the same shape. It starts from how a person would solve the problem by hand, then turns that into code. Steps, code and trace use the same names.
- **Easy to remember.** Every guide ends with a one-line "Remember it" hook, and that hook comes back on the problem's review card.
- **Correct.** Every approach's code runs against test cases in CI.

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Step-by-step reveal:** Hint → Intuition → Brute force → (Better) → Optimal, each step opened only after the one before it. | A learner takes the least help that unblocks them, which is what the solve rating measures. |
| D2 | **Opening Hint or Intuition makes Mark solved default to "Needed a hint". Opening Brute force or later makes it default to "Looked at the solution".** The learner can still change it. | The rating feeds mastery (weights 1.0, 0.7, 0.4) and the first review interval. A default that matches what they opened keeps both honest without blocking anyone. |
| D3 | **Story + trace + hook shape** (see Guide shape). | Approved in chat. An everyday picture, a small trace and a short hook are what make a solution memorable rather than just readable. |
| D4 | **One MDX file per problem in `content/solutions/`.** | Code, tables and highlighting reuse the lesson MDX pipeline. Long Python inside YAML is error-prone. |
| D5 | **Python, written LeetCode-style (`class Solution` with the LeetCode method name).** | Matches the lessons, and a learner can paste the code into LeetCode and submit it. |
| D6 | **Every approach's code runs against the file's test cases in CI** (`scripts/check-solutions.py`, standard library only). | Reviews of lessons caught wrong arithmetic and overbroad claims every round. 300+ code blocks need a machine check. |
| D7 | **The hook appears on the review card** under the learner's own saved insight. | Recall is trained where reviews happen, not only on the problem page. |
| D8 | **Our own words only.** Never copy a problem statement, an editorial or someone else's code. The page keeps linking to LeetCode for the statement. | Content is CC BY-SA 4.0. `CONTRIBUTING.md` already forbids pasted statements and solutions; this spec narrows that to "pasted", not "written by us". |
| D9 | **Rollout in 8 PRs:** platform plus the 10 Arrays & Hashing problems as a pilot, then 7 content PRs by lesson. | The user judges the style on real pages before 140 more are written. |
| D10 | **A problem without a solution file shows only its hint, as today.** | The site stays shippable between content PRs. |

## Guide shape

Each file has fixed sections, in this order:

1. **`## Intuition`**: how a person would solve it by hand, as an everyday picture. No code. 2–5 short sentences.
2. **`## Brute force`**: the most direct correct approach.
3. **`## Better`** (optional): a real middle step, for example sorting first before the hash-map optimal. Only when it teaches something on the way to the optimal.
4. **`## Optimal`**: the approach to remember.

Every approach section (Brute force, Better, Optimal) contains, in order:

- **The idea in one sentence**, as the first paragraph.
- **Steps:** one numbered list of 2–5 items, each fitting on one line.
- **Code:** exactly one ```` ```python ```` block.
- **Trace:** one table on the smallest example that still shows the key move. Its column names match variable names in the code.
- **`**Complexity:**`** a line giving time and space, with a few words on why.
- Brute force and Better also have **`**What's wasted:**`**, one or two sentences naming the repeated work the next approach removes.

The "Remember it" box is not in the body. It is rendered from the frontmatter `hook` together with the pattern (the problem's home lesson), and opens with Optimal.

### Writing bar

Review checks each guide against this list. It isn't machine-checked.

- The intuition stands on its own, without the code, and uses a concrete picture rather than a definition.
- Variable names are the same in steps, code and trace.
- Each step is one line, in plain words, not code.
- The trace uses the smallest input that shows the key move, and every value in it matches what the code actually does (the reviewer runs it).
- "What's wasted" names the specific repeated work, so the next approach reads as the obvious fix.
- The hook is at most 12 words, is a concrete image or rule of thumb, and is true. It must not be a definition ("use a hash map").
- Complexity claims are exact for the code shown, including sorting and recursion stack space.
- No claim is broader than what the code proves ("always", "never" and "any" need care).

## Content model

`content/solutions/<problem-slug>.mdx`. A new Velite collection, `solutions`, `.strict()`.

```mdx
---
problem: two-sum                 # must be an external-problem exercise slug
hook: "Don't search for the partner. Let the partner find you."
entry: twoSum                    # the Solution method (or class name for harness: class)
harness: function                # function | class | custom (see Harness)
args: [plain, plain]             # optional per-argument types, default plain
returns: plain                   # plain | listnode | treenode | inplace:<i>
compare: unordered               # exact (default) | unordered | unordered-deep | float
cases:                           # at least 4; include edge cases
  - args: [[2, 7, 11, 15], 9]
    expect: [0, 1]
  - args: [[3, 3], 6]
    expect: [0, 1]
large:                           # optional, see Speed check
  args: "[list(range(100000)), 199997]"
  expect: [99998, 99999]
---

## Intuition
...
```

### Harness

The checker extracts the Python block of each approach section, executes it in a fresh namespace with LeetCode's usual imports available (`typing`, `collections`, `heapq`, `math`, `functools`, `itertools`, `bisect`) and the LeetCode `ListNode` and `TreeNode` classes, then runs every case.

- **`function`**: calls `Solution().<entry>(*args)`. Argument and return types convert between YAML values and LeetCode structures:
  - `plain`: as is.
  - `listnode`: a YAML list becomes a linked list, and back.
  - `treenode`: a YAML level-order list with `null` holes becomes a binary tree, and back.
  - `returns: inplace:<i>`: the method returns nothing and modifies argument `i`; that argument is compared after the call.
- **`class`**: the LeetCode operation format, for design problems (LRU Cache, Min Stack and similar):
  ```yaml
  cases:
    - ops: [LRUCache, put, put, get]
      args: [[2], [1, 1], [2, 2], [1]]
      expect: [null, null, null, 1]
  ```
- **`custom`**: for the few problems the above can't express (a list with a cycle, random pointers, graph cloning, a codec round trip, tree nodes passed by value). The frontmatter adds `check: |` holding Python that defines `run(Solution)` and asserts. Each case is passed to it as `case`.

**Comparison:** `exact` (default); `unordered` sorts the top-level list on both sides; `unordered-deep` sorts each inner list and then the outer list (for 3Sum, Group Anagrams, Subsets); `float` compares within 1e-5.

**Speed check (optional `large`).** A generated input, given as a Python expression, that only the Optimal and Better approaches must pass within 2 seconds. It catches an "optimal" that is secretly quadratic. Recommended wherever the brute force and optimal differ in complexity class on array input. Brute force also runs on it once, and the checker prints a WARN (not a failure) if it passes, since then `large` doesn't separate the approaches.

**Limits:** each case runs with a 2-second timeout per approach. Brute force must pass the small cases only. Every approach must pass every small case.

### Running it

- **Input:** Velite already parses every solution file. The `solutions` collection's output, `.velite/solutions.json`, keeps each file's frontmatter and raw body. It is imported only by server code, so it never reaches the client bundle. The checker reads that JSON and needs only the Python standard library, with no YAML parser.
- `npm run check:solutions` runs `velite build` and then `python3 scripts/check-solutions.py .velite/solutions.json`. Its output lists each failing file, approach and case, with the expected and actual values. It exits non-zero on any failure.
- CI's `check` job gains `actions/setup-python` (Python 3.12) and runs it before the e2e tests.

## Validation (V18, in `validateContent`)

- `problem` names an `external-problem` exercise, and no problem has two solution files.
- `hook` is at most 12 words. `cases` has at least 4 entries (`class` and `custom` too).
- The body's `##` headings are exactly `Intuition`, `Brute force`, optionally `Better`, then `Optimal`, in that order, with no others, and there are no `#` (h1) headings outside code fences: Velite's toc would nest the steps under one and hide the solution.
- Intuition contains no code block.
- Each approach section has one ordered list of 2–5 items, exactly one `python` code block, at least one table, and a `**Complexity:**` line. Brute force and Better also have `**What's wasted:**`.
- Each approach's code contains `class Solution` (or `class <entry>` for `harness: class`).
- `harness: custom` requires `check`; other harnesses must not have it.

V18 checks structure only. Correctness is `check-solutions.py`'s job, and clarity is review's.

## UI

### Problem page (`ProblemWorkspace`)

The current "Show hint" box becomes a stepper, `SolutionSteps`:

```
▸ Hint                      [Show hint]
▸ Intuition                 [Show intuition]        appears after Hint is open
▸ Brute force               [Show brute force]      appears after Intuition
▸ Better                    [Show better approach]  only if the file has it
▸ Optimal                   [Show optimal]          …
  Remember it: "Don't search for the partner. Let the partner find you."
  Pattern: Arrays & Hashing
```

- Each step's button appears only once the step before it is open. Open steps stay open until the page is left; reveal state isn't stored.
- **Rendering:** the solution body is one MDX render. A rehype plugin used only by the `solutions` collection wraps each `##` section in `<section data-step="intuition|brute-force|better|optimal">`. `SolutionSteps` shows or hides sections by `data-step`. The text is in the page HTML; this is a learning aid, not a lock.
- **Rating default (D2):** `ProblemWorkspace` tracks the furthest step opened and passes `defaultRating` to `MarkSolvedDialog`, which applies it each time the dialog opens: none → "Solved it alone", Hint or Intuition → "Needed a hint", Brute force or later → "Looked at the solution".
- **Without a solution file:** only the Hint step, as today (D10).
- Wide trace tables and code scroll inside themselves (the existing `ScrollingTable` and code block styles), so the 320px and 375px layout checks keep passing.

### Data flow

- **Catalog (client bundle):** problem exercises gain an optional `hook`, so the review card can show it. Solution bodies are not in the catalog.
- **Exercise page (server):** `getExerciseDoc` attaches `solution: { hook, steps, body }` to problem exercises that have a file. `steps` lists the sections present, in order.

### Review card (`ReviewItem`)

After Reveal, under the learner's saved insight: "Remember it: <hook>", when the problem has one.

## Docs

- `CONTRIBUTING.md`: a section on writing a solution (shape, writing bar, harness, running `npm run check:solutions`), and the narrowed rule from D8.
- `templates/solution.mdx`: a filled-in skeleton.
- `docs/roadmap.md`: a new Phase Q row, "Solutions for all 150 Algorithms problems", before "Try it with people", with its status.

## Testing

- **Unit (Vitest):** V18 accepts a valid file and rejects each missing or misplaced element; the catalog carries `hook`; the rating default maps each furthest step correctly.
- **Checker self-test:** fixtures under `scripts/check-solutions-fixtures/` with one passing and one failing file per harness and comparison mode; the checker's exit code and message are asserted (a small Python test run in CI alongside the checker).
- **e2e (Playwright):**
  - On a pilot problem, the steps open in order, a later button is absent until the earlier step is open, and the hook shows with Optimal.
  - Opening Brute force then Mark solved preselects "Looked at the solution".
  - A problem without a file shows only Hint.
  - The review card shows the hook after Reveal.
  - Pilot problem pages join the 375px no-horizontal-scroll list.

## Rollout

Each PR follows the usual flow: an opus writer, an independent opus reviewer against the writing bar (running the code and checking every trace value), a fix round, then CI.

| PR | Content | Problems |
|---|---|---|
| 1 | Platform + pilot: Arrays & Hashing | 10 |
| 2 | Two Pointers, Stack, Sliding Window | 21 |
| 3 | Binary Search, Linked List | 19 |
| 4 | Recursion, Sorting, Trees | 18 |
| 5 | Tries, Heap / Priority Queue, Backtracking | 21 |
| 6 | Intervals, Greedy, Graphs | 23 |
| 7 | 1-D DP, Advanced Graphs, 2-D DP | 25 |
| 8 | Bit Manipulation, Math & Geometry | 13 |

The pilot's 10: contains-duplicate, valid-anagram, two-sum, majority-element, group-anagrams, top-k-frequent-elements, product-of-array-except-self, valid-sudoku, subarray-sum-equals-k, longest-consecutive-sequence.

After PR 1 merges, the user reviews the pilot pages. Style changes they ask for go into the template and writing bar before PR 2.

## Out of scope

- Languages other than Python.
- Per-problem animations or visualizers.
- Solutions for quizzes, design prompts, diagnose scenarios or estimation drills.
- Storing reveal state, or counting reveals in analytics.
