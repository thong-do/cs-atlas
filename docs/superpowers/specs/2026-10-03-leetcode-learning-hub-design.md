# LeetHub — LeetCode Learning Hub: Design Spec

- **Date:** 2026-10-03
- **Status:** Draft, awaiting review

## 1. Purpose

LeetHub is a learning companion for LeetCode-style algorithm practice. It provides a pattern roadmap, theory, tips and tricks, pattern-recognition guides, links to matching LeetCode problems, and notes on solved problems.

Goals, used to judge every feature:

1. **Fun.** The user wants to come back daily.
2. **Easy to understand.** Every pattern is explained with consistent structure, plain language and visuals.
3. **Lasting memory.** Spaced repetition and active recall keep solved problems and patterns retrievable.

**Audience:** the author first (a Python solver following a NeetCode-style pattern roadmap). The site must be shareable later without rework: shared content and personal data are separate.

**Success criteria:** the author opens it daily, the Today page says what to review and learn next, and pattern-recognition accuracy improves over time (visible on the Stats page).

### Assumptions
- Problems are solved on LeetCode itself. LeetHub has no code runner.
- Content follows a NeetCode-style pattern roadmap. Solution code in notes is mostly Python.

### Non-goals
In-browser code execution, user accounts, cross-device sync (deferred, see §7), comments/social, leaderboards, AI hints, native mobile app.

## 2. Architecture

A static site (Next.js App Router, `output: 'export'`, TypeScript). Shared content is MDX/YAML in the repo, compiled at build time. Personal data lives in the browser in IndexedDB, with JSON export/import for backup.

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router), static export, TypeScript |
| Content | MDX + YAML via Velite (typed collections, build-time validation) |
| Styling/UI | Tailwind CSS + shadcn/ui; light/dark theme |
| Local DB | Dexie (IndexedDB) |
| Scheduler | ts-fsrs |
| Code highlighting | Shiki (build time) |
| Validation | Zod (content + import) |
| Hosting | GitHub Pages or Vercel |
| Tests | Vitest (logic), Playwright (key flows) |

### Units and boundaries
- **`content/`**: data only (MDX/YAML). It has no code dependencies.
- **`lib/content`**: typed accessors over Velite output (`getPatterns()`, `getPattern(slug)`, `getProblems()`, `getRoadmap()`). Build-time only.
- **`lib/store`**: the `Store` interface plus `DexieStore`, the only implementation for now. UI code never touches Dexie directly.
- **`lib/logic`**: pure functions with no I/O: rating mapping, mastery, streak, distractor selection, import merge. Fully unit-tested.
- **`components/`**: UI. Visualizers live in `components/visualizers/`, one per pattern, and are driven by a precomputed array of steps.
- **`app/`**: routes (§4).

## 3. Features

### 3.1 Core loop
Learn a pattern → practice its problem ladder → write a 1-line insight → review on a schedule → train recognition.

### 3.2 Roadmap
- A visual skill tree of about 18 patterns: Arrays & Hashing, Two Pointers, Sliding Window, Stack, Binary Search, Linked List, Trees, Tries, Heap / Priority Queue, Backtracking, Graphs, Advanced Graphs, 1-D DP, 2-D DP, Greedy, Intervals, Math & Geometry, Bit Manipulation.
- Edges come from `prerequisites`.
- Each node shows its title, a mastery ring (0–100) and a solved count (e.g. `5/12`).
- Nodes are never locked. The **recommended next node** is the first one in roadmap order whose prerequisites all have mastery ≥ 50 and whose own mastery is < 80. It is highlighted.

### 3.3 Pattern pages
Every pattern page has the same section order:
1. **Recognize it.** Trigger phrases mapped to the pattern.
2. **Intuition.** Plain-language explanation and an analogy.
3. **Visual.** An interactive step-through (MVP: Two Pointers, Sliding Window, Binary Search; BFS/DFS ships with the Graphs theory page) or a static diagram.
4. **Python template.**
5. **Complexity.**
6. **Pitfalls.**
7. **Tips & tricks.**
8. **Problem ladder.** 5–15 problems from easy to hard. Each row has a LeetCode link, difficulty and status icon (○ unsolved, ◐ solved with help, ● solved alone).

### 3.4 Problem notes
- Fields: **insight (required, one line, ≤ 140 chars)**, approach, complexity, mistakes, code (all Markdown).
- The insight is what reviews show, so it's mandatory when marking a problem solved.

### 3.5 Spaced repetition and the Today page
- **Marking solved** asks for a solve rating and the insight. Solve rating → initial FSRS rating:
  - Solved alone → Good
  - Needed a hint → Hard
  - Looked at the solution → Again
- **A review** shows the problem title, its LeetCode link and a "Reveal" button (no pattern tags shown before reveal). Reveal shows the pattern(s) and the insight. The user then rates Again / Hard / Good / Easy, and ts-fsrs computes the next due date.
- **"Again"** also flags the problem *re-solve on LeetCode* until the next successful review.

### 3.6 Pattern Recognition Trainer
- A round has 5 questions (quick train) or 10 (full).
- Each question shows a problem's `recognitionPrompt` (written in our own words, never copied LeetCode text) and 4 pattern options: the problem's primary pattern plus 3 distractors.
- **Distractors:** prefer patterns listed in the correct pattern's `confusedWith` frontmatter, then fill randomly from other patterns. All 4 options are distinct and shuffled.
- Feedback after each answer: correct or incorrect, the right pattern, and a link to its page.
- **End of round:** the score and the most-missed patterns.
- Questions are drawn from all problems that have a `recognitionPrompt`, weighted toward patterns with lower recognition accuracy.

### 3.7 Gamification
- Daily streak, activity heatmap, mastery rings, and a celebration toast when a pattern crosses mastery 80.
- No leaderboards.

### 3.8 Data safety
- Export all user data as a single JSON file. Import replaces or merges it (§6).
- A backup reminder banner appears when `lastBackupAt` is more than 14 days old (or never set while data exists).

## 4. Pages

| Route | Purpose |
|---|---|
| `/` | **Today**: streak, reviews due, "Continue" card for the recommended node, review queue, 2–3 next unsolved problems, Quick Train button, "All caught up" empty state |
| `/roadmap` | Skill-tree graph (SVG); click node → pattern page |
| `/patterns/[slug]` | Pattern page (§3.3) with a sticky table of contents |
| `/problems` | All problems; search by title; filter by pattern, difficulty, status |
| `/problems/[slug]` | Header (title, difficulty, pattern tags, "Open on LeetCode ↗"), optional hint reveal, "Mark solved" flow, note editor, review history and next due date |
| `/train` | Recognition Trainer (§3.6) |
| `/stats` | Heatmap, streak history, mastery per pattern, recognition accuracy per pattern, review forecast for the next 7 days |
| `/settings` | Export/import, FSRS desired retention (default 0.9), theme |

**Navigation:**
- Left sidebar on desktop and bottom tab bar on mobile, both with Today, Roadmap, Problems, Train and Stats. Settings is in the sidebar footer or the mobile header.
- A ⌘K command palette searches patterns and problems.
- Unknown slugs render a 404 page with a search box.

## 5. Data model

### 5.1 Content (repo, shared)
```
content/
  roadmap.yaml            # ordered list of pattern slugs (display order)
  patterns/<slug>.mdx
  problems/<slug>.yaml
```

**Pattern frontmatter:**
```yaml
slug: two-pointers
title: Two Pointers
order: 2
prerequisites: [arrays-hashing]
confusedWith: [sliding-window, binary-search]
triggers: ["sorted array + find pair/triplet", "palindrome check", "in-place partition"]
complexity: "Usually O(n) time, O(1) space"
summary: "Move two indices toward/along each other to avoid nested loops."
stub: false            # true = theory not written yet; page shows ladder only
```
The MDX body uses H2 sections in the order from §3.3 and may embed `<Visualizer kind="two-pointers" />`.

**Problem file:**
```yaml
slug: two-sum-ii
title: "Two Sum II - Input Array Is Sorted"
leetcodeId: 167
url: https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/
difficulty: medium          # easy | medium | hard
patterns: [two-pointers]    # first = primary
ladderOrder: 2              # position in the primary pattern's ladder
recognitionPrompt: "Sorted numbers; return indices of two that add to a target using O(1) extra space."
hint: "The array is sorted — what happens to the sum if you move the left or right end?"
```

**Build-time validation (build fails on):**
- missing required fields
- an unknown slug in `patterns`, `prerequisites` or `confusedWith`
- a prerequisite cycle
- duplicate slugs or `leetcodeId`s
- duplicate `ladderOrder` within a primary pattern

### 5.2 User data (IndexedDB, private)
```ts
ProblemProgress { slug; status: 'unsolved' | 'solved'; solveRating?: 'alone' | 'hint' | 'solution';
                  firstSolvedAt?; needsResolve: boolean }
Note            { slug; insight; approach; complexity; mistakes; code; updatedAt }
ReviewCard      { slug; card: FsrsCard; due }
ReviewLog       { id; slug; rating: 'again' | 'hard' | 'good' | 'easy'; reviewedAt }
TrainAttempt    { id; problemSlug; correctPattern; chosenPattern; correct; at }
Activity        { date: 'YYYY-MM-DD'; reviews; solves; trains }
Meta            { schemaVersion; lastBackupAt?; settings: { desiredRetention; theme } }
```
All timestamps are ISO strings. `Activity.date` uses the user's local date.

### 5.3 Store interface
```ts
interface Store {
  getProgress(slug): Promise<ProblemProgress | undefined>
  listProgress(): Promise<ProblemProgress[]>
  markSolved(slug, solveRating, insight): Promise<void>  // creates progress, note, card, activity
  saveNote(note): Promise<void>
  getNote(slug): Promise<Note | undefined>
  dueCards(now): Promise<ReviewCard[]>
  recordReview(slug, rating, now): Promise<void>         // updates card, log, activity, needsResolve
  recordTrainAttempt(attempt): Promise<void>
  listTrainAttempts(): Promise<TrainAttempt[]>
  listActivity(): Promise<Activity[]>
  getMeta(): Promise<Meta>; saveSettings(s): Promise<void>
  exportAll(): Promise<ExportFile>
  importAll(file, mode: 'replace' | 'merge'): Promise<void>
}
```
Pages use React hooks wrapping `Store`, with Dexie `liveQuery` for reactivity. `DexieStore` is the only implementation. A future sync backend adds a new implementation without changes to the UI.

## 6. Key logic (`lib/logic`, pure)

- **`initialFsrsRating(solveRating)`:** alone → Good, hint → Hard, solution → Again.
- **`patternMastery(pattern, problems, progress, cards, attempts, now)`** returns 0–100, computed as `round(100 × (0.7 × problemScore + 0.3 × recognitionScore))`:
  - `problemScore`: the mean over all ladder problems of the pattern. An unsolved problem counts 0. A solved one counts `weight(solveRating) × retrievability(card, now)`, where the weight is alone = 1.0, hint = 0.7, solution = 0.4.
  - `recognitionScore`: accuracy over the last 20 attempts whose `correctPattern` is this pattern. If there are none, it's 0.
- **`currentStreak(activity, today)`:** the number of consecutive days ending today (or yesterday, if today has no activity yet) with any non-zero count.
- **`pickDistractors(correct, patterns, rng)`:** see §3.6. It must be deterministic for a given `rng` seed (for tests).
- **`recommendedNode(patterns, masteries)`:** see §3.2. Fallback: the first pattern in order with mastery < 80. If every pattern is ≥ 80, there is no recommendation.
- **`mergeImport(local, incoming)`:** per record key, the newer `updatedAt` / `reviewedAt` / `at` wins. Logs and attempts are unioned by `id`.

## 7. Error handling and evolution

- **IndexedDB unavailable or failing to open:** a persistent banner says "Progress won't be saved in this browser"; the app stays usable read-only.
- **Import:** the file is parsed with Zod. On failure, a clear error is shown and nothing changes. On success, the user chooses Replace (with a confirm) or Merge. Files with a newer `schemaVersion` than the app are rejected.
- **Schema changes:** `Meta.schemaVersion` and Dexie versioned migrations.
- **Future sync:** a `SupabaseStore` implementing `Store` (out of scope).

## 8. Testing

- **Vitest:**
  - `lib/logic`: every function, including edge cases (empty data, a streak across a month boundary, a pattern with no problems, all patterns mastered)
  - content validation (fixture repos with each failure type)
  - an `exportAll` → `importAll` round-trip on `DexieStore` using `fake-indexeddb`
- **Playwright (one main flow):**
  1. open a problem and mark it solved with an insight
  2. advance the clock, then confirm it appears on Today
  3. reveal and rate it
  4. export, clear storage and import
  5. confirm the progress and note are restored
- **Second Playwright flow:** a trainer round records attempts and updates stats.

## 9. MVP content scope

- **`roadmap.yaml`:** all 18 patterns.
- **Full theory pages** for Arrays & Hashing, Two Pointers, Sliding Window, Stack, Binary Search and Linked List.
- The other 12 patterns are `stub: true`, with frontmatter, triggers and ladders but no theory body yet.
- About 50 problem files covering the 6 full patterns' ladders, each with a `recognitionPrompt` and `hint`.
- **Visualizers:** Two Pointers, Sliding Window and Binary Search. BFS/DFS ships with the Graphs theory page later.
