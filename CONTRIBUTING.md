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

## How content is organised

```
content/
  tracks/<track>/track.yaml        # modules and the order of lessons
  tracks/<track>/lessons/<slug>.mdx
  exercises/<slug>.yaml
```

- A **track** (Algorithms, System Design, …) has **modules**; a module lists **lessons** in order and may list `comingSoon` titles.
- An **exercise** links to a problem on LeetCode and lists the lessons it practises. The first lesson is its primary lesson: the exercise appears in that lesson's ladder. Lessons from **other tracks** can share it.

## Add a lesson

1. Copy `templates/lesson.mdx` to `content/tracks/<track>/lessons/<slug>.mdx` and fill it in.
2. Add the slug to a module's `lessons` in `content/tracks/<track>/track.yaml`.
3. Make sure at least one exercise lists it (add one if needed).
4. Run `npm run dev` and open `/<track>/<slug>/`.

## Add an exercise

1. Copy `templates/exercise.yaml` to `content/exercises/<slug>.yaml`. The slug must match the LeetCode URL.
2. Set `ladderOrder` to the next free number in the primary lesson's ladder.
3. Write `recognitionPrompt` and `hint` **in your own words**. Never paste a problem statement or a solution.

## The quality bar (checked by the build)

Every lesson must have these `##` sections: **Intuition**, **Visual**, **Pitfalls**, **Tips & tricks**, plus **Template** (Algorithms) or **Example** (other tracks). Every lesson needs at least one exercise.

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
| V5 | Prerequisites, `confusedWith` and exercise `lessons` point to real lessons |
| V6 | Prerequisites have no cycles |
| V7 | `ladderOrder` is unique within a primary lesson |
| V8 | Algorithms lessons have `triggers` and `complexity` |
| V9 | Required sections are present; every `<Visualizer kind>` is a known kind |
| V10 | Every lesson has at least one exercise |
| V11 | Exercise file name equals its slug; slugs and LeetCode ids are unique; URLs are on leetcode.com |

## Writing style

- Intuition before jargon: start from an everyday analogy.
- Short sentences, concrete numbers, and one idea per paragraph.
- Code is Python unless the topic needs another language.

## Pull requests

- Keep each PR to one topic.
- Vercel posts a **preview link** on the PR. Open your page there and check it on a phone-sized window.
- CI must be green: lint, typecheck, unit tests, build and e2e.

## Licence of contributions

By contributing, you agree that:
- content under `content/` is licensed under **CC BY-SA 4.0** (`LICENSE-CONTENT`)
- code is licensed under **MIT** (`LICENSE`)

Only contribute work you have the right to share.

## Code of conduct

Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
