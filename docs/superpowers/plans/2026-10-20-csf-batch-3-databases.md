# CS Fundamentals Batch 3 (Databases) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `databases` module of the `cs-fundamentals` track: 3 lessons and the `b-tree-insert` visualizer.

**Architecture:** This batch is content only, plus one new step-through visualizer that uses the existing pattern. The platform work shipped in batch 1 (PR #21).

**Tech Stack:** Next.js (App Router), Velite, TypeScript, Vitest, Playwright, MDX, YAML.

**Spec:** `docs/superpowers/specs/2026-10-17-cs-fundamentals-track-design.md`

## Global Constraints

### Branch and commits

- Work on branch `feat/csf-databases`. Never commit to main, never push, and never dispatch subagents or reviewers.
- Make one commit per task. Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stage files explicitly. Never commit anything under `.superpowers/`, and check `git status` first.
- Before committing a task, run `npm test`, `npm run typecheck`, `npm run lint` and `npm run e2e`.
  - Write the e2e output to `/private/tmp/claude-501/-Users-thongdo-IT-algorithms/0211fe1a-3ec8-4ddf-9510-c5acc4d9fb5e/scratchpad/e2e-csf3-<task>.log` and read its tail.
  - If the only failures are browser-launch or `webServer` timeouts on pages you didn't touch, re-run just those specs and say so.

### Track design

- **No cross-track prerequisites.** Lessons link to System Design and Algorithms lessons with the existing link format, e.g. `[SQL vs NoSQL](/system-design/sql-vs-nosql/)`, but never list them in `prerequisites`.
- **Agree with System Design** (spec D4): each lesson goes one layer deeper and must not contradict it. Read the relevant System Design lesson before writing. In particular:
  - `sql-vs-nosql.mdx` introduces ACID, isolation levels ("Postgres uses Read Committed … can abort transactions you must retry"), indexes as "usually a B-tree", the composite index `(customer_id, created_at DESC)`, and conditional updates for the stock race.
  - `consistency-models.mdx` separates linearizability from serializability.
  - `distributed-transactions.mdx` covers 2PC and sagas.
  - `replication-sharding.mdx` covers the order of scaling steps.

### Lesson file (`content/tracks/cs-fundamentals/lessons/<slug>.mdx`)

- **Frontmatter:** exactly `slug`, `title`, `level`, `authors: [cs-atlas]`, `prerequisites`, and a one-sentence `summary`.
- **Sections:** exactly these `##` sections, in order: Intuition, Visual, Example, Pitfalls, Tips & tricks.
  - Intuition opens with an everyday analogy.
  - Visual has a ```text diagram, plus the `<Visualizer>` line if the task names one.
  - The Example is worked, and its SQL or Python is valid. SQL targets PostgreSQL unless the task says otherwise; name the engine wherever behaviour differs.
  - Pitfalls are bullets, each with its fix.
  - Tips & tricks give rules of thumb, interview phrasing, and what to measure.
- **Length:** about 1,100–1,400 words by `wc -w`, with a hard ceiling of 1,400. Aim for ≤1,380 to leave room for review fixes.
- **Voice:** working developers filling CS gaps. Explain what the storage engine and planner actually do underneath their queries, and the bugs and latency that follow. Match the tone of `content/tracks/cs-fundamentals/lessons/tcp-vs-udp.mdx`.

### Accuracy rules

Each of these caught a real error in earlier batches.

- Hedge figures that vary by engine, version or hardware: page sizes (Postgres 8 KB, InnoDB 16 KB by default), fan-out, row throughput and I/O rates. Never invent statistics.
- Show and check every piece of arithmetic.
- Name engine behaviour only when you are sure of it, and say which engine. For example:
  - Postgres REPEATABLE READ is snapshot isolation and prevents phantoms.
  - InnoDB's default is REPEATABLE READ.
  - Postgres treats READ UNCOMMITTED as READ COMMITTED.
- Keep layers straight:
  - The SQL standard's definitions are not one engine's behaviour.
  - A B-tree property is not an LSM property.
  - A planner estimate is not an execution fact.
- Examples must follow the lesson's own advice.
- Don't pre-solve any diagnose prompt in this batch.
  - Each task lists what its lesson must NOT discuss. **Every lesson in this batch must also avoid the other two tasks' NOT lists.**
  - Use different numbers and scenarios in the lesson.
  - Before committing, grep the lesson for each rubric remedy, and grep `content/tracks` for the prompt's key terms.
- Don't refer to "a later lesson" unless a `comingSoon` title or an existing lesson names it. Link to existing lessons instead.

### Quiz (`content/exercises/<slug>-quiz.yaml`)

- **Header:** `type: quiz`, `lessons: [<slug>]`, `ladderOrder: 1`.
- **Questions:** 5 judgement questions, each with 4 choices.
  - **No recall.** No question may be answerable by recalling a lesson sentence or pitfall. Use scenarios, numbers and facts the lesson doesn't contain. Ask "why" or "what would you observe" rather than "which fix" when the fix is a lesson pitfall.
  - **No outside trivia.** No question may need a fact that neither the lesson nor the stem supplies. If one is needed, put it in the stem.
  - **Distractors:**
    - Each is a confident, plausible, related-but-wrong mechanism of similar specificity.
    - None labels its own mistake, states an absurd rule, or contradicts the stem.
    - None is secretly correct under an unstated default. State the needed settings (engine, isolation level, page size) in the stem.
  - The correct choice must not be the only one that echoes the lesson's keywords, nor the only worked derivation.
  - Every premise in a stem must be literally true.
- **Choice lengths:** the correct choice must be neither the longest nor the shortest in at least 4 of the 5 questions. Measure this for the FINAL version and put the table in your report.
- **Explanations:** 1–2 sentences each, describing the distractors accurately.
- **Answer key:**
  - At least 3 distinct indexes, with no run of three identical indexes and no obvious sequence.
  - Re-check it after any rewrite.
  - It must not match any existing key. List the existing keys with:
    `for f in content/exercises/*-quiz.yaml; do grep 'answer:' $f | awk '{print $2}' | tr '\n' ','; echo; done | sort`
- **Flashcards:** 8, with each side ≤200 characters and lowercase-with-dashes ids.
  - No front may duplicate one anywhere in `content/exercises`. Check with `grep -h "front:" content/exercises/*.yaml`.
  - `sql-vs-nosql-quiz.yaml` already has flashcards; check its fronts in particular.

### Diagnose prompt (`content/exercises/<prompt-slug>.yaml`)

- **Fields:** `type: design-prompt`, `kind: diagnose`, `lessons: [<slug>]`, `ladderOrder: 2`.
- **`prompt`:** give the symptoms and environment with numbers, and ask the learner to explain the cause, show the arithmetic, say how to confirm it, and give fixes with trade-offs.
  - The prompt must describe symptoms only. **It must never name the mechanism the learner is asked to find.**
  - Environment facts such as the engine, isolation level, sizes and rates are fine.
- **`hint`:** one nudge that doesn't state the answer.
- **`rubric`:** 5 points.
- **`reference`:** ≤300 words by `wc -w` on the reference block only. It must:
  - match the rubric point by point;
  - show all its arithmetic, correctly;
  - model its own scenario: every number in it comes from the prompt or is derived from it in the reference;
  - be internally consistent;
  - hedge engine-specific behaviour.
- Copy the layout of `content/exercises/diagnose-uneven-backend-load.yaml`.

### Wiring

Each lesson task does the following:
- **`content/tracks/cs-fundamentals/track.yaml`:**
  - appends its slug to `databases.lessons`;
  - removes its own title from `databases.comingSoon`;
  - the task that empties the list deletes the `comingSoon` key.
- **`src/lib/content/index.test.ts`:** adds the lesson's entry to the `CSF` record, in track order.
- **`e2e/layout.spec.ts`:** adds `/cs-fundamentals/<slug>/` and both exercise pages to `PAGES`.
- **`e2e/visualizers.spec.ts`:** if the lesson embeds a visualizer, adds `{ path, final }` to `PAGES`.

## Review Focus

1. **The tracks e2e check uses a Databases title as its coming-soon example.**
   - `e2e/tracks.spec.ts` currently checks `getByText('Indexes & B-trees')` as a coming-soon title, and that title becomes a lesson link in Task 2. Task 2 switches the assertion to a Machine & math title ("The memory hierarchy").
   - Task 4 adds a check that "Query planning" links to `/cs-fundamentals/query-planning/`.
   - "Coming soon" must still appear, from Machine & math.
2. **`b-tree-insert` has a variable-width bottom level.** Up to 4 nodes sit at the bottom, and an overflowing node briefly holds 3 keys. Nodes must not overflow or wrap unpredictably at 320px.
   - Height is reserved for 3 levels from step 0, so it stays constant.
   - Task 1 measures height and horizontal scroll at every step at 320, 375 and 1280px on a lesson-width container.
3. **The lesson must match the visualizer's tree states exactly.** Task 1 pins every level of every step. Task 2 copies the insertion order and the final tree from Task 1's table and greps the lesson for them.
4. **Pre-solving within the batch.** The three prompts cover random-key inserts outgrowing the cache, write skew under snapshot isolation, and a function call on an indexed column. Each is the natural "next sentence" of one of the three lessons. Each lesson task must check its lesson against all three NOT lists, not just its own.
5. **Engine-specific isolation semantics.** Postgres and InnoDB differ: Postgres REPEATABLE READ is snapshot isolation, while InnoDB REPEATABLE READ uses locking reads for some statements. Any isolation claim names the engine or says "SQL standard". Task 3's review checks every isolation claim in the lesson, quiz and reference.

---

### Task 1: `b-tree-insert` visualizer

**Files:**
- Create: `src/lib/visualizers/btree-steps.ts`, `src/lib/visualizers/btree-steps.test.ts`
- Create: `src/components/visualizers/btree-view.tsx`
- Modify: `src/lib/visualizers/kinds.ts`, `src/components/visualizers/visualizer.tsx`

**Interfaces:**
- Produces `bTreeInsertSteps(): BTreeStep[]` and the kind `b-tree-insert`.
- The final caption below is consumed by Task 2 (in the e2e spec).

**Pattern.** Follow the existing visualizers exactly: `src/lib/visualizers/{tcp-steps,pt-steps,mutex-steps}.ts` with their tests, and `src/components/visualizers/{tcp-view,pt-view,mutex-view}.tsx`. (`tree-steps.ts` is an unrelated Algorithms visualizer; don't modify it.)
- Each generator is pure and returns steps with a `caption`. The last step has `done: true`.
- Captions are in the past tense. Counts and plurals are derived from state.
- **Constant height.** The figure height is constant at 320, 375 and 1280px, with no sideways scroll.
  - Reserve the height of 3 levels from step 0.
  - If a caption or the stats line wraps at narrow widths, reserve its height, as `tcp-view.tsx` does with `max-[374px]:min-h-8`.
- **State is shown as text as well as colour.**
  - White text uses blue-600 `#2563eb`, amber-700 `#b45309`, emerald-700 `#047857`, purple-600 `#9333ea`, red-700 `#b91c1c` or slate-600 `#475569`.
  - Red text in dark mode gets `dark:text-red-400`.
- **Accessibility.** Put one dynamic `aria-label` on a `role="img"` container that summarises all the state. Put no `aria-label` on children or on plain elements, and no unlabeled `role="group"`.

**Constants:**
- An order-3 B-tree: each node holds at most 2 keys and has at most 3 children.
- A node that reaches 3 keys overflows. It splits into a left node with its smallest key and a right node with its largest key, and the middle key moves up into the parent. If the overflowing node is the root, the middle key becomes a new root.
- Insert the keys 50, 20, 70, 10, 30, 60, 40 and 80, in that order.

```ts
export interface BTreeStep {
  levels: number[][][]          // levels[0] is the root level; each level lists its nodes left to right; each node lists its keys ascending
  inserting: number | null      // the key being inserted in this step, else null
  focus: { level: number; node: number } | null
  overflow: boolean             // true while the focused node holds 3 keys
  splits: number; height: number
  caption: string; done?: boolean
}
```

The generator must build a real B-tree (nodes with keys and children), not hard-coded levels. It derives `levels` by walking the tree level by level.

Pin every step in the test: `levels` (exactly), `inserting`, `focus`, `overflow`, `splits`, `height` and the caption.

| # | levels | inserting | focus | overflow | splits | height | caption |
|---|---|---|---|---|---|---|---|
| 0 | `[[[]]]` | null | null | false | 0 | 1 | `An empty order-3 B-tree: each node held at most 2 keys` |
| 1 | `[[[50]]]` | 50 | (0,0) | false | 0 | 1 | `Inserted 50 into the empty root` |
| 2 | `[[[20,50]]]` | 20 | (0,0) | false | 0 | 1 | `Inserted 20; the root leaf held [20, 50]` |
| 3 | `[[[20,50,70]]]` | 70 | (0,0) | true | 0 | 1 | `Inserted 70; the root leaf overflowed with [20, 50, 70]` |
| 4 | `[[[50]],[[20],[70]]]` | null | (0,0) | false | 1 | 2 | `The root split: 50 moved up into a new root above [20] and [70]` |
| 5 | `[[[50]],[[10,20],[70]]]` | 10 | (1,0) | false | 1 | 2 | `Inserted 10 into leaf [20], giving [10, 20]` |
| 6 | `[[[50]],[[10,20,30],[70]]]` | 30 | (1,0) | true | 1 | 2 | `Inserted 30; leaf [10, 20, 30] overflowed` |
| 7 | `[[[20,50]],[[10],[30],[70]]]` | null | (0,0) | false | 2 | 2 | `The leaf split into [10] and [30], and 20 moved up into the root` |
| 8 | `[[[20,50]],[[10],[30],[60,70]]]` | 60 | (1,2) | false | 2 | 2 | `Inserted 60 into leaf [70], giving [60, 70]` |
| 9 | `[[[20,50]],[[10],[30,40],[60,70]]]` | 40 | (1,1) | false | 2 | 2 | `Inserted 40 into leaf [30], giving [30, 40]` |
| 10 | `[[[20,50]],[[10],[30,40],[60,70,80]]]` | 80 | (1,2) | true | 2 | 2 | `Inserted 80; leaf [60, 70, 80] overflowed` |
| 11 | `[[[20,50,70]],[[10],[30,40],[60],[80]]]` | null | (0,0) | true | 3 | 2 | `The leaf split into [60] and [80], and 70 moved up; the root overflowed with [20, 50, 70]` |
| 12 | `[[[50]],[[20],[70]],[[10],[30,40],[60],[80]]]` | null | (0,0) | false | 4 | 3 | `The root split: 50 moved up into a new root, and the tree grew to 3 levels` |
| 13 | same as 12 | null | null | false | 4 | 3 | `Done: 8 keys and 4 splits; the tree grew taller only when the root split` |

In step 11, the tree is momentarily invalid: the root holds 3 keys and has 4 children. The generator represents this transient state before splitting the root.

**Compute it:**
- Descend from the root to the leaf, choosing the child by key comparison.
- Insert in sorted position.
- On overflow, split and push the middle key up, repeating up the path.
- Derive the counts and the final caption from state.
- Throw if a node ever holds more than 3 keys, or if an in-order walk of the final tree isn't sorted.

**View:**
- Three fixed-height rows, one per level. Empty rows are reserved but blank.
- Each node is a box showing its keys separated by `·` (or `empty` for the empty root).
- The focused node is highlighted. An overflowing node is outlined in red and marked `overflow` in red text.
- Lines from parents to children are optional. If you draw them, compute them from the real tree, not from `levels`. Expose `children` in the step only if needed, and pin it in the test too.
- Below the tree, the stats line reads `Inserting k` or `—`, then ` · Splits s · Height h`.
- At 320px the widest level has 4 nodes. Size boxes to fit it, with no horizontal scroll.

**Title:** `"B-tree insert: leaf splits and a root split"`

- [ ] **Step 1: Write the failing test.** It pins all 14 steps in the table above, including a length check of 14.
- [ ] **Step 2: Run it and check it fails.** Run `npx vitest run src/lib/visualizers/btree-steps.test.ts`. Expected: FAIL, because the module is missing.
- [ ] **Step 3: Implement** the generator, the view and the wiring (`kinds.ts`, plus the component and switch case in `visualizer.tsx`).
- [ ] **Step 4: Verify.**
  - Run `npm test`, `npm run typecheck` and `npm run lint`; all must pass.
  - Render the visualizer on a throwaway page whose content column matches a lesson page's width, and check it with Playwright. Don't commit the page.
  - Measure the height at every step at 320, 375 and 1280px, and confirm it is constant with no sideways scroll. Put the table in the report.
  - Save `btree-320.png`, `btree-375.png` and `btree-1280.png` (at step 11, the widest) to the scratchpad.
- [ ] **Step 5: Commit.** Use the message `feat(visualizers): b-tree-insert step-through visualizer` with the trailer.

---

### Task 2: `indexes-btrees`

**Files:**
- Create: `content/tracks/cs-fundamentals/lessons/indexes-btrees.mdx`, `content/exercises/indexes-btrees-quiz.yaml`, `content/exercises/diagnose-slowing-bulk-import.yaml`
- Modify: `content/tracks/cs-fundamentals/track.yaml`, `src/lib/content/index.test.ts`, `e2e/layout.spec.ts`, `e2e/visualizers.spec.ts`, `e2e/tracks.spec.ts`

**Lesson:** "Indexes & B-trees", `level: intermediate`, `prerequisites: [data-in-memory]`.

**Visual:**
- `<Visualizer kind="b-tree-insert" />`, plus a text diagram of a 3-level B-tree lookup: the root, an internal node, then a leaf pointing to rows.
- The lesson must describe the visualizer's scenario exactly:
  - an order-3 tree (at most 2 keys per node);
  - the inserts 50, 20, 70, 10, 30, 60, 40, 80;
  - the root splits at 70 (50 moves up);
  - the leaf split at 30 (20 moves up);
  - the leaf split at 80, with 70 moving up, then the root split at the same insert (50 moves up), so the height is 3;
  - 4 splits in all.
- State that real pages hold hundreds of keys, not 2.
- Add `{ path: '/cs-fundamentals/indexes-btrees/', final: 'Done: 8 keys and 4 splits; the tree grew taller only when the root split' }` to `e2e/visualizers.spec.ts`.

**Cover:**
- Why a full scan is O(n), and what an index buys. Link `[Complexity & Big-O](/cs-fundamentals/complexity/)`.
- B-tree structure:
  - sorted keys in fixed-size pages (hedge the size: Postgres 8 KB, InnoDB 16 KB);
  - high fan-out, so the tree is shallow;
  - all leaves at the same depth;
  - B+-tree leaves linked for range scans (most engines' "B-tree" is a B+-tree).
- Height arithmetic. With an illustrative fan-out of 300 (hedged), 300³ = 27,000,000 < 100,000,000 ≤ 300⁴ = 8,100,000,000, so 100 million keys need 4 levels. A lookup is about 4 page reads, and the upper levels are usually cached.
- Lookups, range scans and ORDER BY served by index order.
- **Composite indexes and the leftmost-prefix rule.** Go deeper than `sql-vs-nosql.mdx`'s `(customer_id, created_at DESC)` example. Explain why `WHERE created_at > …` alone can't use that index efficiently, and how equality-then-range column order matters.
- Covering (index-only) scans. Hedge on Postgres needing the visibility map.
- Clustered vs secondary indexes. InnoDB stores rows in the primary-key B-tree, and secondary indexes hold the primary key. Postgres uses a heap with separate indexes.
- **The write cost.** Every index is updated on every insert or update of its columns. Splits happen when a page fills.
- **Hash indexes and LSM trees, one short paragraph.** Hash indexes support equality only. LSM trees (RocksDB, Cassandra) favour writes and compact in the background.
- Link `[SQL vs NoSQL](/system-design/sql-vs-nosql/)`.

**Example:**
- An `orders(id, customer_id, status, created_at, total)` table with 50,000,000 rows, an illustrative 100 bytes per row and 8 KB pages.
- Pages: 50,000,000 × 100 ÷ 8,192 ≈ 610,000 pages for a full scan.
- With an index on `(customer_id, created_at)`: tree height with fan-out 300 is 4 (300³ = 27 M < 50 M). Fetching one customer's 40 most recent orders reads about 4 index pages plus up to 40 heap pages.
- Show the SQL (`CREATE INDEX`, the query), and say which of three queries can use the index:
  - equality on `customer_id`;
  - a range on `created_at` alone;
  - `customer_id = ? AND created_at > ?`.
- Show all the arithmetic.

**Diagnose prompt `diagnose-slowing-bulk-import`:**
- **Scenario.**
  - A team bulk-loads 300 million events into a PostgreSQL table whose primary key is a random UUID (version 4).
  - The import runs at about 40,000 rows/s with CPU near 90%, then slows steadily once the primary-key index outgrows the 8 GB of memory available for caching pages.
  - When the index reaches about 20 GB, the import runs at about 8,000 rows/s. The disk is pinned near its 5,000 random reads per second, and CPU sits at 20%.
  - A second test table with a time-ordered key (a bigint sequence) loads the same data at a steady ~40,000 rows/s.
- **Ask the learner to:**
  - explain why the import slows, and why the second table doesn't;
  - estimate the rate: about 8 of 20 GB of leaf pages are cached, so 60% of inserts touch an uncached leaf, and each such insert costs about 1 random read; 5,000 ÷ 0.6 ≈ 8,300 rows/s, which matches the observed ~8,000;
  - say how to confirm it (cache hit ratio for the index, read IOPS, `pg_stat_io` or `pg_statio_user_indexes`, hedged by version);
  - give fixes with trade-offs: time-ordered keys (UUIDv7, ULID or a sequence), loading sorted by key, building secondary indexes after the load, more memory, and the cost that random splits leave pages part-full (hedge the fill).
- **The lesson must NOT discuss:**
  - random vs sequential key insertion and where in the tree inserts land;
  - UUIDs or other random identifiers as keys;
  - the page cache or buffer pool hit ratio for index pages;
  - how full pages are after splits, or fill factor;
  - bulk-load ordering.
- **The lesson may:** say that splits happen when a page fills, as the visualizer shows.
- **Also avoid** Task 3's and Task 4's NOT lists.

**Extra e2e (Review Focus 1):** in `e2e/tracks.spec.ts`, replace `getByText('Indexes & B-trees')` with `getByText('The memory hierarchy')`, keep the "Coming soon" check, and add a check that "Indexes & B-trees" links to `/cs-fundamentals/indexes-btrees/`.

**Commit:** `feat(cs-fundamentals): indexes and B-trees lesson`.

---

### Task 3: `transactions-isolation`

**Files:**
- Create: `content/tracks/cs-fundamentals/lessons/transactions-isolation.mdx`, `content/exercises/transactions-isolation-quiz.yaml`, `content/exercises/diagnose-double-booking.yaml`
- Modify: `content/tracks/cs-fundamentals/track.yaml`, `src/lib/content/index.test.ts`, `e2e/layout.spec.ts`

**Lesson:** "Transactions & isolation levels", `level: advanced`, `prerequisites: [indexes-btrees]`.

**Cover:**
- **What a transaction is to the engine.** Atomicity and durability via the write-ahead log (WAL): log first, then a commit record flushed to disk. Hedge fsync cost. Go deeper than `sql-vs-nosql.mdx`'s ACID table and link it.
- The read anomalies: dirty read, non-repeatable read, phantom read, and lost update (read-modify-write).
- The SQL standard levels and which anomalies each forbids, as a table. Then the engine reality, hedged and named:
  - Postgres READ COMMITTED is the default;
  - Postgres REPEATABLE READ is snapshot isolation and also prevents phantoms;
  - Postgres treats READ UNCOMMITTED as READ COMMITTED;
  - InnoDB defaults to REPEATABLE READ;
  - SERIALIZABLE in Postgres uses SSI and can abort with serialization failures that the application retries.
- **MVCC.** Row versions, snapshots, and why readers don't block writers. Old versions need cleanup (VACUUM in Postgres, purge in InnoDB; hedged).
- **Locks.** Row locks and `SELECT … FOR UPDATE` for read-modify-write on one row, atomic `UPDATE … SET x = x - 1 WHERE x > 0`, and deadlocks between transactions with the engine aborting one. Link `[Concurrency primitives](/cs-fundamentals/concurrency-primitives/)`.
- Keep transactions short, and don't hold one open across network calls.
- Link `[Consistency models](/system-design/consistency-models/)` (serializability vs linearizability) and `[Distributed transactions](/system-design/distributed-transactions/)`.

**Example:** a lost update on an inventory counter, as a two-session timeline in Postgres READ COMMITTED.
- Both sessions read `stock = 5`, and both write `stock = 4` after selling one each, so stock should be 3.
- Then show three fixes:
  - an atomic `UPDATE … SET stock = stock - 1 WHERE id = $1 AND stock > 0`;
  - `SELECT … FOR UPDATE`;
  - REPEATABLE READ, where the second writer fails with a serialization error and retries. Name the Postgres behaviour precisely.
- Use different numbers from `sql-vs-nosql.mdx`'s "stock as 1".

**Diagnose prompt `diagnose-double-booking`:**
- **Scenario.**
  - A meeting-room service runs on PostgreSQL at REPEATABLE READ.
  - To book, a transaction runs `SELECT count(*) FROM bookings WHERE room_id = $1 AND tstzrange(starts_at, ends_at) && $2`. If the count is 0, it runs `INSERT INTO bookings …`, then commits. Each booking transaction takes about 25 ms.
  - Last month, 18 of 60,000 bookings (0.03%) overlapped another booking for the same room.
  - In every case, the two transactions' start times were within 25 ms of each other. No errors were logged.
- **Ask the learner to:**
  - explain how both transactions saw no conflict and both committed;
  - name the anomaly;
  - explain why this isolation level doesn't stop it, and why it is rare (18 ÷ 60,000 = 0.03%, and only transactions that overlap within ~25 ms on the same room and time);
  - say how to confirm it (reproduce with two `psql` sessions; correlate start and commit times);
  - give fixes with trade-offs: SERIALIZABLE with retry on SQLSTATE 40001; a Postgres exclusion constraint (`EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at) WITH &&)`, which needs `btree_gist` for the equality part); locking the room row with `SELECT … FROM rooms WHERE id = $1 FOR UPDATE`; and materialising time slots with a unique constraint.
- **The lesson must NOT discuss:**
  - write skew, or any anomaly where two transactions each read a condition and then write different rows;
  - check-then-insert races, or invariants spanning multiple rows;
  - booking or scheduling examples;
  - exclusion constraints;
  - locking a parent or "guard" row to serialize inserts;
  - materialising conflicts.
- **The lesson may:**
  - say that SERIALIZABLE prevents all anomalies of concurrent execution, at the cost of aborts and retries;
  - describe `SELECT … FOR UPDATE` on the same row being updated.
- **Also avoid** Task 2's and Task 4's NOT lists.

**Commit:** `feat(cs-fundamentals): transactions and isolation levels lesson`.

---

### Task 4: `query-planning`

**Files:**
- Create: `content/tracks/cs-fundamentals/lessons/query-planning.mdx`, `content/exercises/query-planning-quiz.yaml`, `content/exercises/diagnose-slow-login.yaml`
- Modify: `content/tracks/cs-fundamentals/track.yaml` (append the slug and delete the now-empty `databases.comingSoon` key), `src/lib/content/index.test.ts`, `e2e/layout.spec.ts`, `e2e/tracks.spec.ts`

**Lesson:** "Query planning", `level: advanced`, `prerequisites: [indexes-btrees]`.

**Cover:**
- **What happens to a SQL statement.** Parse, rewrite, plan, execute. A declarative query has many equivalent plans.
- **The cost model**, hedged as Postgres-flavoured: estimated pages and rows, with sequential reads cheaper than random ones (`seq_page_cost` vs `random_page_cost`, defaults 1 and 4 in Postgres).
- **Statistics:**
  - row counts, distinct values, most-common values and histograms;
  - selectivity estimates;
  - `ANALYZE` / autovacuum keeping them fresh (hedged);
  - why estimates can be wrong, e.g. correlated columns.
- **Access paths:** sequential scan, index scan, index-only scan and bitmap scan. Explain why the planner picks a seq scan when a predicate matches a large fraction of rows.
- **Join algorithms:** nested loop (with an inner index), hash join, and merge join. Say when each wins.
- **Reading `EXPLAIN` and `EXPLAIN (ANALYZE, BUFFERS)`:** estimated vs actual rows, loops, and where the time went.
- Plan caching for prepared statements (generic vs custom plans in Postgres; hedged), in one short paragraph.
- Link `[Indexes & B-trees](/cs-fundamentals/indexes-btrees/)` and `[SQL vs NoSQL](/system-design/sql-vs-nosql/)`.

**Example:** two parts.
1. **The index vs seq scan crossover.** The table has 10,000,000 rows at an illustrative 100 bytes each and 8 KB pages, so ≈ 122,000 pages.
   - A seq scan costs about 122,000 sequential page reads, ≈ 122,000 cost units at `seq_page_cost` 1.
   - A predicate matching 1% (100,000 rows) on uncorrelated data needs up to 100,000 random heap reads, ≈ 400,000 cost units at `random_page_cost` 4. So the seq scan wins.
   - At 0.01% (1,000 rows), the index wins.
   - Show the arithmetic, and say these are simplified cost units.
2. **An `EXPLAIN ANALYZE` of a join between `orders` and `customers`,** annotated:
   - where the hash join builds;
   - a node where estimated rows (e.g. 50) are far from actual rows (e.g. 48,000);
   - why that misestimate led to a nested loop.

   Use illustrative but internally consistent numbers.

**Diagnose prompt `diagnose-slow-login`:**
- **Scenario.**
  - A `users` table in PostgreSQL has 30,000,000 rows, with a unique B-tree index on `email`.
  - A deploy changed the login query from `WHERE email = $1` to `WHERE lower(email) = lower($1)`, to make login case-insensitive.
  - Login p50 went from 2 ms to about 6 s, database CPU hit 100% on all 32 cores, and logins began timing out at the 10 s limit.
  - Peak login traffic is 50 per second.
- **Ask the learner to:**
  - explain the slowdown;
  - estimate the cost: scanning 30 M rows at an illustrative ~5 M rows/s per core ≈ 6 s of CPU per login. At 50 logins/s that needs 50 × 6 = 300 core-seconds per second against 32 cores, so the queue grows. The old lookup was about 4 index page reads;
  - say how to confirm it (`EXPLAIN` showing a Seq Scan with `Filter: (lower(email) = …)`, and `pg_stat_statements`);
  - give fixes with trade-offs: an expression index `CREATE INDEX CONCURRENTLY … ON users (lower(email))` (and whether it should be UNIQUE, given existing emails that differ only by case); the `citext` type; storing a normalised email column; and rolling back first.
- **The lesson must NOT discuss:**
  - wrapping indexed columns in functions, expressions or casts (sargability);
  - expression or functional indexes;
  - case-insensitive matching, `lower()` or `citext`;
  - implicit type casts that disable index use.
- **Also avoid** Task 2's and Task 3's NOT lists. For example, the lesson must not explain slowdowns from random-key inserts.
- **Extra e2e (Review Focus 1):** in `e2e/tracks.spec.ts`, check that "Query planning" links to `/cs-fundamentals/query-planning/`. "Coming soon" must still appear, from Machine & math.
- **Commit:** `feat(cs-fundamentals): query planning lesson`.
