# System Design Case Studies Batch 2 (Video streaming, Payment system) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish System Design's Case Studies module. It gains two advanced case studies, `video-streaming` and `payment-system`, each with a quiz and a design prompt, plus one new step-through visualizer, `abr-player`. Its `comingSoon` list ends up empty.

**Architecture:** This batch is content only, plus one visualizer built on the existing pattern: a pure `*-steps.ts` generator with a pinned test, a `*-view.tsx` component, and a case in `visualizer.tsx`. The platform needs no changes. Case-study lessons use the six-section layout that V9 enforces for the `case-studies` module.

**Tech Stack:** Next.js (App Router, static export), Velite, TypeScript, Vitest, Playwright, MDX, YAML.

**Spec:** none separate. The design was approved in chat on 2026-10-26 and follows the approach of PR #19 (case-studies batch 1). `docs/roadmap.md` Phase 2 lists both titles.

## Global Constraints

### Branch and commits

- **Branch:** `feat/sd-case-studies-2`. It is based on `feat/estimation-drills` (PR #27), so `track.yaml`, `index.test.ts` and `layout.spec.ts` already contain the estimation lesson. The PR targets `main` after #27 merges.
- **Never** commit to main, push, or dispatch subagents or reviewers.
- **One commit per task.** Every message ends with a `Co-Authored-By:` trailer naming your model, e.g. `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Staging:** stage files explicitly. Never commit anything under `.superpowers/`; check `git status` first.
- **Checks:** before committing a task, run `npm test`, `npm run typecheck` and `npm run lint`, plus the e2e specs the task names. If the only failures are browser-launch or `webServer` timeouts on pages you didn't touch, re-run just those specs and say so.

### Lesson file (`content/tracks/system-design/lessons/<slug>.mdx`)

- **Frontmatter:** exactly `slug`, `title`, `level: advanced`, `authors: [cs-atlas]`, `prerequisites`, and a one-sentence `summary`, as in `chat.mdx`.
- **Sections:** exactly these `##` sections, in order: Intuition, Requirements & estimates, Visual, Design walkthrough, Pitfalls, Tips & tricks.
  - **Intuition** opens with an everyday analogy.
  - **Requirements & estimates** lists functional and non-functional requirements with numbers, then the back-of-the-envelope arithmetic. Link `[Back-of-the-envelope estimation](/system-design/estimation/)` once.
  - **Visual** has a ```text architecture diagram, plus the `<Visualizer>` line if the task names one.
  - **Design walkthrough** covers the components in request order, each decision with its trade-off, and scaling and failure handling.
  - **Pitfalls** are bullets, each with its fix.
  - **Tips & tricks** gives rules of thumb, what to measure, and an "Interview phrasing" line.
- **Length:** 1,450–1,650 words by `wc -w`. The existing case studies run 1,580–1,590.
- **Voice:** match `chat.mdx` and `news-feed.mdx`. Link prerequisite and related lessons with the site's link format, e.g. `[Queues & streams](/system-design/queues-streams/)`.

### Accuracy rules

Each of these caught a real error in earlier batches.

- **Hedge figures that vary by vendor, codec or hardware:** bitrates, encode speed, CDN hit ratios, provider fees, latency. Never invent statistics, and never present a vendor's internal design as fact.
- **Arithmetic:** show and check all of it, keep units straight (bits vs bytes, per day vs per second), and make it consistent with the estimation lesson's conventions (decimal prefixes, 86,400 s/day).
- **Protocols and standards:** name them only when you are sure, and keep them distinct.
  - HLS vs DASH.
  - CMAF segments.
  - Payment-provider webhooks vs API responses.
  - Authorisation vs capture vs settlement vs refund vs chargeback.
- **Examples follow the lesson's own advice.**
- **Don't pre-solve any design prompt:**
  - **Avoid every NOT list.** Each task lists what its lesson must NOT discuss, and every lesson in this batch must also avoid the other task's NOT list.
  - **Different scenarios.** Use different scenarios and numbers from the design prompts.
  - **Check before committing.** Grep the lesson for each rubric point's key terms.
- **Don't refer to "a later lesson"** unless an existing lesson names it. Link to existing lessons instead.

### Quiz (`content/exercises/<slug>-quiz.yaml`)

- **Header:** `type: quiz`, `title: "<Lesson title> — quiz"`, `lessons: [<slug>]`, `ladderOrder: 1`.
- **Questions:** 5 judgement questions, each with 4 choices. Use the layout of `chat-quiz.yaml`.
  - **No recall.** No question may be answerable by recalling a lesson sentence or pitfall. Use scenarios, numbers and facts the lesson doesn't contain. Ask "why" or "what would you observe".
  - **No outside trivia.** No question may need a fact that neither the lesson nor the stem supplies; put any needed fact in the stem.
  - **Distractors:**
    - Each is a confident, plausible, related-but-wrong mechanism of similar specificity.
    - None labels its own mistake, states an absurd rule, or contradicts the stem.
    - None is secretly correct under an unstated default.
  - **The correct choice** must not be the only one that echoes the lesson's keywords, nor the only worked derivation.
  - **Every premise** in a stem must be literally true.
- **Choice lengths:** the correct choice must be neither the longest nor the shortest in at least 4 of the 5 questions. Measure this for the FINAL version and put the table in your report.
- **Explanations:** 1–2 sentences each, describing the distractors accurately.
- **Answer key:**
  - At least 3 distinct indexes, with no run of three identical indexes.
  - Re-check it after any rewrite.
  - It must not match any existing key. List the existing keys with:
    `for f in content/exercises/*-quiz.yaml; do grep 'answer:' $f | awk '{print $2}' | tr '\n' ','; echo; done | sort`
- **Flashcards:** 8, with each side ≤200 characters and lowercase-with-dashes ids. No front may duplicate one anywhere in `content/exercises`; check with `grep -h "front:" content/exercises/*.yaml`.
- **Duplicates:** don't repeat or closely paraphrase any question in another `*-quiz.yaml` or any prompt in `content/placement/*.yaml`.

### Design prompt (`content/exercises/<prompt-slug>.yaml`)

- **Fields:** `type: design-prompt`, `kind` omitted (it defaults to `design`), `title: "Design: …"`, `lessons: [<slug>]`, `ladderOrder: 2`. Copy the layout of `content/exercises/design-live-comments.yaml`.
- **`prompt`:**
  - Give the product, the load with numbers in bold, the hard requirements, and what to describe.
  - End with "Show the arithmetic."
  - It must not name the solution.
- **`hint`:** one nudge that doesn't state the answer.
- **`rubric`:** 5 points with lowercase-with-dashes ids.
- **`reference`:** 230–300 words by word count on the reference block only. It must:
  - match the rubric point by point;
  - show all its arithmetic, correctly;
  - use only numbers from the prompt or derived in the reference;
  - be internally consistent;
  - hedge vendor-specific behaviour.

### Wiring

Each lesson task does the following:
- **`content/tracks/system-design/track.yaml`:**
  - appends its slug to `case-studies.lessons`;
  - removes its own title from `case-studies.comingSoon`;
  - the task that empties the list deletes the `comingSoon` key.
- **`src/lib/content/index.test.ts`:**
  - appends the slug to the System Design lesson-order assertion;
  - adds a lesson test like the existing `url-shortener` one, covering track, prerequisites, toc titles and the exercise slugs.
- **`e2e/layout.spec.ts`:** adds `/system-design/<slug>/`, `/exercises/<slug>-quiz/` and `/exercises/<prompt-slug>/` after `'/exercises/design-live-comments/'`, in lesson order.
- **`e2e/visualizers.spec.ts`:** if the lesson embeds a visualizer, adds `{ path, final }` to `PAGES`.

## Review Focus

1. **The tracks e2e test expects a "Coming soon" label on `/system-design/`.**
   - `e2e/tracks.spec.ts` checks `getByText('Coming soon').first()` there. After Task 3 no track has coming-soon titles, so Task 3 changes that assertion to `toHaveCount(0)`.
   - Task 3 also adds checks that "Video streaming" and "Payment system" link to their lessons.
   - Task 2 must keep the test passing: after Task 2, "Payment system" is still coming soon.
2. **`abr-player` must stay a fixed height at 320 px.** It shows the bitrate ladder, a buffer bar and a segment strip of 8 cells. Task 1 measures height and horizontal scroll at every step at 320, 375 and 1280 px on a lesson-width container.
3. **The video lesson must describe the visualizer's trace exactly:**
   - the ladder;
   - the bandwidth sequence;
   - the 3 s stall at segment 4;
   - the step-down to 1,000 kbps, then back up to 2,500 kbps.

   Task 1 pins every step, and Task 2 copies its numbers from Task 1's table.
4. **Payments overlap with `design-money-transfer`.** That design prompt, from the `distributed-transactions` lesson, already asks for a saga between an Accounts service and a partner bank, with idempotency across retries, holds, and repairing mismatches.
   - The payment lesson may use idempotency keys, the outbox and reconciliation, because `distributed-transactions.mdx` already teaches them.
   - It must use a card-payment-through-a-provider scenario, never account-to-account transfers between two services.
   - It must not lay out a saga's steps and compensations, or a funds-hold mechanism.
5. **Money and card-network terms are easy to get subtly wrong.** These include authorisation holds expiring, capture windows, settlement timing, chargebacks and PCI scope. Every such claim is hedged ("typically", "depends on the network and provider"). Task 3's review checks each one.

---

### Task 1: `abr-player` visualizer

**Files:**
- Create: `src/lib/visualizers/abr-steps.ts`, `src/lib/visualizers/abr-steps.test.ts`, `src/components/visualizers/abr-view.tsx`
- Modify: `src/lib/visualizers/kinds.ts` (add `'abr-player'` after `'b-tree-insert'`), `src/components/visualizers/visualizer.tsx`

**Interfaces:**
- Produces `abrPlayerSteps(): AbrStep[]` and the kind `abr-player`.
- Task 2 consumes the final caption (in `e2e/visualizers.spec.ts`) and the trace numbers.

**Pattern.** Follow `src/lib/visualizers/tb-steps.ts` and its test, and `src/components/visualizers/tb-view.tsx`, along with how `visualizer.tsx` wires `TokenBucketVisualizer` to `StepPlayer`.
- The generator is pure and returns steps with a `caption`; the last step has `done: true`.
- Captions are in the past tense, and numbers are derived from state.
- **Constant height:** the figure keeps one height at 320, 375 and 1280 px, with no sideways scroll. Reserve caption height where it wraps, as `tcp-view.tsx` does with `max-[374px]:min-h-8`.
- **State is shown as text as well as colour.**
  - White text sits on blue-600 `#2563eb`, amber-700 `#b45309`, emerald-700 `#047857`, purple-600 `#9333ea`, red-700 `#b91c1c` or slate-600 `#475569`.
  - Red text in dark mode gets `dark:text-red-400`.
- **Accessibility:** one dynamic `aria-label` on a `role="img"` container that summarises the state. No `aria-label` on children.

**Model.** Use exactly these constants and rules:
- Ladder `ABR_LADDER_KBPS = [400, 1000, 2500, 5000]`, each 4 s segments (`ABR_SEGMENT_SECONDS = 4`).
- Bandwidth during each of the 8 segment downloads, in Mbit/s: `ABR_BANDWIDTH_MBPS = [8, 8, 8, 2, 2, 2, 4, 4]`.
- **Rendition rule:**
  - Segment 1 uses the lowest rendition, since there is no measurement yet.
  - Each later segment uses the highest rendition ≤ 0.8 × the throughput measured while downloading the previous segment, falling back to the lowest.
- **Download time:** `rendition_kbps × 4 ÷ (bandwidth_mbps × 1000)` seconds.
- **Buffer:**
  - After segment 1, the buffer is 4 s and playback starts.
  - For each later segment, the stall is `max(0, download − buffer_before)`, and the buffer becomes `max(0, buffer_before − download) + 4`.

The trace, which your test pins exactly:

| seg | bandwidth Mbit/s | rendition kbps | download s | stall s | buffer after s |
|---|---|---|---|---|---|
| 1 | 8 | 400 | 0.2 | 0 | 4 |
| 2 | 8 | 5000 | 2.5 | 0 | 5.5 |
| 3 | 8 | 5000 | 2.5 | 0 | 7 |
| 4 | 2 | 5000 | 10 | 3 | 4 |
| 5 | 2 | 1000 | 2 | 0 | 6 |
| 6 | 2 | 1000 | 2 | 0 | 8 |
| 7 | 4 | 1000 | 1 | 0 | 11 |
| 8 | 4 | 2500 | 2.5 | 0 | 12.5 |

```ts
export interface AbrStep {
  segment: number | null          // 1-based segment just downloaded, null on the start and done steps
  bandwidthMbps: number | null
  renditionKbps: number | null
  downloadSeconds: number | null
  stallSeconds: number            // stall caused by this segment (0 if none)
  bufferSeconds: number           // buffer after this step
  totalStallSeconds: number
  history: number[]               // renditions chosen so far, in order
  caption: string
  done?: boolean
}
```

- **Steps:** 10 in all, a start step, one per segment, and a done step.
- **Captions,** which your test pins exactly:
  - 0: `The player started with an empty buffer and a 4-rendition ladder: 400, 1,000, 2,500 and 5,000 kbps`
  - 1: `Segment 1 at 400 kbps (no measurement yet) downloaded in 0.2 s; playback started with 4 s buffered`
  - 2: `Measured 8 Mbit/s, so segment 2 jumped to 5,000 kbps; it took 2.5 s and the buffer grew to 5.5 s`
  - 3: `Segment 3 stayed at 5,000 kbps; 2.5 s to download, buffer 7 s`
  - 4: `Bandwidth fell to 2 Mbit/s: segment 4, chosen at 5,000 kbps from the old 8 Mbit/s measurement, took 10 s; the 7 s buffer ran dry and playback stalled for 3 s`
  - 5: `Measured 2 Mbit/s, so segment 5 stepped down to 1,000 kbps; 2 s to download, buffer 6 s`
  - 6: `Segment 6 stayed at 1,000 kbps; buffer 8 s`
  - 7: `Segment 7 stayed at 1,000 kbps while bandwidth recovered to 4 Mbit/s; buffer 11 s`
  - 8: `Measured 4 Mbit/s, so segment 8 stepped up to 2,500 kbps; buffer 12.5 s`
  - 9: `Done: 8 segments, one 3 s stall; the player stepped down to 1,000 kbps and recovered to 2,500 kbps` (`done: true`)
- **The generator computes everything** from the constants and rules: renditions, downloads, stalls, buffers and counts. Numbers in captions are formatted with `toLocaleString('en-US')`, and seconds with at most one decimal.
  - It throws if any buffer goes negative.
  - It throws if the total stall in the final caption differs from the sum of the per-segment stalls.

**View:**
- **Ladder:** the 4 renditions as a vertical list, with the current one highlighted and labelled with text.
- **Segment strip:** 8 fixed cells, filled with each downloaded segment's rendition in kbps. A stalled segment is outlined in red and marked `stall 3 s` in text.
- **Buffer bar:** a horizontal bar scaled to a 14 s maximum, with the value written in text.
- **Stats line:** `Bandwidth b Mbit/s · Rendition r kbps · Buffer x s · Stalls total s`, using `—` where a value is null.
- **Fit:** no horizontal scroll at 320 px. The 8 cells must fit; use short labels such as `5k`, `2.5k`, `1k` and `400` inside the cells if needed.

**Title:** `"Adaptive bitrate: a bandwidth drop, one stall, then a step down"`

- [ ] **Step 1: Write the failing test.** Pin all 10 steps in the table and captions above: the segment, bandwidth, rendition, download, stall, buffer, total stall, history and caption fields, and that only the last step is done.
- [ ] **Step 2: Run it and check it fails.** Run `npx vitest run src/lib/visualizers/abr-steps.test.ts`. Expected: FAIL, because the module is missing.
- [ ] **Step 3: Implement** the generator, the view and the wiring: `kinds.ts`, plus the component and switch case in `visualizer.tsx`.
- [ ] **Step 4: Verify.**
  - Run `npm test`, `npm run typecheck` and `npm run lint`; all must pass.
  - Render the visualizer on a throwaway page whose content column matches a lesson page's width, and check it with Playwright. Don't commit the page.
  - Measure height at every step at 320, 375 and 1280 px, and confirm it is constant with no sideways scroll. Put the table in the report.
  - Save `abr-320.png`, `abr-375.png` and `abr-1280.png` at step 4 (the stall) to the scratchpad.
- [ ] **Step 5: Commit.** Use the message `feat(visualizers): abr-player adaptive bitrate visualizer` with the trailer.

---

### Task 2: `video-streaming`

**Files:**
- Create: `content/tracks/system-design/lessons/video-streaming.mdx`, `content/exercises/video-streaming-quiz.yaml`, `content/exercises/design-podcast-hosting.yaml`
- Modify: `content/tracks/system-design/track.yaml`, `src/lib/content/index.test.ts`, `e2e/layout.spec.ts`, `e2e/visualizers.spec.ts`

**Lesson:** "Video streaming", `prerequisites: [dns-cdn, queues-streams]`.

**Requirements & estimates:**
- **The product:** a video-on-demand platform. Uploads, playback on phones and TVs, resume, and view counts.
- **Its own numbers:** uploads per day, average length, ladder renditions, concurrent viewers and average delivered bitrate. Derive from them:
  - storage per day across all renditions;
  - peak egress in Tbit/s;
  - the share served by the CDN at a stated hit ratio.
- **Numbers to avoid:**
  - the estimation drills' 1.5 M viewers × 6 Mbit/s and 97% hit ratio (`estimate-video-egress.yaml`);
  - the live-comments numbers (2 M viewers, 500 k);
  - the lesson's own example numbers from `estimation.mdx`.

**Visual:**
- `<Visualizer kind="abr-player" />`, plus a text diagram of upload → object store (originals) → transcode queue → workers → renditions and manifests in the object store → CDN → player.
- **Describe the visualizer's trace exactly,** from Task 1's table:
  - ladder 400/1,000/2,500/5,000 kbps;
  - 4 s segments;
  - bandwidth 8 → 2 → 4 Mbit/s;
  - the jump to 5,000 kbps at segment 2;
  - the 10 s download at segment 4 that drained a 7 s buffer and caused a 3 s stall;
  - the step-down to 1,000 kbps;
  - the step back up to 2,500 kbps at segment 8.
- **Say the rule is simplified.** It picks the highest rendition ≤ 0.8 × the last measured throughput. Real players also weigh the buffer level, e.g. buffer-based ABR; hedge this.
- **e2e:** add `{ path: '/system-design/video-streaming/', final: 'Done: 8 segments, one 3 s stall; the player stepped down to 1,000 kbps and recovered to 2,500 kbps' }` to `e2e/visualizers.spec.ts`.

**Design walkthrough:**
- **Upload:** resumable or chunked uploads straight to object storage via pre-signed URLs, so the API servers don't proxy bytes.
- **Transcoding:**
  - an upload event goes to a queue;
  - parallel workers split the source into chunks and encode each rendition, so encodes are idempotent per chunk and rendition;
  - packaging produces HLS/DASH manifests and segments (mention CMAF with a hedge);
  - the video is marked ready only when the lowest renditions exist.
- **Storage:** originals plus renditions; hot vs long-tail content; cheaper storage tiers for old renditions (hedge).
- **Delivery:**
  - CDN-first, with segments as immutable cacheable files and short-lived manifests where needed;
  - origin shielding (a mid-tier cache);
  - signed URLs for access control.
- **Adaptive bitrate on the client:** link the visualizer. It explains why a startup at a low rendition is common.
- **Metadata and resume position:** a resume position is a small write per user per video, stored every few seconds or on pause.
- **View counting:** count asynchronously from player beacons into a stream, then aggregate, with approximate counts shown. **Do not** describe dedup rules for counting downloads (see the NOT list).
- **Failure handling:** a failed transcode chunk is retried; the CDN serves stale content on origin errors (hedge).
- **Links:** `[DNS & CDNs](/system-design/dns-cdn/)`, `[Queues & streams](/system-design/queues-streams/)`, `[Caching](/system-design/caching/)`.

**Design prompt `design-podcast-hosting`:**
- **Scenario:**
  - a podcast host stores **400 k shows** with **20 M episodes**, average **50 MB** MP3;
  - **60 M downloads/day**, most within 3 days of release;
  - podcast apps fetch each show's **RSS feed** on a schedule, about **every 30 minutes per subscribed app instance**, for **25 M** app instances, each subscribed to ~6 shows (all numbers illustrative; make them consistent);
  - publishers need **download counts** they can trust for ad sales;
  - a new episode must be visible in apps within about 15 minutes.
- **Ask the learner to describe:**
  - storage;
  - how episode files are delivered;
  - how feed polling is served cheaply;
  - how downloads are counted without inflating numbers;
  - how a new episode propagates.
- **Rubric (5):**
  - **storage arithmetic** (20 M × 50 MB = 1 PB);
  - **delivery via CDN** with immutable episode URLs, supporting HTTP byte-range requests for resumable and partial downloads;
  - **feed polling load:** 25 M × 6 ÷ 1,800 s ≈ 83 k req/s average, served from the CDN or cache with conditional GET (ETag / If-Modified-Since → 304), plus a short cache TTL;
  - **trustworthy counts:** counting from CDN logs, filtering partial or byte-range requests and repeated requests from the same client within a window, and bots (follow industry guidance such as the IAB podcast measurement guidelines, hedged);
  - **propagation:** purge or short-TTL the feed when a new episode is published, optionally notifying aggregators (e.g. WebSub), hedged.
- **The lesson must NOT discuss:**
  - RSS feeds or feed polling;
  - conditional GET, ETags or 304 responses;
  - HTTP byte-range requests for whole-file downloads;
  - deduplicating or filtering download or view counts (IAB-style rules);
  - CDN purge on publish.
- **Also avoid** Task 3's NOT list.

**Commit:** `feat(system-design): video streaming case study`.

---

### Task 3: `payment-system`

**Files:**
- Create: `content/tracks/system-design/lessons/payment-system.mdx`, `content/exercises/payment-system-quiz.yaml`, `content/exercises/design-subscription-billing.yaml`
- Modify: `content/tracks/system-design/track.yaml` (append the slug, delete the now-empty `comingSoon` key), `src/lib/content/index.test.ts`, `e2e/layout.spec.ts`, `e2e/tracks.spec.ts`

**Lesson:** "Payment system", `prerequisites: [distributed-transactions, queues-streams]`.

**Scenario.** A marketplace checkout charges buyers' cards through an external payment provider (PSP) and pays sellers later. Card data never touches your servers: the provider's hosted fields or SDK return a token, which keeps PCI scope small (hedge).

**Requirements & estimates:** its own numbers. Derive from them:
- payments per day → average and peak payments/s;
- provider calls per payment;
- ledger entries per payment, at least 2 per movement;
- ledger rows per year.

Don't reuse `design-money-transfer`'s 1,000 transfers/s or the estimation drills' 98,000 ledger writes/s.

**Visual:**
- A text state diagram of a payment: `created → authorising → authorised → capturing → captured → (refunded | partially_refunded)`, with `failed` and `requires_action` (3-D Secure) branches and `unknown` after a timeout.
- A second text diagram: checkout API → payments service (idempotency store) → provider → webhooks in → outbox → ledger, then a reconciliation job comparing the ledger with the provider's settlement report.
- No visualizer.

**Design walkthrough:**
- **Idempotency key per checkout attempt.** The server stores key → result, and replays return the stored result. Link `[Distributed transactions](/system-design/distributed-transactions/)` for the general pattern and don't re-teach it.
- **The payment state machine,** with transitions as conditional updates (`UPDATE … WHERE state = 'authorising'`).
- **Authorise then capture.** Capture when the order ships or immediately for digital goods. Authorisations expire after a period that depends on the network and provider (hedge).
- **Timeouts with an unknown outcome.** Mark the payment `unknown`, then look it up with the same idempotency key at the provider, or wait for the webhook. Never charge again with a new key.
- **Webhooks:**
  - verify signatures;
  - handle late, duplicated and out-of-order deliveries by event id;
  - apply transitions only forward through the state machine.
- **Double-entry ledger:**
  - append-only;
  - each movement is balanced debit and credit rows (buyer → platform clearing → seller payable, plus a fee account);
  - balances are derived from the rows;
  - amounts are stored as integer minor units with currency, never floats. Link `[Number representation](/cs-fundamentals/number-representation/)`.
- **The outbox** from payment-state changes to the ledger and downstream events. Link `[Queues & streams](/system-design/queues-streams/)`.
- **Reconciliation:** daily, against the provider's settlement report. Mismatches go to a queue for humans.
- **Refunds and chargebacks** as new ledger entries, never edits.
- **Seller payouts** batched later from seller payable balances, briefly.

**Design prompt `design-subscription-billing`:**
- **Scenario:**
  - a SaaS company bills **3 M subscribers**, monthly or annual plans, through a PSP;
  - renewals cluster: **about 40% of monthly renewals fall on the 1st of the month** (illustrative);
  - plan upgrades and downgrades happen mid-cycle;
  - about **6% of renewal charges fail** at first try (expired cards, insufficient funds), illustrative;
  - finance needs invoices that never double-charge and a monthly revenue report.
- **Ask the learner to describe:**
  - how renewals are scheduled and spread;
  - how a failed renewal is retried and when access is cut;
  - mid-cycle plan changes;
  - preventing double charges;
  - the arithmetic of the 1st-of-month peak.
- **Rubric (5):**
  - **renewal scheduling:** a due-date index and a job queue rather than a single cron loop; spreading by anchoring to each customer's sign-up date, with the peak arithmetic shown (e.g. 40% of monthly subscribers on the 1st, spread over a stated window → charges/s);
  - **dunning:** a retry schedule over days (e.g. 1, 3, 5, 7 days, illustrative), card-updater services (hedged), customer emails, and a grace period before access is suspended;
  - **proration on upgrade or downgrade:** a credit for unused time and a charge for the new plan, or applied at the next invoice;
  - **no double charges:** an idempotency key per invoice attempt, one open invoice per subscription per period (a unique constraint), and lookup before retrying after a timeout;
  - **invoices as immutable records,** with revenue reports derived from them.
- **The lesson must NOT discuss:**
  - subscriptions, recurring billing, renewals or billing cycles;
  - retry schedules for failed charges or dunning;
  - proration;
  - card-updater services;
  - scheduling large batches of charges on a date.
- **Also avoid** Task 2's NOT list, and `design-money-transfer`'s ground (Review Focus 4): no saga step lists or compensations, and no funds-hold mechanism.

**Extra e2e (Review Focus 1):** in `e2e/tracks.spec.ts`'s "a track home shows modules, lessons and coming-soon titles" test:
- replace `await expect(page.getByText('Coming soon').first()).toBeVisible()` with `await expect(page.getByText('Coming soon')).toHaveCount(0)`;
- add `await expect(page.getByRole('link', { name: /Video streaming/ })).toHaveAttribute('href', '/system-design/video-streaming/')` and the same for "Payment system";
- rename the test to `'a track home shows modules and lessons, with nothing coming soon'`.

**Commit:** `feat(system-design): payment system case study`.

---

## After the PR merges

`check:deploy` should report 6 more pages than the count after #27 (269), so **275**: 2 lessons, 2 quizzes and 2 design prompts.
