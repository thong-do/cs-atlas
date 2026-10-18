# CS Fundamentals Track — Design

**Status:** approved in chat on 2026-10-17. This is phase 2c of `docs/roadmap.md`.

## Goal

Add a third track, **CS Fundamentals**, for working developers who want to fill gaps in their CS background: self-taught and bootcamp engineers, and people preparing for interviews. Each lesson explains what the machine, the operating system, the network or the database actually does underneath your code, and the bugs and performance problems that follow from it.

With 16 lessons, all three tracks meet the Phase 2 exit criterion of at least 12 lessons.

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Standalone track with no cross-track prerequisites.** Lessons link to related System Design and Algorithms lessons instead of requiring them. | Cross-track prerequisites push lessons to the end of a single-track learner's recommendations. That is the Caching problem fixed in PR #20. |
| D2 | **Slug `cs-fundamentals`, title "CS Fundamentals", `order: 3`.** | Existing tracks keep their positions, so nothing on the existing pages reshuffles. |
| D3 | **Concept-lesson format:** Intuition, Visual, Example, Pitfalls, Tips & tricks. About 1,100–1,400 words, with a hard ceiling of 1,400. | V9 already requires this for non-algorithms tracks, so no validation rule changes. |
| D4 | **Overlap with System Design is handled by linking.** The CS lesson goes one layer deeper, and the two must agree. | Live lessons aren't rewritten. Learners can enter from either track. |
| D5 | **Every lesson has a quiz (5 questions, 8 flashcards) and an explain/diagnose prompt.** The prompt reuses the `design-prompt` type with the new `kind: diagnose`. | Working developers learn by reasoning through symptoms. The diagnose prompt reuses the rubric, reference and self-grading UI. |
| D6 | **Delivery:** four batches, each its own PR. Each lesson is reviewed for accuracy by opus with one fix round. Each batch also gets a final whole-branch review. | This process caught real errors in every System Design batch. |

## Curriculum (16 lessons, 5 modules)

| Module (slug) | Lesson slug | Title | Level | Prerequisites (in-track) | Visualizer |
|---|---|---|---|---|---|
| Foundations (`foundations`) | `complexity` | Complexity & Big-O | beginner | — | — |
| | `data-in-memory` | Data in memory | beginner | complexity | — |
| Operating systems (`operating-systems`) | `processes-threads` | Processes & threads | beginner | data-in-memory | — |
| | `cpu-scheduling` | CPU scheduling | intermediate | processes-threads | — |
| | `virtual-memory` | Virtual memory | intermediate | processes-threads | `page-table` |
| | `concurrency-primitives` | Concurrency primitives | intermediate | processes-threads | `mutex` |
| Networking (`networking`) | `tcp-ip-stack` | The TCP/IP stack | beginner | — | — |
| | `tcp-vs-udp` | TCP vs UDP | intermediate | tcp-ip-stack | `tcp-handshake` |
| | `tls` | TLS | intermediate | tcp-vs-udp | — |
| | `http-versions` | HTTP/1.1, HTTP/2 and HTTP/3 | intermediate | tcp-vs-udp, tls | — |
| Databases (`databases`) | `indexes-btrees` | Indexes & B-trees | intermediate | data-in-memory | `b-tree-insert` |
| | `transactions-isolation` | Transactions & isolation levels | advanced | indexes-btrees | — |
| | `query-planning` | Query planning | advanced | indexes-btrees | — |
| Machine & math (`machine-math`) | `memory-hierarchy` | The memory hierarchy | intermediate | data-in-memory | — |
| | `number-representation` | Number representation | beginner | — | — |
| | `discrete-math-essentials` | Discrete math essentials | beginner | — | — |

**Ordering.** Modules ship in batches. A module that hasn't shipped yet appears as `comingSoon` titles on the track page. Prerequisites stay inside the track and always point to lessons in the same batch or an earlier one.

**Diagnose prompts.** There is one per lesson, each a concrete scenario with numbers, for example:
- "a service's p99 doubles under load"
- "this query stopped using its index"
- "a file upload is slow only over a long-distance link"

Every prompt must follow the content rules: arithmetic shown, internally consistent, and not answered by any lesson in any track.

## Platform change: `kind: diagnose`

- **Schema** (`velite.config.ts`): design-prompt exercises gain an optional `kind: 'design' | 'diagnose'`, defaulting to `'design'`. Existing files don't change.
- **Types and catalog:** `kind` flows through `DesignDoc` and the exercise catalog.
- **UI:**
  - The badge (`exercise-type-badge.tsx`) shows "Diagnose" when `kind` is `diagnose`.
  - In the exercises table filter, the "Design" option includes both kinds. A separate filter value is out of scope.
  - The design workspace says "Your answer" instead of "Your design" when `kind` is `diagnose`.
- **Tests:** a unit test checks the badge label for each kind, and an e2e test opens one diagnose prompt and checks its labels.

## Visualizers

Each follows the existing step-through pattern:
- a pure generator, plus pinned tests of a hand-traced sequence;
- constant figure height at 320, 375 and 1280 px, with no sideways scroll;
- state shown in text as well as colour, with white text at ≥4.5:1 contrast;
- one dynamic `aria-label` on any `role="img"`;
- captions in the past tense.

| Kind | Scenario (fixed in its batch's brief) |
|---|---|
| `page-table` | Translating virtual addresses through a single-level page table: a TLB hit, a TLB miss that fills from the table, then a page fault that loads from disk |
| `mutex` | Two threads incrementing a shared counter: first without a lock (a lost update), then with a mutex (correct, and the second thread blocks) |
| `tcp-handshake` | The three-way handshake, one data segment with its ACK, one retransmission after a lost segment, then the FIN close |
| `b-tree-insert` | Inserting keys into an order-3 B-tree until a leaf split and a root split occur |

## Wiring and tests per batch

- **`content/tracks/cs-fundamentals/track.yaml`:** created in batch 1, which also lists `comingSoon` titles for later modules. Each later batch appends its module.
- **`src/lib/content/index.test.ts` and `src/lib/logic/lessons.test.ts`:** update the track lists in batch 1. Add inventory assertions for the CS Fundamentals lessons, their tables of contents and their exercises.
- **e2e:**
  - `layout.spec.ts`: each lesson page and both of its exercise pages.
  - `visualizers.spec.ts`: final captions.
  - `tracks.spec.ts` and `roadmap.spec.ts`: three tracks are visible.
- **Content rules:** quiz answer keys must be unique across all quizzes, and flashcard fronts must be unique across `content/exercises`.

## Out of scope

- Placement quizzes; that's a separate later piece.
- Changing the System Design or Algorithms lessons beyond adding links.
- Code-execution exercises.
- A separate "Diagnose" filter value.

## Success criteria

- 16 CS Fundamentals lessons are live. Each has a visual, a quiz with flashcards and a diagnose prompt, and passes the accuracy review.
- `npm test`, typecheck, lint, e2e and `check:deploy` all pass after each batch.
- No lesson in any track pre-solves another track's prompts. Cross-track links resolve.
