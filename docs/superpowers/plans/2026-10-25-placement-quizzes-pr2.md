# Placement Quizzes (PR 2: Algorithms + System Design content) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Algorithms and System Design tracks get placement quizzes too. PR 2 also finishes two follow-ups parked from PR 1: the question counter is announced to screen readers, and the results screen is checked for horizontal scroll on a phone.

**Architecture:** PR 1 (#25) built the whole platform: the Velite `placements` collection, the V14 validation, the `/[track]/placement` route, the track-home card, skip-aware recommendations and storage. This PR is mostly content:
- Two YAML files under `content/placement/`. The route, `placementTracks()` and `check:deploy` pick them up automatically.
- An updated inventory test.
- A one-attribute UI change.
- Playwright coverage for the new tracks.

**Tech Stack:** Velite (YAML content), Vitest, Playwright, React (one attribute).

**Spec:** `docs/superpowers/specs/2026-10-23-placement-quizzes-design.md` (sections Content, Delivery → PR 2)

## Global Constraints

- **Pass rule:** a module is passed only when every one of its questions is answered correctly. The result moves the start point only; mastery is never credited.
- **Questions per module:** 2–3 for each module that has lessons. `system-design`'s `case-studies` module is exempt and has 0. V14 enforces this during `pretest` and the Velite build.
- **Question format:** exactly 4 distinct choices; `answer` is 0–3 (0-based); `explanation` is one or two sentences.
- **No repeats:** no placement prompt may equal any lesson-quiz prompt (V14) or closely paraphrase one (review).
- **Prior knowledge only:** each question must be answerable by a developer who knows the topic from work or study, without reading the CS Atlas lesson. Don't reuse a lesson's examples, numbers or phrasing.
- **Plausible distractors:** they must not contradict the stem, must not be absurd, and must not be secretly correct under an unstated default.
- **Answer length:** the correct choice is neither the longest nor the shortest choice, by character count, in at least 80% of a file's questions. That means at most 2 of 12 for Algorithms and at most 1 of 9 for System Design.
- **Answer keys:** each of 0–3 is used at least twice per file. No key appears on three consecutive questions.
- **Arithmetic:** where a question involves arithmetic, show it in the explanation.
- **Copy:** the counter text stays exactly `Question N of M`. The results heading stays `Your placement`, and the link stays `Start at <lesson title>`.
- **Commits:** end every message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Scratch files:** never commit anything under `.superpowers/`.

## Review Focus

1. **Algorithms questions must not hand over exercise solutions.** The Algorithms track has no lesson quizzes, but its lessons list LeetCode-style exercises under `content/exercises/`. A placement question that states the core trick of a listed exercise, such as "use a monotonic stack for next-greater-element", spoils that exercise. Task 1's writing rules require each concept to be checked against the exercise list.
2. **System Design questions must not pre-solve a design prompt.** Each `content/exercises/design-*.yaml` tied to a system-design lesson has a reference answer. A question that states that answer's key decision spoils it. Task 2's writing rules require reading them all.
3. **Case Studies never shows "Placed out".** A learner who answers every System Design question correctly places out of Foundations, Scaling and Advanced. The results screen and track home show exactly three "Placed out" badges, and Continue opens the first case study. This is pinned by an e2e test in Task 3.
4. **The results screen fits a 375 px phone.** "Questions to revisit" prints every wrongly answered prompt, its answer and its explanation, and long unbroken text must not cause horizontal scroll. This is pinned by an e2e test in Task 3, on the all-wrong Algorithms run (12 explanations).
5. **Screen readers hear question progress.** Focus moves to the new prompt after each answer, but the counter is a separate node. `aria-live="polite"` on it announces "Question N of M". This is pinned in Task 3.

## File Structure

| File | Responsibility |
|---|---|
| `content/placement/algorithms.yaml` (create) | 12 questions: foundations 3, trees-heaps 2, search-greedy 2, graphs-dp 3, math-bits 2 |
| `content/placement/system-design.yaml` (create) | 9 questions: foundations 3, scaling 3, advanced 3 |
| `src/lib/content/index.test.ts` (modify) | inventory: tracks, per-module counts, answer-key spread for every placement file |
| `src/components/tracks/placement-quiz.tsx` (modify) | `aria-live` on the counter |
| `e2e/placement.spec.ts` (modify) | new-track entry points, SD exemption, results-screen width |
| `e2e/layout.spec.ts` (modify) | `/algorithms/placement/`, `/system-design/placement/` |

---

### Task 1: Algorithms placement content

**Files:**
- Create: `content/placement/algorithms.yaml`
- Modify: `src/lib/content/index.test.ts` (the `describe('placement quizzes', …)` block at the end of the file)

**Interfaces:**
- Consumes: `getPlacement(track)` and `placementTracks()` from `src/lib/content/index.ts`. The order of `placementTracks()` is Velite's file order, so tests sort it.
- Produces: 12 questions that Task 3's e2e test reads from `.velite/placements.json`.

**Question plan.** There are 12 questions in module order. Each row gives the concept to test; the writer picks the scenario and wording. Every row has been chosen to avoid being the headline trick of a common exercise, but the writer must still check (see the writing rules).

| # | module | concept to test |
|---|---|---|
| 1 | foundations | A hash table's expected O(1) lookup degrades to O(n) when many keys land in the same bucket (poor hash or adversarial keys), not because of the table's size |
| 2 | foundations | Binary search for the *first* index where a monotone predicate becomes true over `[lo, hi)`: when `pred(mid)` is true, set `hi = mid`, not `mid - 1`, because `mid` may be the answer |
| 3 | foundations | Why a variable-size sliding window is O(n) in total even though the inner loop shrinks the window: each of the two pointers only moves forward, at most n times |
| 4 | trees-heaps | What a binary min-heap guarantees: every parent ≤ its children, so the minimum is at the root, but the array isn't sorted and the maximum is somewhere among the leaves |
| 5 | trees-heaps | Inserting already-sorted keys into a plain (unbalanced) binary search tree builds a chain of height n, so search becomes O(n) |
| 6 | search-greedy | Counting a backtracking search's output: n distinct items have n! orderings, but only 2ⁿ subsets (e.g. n = 10 gives 3,628,800 against 1,024) |
| 7 | search-greedy | Greedy "largest coin first" is not always optimal: with coins {1, 3, 4} and amount 6 it gives 4 + 1 + 1 (3 coins), against 3 + 3 (2 coins). Ask only whether greedy is optimal; don't show the DP |
| 8 | graphs-dp | Why BFS finds shortest paths in an *unweighted* graph: it dequeues nodes in non-decreasing distance order, so a node's first visit is along a shortest path |
| 9 | graphs-dp | Why Dijkstra's algorithm can be wrong with a negative edge weight: a node it has already finalised can later be reached more cheaply through that edge |
| 10 | graphs-dp | A 2D DP where cell (i, j) depends only on row i − 1 and on cell (i, j − 1): time O(m·n), and space can drop to O(n) by keeping one row |
| 11 | math-bits | For a positive integer x, `x & (x - 1) == 0` holds exactly when x is a power of two, because subtracting 1 flips the lowest set bit and every bit below it |
| 12 | math-bits | Euclid's algorithm `gcd(a, b) = gcd(b, a mod b)` finishes in O(log min(a, b)) steps, because the remainder at least halves every two steps |

**Writing rules.** These are binding; reviewers will check every one.
- Use this YAML shape, the same as `content/placement/cs-fundamentals.yaml`: `track: algorithms`, then `questions:` with `module`, `prompt`, `choices` (4), `answer` (0-based) and `explanation` (1–2 sentences). Quote strings with double quotes, as that file does.
- **Prior knowledge only.** Read the 18 lessons under `content/tracks/algorithms/lessons/`, then:
  - Don't reuse a lesson's examples, numbers or phrasing.
  - State the setting in the stem where it matters: "unweighted", "positive integer", "plain BST with no rebalancing", "half-open range `[lo, hi)`".
- **No spoiling exercises.** List every `content/exercises/*.yaml` whose `lessons:` field names an algorithms lesson (these are LeetCode-style `external-problem` files). For every question:
  - Its stem must not describe any listed exercise's problem.
  - Its correct choice must not state that exercise's solution approach.
  - If a planned concept turns out to be a listed exercise's headline trick, keep the concept and change the scenario. For example, test the heap property through "where is the maximum?", not "find the k largest".
  - Note each such change in your report.
- **No repeats.** No prompt may repeat or closely paraphrase a question in any `content/exercises/*-quiz.yaml`, or a prompt in `content/placement/cs-fundamentals.yaml`. V14 catches exact repeats; you must also avoid near-repeats. In particular, CS Fundamentals Q1 (binary search inside a loop) and Q2 (array vs linked-list indexing) are taken.
- **Plausible distractors.** Use real misconceptions, such as "BFS works because it explores neighbours first, as DFS does" or "Dijkstra fails only on cycles". No distractor may be correct under an unstated default.
- **Answer length:** at most 2 of the 12 questions may have the correct choice as the longest or the shortest.
- **Answer keys:** each of 0–3 at least twice; never the same key on three consecutive questions.
- **Arithmetic:** show it in the explanation (Q6, Q7, Q10, Q12).

- [ ] **Step 1: Update the inventory test.** Replace the whole `describe('placement quizzes', …)` block at the end of `src/lib/content/index.test.ts` with:

```ts
describe('placement quizzes', () => {
  const counts = (track: string) => {
    const out: Record<string, number> = {}
    for (const q of getPlacement(track)!.questions) out[q.module] = (out[q.module] ?? 0) + 1
    return out
  }
  it('ships the planned question counts per module', () => {
    expect([...placementTracks()].sort()).toEqual(['algorithms', 'cs-fundamentals'])
    expect(counts('cs-fundamentals')).toEqual({ foundations: 2, 'operating-systems': 2, networking: 2, databases: 3, 'machine-math': 3 })
    expect(counts('algorithms')).toEqual({ foundations: 3, 'trees-heaps': 2, 'search-greedy': 2, 'graphs-dp': 3, 'math-bits': 2 })
    expect(getPlacement('system-design')).toBeUndefined()
  })
  it('varies answer positions with no run of three in every file', () => {
    for (const track of placementTracks()) {
      const keys = getPlacement(track)!.questions.map((q) => q.answer)
      for (const k of [0, 1, 2, 3]) expect(keys.filter((x) => x === k).length, `${track} key ${k}`).toBeGreaterThanOrEqual(2)
      for (let i = 2; i < keys.length; i++) expect(keys[i] === keys[i - 1] && keys[i] === keys[i - 2], `${track} run at ${i}`).toBe(false)
    }
  })
})
```

- [ ] **Step 2: Run it and watch it fail.**
Run: `npm test -- src/lib/content/index.test.ts`
Expected: FAIL. `placementTracks()` is `['cs-fundamentals']`.

- [ ] **Step 3: Write `content/placement/algorithms.yaml`** following the question plan and writing rules.

- [ ] **Step 4: Run the checks.**
Run: `npm test && npm run typecheck && npm run lint`
Expected: everything passes, including V14 during `pretest`.

Then check answer lengths with this script and paste its output into your report. `FLAGGED` must be at most 2.

```bash
node -e '
const y=require("js-yaml").load(require("fs").readFileSync("content/placement/algorithms.yaml","utf8"));let f=0
y.questions.forEach((q,i)=>{const L=q.choices.map(c=>c.length),a=L[q.answer],x=a===Math.max(...L)||a===Math.min(...L);if(x)f++;console.log(i+1,q.module,"key",q.answer,"len",a,"min",Math.min(...L),"max",Math.max(...L),x?"<-":"")})
console.log("FLAGGED",f)'
```

If `js-yaml` isn't resolvable, use `npx -y js-yaml content/placement/algorithms.yaml > /tmp/a.json`, then run the same logic on the JSON.

- [ ] **Step 5: Commit.**

```bash
git add content/placement/algorithms.yaml src/lib/content/index.test.ts
git commit -m "feat(placement): Algorithms placement questions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: System Design placement content

**Files:**
- Create: `content/placement/system-design.yaml`
- Modify: `src/lib/content/index.test.ts` (the block Task 1 wrote)

**Interfaces:**
- Consumes: Task 1's inventory test block.
- Produces: 9 questions that Task 3's e2e test reads from `.velite/placements.json`. Task 3 relies on these points:
  - The track has no questions for `case-studies`.
  - The first case-study lesson is `url-shortener`, titled "URL shortener".

**Question plan.** There are 9 questions in module order. `case-studies` gets none.

| # | module | concept to test |
|---|---|---|
| 1 | foundations | HTTP idempotency: retrying a timed-out `PUT` or `DELETE` is safe because repeating it leaves the same state, while retrying a `POST` can create a duplicate unless the server de-duplicates it (e.g. with an idempotency key) |
| 2 | foundations | After a DNS record is changed, some clients keep reaching the old address until their resolvers' cached answer expires, which takes up to the record's previous TTL |
| 3 | foundations | Average read latency with a cache: 90% hit ratio, 1 ms cache, 50 ms database, and a miss checks the cache first. The average is 0.9 × 1 + 0.1 × (1 + 50) = 6 ms. Use your own numbers |
| 4 | scaling | Routing `/api/*` and `/static/*` to different server pools needs a layer-7 (HTTP-aware) load balancer. A layer-4 balancer sees only IPs and ports |
| 5 | scaling | With `shard = hash(key) mod N`, going from N to N + 1 shards moves most keys (about N/(N+1) of them). Consistent hashing moves only about 1/(N+1) |
| 6 | scaling | A queue with at-least-once delivery can deliver a message twice, e.g. after a consumer crashes before acking, so consumers must be idempotent |
| 7 | advanced | A user saves an edit, reloads, and sees the old value, because reads go to an asynchronously replicated follower. The missing guarantee is read-your-writes |
| 8 | advanced | A 5-node majority-quorum cluster (e.g. Raft) needs 3 votes, so it tolerates 2 failed nodes. With 6 nodes it still tolerates only 2 |
| 9 | advanced | Why dashboards track p99 rather than the mean: a small slow tail barely moves the mean, but it is what a meaningful share of requests, and of users making many requests, experience |

**Writing rules.** These are binding; reviewers will check every one.
- **YAML shape:** the same as Task 1, with `track: system-design`.
- **Prior knowledge only.** Read the 15 lessons under `content/tracks/system-design/lessons/`. Don't reuse their examples, numbers or phrasing.
- **No pre-solving.** Read the prompt and the reference of every `content/exercises/design-*.yaml` that lists a system-design lesson. No question may state or strongly hint at any reference's key decision. If a planned row does, change its scenario, or swap in a different concept from the same module, and note the change in your report. Rows at risk:
  - Q5 against `design-message-store-sharding`.
  - Q6 against `design-order-email-pipeline`.
  - Q9 against `design-checkout-slos`. If it collides, use instead: two-phase commit blocks participants that have voted "prepared" when the coordinator fails.
- **No repeats.** No prompt may repeat or closely paraphrase a question in any `content/exercises/*-quiz.yaml`, especially the system-design lesson quizzes, or in another placement file. V14 catches exact repeats; you must also avoid near-repeats.
- **Plausible distractors.** For example, Q2 could offer "browsers ignore TTLs" or "the registrar takes 48 hours to publish". No distractor may be correct under an unstated default. For example, Q4 must not offer an option that an L4 balancer with SNI routing could also satisfy.
- **Answer length:** at most 1 of the 9 questions may have the correct choice as the longest or the shortest.
- **Answer keys:** each of 0–3 at least twice; never the same key on three consecutive questions.
- **Arithmetic:** show it in the explanation (Q3, Q5, Q8).

- [ ] **Step 1: Update the inventory test.** In the `ships the planned question counts per module` test:
  - Replace the `placementTracks()` assertion with:

```ts
    expect([...placementTracks()].sort()).toEqual(['algorithms', 'cs-fundamentals', 'system-design'])
```

  - Replace `expect(getPlacement('system-design')).toBeUndefined()` with:

```ts
    expect(counts('system-design')).toEqual({ foundations: 3, scaling: 3, advanced: 3 })
```

- [ ] **Step 2: Run it and watch it fail.**
Run: `npm test -- src/lib/content/index.test.ts`
Expected: FAIL, because `system-design` is missing from `placementTracks()`.

- [ ] **Step 3: Write `content/placement/system-design.yaml`** following the question plan and writing rules.

- [ ] **Step 4: Run the checks.**
Run: `npm test && npm run typecheck && npm run lint`
Expected: everything passes. Then run Task 1's length script on `content/placement/system-design.yaml` and paste its output into your report. `FLAGGED` must be at most 1.

- [ ] **Step 5: Commit.**

```bash
git add content/placement/system-design.yaml src/lib/content/index.test.ts
git commit -m "feat(placement): System Design placement questions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Counter announcement and e2e coverage for the new tracks

**Files:**
- Modify: `src/components/tracks/placement-quiz.tsx` (the counter `<p>`, currently `<p className="text-sm tabular-nums">Question {answers.length + 1} of {total}</p>`)
- Modify: `e2e/placement.spec.ts`
- Modify: `e2e/layout.spec.ts` (the `PAGES` array)

**Interfaces:**
- Consumes:
  - `.velite/placements.json`: an array of `{ track, questions: { module, choices, answer }[] }`, produced by `npm run build` or `velite`, which Playwright's web server runs.
  - Task 2's content facts: there are 9 System Design questions, none for `case-studies`, and the first case study is "URL shortener".
  - Task 1: there are 12 Algorithms questions, and the first lesson is "Arrays & Hashing" (`arrays-hashing`).
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing e2e tests.** Edit `e2e/placement.spec.ts`:
  - Replace the `const csf = …` lines at the top with a helper:

```ts
type Q = { module: string; choices: string[]; answer: number }
const quizzes = JSON.parse(readFileSync('.velite/placements.json', 'utf8')) as { track: string; questions: Q[] }[]
const quiz = (track: string) => quizzes.find((p) => p.track === track)!.questions
const csf = { questions: quiz('cs-fundamentals') }
```

  - Replace the whole `test('tracks without a placement quiz show no placement card', …)` block with:

```ts
for (const [slug, title] of [['algorithms', 'Algorithms'], ['system-design', 'System Design']] as const) {
  test(`${title} links to its placement quiz and announces progress`, async ({ page }) => {
    await page.goto(`/${slug}/`)
    await page.getByRole('link', { name: 'Take the 5-minute placement quiz' }).click()
    await expect(page).toHaveURL(new RegExp(`/${slug}/placement/$`))
    await expect(page.getByRole('heading', { level: 1, name: `${title} placement` })).toBeVisible()
    await expect(page.getByText(`Question 1 of ${quiz(slug).length}`)).toHaveAttribute('aria-live', 'polite')
  })
}

test('System Design never places out of Case Studies', async ({ page }) => {
  await page.goto('/system-design/placement/')
  const qs = quiz('system-design')
  for (const [i, q] of qs.entries()) {
    await expect(page.getByText(`Question ${i + 1} of ${qs.length}`)).toBeVisible()
    await page.getByRole('button', { name: q.choices[q.answer], exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: 'Your placement' })).toBeVisible()
  await expect(page.getByText('Placed out')).toHaveCount(3)
  await expect(page.getByText('Case Studies')).toHaveCount(0)
  await page.getByRole('link', { name: 'Start at URL shortener' }).click()
  await expect(page).toHaveURL(/\/system-design\/url-shortener\/$/)

  await page.goto('/system-design/')
  await expect(page.getByText('Placed out')).toHaveCount(3)
  await page.getByRole('link', { name: /^Continue/ }).click()
  await expect(page).toHaveURL(/\/system-design\/url-shortener\/$/)
})

test.describe('on a 375px phone', () => {
  test.use({ viewport: { width: 375, height: 812 } })
  test('the results screen with every question to revisit has no horizontal scroll', async ({ page }) => {
    await page.goto('/algorithms/placement/')
    const qs = quiz('algorithms')
    for (const [i, q] of qs.entries()) {
      await expect(page.getByText(`Question ${i + 1} of ${qs.length}`)).toBeVisible()
      await page.getByRole('button', { name: q.choices[(q.answer + 1) % 4], exact: true }).click()
    }
    await expect(page.getByRole('heading', { name: 'Questions to revisit' })).toBeVisible()
    await expect(page.getByText('Placed out')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Start at Arrays & Hashing' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})
```

Notes for the implementer:
- `getByText('Case Studies')` checks that the results list has no Case Studies row. The results screen shows only the track's modules that have questions, and nothing else on that page names the module. If the site header or footer turns out to contain that text, scope the locator to the results list: `page.getByRole('list').getByText('Case Studies')`.
- The existing CS Fundamentals test keeps using `csf.questions`, unchanged.

- [ ] **Step 2: Run the new tests and watch the right one fail.**
Run: `npx playwright test e2e/placement.spec.ts`
Expected:
  - The two "links to its placement quiz" tests FAIL on the `aria-live` assertion.
  - The Case Studies and 375 px tests PASS, since the content from Tasks 1–2 already exists.
  - If anything else fails, investigate before going on.

- [ ] **Step 3: Announce the counter.** In `src/components/tracks/placement-quiz.tsx`, change the counter to:

```tsx
      <p className="text-sm tabular-nums" aria-live="polite" aria-atomic="true">Question {answers.length + 1} of {total}</p>
```

- [ ] **Step 4: Add the layout pages.** In `e2e/layout.spec.ts`'s `PAGES` array:
  - insert `'/algorithms/placement/'` right after `'/algorithms/'`;
  - insert `'/system-design/placement/'` right after `'/system-design/'`.

- [ ] **Step 5: Run the checks.**
Run: `npx playwright test e2e/placement.spec.ts e2e/layout.spec.ts e2e/tracks.spec.ts && npm test && npm run typecheck && npm run lint`
Expected: all pass. If local e2e times out because the machine is overloaded, rerun the failing spec alone before concluding anything.

- [ ] **Step 6: Commit.**

```bash
git add src/components/tracks/placement-quiz.tsx e2e/placement.spec.ts e2e/layout.spec.ts
git commit -m "feat(placement): announce question progress; e2e for Algorithms and System Design placement

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After the PR merges

`npm run check:deploy -- https://cs-atlas-hub.vercel.app` should check 261 pages: the 259 from before plus the two new placement routes. `check:deploy` lists `content/placement/*.yaml` itself, so it needs no code change.
