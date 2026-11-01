# Product Roadmap

*Owner: PO · Last updated: 2026-11-01 · Phases 0–2 shipped; the quality phase is in progress*

## 1. Vision

**An open, community-built place where anyone, at any level, can learn computer science in a way that sticks.**

CS Atlas began as LeetHub, a personal LeetCode trainer. It is now a learning platform with:

- **Many tracks:** Algorithms, System Design and CS Fundamentals today, with Technologies to come.
- **All levels:** a student who can write a loop but has never met a data structure and a senior engineer preparing for staff interviews should both find a path.
- **Community content, later:** admins curate, and learners contribute fixes and lessons. All content so far is written by the owner.

Our edge stays the same as v1: **learning that lasts.** Every track gets the parts that already work for algorithms:

- a roadmap graph of prerequisites
- theory written for intuition first
- interactive visualizers
- notes in the learner's own words
- spaced-repetition review (FSRS)

### Who we serve

| Persona | Need | Example |
|---|---|---|
| **Beginner** (can already write basic code) | A guided path and no jargon walls | A student learning their first data structure |
| **Interview prepper** | A focused plan with a deadline and pattern recognition | An engineer preparing for a FAANG loop in 8 weeks |
| **Working engineer** | To close a gap fast | A backend developer learning how Kafka or consistent hashing works |
| **Contributor** | To share knowledge and get credit | A senior engineer writing a case study on rate limiting |
| **Admin / reviewer** | To keep quality high with little effort | A maintainer reviewing 20 submissions a week |

### Non-goals (for the next 12 months)

- **Hosting LeetCode-style judges.** We link out to LeetCode and similar sites rather than run code against hidden tests.
- **Teaching programming from zero.** Learners need to be able to read and write basic code; variables and loops are not taught here.
- **A native mobile app.** A PWA comes later, in Phase 5.
- **Video courses.** We embed videos, but we don't produce them.
- **Paid tiers.** We'll revisit this once there's an audience.

## 2. Where we are today

- **Content:**
  - 3 tracks and 52 lessons: Algorithms (18), System Design (18) and CS Fundamentals (16).
  - 210 exercises: 138 linked LeetCode problems, 34 quizzes with 273 flashcards, 32 design prompts (16 of them diagnose scenarios) and 6 estimation drills.
  - 21 step-through visualizers and a placement quiz for each track.
- **Learning loop:** roadmap graph, solve + insight notes, a mixed FSRS review queue (Today), a pattern-recognition trainer, mastery per lesson, stats, a ⌘K palette and dark mode.
- **Accounts:** optional GitHub or Google sign-in with cloud sync. Guests keep working offline, and export and account deletion are built in.
- **Architecture:**
  - A static Next.js export on Vercel, with Supabase called from the browser under row-level security.
  - Content is MDX/YAML in a public repo, validated in CI.
- **Audience:** one signed-in learner with synced activity, and no outside contributions yet.
- **Known gaps** (from the audit of 2026-10-31):
  - Algorithms has no quizzes, flashcards or worked examples, and its lessons run 400–950 words against about 1,400 in the other tracks.
  - Beginners land on Arrays & Hashing, which assumes Big-O, and recursion and sorting aren't taught anywhere.
  - Only 4-week retention can be measured, and only for signed-in learners.

## 3. Guiding principles

1. **Learning science over content volume.** A topic ships only with its intuition, a visual or interactive part, practice and review items. Fifty great lessons beat five hundred thin ones.
2. **Curated core, open edges.** Track content is reviewed like code. Blog posts are lighter, but still moderated.
3. **Guest-first.** Everything except contributing works without an account. Signing in adds sync and never gates learning.
4. **Ship by vertical slice.** Each phase ends with something a real learner can use on production.
5. **Respect copyright.** We link to problems on other sites and never copy their statements. Contributions are licensed CC BY-SA 4.0 and code is MIT.

## 4. Roadmap at a glance

Phases 0–2 took about 3.5 weeks with one developer and AI agents, against 11–15 weeks planned, so the original calendar has been dropped. Later sizes are rough, and order matters more than dates.

| Phase | Theme | Outcome | Status |
|---|---|---|---|
| **0** | Foundations | A multi-track content model, a new name, a public repo and Git-based contributions | Shipped 2026-10-07 |
| **1** | Accounts & sync | Sign in, cloud progress and a private profile; guests keep working offline | Shipped 2026-10-13 |
| **2** | New tracks (MVP) | System Design and CS Fundamentals tracks, levels and new exercise types | Shipped 2026-10-28 |
| **Q** | Quality first | Every track meets the same bar, beginners have a way in, and real learners have tried it | **In progress** |
| **3** | Contributions (small) | Invited contributors suggest an edit in the browser and get credit | Next after Q |
| **4** | Community & engagement | Discussions, study plans, streaks and notifications | Waits for real learners |
| **5** | Scale & reach | Technologies track, i18n, PWA/offline, SEO and accessibility | Ongoing, later |

## 5. Phases in detail

### Phase 0 — Foundations (shipped 2026-10-07)

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

**Built differently:** cross-track prerequisites were dropped because they stalled recommendations. Optional `background` links between tracks replaced them (PR #33). Estimated time and tags on lessons were never built.

**Exit criteria**

- The algorithms track is unchanged for learners.
- An outside contributor can add a lesson through a PR by following `CONTRIBUTING.md`.

### Phase 1 — Accounts & sync (shipped 2026-10-13)

**Goal:** progress follows the learner across devices. This is the foundation for roles and contributions.

**Epics**

1. **Backend.**
   - Supabase as the backend: Postgres, auth and row-level security in one place.
   - **The site stays a static export**, with all Supabase calls made from the browser and protected by row-level security (decided 2026-10-11).
2. **Auth.** Sign in with GitHub and Google (no email).
3. **`SupabaseStore`.**
   - Implements the existing `Store` interface.
   - Keeps an in-memory snapshot, writes through Postgres functions, and refreshes over Realtime.
   - On first sign-in, guest progress is merged into the account and the local copy is cleared.
4. **Profile.** A private profile (avatar and name, Account settings). Public profiles move to Phase 4.
5. **Privacy.** Export all my data (already exists), delete my account, and a privacy policy page.

**Exit criteria**

- Progress made on a laptop shows up on a phone within seconds.
- Guest mode still works fully offline.
- Deleting an account removes every row that belongs to the user.

### Phase 2 — New tracks (shipped 2026-10-28)

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

**Built differently**

- Consistent hashing is part of Replication & sharding rather than its own lesson.
- HTTP and APIs is part of Client–server & HTTP, and covers REST only.
- The rate limiter is a lesson plus a design prompt rather than a case study, so there are 5 case studies, not 6.
- Computer architecture became the Machine & math module, which covers the memory hierarchy but not how a CPU runs a program.
- CS Fundamentals has no capstone: it ends at its fifth module.

**Close-out (2026-10-28)**

- Both exit criteria were verified by walking each track on production as a fresh guest, using only Continue. The walk found that other tracks' exercises held a lesson back (Caching) and that a finished track had no end state; both were fixed (PR #29).
- **Retention baseline.** 4-week retention is measured by `report.retention_w4()` (Supabase, `service_role` only):
  - a learner's cohort is the week of their first synced activity day;
  - they count as retained if they have any activity on days 22–28, counting that first day as day 1;
  - only cohorts whose day 28 has passed are counted, and cohorts under 5 learners are merged.
  - It covers signed-in learners only, because guest progress never leaves the browser. Phase 4 compares against the same function.
  - First production run, 2026-10-28: no cohort was complete. Only one signed-in learner had synced activity, first active 2026-10-15; their cohort (week of 2026-10-12) completes on 2026-11-14.
  - The baseline is recorded once at least one complete cohort has 5 or more learners. Until then the figure would describe individuals, not a baseline.

### Phase Q — Quality first (in progress)

**Goal:** before inviting anyone, make what's already here correct, even across tracks, and usable by the people the vision names. Principle 1 says fifty great lessons beat five hundred thin ones, and the audit of 2026-10-31 found the bar uneven.

**Work, in order, one PR or small batch each**

| # | Work | Status |
|---|---|---|
| 1 | **Correctness fixes** across all three tracks | Done (PR #32) |
| 2 | **Learning-loop fixes:** Algorithms mastery reachable without the trainer, real prerequisites, `background` links, stricter V10, quiz answer-length rule V16 | Done (PRs #33, #34) |
| 3 | **This roadmap rewrite** | Done |
| 4 | **Algorithms up to the bar:** a quiz and flashcards for all 18 lessons, worked examples, a deeper Foundations module | Next |
| 5 | **Beginner on-ramp:** Big-O reachable from the first lesson, and new Recursion and Sorting lessons | Planned |
| 6 | **Coverage gaps:** rate-limiter case study, consistent hashing lesson, how hash tables and trees work underneath, how a CPU runs a program | Planned |
| 7 | **Minimum measurement:** cookieless page analytics, a weekly-active-learners query, the due date stored on review logs | Planned |
| 8 | **Try it with people:** 5–10 real learners and 1–2 contributors, with an "Improve this page" link for reports | Planned |

**Exit criteria**

- Every lesson in every track has a worked example, a quiz with flashcards and at least one exercise that counts for its mastery.
- A learner who can write basic code but doesn't know Big-O can follow Algorithms from its first lesson without getting stuck.
- At least 5 people outside the project have used it, and what they reported has been triaged.

### Phase 3 — Contributions (small)

**Goal:** the few people we invite can fix a page without knowing Git. Docs stay in Git as MDX, so every change is still a PR with CI and a review.

The first plan for this phase also had roles, a review queue with SLAs, a blog and moderation tooling. Those assume a community we don't have, so they are deferred (see below).

**Epics**

1. **Suggest an edit on any page.** An in-browser editor with a live preview. On submit, a PR opens that credits the contributor, and they can see its status. Contributors are on an allowlist. How the PR gets created needs its own spec; the leading option is a GitHub App behind one Supabase Edge Function.
2. **Credit.** Each lesson shows its contributors, built from merged PRs.

**Exit criteria**

- A contributor who doesn't know Git can fix a typo in under 2 minutes, end to end.

**Deferred until outside contributions are more than one maintainer can handle on GitHub**

- A new-lesson wizard, which would reuse the editor and PR path from epic 1.
- Roles and permissions, and a review queue with SLA indicators.
- Rate limits, spam filtering and a moderation log. An allowlist is enough until sign-up for contributing is open.

**Blog:** blog posts would live in Postgres rather than Git, with light moderation. Not planned until there are writers asking for it.

### Phase 4 — Community & engagement

**Goal:** make coming back fun, without dark patterns. This phase waits for real learners: discussions and streaks can't be judged with one user.

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

- 4-week retention improves measurably over the baseline, once a complete cohort of 5 or more learners exists to set one.
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

Percentage targets are on hold until there are about 30 active learners, because below that they would describe individuals. Phase Q #7 adds what's missing.

| Metric | Why it matters | Measurable today? | Target once there's an audience |
|---|---|---|---|
| **North Star: weekly active learners** who complete a lesson or a review session | Measures real learning, not page views | No. Activity exists for signed-in learners but nothing queries it, "completes a lesson" isn't defined, and guests aren't visible | +20% a quarter |
| Review completion rate (due items reviewed within 48h) | Measures whether learning lasts | No. Review logs don't store the due date | ≥ 60% |
| 4-week retention of new sign-ups | Measures whether the product is fun | Yes, signed-in learners only: `report.retention_w4()` | ≥ 25% |
| Accepted contributions per month | Measures whether the community is healthy | Yes, from GitHub. Currently no outside ones | Set after Phase 3 |
| Median time to review a submission | Measures contributor experience | Yes, from GitHub. Nothing to measure yet | < 72h |
| Lessons meeting the quality bar | Measures content depth | Partly. CI checks required sections, not whether each lesson has a quiz | 100% of published lessons |

**Analytics:** privacy-friendly (e.g. Plausible or Umami with no third-party cookies), added in Phase Q.

## 7. Key risks

| Risk | Mitigation |
|---|---|
| **Quality drops as content grows** | Enforce the quality bar in CI; an independent accuracy review for every content change; let learners flag weak lessons |
| **Building for a community that doesn't exist** | Test with real learners first; community features wait for evidence they're needed |
| **The review load overwhelms one admin** | Promote trusted contributors to reviewers early; lighter review for blog posts; automated checks first |
| **Spam and abuse** once accounts exist | Rate limits, first-post moderation, reporting, and blocking links for new accounts |
| **Scope creep across tracks** | Ship two new tracks well before starting a third; Technologies waits for Phase 5 |
| **Copyright** (problem statements, copied blog posts) | Link out instead of copying; licence terms on submit; a takedown process |
| **Cost grows with users** | Static-first rendering and free tiers (Vercel, Supabase); watch costs monthly |
| **Migration breaks v1 users' local data** | Import local progress through the existing backup schema; keep guest mode; cover it with e2e tests |

## 8. Decisions

The PO's recommendations below were approved on 2026-10-06.

1. **Rename the product before the repo goes public.** "LeetHub" was too narrow and clashed with an existing extension. It is now CS Atlas.
2. **Make the repo public** at the end of Phase 0, with MIT for code and CC BY-SA 4.0 for content. Git-based contribution is the cheapest way to get early contributors.
3. **Backend: Supabase** (Postgres + auth + RLS), on the current Vercel hosting.
4. **Split docs and blog posts** (the hybrid in Phase 3). Docs stay in Git, reviewed and versioned; blog posts go in the database.
5. **First new track: System Design.** CS Fundamentals follows in the same phase.

Added on 2026-11-01:

6. **Quality before community.** Phase Q comes before Phase 3, and Phase 3 is cut to suggest-an-edit and credit.
7. **Learners need basic programming.** We won't teach variables and loops; the on-ramp starts from Big-O.
8. **Track links never block.** Links between tracks are optional `background`, not prerequisites.

## 9. Next step

Phase Q #4: bring Algorithms up to the bar, batched by module like the CS Fundamentals track, starting with the 6 Foundations lessons. Each later phase gets its own spec → plan → PR cycle.
