# CS Fundamentals Batch 4 (Machine & math) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `machine-math` module, the last module of the `cs-fundamentals` track. It has 3 lessons and no visualizer, and completes the track at 16 lessons.

**Architecture:** This batch is content only. When it ships, the track has no `comingSoon` titles left, so tests that relied on one being present are updated in the last task.

**Tech Stack:** Next.js (App Router), Velite, TypeScript, Vitest, Playwright, MDX, YAML.

**Spec:** `docs/superpowers/specs/2026-10-17-cs-fundamentals-track-design.md`

## Global Constraints

### Branch and commits

- Work on branch `feat/csf-machine-math`. Never commit to main, never push, and never dispatch subagents or reviewers.
- Make one commit per task. Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stage files explicitly. Never commit anything under `.superpowers/`, and check `git status` first.
- Before committing a task, run `npm test`, `npm run typecheck`, `npm run lint` and `npm run e2e`.
  - Write the e2e output to `/private/tmp/claude-501/-Users-thongdo-IT-algorithms/0211fe1a-3ec8-4ddf-9510-c5acc4d9fb5e/scratchpad/e2e-csf4-<task>.log` and read its tail.
  - If the only failures are browser-launch or `webServer` timeouts on pages you didn't touch, re-run just those specs and say so.

### Track design

- **No cross-track prerequisites.** Lessons link to System Design and Algorithms lessons with the existing link format, e.g. `[Bit manipulation](/algorithms/bit-manipulation/)`, but never list them in `prerequisites`.
- **Agree with the existing lessons and go one layer deeper.** Read each one before writing:
  - `content/tracks/cs-fundamentals/lessons/data-in-memory.mdx` covers bits, bytes and addresses, endianness, UTF-8 byte length, and the struct padding arithmetic. It ends with a locality teaser that names "The memory hierarchy". Don't repeat any of it; link it.
  - `content/tracks/cs-fundamentals/lessons/complexity.mdx` covers logs, log bases and the growth table.
  - `content/tracks/cs-fundamentals/lessons/virtual-memory.mdx` covers the TLB, pages and the 4 KiB page size.
  - `content/tracks/cs-fundamentals/lessons/concurrency-primitives.mdx` covers memory visibility and happens-before.
  - `content/tracks/algorithms/lessons/bit-manipulation.mdx` covers XOR, masks, Python's unbounded ints and `& 0xFFFFFFFF`.
  - `content/tracks/algorithms/lessons/math-geometry.mdx` covers fast power and modular arithmetic for problems.
  - `content/tracks/system-design/lessons/url-shortener.mdx` covers base62 code space (62^7 ≈ 3.5 × 10^12) and the birthday estimate n² ÷ 2N.

### Lesson file (`content/tracks/cs-fundamentals/lessons/<slug>.mdx`)

- **Frontmatter:** exactly `slug`, `title`, `level`, `authors: [cs-atlas]`, `prerequisites`, and a one-sentence `summary`.
- **Sections:** exactly these `##` sections, in order: Intuition, Visual, Example, Pitfalls, Tips & tricks.
  - Intuition opens with an everyday analogy.
  - Visual has a ```text diagram (this batch has no `<Visualizer>`).
  - The Example is worked, and its code is valid and runnable. Use Python unless the task names another language. Run every snippet locally and paste the real output into the report.
  - Pitfalls are bullets, each with its fix.
  - Tips & tricks give rules of thumb, interview phrasing, and what to measure.
- **Length:** about 1,100–1,400 words by `wc -w`, with a hard ceiling of 1,400. Aim for at most 1,380 so review fixes have room.
- **Voice:** working developers filling CS gaps. Explain what the hardware or the maths actually does underneath their code, and the bugs and performance effects that follow. Match the tone of `content/tracks/cs-fundamentals/lessons/indexes-btrees.mdx`.

### Accuracy rules

Each of these caught a real error in earlier batches.

- **Hedge varying figures.** Latencies, cache sizes, line sizes, bandwidths and language behaviour vary by CPU, language and version; hedge them. Use "illustrative" or "order of magnitude" for latency ladders. Never invent statistics.
- **Arithmetic.** Show and check every piece of it, and state the formula before the numbers.
- **Language and hardware behaviour.** Name it only when you're sure of it, and say which language or CPU family it applies to. For example:
  - C signed overflow is undefined behaviour.
  - Java `int` wraps.
  - Python `int` is unbounded.
  - JavaScript has `Number` (IEEE 754 double) and `BigInt`.
  - x86-64 and most ARM cores typically use 64-byte cache lines.
- **Keep layers straight:**
  - A language rule isn't a hardware rule.
  - The IEEE 754 format isn't one language's printing behaviour.
  - A mathematical fact isn't a library's implementation.
- **Examples must follow the lesson's own advice.**
- **Don't pre-solve any diagnose prompt in this batch:**
  - Each task lists what its lesson must NOT discuss. **Every lesson and every quiz in this batch must avoid all three tasks' NOT lists**, because quizzes sit just before the prompt on the ladder.
  - Use different numbers and scenarios in the lesson.
  - Before committing, grep the lesson and quiz for each rubric remedy, and grep `content/tracks` for the prompt's key terms.
- **No "a later lesson".** Don't refer to one unless a `comingSoon` title or an existing lesson names it. Link to existing lessons instead.

### Quiz (`content/exercises/<slug>-quiz.yaml`)

- **Header:** `type: quiz`, `lessons: [<slug>]`, `ladderOrder: 1`.
- **Questions:** 5 judgement questions, each with 4 choices.
  - **No recall.** No question may be answerable by recalling a lesson sentence or pitfall. Use scenarios, numbers and facts the lesson doesn't contain. Ask "why" or "what would you observe" rather than "which fix" when the fix is a lesson pitfall. Don't add a lesson sentence just to supply a quiz fact and then echo it in the correct choice.
  - **No outside trivia.** No question may need a fact that neither the lesson nor the stem supplies. If one is needed, put it in the stem, and state the language, CPU or settings the answer depends on.
  - **Distractors:** each is a confident, plausible, related-but-wrong mechanism of similar specificity. None may:
    - label its own mistake;
    - state an absurd rule;
    - contradict the stem;
    - be secretly correct under an unstated default.
  - **Correct choice:** it must not be the only one that echoes the lesson's keywords, nor the only worked derivation.
  - **Premises:** every premise in a stem must be literally true. Numbers in a premise must account for every real cost they mention.
- **Choice lengths:** the correct choice must be neither the longest nor the shortest in at least 4 of the 5 questions. Measure this for the FINAL version and put the table in your report.
- **Explanations:** 1–2 sentences each, describing the distractors accurately.
- **Answer key:**
  - Use at least 3 distinct indexes, with no run of three identical indexes and no obvious sequence.
  - Re-check it after any rewrite.
  - It must not match any existing key. List the existing keys with:
    `for f in content/exercises/*-quiz.yaml; do grep 'answer:' $f | awk '{print $2}' | tr '\n' ','; echo; done | sort`
- **Flashcards:** 8, with each side ≤200 characters and lowercase-with-dashes ids. No front may duplicate one anywhere in `content/exercises`. Check with `grep -h "front:" content/exercises/*.yaml`.

### Diagnose prompt (`content/exercises/<prompt-slug>.yaml`)

- **Fields:** `type: design-prompt`, `kind: diagnose`, `lessons: [<slug>]`, `ladderOrder: 2`.
- **`prompt`:** give the symptoms and environment with numbers, and ask the learner to explain the cause, show the arithmetic, say how to confirm it, and give fixes with trade-offs.
  - **It must never name the mechanism the learner is asked to find.**
  - Environment facts, such as language, hardware, sizes and rates, are fine.
- **`hint`:** one nudge that doesn't state the answer.
- **`rubric`:** 5 points.
- **`reference`:** ≤300 words by `wc -w` on the reference block only. It must:
  - match the rubric point by point;
  - show all its arithmetic, correctly;
  - model its own scenario: every number in it comes from the prompt or is derived from it in the reference;
  - be internally consistent;
  - hedge hardware and language behaviour.
- **Layout:** copy `content/exercises/diagnose-slow-login.yaml`.

### Wiring

Each lesson task does the following:
- **`content/tracks/cs-fundamentals/track.yaml`:** appends its slug to `machine-math.lessons` and removes its own title from `machine-math.comingSoon`. The task that empties the list deletes the `comingSoon` key.
- **`src/lib/content/index.test.ts`:** adds the lesson's entry to the `CSF` record, in track order.
- **`e2e/layout.spec.ts`:** adds `/cs-fundamentals/<slug>/` and both exercise pages to `PAGES`.

## Review Focus

1. **The track ends with no coming-soon titles.** After Task 3, three checks that assume at least one `comingSoon` title would fail:
   - `src/lib/content/index.test.ts:152` asserts `csf.modules.flatMap((m) => m.comingSoon).length` is greater than 0.
   - `e2e/tracks.spec.ts` checks "Coming soon" text on `/cs-fundamentals/`.
   - The same spec also checks "The memory hierarchy" as a coming-soon title.

   Task 1 moves the title check to "Discrete math essentials". Task 3 asserts the opposite: there are zero `comingSoon` titles, no "Coming soon" text on `/cs-fundamentals/`, and all three new lessons are links. Velite defaults `comingSoon` to `[]`, so deleting the key gives an empty array.
2. **The track page and "Continue" work once every module is complete.** Nothing in the UI should assume some module is pending. Task 3's e2e check covers this: the track page renders all 5 module headings with links, "Continue" still opens `complexity` for a new learner, and the roadmap still renders three tracks (the existing roadmap spec).
3. **Pre-solving within the batch, including quizzes.**
   - The three prompts are:
     - adjacent per-thread counters on one cache line;
     - 64-bit IDs losing precision when parsed as JavaScript numbers;
     - `random_byte % 62` making some characters likelier.
   - Each is the natural "next sentence" of one lesson. Every lesson and quiz is checked against all three NOT lists.
4. **Numeric facts that are easy to get subtly wrong.** These must be computed, not recalled:
   - 2^53 = 9,007,199,254,740,992;
   - the spacing of doubles at a given magnitude is 2^(e−52);
   - 256 mod 62 = 8;
   - 0.1 + 0.2 = 0.30000000000000004 in IEEE 754 double;
   - two's-complement ranges.

   Each task runs every number through Python and pastes the output into its report.
5. **Language-specific behaviour is named.** Overflow, float printing, JSON parsing and integer widths differ across C, Java, Python, JavaScript and Go. Every such claim names its language, and every quiz stem that depends on one states it.

---

### Task 1: `memory-hierarchy`

**Files:**
- Create: `content/tracks/cs-fundamentals/lessons/memory-hierarchy.mdx`, `content/exercises/memory-hierarchy-quiz.yaml`, `content/exercises/diagnose-counters-dont-scale.yaml`
- Modify: `content/tracks/cs-fundamentals/track.yaml`, `src/lib/content/index.test.ts`, `e2e/layout.spec.ts`, `e2e/tracks.spec.ts`

**Lesson:** "The memory hierarchy", `level: intermediate`, `prerequisites: [data-in-memory]`.

**Cover:**
- **The latency ladder**, as an illustrative, order-of-magnitude table: registers; L1 ~1 ns; L2 a few ns; L3 ~10–40 ns; DRAM ~100 ns; NVMe SSD ~10–100 µs; spinning disk ~10 ms; a same-datacentre round trip ~0.5 ms. Hedge every figure. Then scale it to human time (if L1 is 1 second, DRAM is about 1.5–2 minutes) with the arithmetic shown.
- **Caches:**
  - They work in lines (64 bytes on typical x86-64 and many ARM cores).
  - Spatial and temporal locality.
  - Hardware prefetching rewards sequential and strided access.
  - Capacity, conflict and compulsory misses, in one sentence each.
  - Write-back caches, briefly.
- **Why algorithms with the same Big-O differ:** an array vs a linked list, and a sorted-array binary search vs a hash table on small n. Link `[Complexity & Big-O](/cs-fundamentals/complexity/)` and `[Data in memory](/cs-fundamentals/data-in-memory/)`.
- **Data layout:** array of structs vs struct of arrays when you read one field. Row-major traversal.
- Where the TLB and page faults fit on the ladder. Link `[Virtual memory](/cs-fundamentals/virtual-memory/)`.
- **What to measure:** `perf stat` cache-miss counters (Linux), and benchmarks with warm-up. Hedge the tool names.

**Example:** summing a 4,096 × 4,096 matrix of 4-byte ints (64 MiB) row by row vs column by column, in C or with NumPy.
- Row-major uses one 64-byte line per 16 ints, so ≈ 4,096 × 4,096 ÷ 16 ≈ 1.05 million line fetches.
- Column-major jumps 16 KiB per step. That is about one line per element once the working set exceeds the cache: ≈ 16.8 million fetches, about 16× more.
- Give an illustrative measured ratio, hedged by CPU, and note that prefetchers soften it.
- If you use C, show the compile command. If you use NumPy, explain that `a.sum(axis=…)` is not a traversal-order demo and write explicit loops in a language where the loop cost doesn't hide the effect. The preferred option is C, compiled with `cc -O2`. Run it and paste the output, labelled as one machine's result.

**Diagnose prompt `diagnose-counters-dont-scale`:**
- **Scenario.** A Java (or C) service counts requests per worker thread in `long counts[8]`, a contiguous 64-byte array. Each of the 8 threads increments only `counts[threadId]`, with no locks and no atomics, because "each thread owns its slot". The machine has 16 cores.
  - With 1 thread the counting microbenchmark does about 500 million increments/s.
  - With 8 threads the combined total is about 120 million/s, lower than a single thread.
  - CPU usage is 800%, and `perf` shows no lock contention and no system calls.
- **Ask the learner to:**
  - explain why adding threads made it slower;
  - show the arithmetic: 8 × 8 bytes = 64 bytes = one cache line on typical x86-64. Every increment by one core invalidates the line in the other 7 cores' caches, so the line ping-pongs between cores;
  - say how to confirm it: `perf c2c` on Linux showing HITM on one cache line, and the experiment of padding each counter to its own line;
  - give fixes with trade-offs:
    - padding or alignment to 64 bytes (128 on some CPUs, because adjacent-line prefetch pairs lines);
    - per-thread local counters summed at the end;
    - `LongAdder` (Java) or thread-local storage;
    - the memory cost of padding: 8 × 64 = 512 bytes vs 64.
- **The lesson must NOT discuss:**
  - false sharing, or two cores writing different variables on the same cache line;
  - cache-coherence protocols (MESI) or invalidation traffic between cores;
  - padding or aligning data to cache-line boundaries;
  - per-thread counters or `LongAdder`;
  - `perf c2c`.
- **The lesson may:** say in one sentence that each core has its own L1 and L2 and that hardware keeps them consistent with each other.
- **Also avoid** Task 2's and Task 3's NOT lists.
- **Extra e2e (Review Focus 1):** in `e2e/tracks.spec.ts`:
  - replace `getByText('The memory hierarchy')` with `getByText('Discrete math essentials')`;
  - keep the "Coming soon" check;
  - add a check that "The memory hierarchy" links to `/cs-fundamentals/memory-hierarchy/`.
- **Commit:** `feat(cs-fundamentals): memory hierarchy lesson`.

---

### Task 2: `number-representation`

**Files:**
- Create: `content/tracks/cs-fundamentals/lessons/number-representation.mdx`, `content/exercises/number-representation-quiz.yaml`, `content/exercises/diagnose-broken-order-links.yaml`
- Modify: `content/tracks/cs-fundamentals/track.yaml`, `src/lib/content/index.test.ts`, `e2e/layout.spec.ts`

**Lesson:** "Number representation", `level: beginner`, `prerequisites: []`.

**Cover:**
- **Positional notation:** binary and hex, with conversions shown (e.g. 0xFF = 255, 0b1011 = 11).
- **Unsigned integers:** ranges (n bits hold 0 … 2^n − 1).
- **Two's complement:**
  - how −x is formed (invert, add 1), with an 8-bit −5 = 11111011 worked;
  - why there is one zero;
  - the asymmetric range −2^(n−1) … 2^(n−1) − 1, with int32 = −2,147,483,648 … 2,147,483,647.
- **Overflow by language:** C signed overflow is undefined behaviour and unsigned wraps mod 2^n; Java `int` wraps; Python `int` is unbounded; Rust panics in debug builds and wraps in release (hedged). Link `[Bit manipulation](/algorithms/bit-manipulation/)` for masks and `[Data in memory](/cs-fundamentals/data-in-memory/)` for endianness. Don't repeat endianness.
- **IEEE 754 double:**
  - sign, 11-bit exponent and 52-bit fraction, with the implicit leading 1;
  - why 0.1 has no exact binary form;
  - `0.1 + 0.2 != 0.3` in IEEE 754 double (show Python's `0.30000000000000004`);
  - relative precision of about 15–17 significant decimal digits;
  - machine epsilon 2^−52 ≈ 2.22 × 10^−16;
  - ±0, ±infinity and NaN (NaN ≠ NaN);
  - comparing with a tolerance.
- **float32:** 24 significant bits, about 7 decimal digits. Mention it only to show the precision trade-off.
- **Money:** use integer minor units (cents) or decimal types (`decimal.Decimal` in Python, `BigDecimal` in Java), and round only at defined points.
- Choosing a width for counters and IDs, in general terms: estimate the maximum, then pick a type.

**Example:**
1. Show three things in Python, with real output:
   - two's complement by hand for an 8-bit value, checked with `(-5) & 0xFF == 251`;
   - a 32-bit overflow simulated with masking, e.g. 2,147,483,647 + 1 wrapping to −2,147,483,648 via `((x + 2**31) % 2**32) - 2**31`;
   - `0.1 + 0.2`, and adding 0.1 ten times in a `for` loop (0.9999999999999999). Don't use `sum()` for this: Python 3.12+ `sum` uses compensated summation and prints 1.0, so say so in one clause if you mention it.
2. Invoice totals computed with floats vs integer cents vs `Decimal`. Use different numbers from the quiz and the prompt, and run it.

**Diagnose prompt `diagnose-broken-order-links`:**
- **Scenario.**
  - The backend (Go) switched order IDs from a 32-bit auto-increment to 64-bit time-based IDs, such as `1180591620717411303`.
  - The JSON API returns `{"id": 1180591620717411303, …}` as a JSON number.
  - Since the switch, nearly all "View order" links in the web app (a browser JavaScript SPA that uses `JSON.parse` and builds `/orders/${order.id}`) return 404. The browser's address bar shows `/orders/1180591620717411300`.
  - The Android app (Kotlin, which parses IDs as `Long`) works.
  - Old orders with small IDs work everywhere.
- **Ask the learner to:**
  - explain the 404s;
  - show the arithmetic:
    - JavaScript numbers are IEEE 754 doubles, which hold integers exactly only up to 2^53 = 9,007,199,254,740,992;
    - the IDs are about 1.18 × 10^18, between 2^60 ≈ 1.15 × 10^18 and 2^61, so adjacent doubles there are 2^(60−52) = 256 apart, and IDs round to the nearest multiple of 256;
    - most IDs are not multiples of 256 and change when parsed;
    - check the example: 1,180,591,620,717,411,303 → 1,180,591,620,717,411,328 is the nearest representable double, which JavaScript prints in shortest round-trip form as `1180591620717411300`;
    - why nearly all: only IDs that are multiples of 256 are exactly representable, about 1 in 256 (≈0.4%);
  - say how to confirm it: `Number.isSafeInteger(id)`, compare the raw response text with the parsed value, and a unit test with this ID;
  - give fixes with trade-offs:
    - serialise IDs as strings in JSON (e.g. Go's `json:",string"` tag);
    - parse with `BigInt` via a reviver or a JSON library that preserves large integers;
    - keep IDs below 2^53 (fewer bits for time or sequence);
    - why rounding on the client can't be undone.
- **Task-specific accuracy:**
  - Compute the nearest double and the printed form with Python (`float(1180591620717411303)` and `repr`) and Node if available (`JSON.parse`).
  - Use the values you actually get, and adjust the prompt's printed URL to match exactly.
- **The lesson must NOT discuss:**
  - JavaScript `Number` or JSON number parsing;
  - integer IDs or identifiers losing precision;
  - the exact-integer limit 2^53, or the spacing between adjacent doubles at a given magnitude;
  - `BigInt`, or serialising numbers as strings.
- **The lesson may:**
  - state that a double has 53 significant bits (52 stored plus the implicit 1);
  - state its ~15–17 significant decimal digits;
  - give machine epsilon at 1.0.
- **Also avoid** Task 1's and Task 3's NOT lists.
- **Commit:** `feat(cs-fundamentals): number representation lesson`.

---

### Task 3: `discrete-math-essentials`

**Files:**
- Create: `content/tracks/cs-fundamentals/lessons/discrete-math-essentials.mdx`, `content/exercises/discrete-math-essentials-quiz.yaml`, `content/exercises/diagnose-skewed-coupon-codes.yaml`
- Modify: `content/tracks/cs-fundamentals/track.yaml` (append the slug and delete the now-empty `machine-math.comingSoon` key), `src/lib/content/index.test.ts` (CSF record, and change line ~152 to assert zero `comingSoon` titles), `e2e/layout.spec.ts`, `e2e/tracks.spec.ts`

**Lesson:** "Discrete math essentials", `level: beginner`, `prerequisites: []`.

**Cover:**
- **Logic and sets for programmers:**
  - De Morgan's laws applied to an `if` condition;
  - implication and contrapositive, in one paragraph;
  - set operations as SQL and code operations.
- **Counting:**
  - the product rule;
  - permutations vs combinations, with C(n, k);
  - 2^n subsets (link `[Bit manipulation](/algorithms/bit-manipulation/)` for bitmasks);
  - estimating search spaces, e.g. passwords: 26^8 vs 62^8, computed.
- **The pigeonhole principle:** e.g. why any hash into 2^32 buckets must collide among 2^32 + 1 keys, and why lossless compression can't shrink every file.
- **Logs and powers of two** as estimation tools. Link `[Complexity & Big-O](/cs-fundamentals/complexity/)` and don't repeat its log-base content.
- **Modular arithmetic:**
  - congruence;
  - clock arithmetic;
  - `%` with negative operands differs by language (Python gives a non-negative result for a positive modulus; C and Java keep the sign of the dividend);
  - hashing into buckets with `h % n`;
  - why resizing changes bucket assignment. Link `[Load balancing](/system-design/load-balancing/)` or `[Replication & sharding](/system-design/replication-sharding/)` (use whichever covers consistent hashing; check the slug).
- **Probability basics:**
  - uniform distributions;
  - independence and the product of probabilities;
  - expectation (linearity), e.g. the expected number of retries 1/p;
  - the complement trick.
  - The birthday estimate: link `[URL shortener](/system-design/url-shortener/)`, which already uses n² ÷ 2N. Go one step deeper with P(no collision) ≈ e^(−n²/2N), and use different numbers from the URL shortener.
- **Invariants and induction, briefly:** a loop invariant as a proof that code is correct.

**Example:**
- A worked estimate: how many 6-character codes from a 32-character alphabet exist, 32^6 = 2^30 ≈ 1.07 × 10^9.
- Then, after issuing 50,000 random codes:
  - the chance that a new random code collides with an existing one: 50,000 ÷ 2^30 ≈ 4.7 × 10^−5;
  - the expected number of colliding pairs among the 50,000: ≈ n² ÷ 2N = 2.5 × 10^9 ÷ 2.15 × 10^9 ≈ 1.16;
  - the probability of at least one collision: 1 − e^(−1.16) ≈ 0.69.
- Python that checks each number, run with real output.
- The numbers must differ from the URL shortener's and from the prompt's.
- Make sure the alphabet size (32) divides 256 evenly, so the example never touches the prompt's mechanism.

**Diagnose prompt `diagnose-skewed-coupon-codes`:**
- **Scenario.**
  - A shop generates 10-character coupon codes from the 62-character alphabet `A–Z a–z 0–9`.
  - Each character is `ALPHABET[os.urandom(1)[0] % 62]` (Python), with one fresh cryptographically random byte per character.
  - A security review counts characters across 1,000,000 issued codes (10,000,000 characters). The first 8 characters of the alphabet (`A`–`H`) each appear about 195,000 times. The other 54 each appear about 156,000 times.
  - The team expected about 161,000 each (10,000,000 ÷ 62).
- **Ask the learner to:**
  - explain the skew;
  - show the arithmetic:
    - 256 = 4 × 62 + 8, so byte values 0–247 map evenly (4 each) and 248–255 add a fifth hit to indices 0–7;
    - P = 5/256 ≈ 1.95% vs 4/256 ≈ 1.56%, a ratio of 1.25;
    - 10,000,000 × 5/256 ≈ 195,313 and × 4/256 = 156,250, matching the counts;
    - the check: 8 × 5 + 54 × 4 = 40 + 216 = 256;
  - say how much it matters:
    - per-character entropy is about 5.950 bits vs log2 62 ≈ 5.954 bits (computed: 5.9497 vs 5.9542). Compute it, show the formula H = −Σ p log2 p, and keep it hedged and approximate;
    - so the loss is small, but the bias is detectable and makes guessing the likely characters first slightly better;
  - say how to confirm it: a frequency count, a chi-square test, or reproducing the arithmetic;
  - give fixes with trade-offs:
    - rejection sampling (discard bytes ≥ 248; expected bytes per character 256/248 ≈ 1.03);
    - `secrets.choice(ALPHABET)` (Python);
    - a 64-character alphabet (256 is divisible by 64);
    - drawing a large random integer and converting its base, noting the remaining bias is small but non-zero unless the integer is drawn uniformly over 62^10.
- **Task-specific accuracy:**
  - Compute the entropy in Python and use the real value.
  - Keep "small loss" only if the computed numbers support it (about 0.005 bits per character, ≈0.05 bits per 10-character code).
- **The lesson must NOT discuss:**
  - mapping random bytes or random integers onto a smaller range with `%`;
  - modulo bias, or whether `x % n` is uniform when the source range isn't a multiple of n;
  - rejection sampling;
  - generating random codes or tokens from an alphabet with `%`;
  - Shannon entropy of a skewed character distribution.
- **The lesson may:**
  - use `%` for hashing into buckets and clock arithmetic;
  - compute uniform probabilities;
  - use the collision estimate with an alphabet that divides 256.
- **Also avoid** Task 1's and Task 2's NOT lists.

**Extra tests (Review Focus 1 and 2):**
- In `src/lib/content/index.test.ts`, change the CSF `comingSoon` assertion to `toEqual([])` (no titles left), and assert the CSF lesson count is 16.
- In `e2e/tracks.spec.ts`, rename the CS Fundamentals test to drop "coming-soon titles".
  - Assert all five module headings.
  - Assert `getByText('Coming soon')` has count 0 on `/cs-fundamentals/`.
  - Assert "Number representation" and "Discrete math essentials" link to their lessons.
  - Keep the "Continue opens complexity" check.
  - Drop the `getByText('Discrete math essentials')` coming-soon assertion added in Task 1.

**Commit:** `feat(cs-fundamentals): discrete math essentials lesson`.
