# Phase 2a — Quizzes, Flashcards and Design Prompts: Design Spec

*Date: 2026-10-13 · Status: approved in brainstorming, awaiting written review*
*Roadmap: `docs/roadmap.md` §5, Phase 2, split into 2a (platform), 2b (System Design lessons) and 2c (CS Fundamentals lessons)*

## 1. Goal and success criteria

Add the practice types that the new tracks need, so lessons without good LeetCode problems can still be practised and remembered. Prove them on the existing Caching lesson.

**Done when:**

1. **Quizzes.** A learner can take a lesson quiz and see which answers were right or wrong, each question's explanation and the score. The result counts towards mastery, and the quiz enters review.
2. **Flashcards.** Finishing a quiz for the first time puts that quiz's flashcards into the review queue. On Today, a due flashcard can be flipped and rated.
3. **Design prompts.** A learner can write a design, compare it with a reference answer and grade themselves against a rubric. The answer is saved as a note, and the prompt enters review.
4. **Everything else keeps working.** Every existing LeetCode flow (solve, review, trainer, list, ladder, palette) is unchanged.
5. **Same behaviour signed in or out.** It works identically for guests (`DexieStore`) and signed-in users (`SupabaseStore`), with no storage-schema, Supabase-migration or backup-format change.
6. **Proof content.** The Caching lesson has one quiz (5 questions, 8 flashcards) and one design prompt.

### Non-goals (later in Phase 2)

- Placement quizzes. These wait until each track has 8 or more lessons (after 2b and 2c).
- New lesson content beyond the Caching proof items (2b and 2c).
- New visualizers.
- Back-of-the-envelope estimation drills.
- Question types other than single-answer multiple choice.

## 2. Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Phase 2 split | 2a platform first, then 2b and 2c content in batches of about 4 lessons |
| How flashcards enter review | On first completion of the lesson quiz, rated by the score |
| 2a scope | Quizzes, flashcards and design prompts. Placement is deferred. |
| Content model | **A.** Extend the exercise union with `quiz` and `design-prompt`. Flashcards live inside quizzes. |
| Score → solve rating | ≥ 80% `alone`; 50–79% `hint`; < 50% `solution` |
| Flashcard initial rating | `good` if the quiz score is ≥ 80%, otherwise `again`. Retakes never add duplicate cards. |
| Design answer storage | The existing `Note`: `approach` = the design text, `insight` = a one-line key insight, validated like problems |
| Design solve rating | The share of rubric points covered, using the same thresholds as quizzes |
| Mastery | Counts problem, quiz and design-prompt exercises. Flashcards don't count. |

## 3. Content model

### 3.1 Exercise schema

`content/exercises/*.yaml` becomes a union on `type`.

**Common fields:** `slug`, `type`, `title`, `lessons` (≥ 1; the first is the primary lesson), and `ladderOrder` (unique within the primary lesson, as today).

| `type` | Extra fields |
|---|---|
| `external-problem` | Unchanged: `leetcodeId`, `url`, `difficulty`, `recognitionPrompt`, `hint` |
| `quiz` | `questions`: 3–8 items of `{ id, prompt, choices, answer, explanation }`, where `choices` has 2–5 strings and `answer` is a 0-based index. `flashcards`: 0–20 items of `{ id, front, back }`. |
| `design-prompt` | `prompt` (Markdown), `rubric`: 3–8 items of `{ id, point }`, `reference` (Markdown), optional `hint` |

**Format rules:**
- Ids are slug-like: `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Each flashcard `front` and `back` is 1–200 characters.
- Each question `prompt`, choice and `explanation` is non-empty.
- The schema stays `.strict()` per member.

### 3.2 Validation (additions to `validateContent`)

| Rule | Check |
|---|---|
| V11 | Applies only to `external-problem`: unique `leetcodeId`, and `url` on leetcode.com |
| V12 (new) | Within each `quiz`, question ids are unique and flashcard ids are unique. Each `answer` is within `choices`. |
| V13 (new) | Within each `design-prompt`, rubric ids are unique |

- V10 (every lesson has an exercise) is satisfied by any exercise type.
- Messages keep the format `[Vn] <file>: <problem>`.
- `CONTRIBUTING.md`'s rule table gains V12 and V13. `templates/` gains `quiz.yaml` and `design-prompt.yaml`.

### 3.3 Types and catalog

- **`ExerciseMeta`** becomes a discriminated union: `ProblemExercise | QuizExercise | DesignExercise`.
- **Catalog contents.** The catalog serialised into every page stays slim:
  - Problems: their current fields.
  - Quizzes: `questionCount` and `flashcardIds`.
  - Design prompts: `rubric` (the point texts, which Today's Reveal needs).
- **Flashcard map.** `Catalog.flashcards` is a `Record<string, { front, back, quiz, lesson }>` keyed by `"<quiz-slug>#<card-id>"`. Today needs it.
- **Exercise page.** Questions, rubric, reference and hint load only on the exercise's own page, via `getExercise(slug)` on the server.
- **Helper.** `flashcardKey(quizSlug, cardId)` builds the key, and `parseReviewKey(key)` returns `{ kind: 'exercise', slug } | { kind: 'flashcard', quiz, card }`.

## 4. Pages and UI

### 4.1 Exercise page `/exercises/[slug]/`, by type

**`external-problem`:** unchanged.

**Note:** Grading happens in the browser, so quiz answers, explanations and the reference answer are part of the page's data before submitting (not shown on screen or to assistive tech until then).

**`quiz` (`QuizWorkspace`):**
- **Questions:** each is a `fieldset` of radio buttons, all shown at once.
- **Check answers:** enabled once every question is answered. Each question then shows ✓ or ✗, the correct choice and its explanation, plus a summary such as "4 of 5 correct". The result is saved through `completeQuiz`.
- **Flashcards:** after the first completion, a "Flashcards — in your reviews" section lists each card. A card shows its front and flips to the back on click or Enter.
- **Retake:** clears the answers. A retake saves a new result through `completeQuiz`.
- **Navigation:** a link back to the lesson.

**`design-prompt` (`DesignWorkspace`):**
- **Before comparing:** the prompt (rendered Markdown), an optional hint under a `details` toggle, a **Your design** textarea, a **Key insight** input with the same one-line rules as problems, and a **Compare with reference** button. The button is enabled when both fields are non-empty.
- **After comparing:** the reference answer (Markdown) and the rubric as checkboxes labelled "I covered this". **Save** calls `completeDesign` and shows the solve-rating label.
- **Once saved:** the existing `NoteEditor` (design = approach) and `ReviewHistory`.
- **Revisiting:** the reference answer and rubric stay visible.
- **Rendering:** Markdown is rendered with the project's existing `react-markdown` and `remark-gfm` dependencies. Raw HTML is not allowed.

### 4.2 Lists and navigation

| Place | Change |
|---|---|
| **Lesson ladder** ("Practice ladder") | Rows show a type badge (**LeetCode**, **Quiz** or **Design**). Difficulty, the LeetCode number and the ↗ link appear only for problems. |
| **Exercises list** | Adds a **Type** filter (All / LeetCode / Quiz / Design). The difficulty filter applies only to problems, so other types don't match a difficulty filter other than All. The LeetCode number is searched only for problems. |
| **⌘K** | Shows the number only for problems; other types show their badge text. |
| **Trainer** | Draws only `external-problem` exercises, as today. Its pool is filtered by type. |

## 5. Review queue

**Review keys:** a card's slug is the exercise slug for quiz, design-prompt and problem cards, and `<quiz-slug>#<card-id>` for flashcards.

**What a due item shows on Today:**

| Kind | Shown | Action |
|---|---|---|
| Problem | Unchanged | Unchanged |
| Flashcard | The front, plus the lesson title as context | **Reveal** shows the back, then **Again / Hard / Good / Easy** call `recordReview(key, rating)` |
| Design prompt | The title and the learner's saved key insight | **Reveal** shows the rubric points, then rate as for problems |
| Quiz | "Retake the {lesson} quiz ({n} questions)" | Links to the quiz page. Finishing the quiz records the review with a rating from the score: 100% `easy`, 80–99% `good`, 50–79% `hard`, < 50% `again`. |

- **Orphaned cards:** due cards whose key no longer resolves (an unknown exercise or flashcard) are skipped, as today.
- **Review history** on the exercise page works unchanged for quiz and design keys.

## 6. Store

### 6.1 New `Store` methods

```ts
completeQuiz(slug: string, flashcardIds: string[], result: { correct: number; total: number }, now: Date): Promise<void>
completeDesign(slug: string, answer: { design: string; insight: string; covered: number; total: number }, now: Date): Promise<void>
```

Both stores implement these by calling pure functions in `src/lib/store/mutations.ts`:
- `quizWrites(prev, slug, flashcardIds, result, now, desiredRetention)`
- `designWrites(prev, slug, answer, now, desiredRetention)`

`prev` holds the existing progress, note, the exercise's card, and the existing flashcard cards. The UI passes the quiz's flashcard ids from `useCatalog()`, so the store stays independent of content.

### 6.2 Write rules

**`quizWrites`:**
1. `score = correct / total`. The `total` must be > 0 and `0 ≤ correct ≤ total`; otherwise the function throws.
2. **Progress:** `status: 'solved'`. `solveRating` comes from the score (§2). `firstSolvedAt` is kept if already set, and `needsResolve` is false.
3. **The quiz's own card:**
   - If none exists: a new card scheduled with `initialReviewRating(solveRating)`, plus a log of `kind: 'solve'`.
   - Otherwise: `scheduleReview(card, ratingFromScore)`, using the §5 mapping, plus a log of `kind: 'review'`.
4. **Flashcards:** each flashcard id without an existing card gets a new card scheduled with `good` (score ≥ 80%) or `again`. Existing flashcard cards are left untouched. No log entries are written for flashcards.
5. **Activity:** one bump, `solves` on the first completion and `reviews` afterwards.

**`designWrites`:**
1. The insight is validated (`validateInsight`), and `design` must be non-empty. `covered` and `total` follow the same bounds as the quiz score.
2. **Note:** `approach = design` and `insight` = the validated insight. Other note fields are kept.
3. **Progress, card, log and activity:** as in quiz rules 2, 3 and 5, with `score = covered / total`.

**Mechanics:**
- **`WriteSet` shape:** a `WriteSet` can carry several cards, so `card?: ReviewCard` becomes `cards?: ReviewCard[]`. All existing producers and appliers are updated in both stores, and the `Changes` mapping sends all of them.
- **Activity:** still one bump per write, which keeps the one-increment-per-date rule for `apply_changes`.

### 6.3 Mastery

`lessonExercises` already includes every exercise listing the lesson. Quiz and design-prompt exercises count through their progress and their own card, exactly like problems. Flashcard cards are not exercises, so they don't count.

## 7. Proof content

**`content/exercises/caching-quiz.yaml`** (`type: quiz`):
- `lessons: [caching]` and the next free `ladderOrder` in Caching's ladder.
- 5 questions: hit rate math, LRU eviction choice, cache-aside invalidation order, thundering-herd mitigation, and write-through vs write-back.
- 8 flashcards on the lesson's key terms: hit, miss, TTL, LRU, cache-aside, write-through, write-back, stampede.

**`content/exercises/design-product-page-cache.yaml`** (`type: design-prompt`):
- Prompt: "Add a cache in front of a product-details API that serves 5,000 reads/s and 50 writes/s; prices must never be more than 60 s stale."
- 5 rubric points: what to cache and the key, TTL with jitter, invalidation on write, stampede protection, and what to measure.
- A reference answer of about 200–300 words.

Both are written in the lesson's style: intuition first, with concrete numbers.

## 8. Testing

**Unit tests:**
- **Validator:** V12 and V13, each with a passing and a failing case. V11 now applies only to problems.
- **Mutations:**
  - score → rating and solve-rating mapping at the boundaries (0, 49, 50, 79, 80, 99 and 100%)
  - flashcards created only when missing, and never duplicated on retake
  - the first-completion vs retake log kind and activity field
  - design insight validation and that the note keeps its other fields
  - invalid totals throw
- **Contract suite:** `completeQuiz` and `completeDesign` run against both `DexieStore` and `SupabaseStore` (with the fake remote).
- **Catalog:** the flashcard map and its keys, and `parseReviewKey`.

**E2E:**
1. **Caching quiz:** open it, answer, and check results and explanations show. Flashcards then appear.
2. **Flashcard review:** advance the clock past the due date; a flashcard is due on Today. Reveal it and rate it, and it leaves the queue.
3. **Design prompt:** write, compare, tick the rubric, save; the note shows the design.
4. **Badges and filter:** the ladder shows type badges, and the Exercises Type filter works.
5. **No regressions:** existing LeetCode e2e flows stay green.

**Database:** no migration changes. The existing pgTAP suite keeps passing.

## 9. Rollout

**One PR,** on `feat/phase-2a`. It needs CI (`check` and `db`) green and a manual check on the preview, once as a guest and once signed in:
- take the Caching quiz and see its flashcards appear
- complete the design prompt and see the saved note

The "flashcard due on a later day" path is covered by the e2e test, which controls the clock.
