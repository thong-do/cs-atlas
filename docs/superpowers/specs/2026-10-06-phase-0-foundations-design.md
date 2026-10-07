# Phase 0 — Foundations: Design Spec

*Date: 2026-10-06 · Status: approved in brainstorming, awaiting written review*
*Roadmap: `docs/roadmap.md` §5, Phase 0*

## 1. Goal and success criteria

Turn the single-track LeetCode trainer into a multi-track platform skeleton named **CS Atlas**, open to Git-based contributions, without breaking anything a current learner relies on.

**Done when:**

1. **Algorithms track unchanged.** All 18 lessons and 138 exercises are reachable, in the same order and with the same content. Old URLs redirect permanently.
2. **Saved data survives.** Existing local progress (IndexedDB) and v1 backup files work with no migration.
3. **Second track live.** A System Design track ships with one complete lesson (**Caching**) and an outline of modules marked "coming soon".
4. **Cross-track roadmap.** The roadmap shows both tracks and the prerequisite edge from `arrays-hashing` to `caching`.
5. **Ready for outside contributors.** The repo has licences, `CONTRIBUTING.md`, templates and CI. Someone outside the project could add a lesson through a PR by following `CONTRIBUTING.md`.
6. **Rebranded.** No user-visible "LeetHub" remains.

### Non-goals

- Accounts and sync (Phase 1).
- Quiz and flashcard exercise types (Phase 2).
- In-app editing (Phase 3).
- Any change to the IndexedDB schema or the backup format.

## 2. Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Name | **CS Atlas**. Clash check: no product by that name; `csatlas.io` looked unregistered on 2026-10-06 (`csatlas.dev` is taken) |
| URL scheme | Track-prefixed: `/[track]/[lesson]`, `/exercises/[slug]` |
| Proof of a second track | One real System Design lesson (Caching); the other modules listed as `comingSoon` |
| Approach | **A**: rename and restructure in place, with one content model for every track |
| Storage | IndexedDB name, tables, fields (`problemSlug` …), the `LeetHubDB` class and the backup `app` marker stay unchanged |
| Slugs | Lesson slugs and exercise slugs are each unique across all tracks |
| Trainer | Algorithms lessons only |
| Exercise types | Schema has a `type` discriminator; only `external-problem` exists in Phase 0 |
| Account-level steps | Done by the owner after merge (§8) |

## 3. Content model

### 3.1 Layout

```
content/
  tracks/
    algorithms/
      track.yaml
      lessons/*.mdx          # the 18 files from content/patterns/, moved with git mv
    system-design/
      track.yaml
      lessons/caching.mdx
  exercises/*.yaml           # the 138 files from content/problems/, moved with git mv
```

`content/roadmap.yaml` is deleted. Each track's order comes from its `track.yaml`.

### 3.2 `track.yaml`

```yaml
slug: algorithms                # must equal the folder name
title: Algorithms
summary: "Recognise the pattern, apply the template, remember it for good."
order: 1                        # position among tracks (nav, roadmap bands); unique
modules:
  - slug: foundations
    title: Foundations
    lessons: [arrays-hashing, two-pointers, stack, sliding-window, binary-search, linked-list]
  - slug: trees-heaps
    title: Trees & Heaps
    lessons: [trees, tries, heap]
  - slug: search-greedy
    title: Search & Greedy
    lessons: [backtracking, intervals, greedy]
  - slug: graphs-dp
    title: Graphs & DP
    lessons: [graphs, dp-1d, advanced-graphs, dp-2d]
  - slug: math-bits
    title: Math & Bits
    lessons: [bit-manipulation, math-geometry]
```

- **Lesson order** for a track is its modules in order, then the lessons inside each module in order.
- **The algorithms order must equal today's `roadmap.yaml` order exactly.** The module grouping above keeps it.
  - Brainstorming sketched the module names "Foundations / Linear structures / Trees & graphs / Dynamic programming / Math & bits".
  - Those groups aren't contiguous in the current order, so the names here were adjusted to fit it.
- **`comingSoon`** (optional, a list of strings) on a module is shown as greyed titles. It doesn't refer to any files.
  - A module needs at least one lesson **or** at least one `comingSoon` title.

`system-design/track.yaml`:

```yaml
slug: system-design
title: System Design
summary: "How real systems scale, stay fast and survive failures."
order: 2
modules:
  - slug: foundations
    title: Foundations
    lessons: [caching]
    comingSoon: [Client–server & HTTP, DNS & CDNs, SQL vs NoSQL]
  - slug: scaling
    title: Scaling
    lessons: []
    comingSoon: [Load balancing, Replication & sharding, Queues & streams, Rate limiting]
  - slug: case-studies
    title: Case Studies
    lessons: []
    comingSoon: [URL shortener, News feed, Chat]
```

### 3.3 Lesson frontmatter (`lessons/*.mdx`)

| Field | Type | Notes |
|---|---|---|
| `slug` | string | Unique across all tracks |
| `title` | string | |
| `summary` | string | |
| `level` | `beginner` \| `intermediate` \| `advanced` | **New.** The 18 algorithms lessons get levels in the spec appendix |
| `authors` | string[] | **New.** Default `[]`; existing lessons get `[cs-atlas]` |
| `prerequisites` | string[] | Default `[]`; may name lessons in any track |
| `triggers` | string[] | Optional in the schema; **required (min 1) for the algorithms track** |
| `confusedWith` | string[] | Optional; default `[]` |
| `complexity` | string | Optional in the schema; **required for the algorithms track** |

- The `stub` field and every code path for stubs are removed.
- The track is derived from the file path (`tracks/<track>/lessons/…`) and exposed as `track`.

### 3.4 Exercise YAML (`exercises/*.yaml`)

The old problem schema plus a `type` field, with `patterns` renamed to `lessons`. Unknown fields still fail the build (`.strict()`).

```yaml
slug: lru-cache
type: external-problem
title: "LRU Cache"
leetcodeId: 146
url: https://leetcode.com/problems/lru-cache/
difficulty: medium
lessons: [linked-list, arrays-hashing, caching]    # first entry = primary lesson (ladder placement)
ladderOrder: 4
recognitionPrompt: "…"
hint: "…"
```

- `type` is a literal (`external-problem`) in Phase 0. Phase 2 turns the schema into a discriminated union on `type` when it adds `quiz` and `flashcard`.
- Changes to existing exercises:
  - `lru-cache.yaml` and `time-based-key-value-store.yaml` gain `caching` as an extra lesson (appended last).
  - Every file gains `type: external-problem` and renames `patterns:` to `lessons:`.

### 3.5 Validation rules (`validateContent`)

| # | Rule | Status |
|---|---|---|
| V1 | Track `slug` equals its folder name; track `order` values are unique | new |
| V2 | Lesson slugs are unique across all tracks | new |
| V3 | Every lesson file appears in exactly one module of its own track, and every module lesson names an existing lesson of that track | new (replaces the roadmap check) |
| V4 | A module has ≥ 1 lesson or ≥ 1 `comingSoon` title | new |
| V5 | Prerequisites and exercise `lessons` reference existing lessons in any track | generalised |
| V6 | The prerequisite graph has no cycles | kept |
| V7 | `ladderOrder` is unique per primary lesson | kept |
| V8 | Algorithms-track lessons have `triggers` (≥ 1) and `complexity` | new |
| V9 | **Quality bar:** each lesson's top-level (`##`) headings include **Intuition**, **Visual**, **Pitfalls** and **Tips & tricks**, plus **Template** (algorithms) or **Example** (other tracks) | new |
| V10 | Every lesson has ≥ 1 exercise that lists it | new |
| V11 | Exercise slugs are unique; the `url` host is `leetcode.com` for `external-problem` | kept/new |

- V9 reads the headings from Velite's `toc` output.
- Each error message names the file and the rule, so contributors can fix it without reading code.

## 4. Routes and UI

### 4.1 Routes

| Route | Page | Source |
|---|---|---|
| `/` | Today | unchanged |
| `/tracks` | Track cards: title, summary, lesson count, mastery bar | new |
| `/[track]` | Track home: modules in order; lessons with mastery and level badge; greyed `comingSoon` titles; a "Continue" button to the first lesson that isn't mastered | new |
| `/[track]/[lesson]` | Lesson page | today's `/patterns/[slug]` |
| `/exercises` | Exercise list with a new **track** filter alongside the existing filters | today's `/problems` |
| `/exercises/[slug]` | Exercise page | today's `/problems/[slug]` |
| `/roadmap` | Cross-track graph | generalised |
| `/train`, `/stats`, `/settings` | | unchanged routes |

- `/[track]` and `/[track]/[lesson]` are static, using `generateStaticParams` over tracks and lessons.
- Static segments (`tracks`, `exercises`, `roadmap`, `train`, `stats`, `settings`) take precedence over `[track]`.
- The validator rejects a track slug that collides with a static route name.

### 4.2 Redirects (`vercel.json`, permanent)

| From | To |
|---|---|
| `/patterns/:slug` | `/algorithms/:slug` |
| `/problems` | `/exercises` |
| `/problems/:slug` | `/exercises/:slug` |

With `trailingSlash: true`, each rule has a variant with and without the trailing slash. `next.config` `redirects()` is not used because it doesn't work with `output: 'export'`.

### 4.3 Navigation and labels

- **Nav:** Today · Tracks · Roadmap · Exercises · Train · Stats (plus Settings, as today).
- **⌘K:** lists the lessons of every track with the track name as a group heading, plus exercises.
- **Labels:** "pattern" becomes "lesson" and "problem" becomes "exercise" in UI copy.
  - The trainer keeps asking "which pattern?", because pattern recognition is the algorithms skill it trains.

### 4.4 Roadmap

- One horizontal band per track, ordered by `track.order`.
- Within a band, lessons are laid out by module, using the existing layering logic.
- Prerequisite edges inside a track are drawn as today. Edges between tracks are dashed so they read as cross-track links.
- `comingSoon` titles are not drawn.
- The existing roadmap tests about overlap and clipping must still pass with two bands.

### 4.5 Behaviour changes

- **Mastery** is computed per lesson.
  - An exercise counts towards its **primary** lesson, as in v1, and also towards any listed lesson in a **different track**.
    *Amended while planning:* counting every listed lesson would change the mastery of the 17 algorithms exercises that list a second algorithms lesson, so existing learners' numbers would shift.
  - Recognition accuracy (30% of mastery) applies only to lessons in the algorithms track, which is the only track the trainer covers.
    For any other track, mastery is the exercise score alone. Otherwise a System Design lesson could never pass 70%.
  - The `mastery.ts` rules are otherwise unchanged.
  - A lesson with no exercises can't exist (V10).
- **Recommendations (Today):** "next lesson" follows the tracks the learner has started, in track order then lesson order.
  - A track counts as started once the learner has solved at least one exercise that lists one of its lessons.
  - If no track has been started, the recommendation is the first algorithms lesson.
- **Stats:** a mastery breakdown per track is added.
- **Trainer:** draws exercises whose primary lesson is in the algorithms track. Its answer choices are algorithms lessons only.

### 4.6 Renames in code

- **Content and UI layers:**
  - `PatternMeta` becomes `LessonMeta` and `ProblemMeta` becomes `ExerciseMeta`.
  - `getPatternDoc` becomes `getLessonDoc` and `getProblem` becomes `getExercise`.
  - `Catalog` changes from `{order, patterns, problems}` to `{tracks, lessons, exercises}`.
  - The folders `components/patterns` and `components/problems` become `components/lessons` and `components/exercises`.
- **Store layer:** unchanged, including `ProblemProgress`, `problemSlug`, `LeetHubDB`, the DB name and the backup schema.
  - A comment at the store boundary records why the names differ.

## 5. Caching lesson

`content/tracks/system-design/lessons/caching.mdx`:

| Field | Value |
|---|---|
| `level` | `beginner` |
| `prerequisites` | `[arrays-hashing]` (the cross-track edge) |
| `authors` | `[cs-atlas]` |

**Sections** (V9):
- **Intuition:** a desk vs a library; latency numbers; hit rate.
- **Visual:** a `<Visualizer kind="cache-lru" />` plus a text diagram of read-through caching.
- **Example:** an LRU cache built from a hash map and a doubly linked list (Python), and cache-aside read and write code.
- **Pitfalls:** stale data and invalidation, the thundering herd, caching errors, unbounded caches.
- **Tips & tricks:** TTL with jitter, write-through vs write-back vs cache-aside, what to measure.

**Exercises:** `lru-cache` and `time-based-key-value-store` (§3.4).

**`cache-lru` visualizer**
- `src/lib/visualizers/cache-steps.ts` is a pure generator for a capacity-3 cache. Requests: `A B C A D B E A`.
- Each step records the cache contents from most to least recently used, the key requested, `hit`/`miss`, any evicted key, and a caption written after the event in past tense.
- The final caption states the totals: "Done: 1 hit, 7 misses, 4 evictions" (corrected by hand-tracing while planning). A unit test pins the full traced sequence.
- `CacheView` renders the slots and has a constant height on every step, as the other visualizers do.

## 6. Rebrand and open-source files

**Rebrand**
- Every user-visible "LeetHub" becomes **CS Atlas**: titles and metadata, the shell header, the README and the backup error messages.
- The backup tests are updated to match.
- Unchanged by design: the IndexedDB name, `LeetHubDB` and the backup `app` marker.

**New files**

| File | Content |
|---|---|
| `LICENSE` | MIT, for code |
| `LICENSE-CONTENT` | CC BY-SA 4.0, covering `content/` |
| `CONTRIBUTING.md` | Local setup; adding a lesson or exercise; the quality bar (V9/V10); frontmatter reference; PR flow with Vercel preview links; licence of contributions |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1 |
| `.github/ISSUE_TEMPLATE/{content-error,lesson-request,bug}.yml` | Issue forms |
| `.github/pull_request_template.md` | Checklist: validation passes, quality bar, no copied problem statements, preview checked |
| `templates/lesson.mdx`, `templates/exercise.yaml` | Copy-and-fill starting points |
| `.github/workflows/ci.yml` | On PR and on push to `main`: `npm ci`, lint, typecheck, unit tests, build (includes validation), Playwright e2e |

**README:** rewritten as the CS Atlas front page, with links to the live site, `CONTRIBUTING.md` and the roadmap.

## 7. Testing

**Unit (Vitest)**
- Validator: V1–V11, each with a passing and a failing fixture.
- Catalog: tracks sorted by `order`; lesson order taken from modules; algorithms order equal to the old `roadmap.yaml` list, pinned as a literal.
- Mastery: an exercise in two lessons counts for both.
- Recommendation across tracks.
- Trainer: answer choices limited to algorithms.
- `cache-steps`: the hand-traced sequence.

**E2E (Playwright)**
- `/tracks` lists both tracks, and `/system-design` shows Caching and its "coming soon" titles.
- The Caching lesson renders, and its visualizer reaches the final caption at a constant height.
- The roadmap shows two bands and the edge from `arrays-hashing` to `caching`.
- **Upgrade safety:** IndexedDB is seeded in the v1 shape (solved `3sum`, a due card), then `/` and `/exercises` show it as solved and due.
- Existing specs are updated for the new routes and labels. None are deleted.

**Production check after deploy (script)**
- The three redirect rules return 308 to their new URLs.
- Every lesson and exercise URL returns 200.

## 8. Rollout

1. **One PR** on `feat/phase-0`: moves, code and content, with CI green and the Vercel preview checked by hand.
2. **Merge.** Production deploys; the redirect and URL check script runs.
3. **Owner checklist** (account-level, done by the owner):
   - Rename the GitHub repo `leethub` to `cs-atlas`. GitHub redirects the old URL.
   - Rename the Vercel project, and optionally add `csatlas.io`.
   - Make the repo public.
   - Enable the CI workflow as a required check on `main`.

## Appendix: levels for the algorithms lessons

| Level | Lessons |
|---|---|
| beginner | arrays-hashing, two-pointers, stack, sliding-window, binary-search, linked-list |
| intermediate | trees, tries, heap, backtracking, intervals, greedy, graphs, dp-1d, bit-manipulation, math-geometry |
| advanced | advanced-graphs, dp-2d |
