# Placement Quizzes — Design

**Status:** approved in chat on 2026-10-23. This is the "Level placement" platform feature of Phase 2 in `docs/roadmap.md`.

## Goal

Each track gets a placement quiz of about 5 minutes. Learners who already know part of a track can use it to skip what they know. The result moves the learner's starting point: recommendations and the track's Continue link skip modules the learner placed out of. Mastery is unchanged, and every lesson stays open.

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **The result moves the start point. It does not credit mastery.** | Mastery stays an honest measure of exercises done. A lucky guess can't inflate progress, only reorder suggestions. |
| D2 | **New questions, written per module.** They are not sampled from lesson quizzes. | Lesson quizzes test the lesson as taught. Placement tests prior knowledge, and must not spoil the lesson quizzes. |
| D3 | **Each concept module gets 2–3 questions.** System Design's `case-studies` module gets none. | About 9–12 questions per track fits 5 minutes. Case studies apply the whole track, so nobody places out of them. |
| D4 | **A module is passed only when all its questions are answered correctly.** | Wrongly skipping material costs more than one extra review. |
| D5 | **Every passed module is skipped, even when an earlier module was failed.** | Someone strong on graphs but weak on intervals shouldn't be sent back through graphs later. |
| D6 | **The result is stored in `Settings` as `placements`.** | `Settings` is already JSON in both the Dexie and Supabase stores, so no migration is needed, and it syncs and exports with the rest. |
| D7 | **Delivery takes two PRs.** PR 1 is the platform plus the CS Fundamentals content. PR 2 is the Algorithms and System Design content. | The platform is reviewed alongside real content, and each PR stays reviewable. |

## Content

**Files.** One file per track, `content/placement/<track>.yaml`, loaded by a new Velite collection `Placement`:

```yaml
track: cs-fundamentals
questions:
  - module: foundations
    prompt: "…"
    choices: ["…", "…", "…", "…"]
    answer: 2          # 0-based index
    explanation: "…"   # one or two sentences, shown on the results screen
```

**Validation.** The rules are added to `validateContent`:
- `track` names an existing track, and each track has at most one placement file.
- Every `module` is a module slug in that track's `track.yaml`.
- Each module in the track has 2–3 questions. Modules on an explicit exemption list must have 0 instead; the list is `PLACEMENT_EXEMPT_MODULES = { 'system-design': ['case-studies'] }`.
- Every question has exactly 4 distinct choices, and its `answer` is in the range 0–3.
- No placement prompt matches any lesson-quiz question prompt, after normalising whitespace and case.
- No lesson may use the slug `placement`, because `/[track]/placement` is a static route.

**Writing rules.** These are the existing quiz rules plus placement-specific ones:
- **Prior knowledge only.**
  - Each question must be answerable by someone who knows the topic from work or study, without having read our lesson.
  - No question may depend on our lesson's wording, examples or numbers.
- **Plausible distractors.** They must not contradict the stem, must not be absurd, and must not be secretly correct under an unstated default.
- **Answer length.** In each track, the correct choice is neither the longest nor the shortest choice in at least 80% of questions.
- **Answer positions.** They vary, with no run of three equal answers in a row in a file.
- **No overlap.** No question pre-solves a diagnose prompt; each lesson's design-prompt NOT list still applies.
- **Explanations.** Each states why the right answer is right in one or two sentences, without teaching the whole module.

Each content file gets an opus accuracy review with one fix round, the same as lessons.

## Logic (`src/lib/logic/placement.ts`)

These are pure functions with unit tests:

- `scorePlacement(questions, answers: number[]): { passedModules: string[]; byModule: Record<string, { correct: number; total: number }> }`
  - A module is in `passedModules` exactly when `correct === total`.
  - `passedModules` keeps the module order from the track.
- `skippedLessons(track: TrackMeta, placement?: Placement): Set<string>`
  - Returns the lessons of every passed module.
  - With no placement it returns an empty set.
  - Unknown module slugs are ignored, so stale placements survive content changes.
- **`continueLesson(track, masteries, skipped?)`**:
  - Returns the first lesson that is below `MASTERED` and not skipped.
  - If every lesson is mastered or skipped, it returns the first non-mastered lesson, then falls back to the track's first lesson as it does now.
- **`recommendedLesson(lessons, mastery, started, skipped?)`**:
  - Returns the first lesson that isn't skipped and is ready, then the first lesson that isn't skipped.
  - It then falls back to the current behaviour, ignoring `skipped`.
  - Prerequisite readiness treats a skipped prerequisite as satisfied.
- **Started tracks:** a track with a placement counts as started for `recommendedLesson`, even before any exercise is solved.

## Storage

- **Types.**
  - `Settings` gains `placements?: Record<string, Placement>`.
  - `Placement` is `{ passedModules: string[]; takenAt: string }`, where `takenAt` is an ISO timestamp.
- **Saving.**
  - Writes go through `saveSettings`, merged into the existing settings.
  - A new helper, `withPlacement(settings, track, placement | null)`, returns new settings; passing `null` clears that track.
- **Export and import.**
  - `transfer.ts` gains an optional `placements` field in `meta.settings`.
  - Without it, zod would strip the field and an import would silently lose placements.
  - A test does an export → import round trip with placements and checks they survive.
- **Supabase.** `profiles.settings` is `jsonb`, so no migration is needed. The pgTAP job doesn't change.
- **Store contract.** `saveSettings` with placements round-trips on both stores.

## UI

- **Route `/[track]/placement`** (`src/app/[track]/placement/page.tsx`):
  - It is statically generated for tracks that have a placement file and returns 404 for the others.
  - It shows one question at a time with 4 choice buttons and a "Question N of M" counter. There is no feedback until the end.
  - **Results screen:**
    - One row per module, labelled "Placed out" or "Start here / study", with the module's score.
    - The explanation for every question that was answered wrong.
    - A primary button, "Start at <lesson title>", which goes to the new `continueLesson`.
  - The result is saved when the results screen appears.
- **Track home** (`track-home.tsx`):
  - With no placement, a card reads "Already know some of this? Take the 5-minute placement quiz." It shows only when the track has a placement file.
  - With a placement, the card reads "Placement taken <date> · Retake · Clear".
  - Each passed module's heading shows a "Placed out" badge, as text, not colour alone.
  - The Continue link uses the skipped set.
- **Today and Roadmap:** the "recommended" pick passes the skipped set from every placement.

## Tests

- **Unit tests:**
  - `scorePlacement`, `skippedLessons`, and `continueLesson` and `recommendedLesson` with skipped lessons: a passed module after a failed one, all modules passed, a stale module slug, and a skipped prerequisite.
  - Every validation rule, each with a failing fixture.
  - The `withPlacement` helper and the transfer round trip.
- **Content inventory:** the placement file for each shipped track exists and has the expected question count per module.
- **e2e:**
  - Take the CS Fundamentals placement, answering the Foundations and Operating systems questions correctly and the rest wrongly. Expect two "Placed out" badges, and Continue opening `tcp-ip-stack`.
  - Clear the placement, and Continue opens `complexity` again.
  - The layout spec covers each placement page at 375 px, the width the whole layout spec uses.

## Delivery

- **PR 1:** everything above, plus `content/placement/cs-fundamentals.yaml` with 12 questions (Databases and Machine & math get 3 each; the other modules 2).
- **PR 2:**
  - `content/placement/algorithms.yaml`, 12 questions across 5 modules.
  - `content/placement/system-design.yaml`, 9 questions across 3 modules.
  - Their inventory and e2e layout entries.

## Out of scope

- Adaptive quizzes that change questions based on earlier answers.
- Crediting mastery or flashcards from placement.
- Per-lesson placement.
- Analytics on placement results.

## Success criteria

- All three tracks have a placement quiz that passes validation and accuracy review.
- Taking one changes Continue, Today and Roadmap recommendations as described. Clearing it restores them.
- Placements survive sync, export and import.
- `npm test`, typecheck, lint, e2e and `check:deploy` all pass after each PR.
