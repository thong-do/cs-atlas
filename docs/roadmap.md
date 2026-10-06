# Product Roadmap

*Owner: PO · Last updated: 2026-10-06 · Status: approved*

## 1. Vision

**An open, community-built place where anyone, at any level, can learn computer science in a way that sticks.**

LeetHub began as a personal LeetCode trainer. The next step is a learning platform with:

- **Many tracks:** Algorithms, System Design, CS Fundamentals and Technologies.
- **All levels:** a beginner who has never written a loop and a senior engineer preparing for staff interviews should both find a path.
- **Community content:** admins curate, and learners contribute docs, blog posts, exercises and fixes.

Our edge stays the same as v1: **learning that lasts.** Every track gets the parts that already work for algorithms:

- a roadmap graph of prerequisites
- theory written for intuition first
- interactive visualizers
- notes in the learner's own words
- spaced-repetition review (FSRS)

### Who we serve

| Persona | Need | Example |
|---|---|---|
| **Beginner** | A guided path from zero and no jargon walls | A student learning their first data structure |
| **Interview prepper** | A focused plan with a deadline and pattern recognition | An engineer preparing for a FAANG loop in 8 weeks |
| **Working engineer** | To close a gap fast | A backend developer learning how Kafka or consistent hashing works |
| **Contributor** | To share knowledge and get credit | A senior engineer writing a case study on rate limiting |
| **Admin / reviewer** | To keep quality high with little effort | A maintainer reviewing 20 submissions a week |

### Non-goals (for the next 12 months)

- **Hosting LeetCode-style judges.** We link out to LeetCode and similar sites rather than run code against hidden tests.
- **A native mobile app.** We ship a PWA instead.
- **Video courses.** We embed videos, but we don't produce them.
- **Paid tiers.** We'll revisit this once there's an audience.

## 2. Where we are today (v1, live)

- **Content:**
  - 18 algorithm patterns with full theory.
  - 138 free LeetCode problems in ladders.
  - 8 step-through visualizers.
- **Learning loop:** roadmap graph, solve + insight notes, an FSRS review queue (Today), a pattern-recognition trainer, stats, a ⌘K palette and dark mode.
- **Architecture:**
  - A static Next.js export on Vercel.
  - Content is MDX/YAML in the repo.
  - Progress lives only in the browser (IndexedDB) with JSON backup, behind a `Store` interface that was designed for a later cloud store.
- **Gaps for the new vision:**
  - The content model is algorithm-specific (`pattern`, `problem`).
  - There are no accounts or sync.
  - There is no way to contribute.
  - The repo is private.
  - The name "LeetHub" ties us to LeetCode and is already used by a well-known browser extension.

## 3. Guiding principles

1. **Learning science over content volume.** A topic ships only with its intuition, a visual or interactive part, practice and review items. Fifty great lessons beat five hundred thin ones.
2. **Curated core, open edges.** Track content is reviewed like code. Blog posts are lighter, but still moderated.
3. **Guest-first.** Everything except contributing works without an account. Signing in adds sync and never gates learning.
4. **Ship by vertical slice.** Each phase ends with something a real learner can use on production.
5. **Respect copyright.** We link to problems on other sites and never copy their statements. Contributions are licensed CC BY-SA 4.0 and code is MIT.

## 4. Roadmap at a glance

The estimates assume one developer working with AI agents, using the same spec → plan → subagent workflow as v1.

| Phase | Theme | Outcome | Rough size |
|---|---|---|---|
| **0** | Foundations | A multi-track content model, a new name, a public repo and Git-based contributions | 2–3 weeks |
| **1** | Accounts & sync | Sign in, cloud progress and profiles; guests keep working offline | 3–4 weeks |
| **2** | New tracks (MVP) | System Design and CS Fundamentals tracks, levels and new exercise types | 6–8 weeks, then ongoing |
| **3** | In-app contributions | An editor, suggested edits, a review queue, roles and blog posts | 5–6 weeks |
| **4** | Community & engagement | Discussions, study plans, streaks and notifications | 4–5 weeks |
| **5** | Scale & reach | Technologies track, i18n, PWA/offline, SEO and accessibility | Ongoing |

```text
Oct      Nov      Dec      Jan      Feb      Mar      Apr      May
|─ P0 ─|
       |── P1 ──|
                |──────── P2: new tracks ────────|········ ongoing content
                                  |──── P3 ────|
                                               |── P4 ──|
                                                        |── P5 → ──
```

## 5. Phases in detail

### Phase 0 — Foundations (now)

**Goal:** turn an algorithm site into a platform skeleton without breaking anything that works today.

**Epics**

1. **Rename and rebrand.** Choose a name that isn't tied to LeetCode, then update the domain, logo and metadata. Redirect the old URLs.
2. **Content model v2.**
   - Generalise the model to **Track → Module → Lesson**, plus **Exercise**.
   - **Exercise types:**
     - `external-problem`: what a LeetCode problem is today
     - `quiz`
     - `flashcard`
     - `design-prompt`
   - **Lesson metadata:** level (Beginner, Intermediate or Advanced), estimated time, prerequisites (which may point to lessons in other tracks), tags and authors.
   - The algorithm patterns move into an `algorithms` track with identical URLs, or with redirects.
3. **Cross-track roadmap.** The roadmap graph works for each track and shows prerequisite links between tracks.
4. **Open source the repo.**
   - Make it public and add the licences (MIT for code, CC BY-SA for content).
   - Add `CONTRIBUTING.md`, lesson and exercise templates, a code of conduct and issue/PR templates.
   - Make CI content validation (already in Velite) the gate for every contribution PR.
5. **Preview deploys for contributors.** Every content PR gets a Vercel preview link. This already works today.

**Exit criteria**

- The algorithms track is unchanged for learners.
- An outside contributor can add a lesson through a PR by following `CONTRIBUTING.md`.

### Phase 1 — Accounts & sync

**Goal:** progress follows the learner across devices. This is the foundation for roles and contributions.

**Epics**

1. **Backend.**
   - Add managed Postgres with auth. We recommend **Supabase**: Postgres, auth and row-level security in one place, and the v1 spec already planned a `SupabaseStore`.
   - Drop `output: 'export'` in favour of hybrid Next.js on Vercel. Content pages stay static; only the app routes become dynamic.
2. **Auth.** Sign in with GitHub and Google, plus email magic links.
3. **`SupabaseStore`.**
   - Implements the existing `Store` interface.
   - Syncs with conflict resolution: per-record last-write-wins, with review logs merged as append-only.
   - On first sign-in, local IndexedDB progress is imported using the existing backup schema.
4. **Profile.** A public username, avatar and level, with optional public stats.
5. **Privacy.** Export all my data (already exists), delete my account, and a privacy policy page.

**Exit criteria**

- Progress made on a laptop shows up on a phone within seconds.
- Guest mode still works fully offline.
- Deleting an account removes every row that belongs to the user.

### Phase 2 — New tracks (MVP content)

**Goal:** prove the platform beyond algorithms with two new tracks that meet the v1 quality bar.

**System Design track**

| Level | Modules |
|---|---|
| Beginner | Client–server, HTTP and APIs, DNS and CDNs, SQL vs NoSQL |
| Intermediate | Caching, load balancing, replication and sharding, queues and streams, consistency models, rate limiting |
| Advanced | Consensus (Raft), consistent hashing, distributed transactions, observability |
| Case studies | URL shortener, news feed, chat, rate limiter, video streaming, payment system |

New pieces this track needs:

- **Architecture-diagram visualizers**, such as watching a request travel through a cache or a replica set.
- **`design-prompt` exercises**: the learner writes a design against a rubric, then compares it with a reference answer and self-grades.
- **Back-of-the-envelope estimation drills.**

**CS Fundamentals track**

- **Data structures and complexity.** This module bridges into Algorithms.
- **Operating systems:** processes, threads, scheduling, memory and virtual memory, concurrency primitives.
- **Networking:** the TCP/IP stack, TCP vs UDP, TLS, HTTP/1.1, HTTP/2 and HTTP/3.
- **Databases:** indexes and B-trees, transactions and isolation levels, query planning.
- **Computer architecture basics and discrete math essentials.**

New pieces for this track:

- Visualizers for the TCP handshake, page tables, a B-tree insert and a mutex.
- Quiz and flashcard decks that feed the existing FSRS review queue.

**Platform features in this phase**

- **Level placement.** A 5-minute placement quiz for each track suggests a starting point.
- **Unified "Today".** The review queue mixes items from every track the learner follows.
- **Track pages.** Each shows its progress, estimated time and a "continue where you left off" link.

**Exit criteria**

- Each new track has at least 12 lessons that meet the quality bar: intuition, a visual, an exercise and review items.
- Learners can follow either track from the start to its case studies or capstone.

### Phase 3 — In-app contributions

**Goal:** anyone can improve content without knowing Git, and admins can keep up with what comes in.

**Two content types, two workflows**

| | **Docs (track lessons)** | **Blog posts** |
|---|---|---|
| Who writes | Contributors, then a reviewer approves | Any signed-in user |
| Stored in | The Git repo as MDX, which keeps versioning, review and CI | Postgres |
| Review | Required before publish | Light moderation: first post reviewed, then trusted users publish directly |
| Example | "Fix the B-tree split diagram" | "How I passed my system design interview" |

**Epics**

1. **Suggest an edit on any page.** It opens an in-browser MDX editor with a live preview, including visualizers. On submit, a GitHub App opens a PR on the user's behalf and credits them.
2. **New-lesson wizard.** It starts from a track template, checks for missing sections (intuition, visual, exercise) before submit, and runs the same validation as CI.
3. **Roles and permissions:**
   - Learner
   - Contributor (after one accepted edit)
   - Reviewer (per track)
   - Admin
4. **Review queue.** An admin dashboard of pending edits and posts, with a diff view and approve, request changes or reject. It shows SLA indicators.
5. **Blog.**
   - Posts with tags that link to lessons, so a lesson can list related community posts.
   - Drafts, publish, edit history, and reporting a post.
6. **Credit.** Contributor profiles list accepted contributions, and each lesson shows its authors.
7. **Safety.** Rate limits, spam filtering, reporting and a moderation log.

**Exit criteria**

- A non-technical contributor can fix a typo in under 2 minutes, end to end.
- The median time to review a submission is under 72 hours.

### Phase 4 — Community & engagement

**Goal:** make coming back fun, without dark patterns.

**Epics**

1. **Discussions** on each lesson and exercise. Threads can be marked "answered", and lesson authors are notified.
2. **Study plans.** Curated plans such as "8-week interview prep" or "System design in 30 days", plus user-made plans that can be shared by link.
3. **Habit features.**
   - Streaks with freeze days.
   - Weekly goals.
   - Gentle email or push reminders when reviews are due, opt-in only.
4. **Achievements** for milestones, such as finishing a track or making a first accepted contribution. These are not grind badges.
5. **Better search** across lessons, exercises, posts and discussions.

**Exit criteria**

- 4-week retention improves measurably over Phase 2's baseline.
- Each lesson's discussion area stays healthy, with a low report rate.

### Phase 5 — Scale & reach (ongoing)

- **Technologies track:**
  - Git
  - Linux and shell
  - Docker and Kubernetes
  - SQL in practice
  - One language deep-dive at a time (Python, then TypeScript, then Go)
  - Cloud basics

  Contributors will write most of this.
- **i18n.** Translatable UI first, then translated lessons, with English as the source of truth. Pages flag translations that are out of date.
- **PWA / offline.** Install the app and review flashcards offline.
- **Accessibility.** A WCAG 2.2 AA audit, with keyboard and screen-reader support for the visualizers.
- **SEO and performance budgets.** Open Graph images for each lesson.
- **Later, to explore:** an AI tutor that gives hints grounded in the lesson; in-browser code runners for small exercises; a sustainability model such as sponsors or donations.

## 6. Success metrics

| Metric | Why it matters | Target at the end of Phase 4 |
|---|---|---|
| **North Star: weekly active learners** who complete a lesson or a review session | Measures real learning, not page views | Set the baseline in Phase 1, then aim for +20% a quarter |
| Review completion rate (due items reviewed within 48h) | Measures whether learning lasts | ≥ 60% |
| 4-week retention of new sign-ups | Measures whether the product is fun | ≥ 25% |
| Accepted contributions per month | Measures whether the community is healthy | ≥ 30 |
| Median time to review a submission | Measures contributor experience | < 72h |
| Lessons meeting the quality bar | Measures content depth | 100% of published lessons |

**Analytics:** privacy-friendly (e.g. Plausible or PostHog with no third-party cookies).

## 7. Key risks

| Risk | Mitigation |
|---|---|
| **Quality drops as content grows** | Enforce the quality bar in CI (required sections); review per track; let learners flag weak lessons |
| **The review load overwhelms one admin** | Promote trusted contributors to reviewers early; lighter review for blog posts; automated checks first |
| **Spam and abuse** once accounts exist | Rate limits, first-post moderation, reporting, and blocking links for new accounts |
| **Scope creep across tracks** | Ship two new tracks well before starting a third; Technologies waits for Phase 5 |
| **Copyright** (problem statements, copied blog posts) | Link out instead of copying; licence terms on submit; a takedown process |
| **Cost grows with users** | Static-first rendering and free tiers (Vercel, Supabase); watch costs monthly |
| **Migration breaks v1 users' local data** | Import local progress through the existing backup schema; keep guest mode; cover it with e2e tests |

## 8. Decisions

The PO's recommendations below were approved on 2026-10-06.

1. **Rename the product before the repo goes public.** "LeetHub" is too narrow and clashes with an existing extension. The Phase 0 spec picks the new name.
2. **Make the repo public** at the end of Phase 0, with MIT for code and CC BY-SA 4.0 for content. Git-based contribution is the cheapest way to get early contributors.
3. **Backend: Supabase** (Postgres + auth + RLS), on the current Vercel hosting.
4. **Split docs and blog posts** (the hybrid in Phase 3). Docs stay in Git, reviewed and versioned; blog posts go in the database.
5. **First new track: System Design.** CS Fundamentals follows in the same phase.

## 9. Next step

Brainstorm **Phase 0** into its own spec and implementation plan, following the same workflow as v1. Each later phase gets its own spec → plan → PR cycle.
