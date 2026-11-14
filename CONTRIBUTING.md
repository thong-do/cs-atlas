# Contributing to CS Atlas

Thanks for helping people learn computer science in a way that lasts. You can fix a typo, improve a lesson, add an exercise or write a whole new lesson. Everything goes through a pull request, and every pull request gets a live preview link.

## Quick start

```bash
git clone https://github.com/thong-do/cs-atlas.git && cd cs-atlas
npm install
npm run dev          # http://localhost:3000
```

Before you open a PR, run:

```bash
npm test             # builds content (with validation) and runs unit tests
npm run typecheck
npm run lint
npm run e2e          # optional locally; CI runs it
```

If you add or change a solution guide (`content/solutions/`), also run `npm run check:solutions`. It needs Python 3 (`python3` on your `PATH`; no packages). The checker runs each case in a child process started with the `fork` method, so it runs on macOS and Linux but not on Windows (use WSL there).

## Running with accounts (optional)

The site works guest-only without any setup. To try sign-in and sync locally:

1. Copy `.env.example` to `.env.local`.
2. Run `npm run db:start` (requires Docker). It prints a local API URL (default `http://127.0.0.1:54321`) and an anon key; put them in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Sign-in needs a GitHub and a Google OAuth app, each with the callback `http://127.0.0.1:54321/auth/v1/callback`. Add these blocks to `supabase/config.toml` (next to the existing `[auth.external.apple]` block), then restart with `npx supabase stop` and `npm run db:start`:

   ```toml
   [auth.external.github]
   enabled = true
   client_id = "env(SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID)"
   secret = "env(SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET)"
   redirect_uri = "http://127.0.0.1:54321/auth/v1/callback"

   [auth.external.google]
   enabled = true
   client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
   secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
   redirect_uri = "http://127.0.0.1:54321/auth/v1/callback"
   skip_nonce_check = true
   ```

   Export `SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` in your shell (or put them in `supabase/.env`, which is not committed). Never commit the secrets. `config.toml` already allows redirects back to `http://localhost:3000/**`, so open the app at `http://localhost:3000`. Or skip this step and work guest-only.
4. `npm run db:test` runs the database tests.

### Owner setup (production)

The project owner does this once for the hosted site:

1. Create a Supabase project (free tier) in region **Singapore (ap-southeast-1)** and note its URL and anon key.
2. Apply the migrations: `npx supabase link` then `npx supabase db push`.
3. **GitHub:** create an OAuth app with callback `https://<project-ref>.supabase.co/auth/v1/callback`, then enter its client ID and secret in Supabase → Auth → Providers → GitHub.
4. **Google:** create an OAuth client in Google Cloud (web application) with the same callback URL and a consent screen, then enter it in Supabase → Auth → Providers → Google.
5. **Redirect URLs.** In Supabase → Auth → URL configuration:
   - Site URL: `https://cs-atlas-hub.vercel.app`
   - Additional redirect URLs: `http://localhost:3000/**`, `https://cs-atlas-hub.vercel.app/**` and `https://*-thong-dos-projects.vercel.app/**` (previews)
6. **Vercel.** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Production and Preview, then redeploy.

## How content is organised

```
content/
  tracks/<track>/track.yaml        # modules and the order of lessons
  tracks/<track>/lessons/<slug>.mdx
  exercises/<slug>.yaml
  solutions/<problem-slug>.mdx     # a step-by-step solution to a LeetCode exercise
```

- A **track** (Algorithms, System Design, …) has **modules**; a module lists **lessons** in order and may list `comingSoon` titles.
- An **exercise** links to a problem on LeetCode and lists the lessons it practises. The first lesson is its primary lesson: the exercise appears in that lesson's ladder. Lessons from **other tracks** can share it.

## Add a lesson

1. Copy `templates/lesson.mdx` to `content/tracks/<track>/lessons/<slug>.mdx` and fill it in. An Algorithms lesson has a Template section, then an Example on an original problem. For a case study (a lesson in the `case-studies` module), replace the Example section with Requirements & estimates, Design walkthrough and the other case-study sections listed under the quality bar below.
2. Add the slug to a module's `lessons` in `content/tracks/<track>/track.yaml`.
3. Add a quiz with at least one flashcard that lists the lesson first (`templates/quiz.yaml`). Add other exercises if they fit.
4. Run `npm run dev` and open `/<track>/<slug>/`.

## Add an exercise

1. Copy a template to `content/exercises/<slug>.yaml`: `templates/exercise.yaml` for a LeetCode problem (the slug must match the LeetCode URL), `templates/quiz.yaml` for a quiz with flashcards, or `templates/design-prompt.yaml` for a design prompt, or see [Estimation drills](#estimation-drills) for an estimation drill.
2. Set `ladderOrder` to the next free number in the primary lesson's ladder. A quiz may use 0 to come first on the ladder.
3. Write the text **in your own words** (for a LeetCode problem: `recognitionPrompt` and `hint`). Never paste a problem statement, an editorial or anyone else's solution code; solutions here are written by us.
4. For a quiz, don't let length give the answer away: across a file the right answer should sometimes be the longest or shortest choice, reached by honest wording rather than padding, and V16 checks this.

## Writing a solution

A LeetCode exercise can have a step-by-step solution that the problem page reveals one step at a time: Hint, Intuition, Brute force, Better (optional), Optimal.

1. Copy `templates/solution.mdx` to `content/solutions/<problem-slug>.mdx`, where `<problem-slug>` is the exercise's slug.
2. Write it in your own words, in Python, LeetCode-style (`class Solution` with LeetCode's method name), so the code can be pasted into LeetCode and submitted.
3. Run `npm run check:solutions`. It builds the content and runs every approach's code against the file's `cases`.

**Shape.** The `##` sections are exactly `Intuition`, `Brute force`, optionally `Better`, then `Optimal`, with no `#` headings (an h1 would nest the steps under it and hide them). Intuition is 2–5 short sentences and no code. Each approach section has, in order: the idea in one sentence; one numbered list of 2–5 steps; exactly one `python` block; one trace table; a `**Complexity:**` line. Brute force and Better also end with `**What's wasted:**`. The frontmatter `hook` (at most 12 words) is shown as "Remember it" with Optimal and on the problem's review card.

**Writing bar.** Review checks each guide against this list. It isn't machine-checked.

- The intuition stands on its own, without the code, and uses a concrete picture rather than a definition.
- Variable names are the same in steps, code and trace.
- Each step is one line, in plain words, not code.
- The trace uses the smallest input that shows the key move, and every value in it matches what the code actually does (the reviewer runs it).
- "What's wasted" names the specific repeated work, so the next approach reads as the obvious fix.
- The hook is at most 12 words, is a concrete image or rule of thumb, and is true. It must not be a definition ("use a hash map").
- Complexity claims are exact for the code shown, including sorting and recursion stack space.
- No claim is broader than what the code proves ("always", "never" and "any" need care).

**Harness.** The checker runs each approach's code with LeetCode's usual names available (`List`, `Optional`, `defaultdict`, `heapq`, `math`, `ListNode`, `TreeNode` and so on). Each case has a 2-second limit.

| `harness` | A case is | The checker |
|---|---|---|
| `function` | `args: [...]`, `expect: ...` | calls `Solution().<entry>(*args)`. `args` and `returns` convert values: `listnode` (a list becomes a linked list), `treenode` (a level-order list with `null` holes becomes a tree), `returns: inplace:<i>` (compares argument `i` after the call) |
| `class` | `ops: [...]`, `args: [...]`, `expect: [...]` | runs LeetCode's operation format: `ops[0]` constructs `<entry>`, later ops call methods (for design problems such as LRU Cache) |
| `custom` | anything | calls `run(Solution, case)`, defined by the frontmatter `check`, which asserts (cycles, random pointers, graph cloning, codecs) |

| `compare` | Passes when |
|---|---|
| `exact` (default) | the values are equal |
| `unordered` | the top-level lists are equal once sorted |
| `unordered-deep` | equal once each inner list and then the outer list are sorted (3Sum, Group Anagrams, Subsets) |
| `float` | numbers are within 1e-5 |

**Speed check.** For `harness: function`, an optional `large` gives a generated input as a Python expression. Better and Optimal must pass it within 2 seconds. Brute force is run on it once, only to check that it times out: if it passes, the checker prints `WARN ... [Brute force] passes the large case` (not a failure), so pick a bigger or adversarial input, or explain in a YAML comment beside `large` why none separates them. Add one wherever brute force and optimal differ in complexity class on array input, so a secretly quadratic "optimal" fails.

## The quality bar (checked by the build)

Every lesson must have these `##` sections: **Intuition**, **Visual**, **Pitfalls**, **Tips & tricks**, plus **Template** and **Example** (Algorithms) or **Example** (other tracks). A lesson listed in a module with slug `case-studies` uses the case-study structure instead: **Intuition**, **Requirements & estimates**, **Visual**, **Design walkthrough**, **Pitfalls**, **Tips & tricks**. Every lesson, case studies included, needs a quiz with at least one flashcard that lists it first.

If something is wrong, `npm test` and `npm run build` fail with a message like:

```
[V9] content/tracks/system-design/lessons/caching.mdx: missing section(s) "## Pitfalls"
```

| Rule | Checks |
|---|---|
| V1 | A track's `slug` equals its folder, isn't a reserved route name, and its `order` is unique |
| V2 | Lesson slugs are unique across all tracks, and the file name equals the slug |
| V3 | Every lesson is listed exactly once in a module of its own track |
| V4 | Each module has a lesson or a `comingSoon` title |
| V5 | Prerequisites, `background`, `confusedWith` and exercise `lessons` point to real lessons; `background` lessons are in another track |
| V6 | Prerequisites have no cycles |
| V7 | `ladderOrder` is unique within a primary lesson |
| V8 | Algorithms lessons have `triggers` and `complexity` |
| V9 | Required sections are present (Template and Example for Algorithms, Example for other lessons, the case-study sections rather than Example for lessons in a `case-studies` module); every `<Visualizer kind>` is a known kind |
| V10 | Every lesson is the first entry in at least one exercise's `lessons`, since only those count for mastery |
| V11 | LeetCode exercises: unique slugs, LeetCode ids and leetcode.com URLs (every exercise's file name equals its slug) |
| V12 | Quiz: unique question and flashcard ids; each answer is one of its choices |
| V13 | Design prompt: unique rubric ids |
| V14 | Placement files: the track exists and the file name equals it; each module has 2–3 questions (none for `comingSoon`-only or exempt modules); 4 distinct choices and an `answer` that is one of them; no repeat of a lesson-quiz prompt or of an earlier placement prompt; no lesson takes the reserved slug `placement` |
| V15 | Estimation drills: 2–4 steps with unique ids; a known `unit` (bytes, bytes/s, bits/s, requests/s, count, seconds); `answer` > 0 in base units; `tolerance`, if set, 1.5–10 (default 2); each step's `work` shows its answer as the app formats it (e.g. "10 TB"); non-empty `scenario` and `takeaway` |
| V16 | Lesson quizzes and placement files, per file, counting only questions whose choices differ in length (skipped below 4 such questions): (a) in at least 1 in 5 of them the right answer is the longest or shortest choice; (b) no more than 60% of them have the same number of choices longer than the right answer |
| V17 | Every lesson, in every track, is the first entry in the `lessons` of a `quiz` exercise with at least one flashcard |
| V18 | Solutions: `problem` is a LeetCode exercise with no other solution file, and the file name equals it; `hook` is at most 12 words; at least 4 `cases`; the sections and approach parts listed under [Writing a solution](#writing-a-solution), with no code in Intuition; each approach's code defines `class Solution` (`class <entry>` for `harness: class`); `check` only and always with `harness: custom`; `large` only with `harness: function` |

## Estimation drills

One file per drill at `content/exercises/estimate-<topic>.yaml`, shown as an exercise and scored by `Check` on each step.

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
    unit: bytes                        # bytes, bytes/s, bits/s, requests/s, count or seconds
    answer: 1.0e13                     # in base units
    tolerance: 2                       # optional, default 2; must be 1.5–10
    work: "5 M × 2 MB = 10 TB/day"     # worked arithmetic, shown after Check
takeaway: "…"                          # 1–2 sentences, shown at the end
```

- Byte prefixes are decimal: KB = 10³ bytes, not 2¹⁰.
- `answer` is always in base units (bytes, bytes/s, bits/s, requests/s, a plain count, seconds).
- `work` must contain the answer as the app formats it, such as "10 TB" (V15 checks this).
- Scenario numbers must differ from the numbers in the lessons and design prompts, so the drill is not a lookup.

## Placement quizzes

- One file per track at `content/placement/<track>.yaml`, shown at `/<track>/placement/`.
- 2–3 questions per module. System Design's `case-studies` module is exempt.
- Ask prior-knowledge questions only, and never pre-solve a diagnose prompt.

## Writing style

- Intuition before jargon: start from an everyday analogy.
- Short sentences, concrete numbers, and one idea per paragraph.
- Code is Python unless the topic needs another language.

## Pull requests

- Keep each PR to one topic.
- Vercel posts a **preview link** on the PR. Open your page there and check it on a phone-sized window.
- CI must be green: lint, typecheck, unit tests, build, the solution checker and e2e.

## Licence of contributions

By contributing, you agree that:
- content under `content/` is licensed under **CC BY-SA 4.0** (`LICENSE-CONTENT`)
- code is licensed under **MIT** (`LICENSE`)

Only contribute work you have the right to share.

## Code of conduct

Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
