# Estimation Drills: Design

**Status:** approved in chat on 2026-10-25. This covers the "Back-of-the-envelope estimation drills" item of Phase 2 in `docs/roadmap.md`.

## Goal

Learners practise back-of-the-envelope estimation by working it out themselves, not by picking from choices.

- **The lesson.** A new System Design lesson teaches the method and the reference numbers.
- **The drills.** Six drills each give a scenario and 2–4 steps. For every step the learner types a number and picks a unit. The answer counts when it is within a tolerance band of the reference.
- **Progress.** Drills are auto-graded and recorded like quizzes, so they count toward mastery and enter spaced review.

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **A new exercise type, `estimate`, with typed numeric answers.** | Typing the number tests the arithmetic. Picking among choices only tests recognition. |
| D2 | **Answers count by order of magnitude, within ×`tolerance` either way. The default is 2.** | Estimation is about the right order of magnitude, so a ±10% rule would punish good rounding. |
| D3 | **One try per step. Each step's reference answer is fixed and doesn't depend on the learner's earlier inputs.** | A mistake in step 1 doesn't spill into later steps, and grading stays simple. |
| D4 | **Results go through the existing `completeQuiz` path, with no flashcards.** | Mastery, solved status and review scheduling work unchanged in both stores, so no migration is needed. |
| D5 | **One new lesson, `estimation`, in System Design Foundations, plus six drills.** | The lesson teaches the method and the drills practise it. Each drill also links to the lesson whose topic it uses. |
| D6 | **Byte prefixes are decimal (KB = 10³), and the lesson says so.** | It matches the rounding in the lesson and keeps the arithmetic in powers of ten. |
| D7 | **Everything ships in one PR.** | The platform is small, and it is reviewed alongside real content. |

## Content model

Each drill is one file, `content/exercises/estimate-<topic>.yaml`. `estimate` is a fourth member of the Velite `Exercise` discriminated union. It is `.strict()`, so unknown fields still fail the build.

```yaml
slug: estimate-photo-storage
type: estimate
title: "Estimate: photo storage"
lessons: [estimation, sql-vs-nosql]   # the first entry is the home lesson
ladderOrder: 3
scenario: |                            # markdown
  A photo app gets **5 M uploads/day**, averaging **2 MB**…
steps:                                 # 2–4, answered in order
  - id: daily-storage
    ask: "Storage added per day?"
    unit: bytes                        # see Units
    answer: 1.0e13                     # in base units
    tolerance: 2                       # optional, default 2; must be 1.5–10
    work: "5 M × 2 MB = 10 TB/day"     # worked arithmetic, shown after Check
takeaway: "…"                          # 1–2 sentences, shown at the end
```

**Units and their picker prefixes:**

| `unit` | Base | Picker options |
|---|---|---|
| `bytes` | B | B, KB, MB, GB, TB, PB (decimal) |
| `bytes/s` | B/s | B/s, KB/s, MB/s, GB/s |
| `bits/s` | bit/s | bit/s, Kbit/s, Mbit/s, Gbit/s, Tbit/s |
| `requests/s` | req/s | /s, K/s, M/s |
| `count` | 1 | ×1, thousand, million, billion |
| `seconds` | s | ms, s, min, h, day |

**Validation, V15** (in `validateContent`):
- Each drill has 2–4 steps, and step ids are unique within it.
- `answer` is finite and > 0.
- `tolerance`, when given, is between 1.5 and 10.
- `unit` is one of the units above.
- `work` contains the reference value, as it appears when `formatAmount(answer, unit)` writes it (e.g. "10 TB"). This catches worked arithmetic that has drifted from the answer.
- `scenario` and `takeaway` are non-empty.

## Logic (`src/lib/logic/estimate.ts`)

These are pure functions with unit tests:

- **`parseAmount(text): number | null`**
  - Accepts `7.5`, `7,500`, `1e4` and surrounding spaces.
  - Rejects empty input, non-numeric text, and values that are not finite.
- **`UNIT_PREFIXES[unit]: { label: string; scale: number }[]`:** the picker options in the table above.
- **`withinTolerance(value, answer, tolerance): boolean`**
  - `value > 0 && max(value / answer, answer / value) <= tolerance`.
  - Exactly ×tolerance counts as correct.
- **`formatAmount(base, unit): string`**
  - Uses the largest prefix that keeps the number ≥ 1.
  - Shows at most 3 significant figures (e.g. `7.3 TB`, `230 /s`).
- **`scoreEstimate(steps, values): { correct: number; total: number }`.**

## UI

**`EstimateWorkspace`** is chosen in `exercise-workspace.tsx`, in the same way as the quiz and design workspaces.

- **Header:** the title, status icon and lesson badges, as for a quiz. The scenario is rendered as markdown.
- **Steps** appear one at a time, and earlier steps stay visible above the current one.
  - Each step has a labelled number input (`inputMode="decimal"`) and a unit `<select>` that defaults to the middle prefix.
  - **Check** is disabled while the input is empty or doesn't parse. A value of 0 or below shows an inline error.
- **After Check:**
  - The step locks and shows ✓ or ✗ as text and an icon, not colour alone.
  - It shows the reference value, the line "Within 2× counts" (using the step's own tolerance), and the `work` line.
  - Focus moves to the step's result.
- **After the last step:**
  - The page shows "N of M right" and the `takeaway`, and `completeQuiz(slug, [], { correct, total }, now)` saves the result.
  - On success a toast says "Saved to your progress". On failure an error toast appears, as for a quiz.
  - **Try again** resets the steps locally, and the next completion records a new attempt.
- **The result label** reuses the quiz mapping: all correct is "solved alone", some correct is "solved with help", none correct is "needs another try".

## Integration

Everywhere the exercise type is switched on:

- **Types:** `src/lib/types.ts` gains `EstimateStep`, `EstimateExercise` and `EstimateDoc`, and the `ExerciseMeta` union is extended.
- **Content:** in `src/lib/content/index.ts` and `validate.ts`, the doc mapping and V15.
- **Review queue:** `src/lib/logic/review-queue.ts` gains a `DueItem` kind `'estimate'`.
  - Today, every type that isn't a problem or a quiz falls through to `design`, so the new kind must be explicit.
  - The Today card links to the drill page.
- **Labels:** `src/lib/logic/exercise-label.ts`, the type badge "Estimate", the `/exercises` table and filter, and `ladder-list.tsx`.
- **No changes needed:**
  - `check:deploy` lists exercise pages from the files.
  - Store contract: `completeQuiz` is unchanged.
  - Supabase: no migration.
- **Docs:** `CONTRIBUTING.md` gains a V15 row and a short "Estimation drills" authoring section.

## Content

**The lesson, `content/tracks/system-design/lessons/estimation.mdx`:**
- **Placement:** title "Back-of-the-envelope estimation", level beginner, prerequisites `[client-server-http]`. It is added to `track.yaml` as the 5th Foundations lesson, after `sql-vs-nosql`.
- **Sections:** these are required by V9.
  - **Intuition:** why rough numbers decide designs early.
  - **Visual:** a static reference ladder covering:
    - powers of two against powers of ten;
    - latency orders (L1 → RAM → SSD → same-datacenter round trip → cross-continent round trip);
    - time conversions (86,400 s/day ≈ 10⁵, about 2.6 M s/month).
  - **Example:** one walk-through from DAU to QPS, peak, storage and bandwidth.
  - **Pitfalls:** peak vs average, bits vs bytes, the replication factor, metadata vs payload.
  - **Tips & tricks:** round early, work in powers of ten, sanity-check against a known system.
- **Prefixes:** the lesson states the decimal-prefix convention (D6).

**The quiz, `estimation-quiz.yaml`:** 4–5 questions, plus flashcards for the reference numbers.

**The drills:**

| Drill | Steps | Also links |
|---|---|---|
| `estimate-photo-storage` | storage/day → per year → with 3× replication | sql-vs-nosql |
| `estimate-peak-qps` | DAU → average QPS → peak QPS | load-balancing |
| `estimate-cache-memory` | hot set → RAM needed → cache nodes | caching |
| `estimate-video-egress` | concurrent streams × bitrate → egress → CDN share | dns-cdn |
| `estimate-shard-count` | data ÷ node capacity, write QPS ÷ node limit → shards | replication-sharding |
| `estimate-log-volume` | events/s × size → logs/day → retained total | observability |

**Writing rules:**
- **Numbers.**
  - Scenario numbers must differ from the numbers in any lesson and in any design prompt or reference. For example, pastebin uses 2 M × 10 KB.
  - A drill must not compute a design prompt's headline figure.
- **Steps.**
  - Each step's `work` reproduces its `answer` exactly, and the answer is written in the form `formatAmount` produces.
  - Steps depend only on the scenario and on earlier steps' reference answers. The step's `ask` says which earlier result to use.
- **Ambiguity.** Where a step could be read two ways, the scenario states the assumption, e.g. "peak is 3× average" or "replication factor 3".
- **Quiz rules.** The existing ones apply to `estimation-quiz`: the correct choice is not the longest, answer positions vary, and nothing is answerable only from the lesson's wording.
- **Review.** Every content file gets an opus accuracy review that re-does all the arithmetic, with one fix round.

**Effects on other content:**
- System Design grows to 16 lessons.
- The System Design placement quiz is unchanged. Placing out of Foundations also skips `estimation`, and its drills stay reachable from the lessons they also link to.

## Tests

- **Unit tests:**
  - `parseAmount`: comma, scientific, empty and non-numeric input.
  - `withinTolerance`: exactly ×2 passes, ×2.01 fails, and both directions.
  - `formatAmount`: prefix choice and significant figures.
  - `scoreEstimate`.
  - Every V15 rule, each with a failing fixture.
  - `resolveDue` with an estimate key.
  - Inventory: `estimation` exists in System Design Foundations, along with its quiz and the six `estimate-*` drills.
- **e2e:**
  - Open a drill and answer step 1 correctly and every later step wrongly, using values from `.velite/exercises.json`. Expect one ✓, the rest ✗, every work line, and "1 of M right". The exercise then shows as attempted on `/exercises/`.
  - The layout spec at 375 px covers `/system-design/estimation/`, `/exercises/estimation-quiz/` and every `estimate-*` page.

## Out of scope

- Steps whose reference answer depends on the learner's earlier inputs.
- Free-form unit entry.
- Timed drills.
- Estimation drills in other tracks.
- A new visualizer.

## Success criteria

- Learners can complete each drill. A result in the ×2 band counts as correct, and the outcome feeds mastery and review.
- All six drills and the lesson pass validation and the accuracy review.
- `npm test`, typecheck, lint, e2e and `check:deploy` all pass. `check:deploy` should report 261 + 8 = 269 pages: the lesson, its quiz and the six drills.
