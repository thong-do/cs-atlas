# CS Fundamentals Batch 2 (Networking) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `networking` module of the `cs-fundamentals` track: 4 lessons, and the `tcp-handshake` visualizer.

**Architecture:** This batch is content only, apart from one new step-through visualizer built on the existing pattern. The platform work, including `kind: diagnose`, shipped in batch 1 (PR #21).

**Tech Stack:** Next.js (App Router), Velite, TypeScript, Vitest, Playwright, MDX, YAML.

**Spec:** `docs/superpowers/specs/2026-10-17-cs-fundamentals-track-design.md`

## Global Constraints

### Branch and commits

- Work on branch `feat/csf-networking`. Never commit to main, never push, and never dispatch subagents or reviewers.
- Make one commit per task. Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stage files explicitly. Never commit anything under `.superpowers/`, and check `git status` first.
- Before committing a task, run `npm test`, `npm run typecheck`, `npm run lint` and `npm run e2e`.
  - Write the e2e output to `/private/tmp/claude-501/-Users-thongdo-IT-algorithms/0211fe1a-3ec8-4ddf-9510-c5acc4d9fb5e/scratchpad/e2e-csf2-<task>.log` and read its tail.
  - If the only failures are browser-launch or `webServer` timeouts on pages you didn't touch, re-run just those specs and say so.

### Track design

- **No cross-track prerequisites.** Lessons link to System Design and Algorithms lessons with the existing link format, e.g. `[Load balancing](/system-design/load-balancing/)`, but never list them in `prerequisites`.
- **Agree with System Design** (spec D4). Each lesson goes one layer deeper than [Client–server & HTTP](/system-design/client-server-http/), [DNS & CDNs](/system-design/dns-cdn/) and [Load balancing](/system-design/load-balancing/), and must not contradict them.
  - Read the relevant System Design lesson before writing.
  - In particular, `client-server-http.mdx` gives one-liners for HTTP/1.1, HTTP/2 and HTTP/3 and a 3-round-trip first-visit timeline (TCP, TLS 1.3, request).

### Lesson file (`content/tracks/cs-fundamentals/lessons/<slug>.mdx`)

- **Frontmatter:** exactly `slug`, `title`, `level`, `authors: [cs-atlas]`, `prerequisites`, and a one-sentence `summary`.
- **Sections:** exactly these `##` sections, in order: Intuition, Visual, Example, Pitfalls, Tips & tricks.
  - Intuition opens with an everyday analogy.
  - Visual has a ```text diagram, plus the `<Visualizer>` line if the task names one.
  - The Example is worked and its code is valid (Python preferred, or shell commands where the task says so).
  - Pitfalls are bullets, each with its fix.
  - Tips & tricks give rules of thumb, interview phrasing, and what to measure.
- **Length:** about 1,100–1,400 words by `wc -w`, with a hard ceiling of 1,400.
- **Voice:** working developers filling CS gaps. Explain what the kernel, the network stack and the wire actually do underneath their code, and the bugs and latency effects that follow. Match the tone of the batch 1 lessons, e.g. `content/tracks/cs-fundamentals/lessons/virtual-memory.mdx`.

### Accuracy rules

Each of these caught a real error in earlier batches.

- Hedge figures that vary by OS, kernel, browser or version, and never invent statistics.
  - Header sizes are minimums without options.
  - RTTs are illustrative.
  - Browser connection limits are typical, not guaranteed.
- Show and check every piece of arithmetic.
- Cite RFC numbers or protocol behaviour only when you are sure of them. Add "(varies by OS / version)" where behaviour varies.
- Keep layers straight:
  - A TCP property isn't an IP property.
  - TLS isn't HTTP.
  - QUIC loss recovery isn't TCP's.
- Examples must follow the lesson's own advice.
- Don't pre-solve the diagnose prompt.
  - Each task lists what the lesson must NOT discuss.
  - Use different numbers and scenarios in the lesson.
  - Before committing, grep the lesson for each rubric remedy.
  - No lesson in any track may pre-solve the prompt either. Grep `content/tracks` for the prompt's key terms.
- Don't refer to "a later lesson" unless a `comingSoon` title or an existing lesson names it. Link to existing lessons instead.

### Quiz (`content/exercises/<slug>-quiz.yaml`)

- **Header:** `type: quiz`, `lessons: [<slug>]`, `ladderOrder: 1`.
- **Questions:** 5 judgement questions, each with 4 choices.
  - Use numbers and scenarios that differ from the lesson's examples, so a question can't be answered by recalling one.
  - Distractors must be confident, plausible, related-but-wrong mechanisms of similar specificity.
  - A distractor must never label its own mistake, never state an absurd rule, and never be secretly correct.
  - The correct choice must not be the only one that echoes the lesson's keywords.
  - Every premise in a question stem must be literally true.
- **Choice lengths:** the correct choice must be neither the longest nor the shortest in at least 4 of the 5 questions. Measure this and put a table in your report.
- **Explanations:** 1–2 sentences each, describing the distractors accurately.
- **Answer key:**
  - Use at least 3 distinct indexes, in no obvious sequence.
  - It must not match any existing key. List the existing keys with:
    `for f in content/exercises/*-quiz.yaml; do grep 'answer:' $f | awk '{print $2}' | tr '\n' ','; echo; done | sort`
- **Flashcards:** 8, with each side ≤200 characters and lowercase-with-dashes ids.
  - No front may duplicate one anywhere in `content/exercises`. Check with `grep -h "front:" content/exercises/*.yaml`.
  - `client-server-http-quiz.yaml` already uses the fronts "Keep-alive" and "HTTP/2 vs HTTP/3".

### Diagnose prompt (`content/exercises/<prompt-slug>.yaml`)

- **Fields:** `type: design-prompt`, `kind: diagnose`, `lessons: [<slug>]`, `ladderOrder: 2`.
- **`prompt`:** a concrete symptom with numbers, asking the learner to explain the cause, show how to confirm it, and give fixes.
- **`hint`:** one nudge.
- **`rubric`:** 5 points.
- **`reference`:** ≤300 words by `wc -w` on the reference block only. It must:
  - match the rubric point by point;
  - show all its arithmetic, correctly;
  - model its own scenario: every number it uses comes from the prompt or is derived from it in the reference;
  - be internally consistent: any stored state a later step changes says how it is updated.
- Copy the layout of `content/exercises/diagnose-prefork-memory.yaml`.

### Wiring

Each lesson task does the following:
- **`content/tracks/cs-fundamentals/track.yaml`:**
  - appends its slug to `networking.lessons`;
  - removes its own title from `networking.comingSoon`;
  - the task that empties the list deletes the `comingSoon` key.
- **`src/lib/content/index.test.ts`:** adds the lesson's entry to the `CSF` record, in track order, with its prerequisites and exercises.
- **`e2e/layout.spec.ts`:** adds `/cs-fundamentals/<slug>/` and both exercise pages to `PAGES`.
- **`e2e/visualizers.spec.ts`:** if the lesson embeds a visualizer, adds `{ path, final }` to `PAGES`.

## Review Focus

1. **The track page while Networking is partly shipped.** Between tasks, Networking has both lessons and `comingSoon` titles. The page must render both, and `/cs-fundamentals/` must still pass `e2e/tracks.spec.ts`, whose "Coming soon" check is satisfied by Databases.
   - Each lesson task runs the full e2e suite.
   - Task 5 adds an e2e check that the Networking heading lists "HTTP/1.1, HTTP/2 and HTTP/3" as a link, not as coming soon.
2. **`tcp-handshake` must not overflow on phones.** Segment labels such as `SYN-ACK seq=300 ack=101` are the longest strings in any visualizer so far, and they must fit at 320px.
   - Task 1 measures height and horizontal scroll at every step at 320, 375 and 1280px.
3. **Sequence-number arithmetic in the visualizer must match the lesson's prose and diagram exactly.** A reader checks one against the other.
   - Task 1 pins every `seq` and `ack` in its tests.
   - Task 3 copies the numbers from Task 1's table and greps the lesson for them.
4. **Recommendations for a newcomer.** `tcp-ip-stack` has no prerequisites, so a learner with no progress must be able to start Networking without finishing Operating systems.
   - Task 2 adds a unit assertion in `src/lib/content/index.test.ts` that `tcp-ip-stack` has `prerequisites: []`.
   - `lessons.test.ts` already covers how recommendations follow prerequisites.
5. **Cross-track links resolve.** Each lesson links to System Design lessons, and a typo would be a 404 in production.
   - `check:deploy` crawls only the pages it lists, so each lesson task greps its own `](/` links and checks that each target file exists under `content/tracks/`.

---

### Task 1: `tcp-handshake` visualizer

**Files:**
- Create: `src/lib/visualizers/tcp-steps.ts`, `src/lib/visualizers/tcp-steps.test.ts`
- Create: `src/components/visualizers/tcp-view.tsx`
- Modify: `src/lib/visualizers/kinds.ts`, `src/components/visualizers/visualizer.tsx`

**Interfaces:**
- Produces `tcpHandshakeSteps(): TcpStep[]` and the kind `tcp-handshake`.
- The final caption below is consumed by Task 3 (in the e2e spec).

**Pattern.** Follow the existing visualizers exactly: `src/lib/visualizers/{tpc-steps,pt-steps,mutex-steps}.ts` with their tests, and `src/components/visualizers/{tpc-view,pt-view,mutex-view}.tsx`.
- Each generator is pure and returns steps with a `caption`. The last step has `done: true`.
- Captions are in the past tense. Counts and plurals are derived from state.
- The figure height is constant at 320, 375 and 1280px, with no sideways scroll. If the final caption wraps, use `captionClassName`, as `feed-fanout` does.
- State is shown as text as well as colour.
  - White text uses blue-600 `#2563eb`, amber-700 `#b45309`, emerald-700 `#047857`, purple-600 `#9333ea`, red-700 `#b91c1c` or slate-600 `#475569`.
  - Red text in dark mode gets `dark:text-red-400`.
- Put one dynamic `aria-label` on a `role="img"` container that summarises all the state. Put no `aria-label` on children or on plain elements, and no unlabeled `role="group"`.

**Constants:**
- The client's initial sequence number (ISN) is 100, and the server's is 300.
- The client sends two 100-byte data segments. The server sends no data.
- The second data segment is lost once and resent after the retransmission timeout.
- The client closes first.

```ts
export type Side = 'client' | 'server'
export type TcpState =
  | 'CLOSED' | 'LISTEN' | 'SYN_SENT' | 'SYN_RECEIVED' | 'ESTABLISHED'
  | 'FIN_WAIT_1' | 'FIN_WAIT_2' | 'CLOSE_WAIT' | 'LAST_ACK' | 'TIME_WAIT'
export interface TcpSegment {
  from: Side
  flags: ('SYN' | 'ACK' | 'FIN')[]   // in this order when several
  seq: number
  ack: number | null                  // null only on the first SYN
  len: number                         // payload bytes
  lost?: true
  retransmit?: true
}
export interface TcpStep {
  client: TcpState; server: TcpState
  segment: TcpSegment | null
  sent: number; lost: number; retransmits: number; delivered: number   // delivered = payload bytes the server received in order
  caption: string; done?: boolean
}
```

Pin every step in the test: captions, both states, the whole `segment` (or `null`), and the four counters.

| # | client / server | segment | counters after (sent, lost, retx, delivered) | caption |
|---|---|---|---|---|
| 0 | CLOSED / LISTEN | null | 0, 0, 0, 0 | `The server was listening; the client was closed` |
| 1 | SYN_SENT / LISTEN | client SYN seq 100, ack null, len 0 | 1, 0, 0, 0 | `The client sent SYN with seq = 100` |
| 2 | SYN_SENT / SYN_RECEIVED | server SYN+ACK seq 300, ack 101, len 0 | 2, 0, 0, 0 | `The server replied SYN-ACK with seq = 300 and ack = 100 + 1 = 101` |
| 3 | ESTABLISHED / ESTABLISHED | client ACK seq 101, ack 301, len 0 | 3, 0, 0, 0 | `The client acked with ack = 300 + 1 = 301, and both sides were established` |
| 4 | ESTABLISHED / ESTABLISHED | client ACK seq 101, ack 301, len 100 | 4, 0, 0, 100 | `The client sent 100 bytes with seq = 101` |
| 5 | ESTABLISHED / ESTABLISHED | server ACK seq 301, ack 201, len 0 | 5, 0, 0, 100 | `The server acked with ack = 101 + 100 = 201` |
| 6 | ESTABLISHED / ESTABLISHED | client ACK seq 201, ack 301, len 100, lost | 6, 1, 0, 100 | `The client sent 100 bytes with seq = 201, and the segment was lost` |
| 7 | ESTABLISHED / ESTABLISHED | null | 6, 1, 0, 100 | `No ACK arrived, so the client's retransmission timer expired` |
| 8 | ESTABLISHED / ESTABLISHED | client ACK seq 201, ack 301, len 100, retransmit | 7, 1, 1, 200 | `The client resent the 100 bytes with seq = 201` |
| 9 | ESTABLISHED / ESTABLISHED | server ACK seq 301, ack 301, len 0 | 8, 1, 1, 200 | `The server acked with ack = 201 + 100 = 301` |
| 10 | FIN_WAIT_1 / ESTABLISHED | client FIN+ACK seq 301, ack 301, len 0 | 9, 1, 1, 200 | `The client sent FIN with seq = 301 to close its side` |
| 11 | FIN_WAIT_2 / CLOSE_WAIT | server ACK seq 301, ack 302, len 0 | 10, 1, 1, 200 | `The server acked the FIN with ack = 301 + 1 = 302` |
| 12 | FIN_WAIT_2 / LAST_ACK | server FIN+ACK seq 301, ack 302, len 0 | 11, 1, 1, 200 | `The server sent its own FIN with seq = 301` |
| 13 | TIME_WAIT / CLOSED | client ACK seq 302, ack 302, len 0 | 12, 1, 1, 200 | `The client acked with ack = 302 and waited in TIME_WAIT; the server closed` |
| 14 | TIME_WAIT / CLOSED | null, `done: true` | 12, 1, 1, 200 | `Done: 200 bytes arrived in 12 segments; the 1 lost segment was resent after a timeout` |

**Compute it** instead of hard-coding the numbers:
- Keep `sndNxt` per side. A segment's `seq` is the sender's `sndNxt`.
- `sndNxt` advances by `len`, plus 1 for SYN and plus 1 for FIN.
- A segment's `ack` is the receiver's next expected byte.
- A lost segment advances the sender's `sndNxt` but not the receiver's expected byte. The retransmission reuses the original `seq`.
- Derive `delivered`, the counters and the final caption from state.
- Throw if an ack ever exceeds what the other side has sent.

**View:**
- Two columns, Client and Server, each with a state badge in text.
- A lane between them shows the current segment as an arrow pointing in its direction.
  - Its label is `SYN seq=100`, `SYN-ACK seq=300 ack=101`, `ACK seq=101 ack=301 len=100`, and so on. Show `ack=` whenever it isn't null and `len=` whenever it is above 0.
  - A lost segment is marked `✕ lost` in red text, and a retransmission is marked `↻ resent`.
  - When there is no segment, the lane shows `—`.
- Below, the counters: `Sent s · Lost l · Resent r · Delivered b bytes`.
- At 320px the label may wrap onto two lines inside a fixed-height lane. It must never scroll sideways.

**Title:** `"TCP: handshake, a lost segment and the close"`

- [ ] **Step 1: Write the failing test.** It pins all 15 steps in the table above, including a length check of 15.
- [ ] **Step 2: Run it and check it fails.** Run `npx vitest run src/lib/visualizers/tcp-steps.test.ts`. Expected: FAIL, because the module is missing.
- [ ] **Step 3: Implement** the generator, the view and the wiring (`kinds.ts`, plus the component and switch case in `visualizer.tsx`).
- [ ] **Step 4: Verify.**
  - Run `npm test`, `npm run typecheck` and `npm run lint`; all must pass.
  - Render the visualizer on a throwaway page and check it with Playwright. Don't commit the page.
  - Measure the height at every step at 320, 375 and 1280px, and confirm it is constant with no sideways scroll.
  - Save `tcp-320.png`, `tcp-375.png` and `tcp-1280.png` to the scratchpad.
- [ ] **Step 5: Commit.** Use the message `feat(visualizers): tcp-handshake step-through visualizer` with the trailer.

---

### Task 2: `tcp-ip-stack`

**Files:**
- Create: `content/tracks/cs-fundamentals/lessons/tcp-ip-stack.mdx`, `content/exercises/tcp-ip-stack-quiz.yaml`, `content/exercises/diagnose-large-responses-hang.yaml`
- Modify: `content/tracks/cs-fundamentals/track.yaml`, `src/lib/content/index.test.ts`, `e2e/layout.spec.ts`

**Lesson:** "The TCP/IP stack", `level: beginner`, `prerequisites: []`.

**Cover:**
- The four layers: link, internet, transport and application. Map them to the OSI model in one hedged paragraph ("a teaching model; real stacks don't split at 7 layers").
- **Encapsulation.** Each layer adds a header. Give the minimum sizes without options, hedged: Ethernet 14 bytes (plus a 4-byte FCS trailer), IPv4 20, IPv6 40, TCP 20 and UDP 8.
- **MTU and MSS.** An Ethernet MTU of 1,500 bytes leaves an MSS of 1,500 − 20 − 20 = 1,460 over IPv4 without options. Show the arithmetic.
- **IP addresses and CIDR.** For example, `/24` = 2⁸ = 256 addresses, of which 254 hosts are usable. Also cover private ranges and, briefly, IPv6.
- **Routing.** Hop-by-hop forwarding, the default gateway, and the TTL/hop limit decremented per hop, which is what traceroute exploits.
- **Ports and sockets.** The 5-tuple identifies a connection, and the kernel delivers to sockets.
- ARP (or IPv6 neighbour discovery) in one sentence. NAT, and why it breaks inbound connections.
- Where DNS sits: link `[DNS & CDNs](/system-design/dns-cdn/)`.
- Tools to know: `ping`, `traceroute`, `ss`/`netstat` and `tcpdump`, one line each.

**Visual:** a text diagram of one HTTP request encapsulated down the stack, from application data through the TCP segment and the IP packet to the Ethernet frame, labelled with header sizes.

**Example:** two parts.
1. Send a 1,000,000-byte response over IPv4 and TCP on Ethernet without options.
   - Segments: ⌈1,000,000 ÷ 1,460⌉ = 685.
   - Header bytes per frame: 14 + 20 + 20 = 54, ignoring the FCS.
   - Total header overhead: 685 × 54 = 36,990 bytes, about 3.7%.
   - Show all the arithmetic.
2. Compare a 1-byte payload: 54 bytes of headers to carry 1 byte. Ethernet's minimum frame size pads it further (hedged).

Include a few `traceroute`/`ss` invocations, with an explanation of what to read in their output.

**Diagnose prompt `diagnose-large-responses-hang`:**
- **Scenario.** A team moves its services onto an overlay network that wraps each packet in a VXLAN header, adding 50 bytes. The physical network's MTU is 1,500, and the hosts' interfaces were left at an MTU of 1,500. A firewall between the racks drops all ICMP.
- **Symptoms.**
  - Health checks and small JSON calls succeed.
  - Any response larger than about 1.4 KB hangs until the client's 30 s timeout.
  - SSH logs in, but `cat` on a large file freezes.
- **Ask the learner to:**
  - explain why only large packets fail;
  - compute the usable MTU (1,500 − 50 = 1,450) and the matching IPv4 TCP MSS (1,450 − 40 = 1,410);
  - explain how path MTU discovery depends on ICMP "fragmentation needed" messages when the don't-fragment bit is set, and why dropping ICMP turns it into a black hole;
  - show how to confirm it with `ping -M do -s <size>`: payload 1,422 + 28 = 1,450 passes and 1,423 fails;
  - give fixes with trade-offs: allow ICMP type 3 code 4, lower the interface MTU to 1,450, clamp the MSS at the edge, or raise the physical network's MTU.
- **The lesson must NOT discuss:** path MTU discovery, the don't-fragment bit, ICMP "fragmentation needed", MSS clamping, tunnel or overlay encapsulation overhead, or `ping -M do`.
- **The lesson may:**
  - define MTU and MSS at 1,500 / 1,460;
  - say that a router fragments or drops packets larger than the next link's MTU, in one sentence and without the mechanism.

**Extra test (Review Focus 4):** `tcp-ip-stack` gets `prerequisites: []` in the `CSF` record, which already asserts prerequisites.

**Commit:** `feat(cs-fundamentals): TCP/IP stack lesson`.

---

### Task 3: `tcp-vs-udp`

**Files:**
- Create: `content/tracks/cs-fundamentals/lessons/tcp-vs-udp.mdx`, `content/exercises/tcp-vs-udp-quiz.yaml`, `content/exercises/diagnose-slow-long-distance-upload.yaml`
- Modify: `content/tracks/cs-fundamentals/track.yaml`, `src/lib/content/index.test.ts`, `e2e/layout.spec.ts`, `e2e/visualizers.spec.ts`

**Lesson:** "TCP vs UDP", `level: intermediate`, `prerequisites: [tcp-ip-stack]`.

**Visual:**
- `<Visualizer kind="tcp-handshake" />`, plus a text sequence diagram of the handshake and the close.
- The lesson must describe the visualizer's scenario with its exact numbers:
  - ISNs 100 and 300;
  - SYN, SYN-ACK (ack 101) and ACK (ack 301);
  - 100 bytes at seq 101, acked with 201;
  - 100 bytes at seq 201, lost and resent after a timeout, acked with 301;
  - the four-segment close (FIN seq 301, ack 302, FIN seq 301, ack 302) into TIME_WAIT.
- Add `{ path: '/cs-fundamentals/tcp-vs-udp/', final: 'Done: 200 bytes arrived in 12 segments; the 1 lost segment was resent after a timeout' }` to `e2e/visualizers.spec.ts`.

**Cover:**
- TCP gives a reliable, ordered byte stream over an unreliable network.
  - Sequence numbers count bytes. SYN and FIN each consume one.
  - Cumulative ACKs.
  - Retransmission on timeout. Fast retransmit after 3 duplicate ACKs, hedged as typical.
- The cost of the handshake: the client can send after 1 round trip. Link `[Client–server & HTTP](/system-design/client-server-http/)`.
- **TCP is a byte stream, not messages.** A `recv` can return part of a message or several messages at once, so applications need framing.
- Flow control, qualitatively: the receive window tells the sender how much it may send.
- Congestion control, qualitatively:
  - slow start roughly doubles the congestion window each round trip, then additive increase and multiplicative decrease (AIMD);
  - loss is the classic signal;
  - CUBIC and BBR are common algorithms (hedged, varies by OS).
- Head-of-line blocking: one lost segment holds back later bytes from the application.
- The close and TIME_WAIT, and why it exists (hedge the duration as "typically 60 s on Linux").
- UDP: an 8-byte header, no connection, and no ordering, retransmission or congestion control. The application adds what it needs.
- Use cases:
  - DNS, games, voice and video;
  - QUIC, which builds reliability on UDP (name the "HTTP/1.1, HTTP/2 and HTTP/3" lesson by its title);
  - why a stale retransmitted voice packet is worse than a gap.

**Example:** Python, in two parts.
1. A UDP send/receive pair with `socket.SOCK_DGRAM` and a timeout, showing that a lost datagram simply never arrives.
2. TCP message framing with a 4-byte length prefix (`struct.pack('!I', len(payload))`). Use a `recv_exact` loop that keeps calling `recv` until it has n bytes, because one `recv` may return fewer.

Both must be valid code.

**Diagnose prompt `diagnose-slow-long-distance-upload`:**
- **Scenario.**
  - A nightly backup uploads 50 GB from Singapore to a bucket in Frankfurt over one TCP connection. The link is 1 Gbit/s (125 MB/s) with an RTT of 160 ms.
  - The same upload to a same-region bucket (RTT 2 ms) runs at about 110 MB/s. To Frankfurt it runs at a steady ~3.2 MB/s and takes about 4.2 hours.
  - There is no measurable loss.
  - Both hosts cap their socket buffers at 512 KiB, a setting left by an old tuning script, so the TCP window can never exceed 512 KiB.
- **Ask the learner to:**
  - explain why throughput is capped at window ÷ RTT: 524,288 B ÷ 0.16 s ≈ 3.28 MB/s;
  - compute the bandwidth-delay product needed to fill the link: 125 MB/s × 0.16 s = 20 MB;
  - explain why the same window is fine at 2 ms (524,288 ÷ 0.002 ≈ 262 MB/s, above the link);
  - check the duration: 50,000 MB ÷ 3.28 MB/s ≈ 15,240 s ≈ 4.2 hours, which matches the symptom;
  - show how to confirm it (`ss -ti` for the window and RTT, or a packet capture showing the sender idle while it waits for ACKs);
  - give fixes with trade-offs: raise the socket buffers or allow autotuning to ≥ 20 MB, use parallel streams, or upload to a closer region and replicate.
- **The lesson must NOT discuss:** the bandwidth-delay product, throughput = window ÷ RTT, window scaling, socket buffer sizing, or long-distance throughput.
- **The lesson may:** describe the receive window as flow control, qualitatively, with no figures.

**Commit:** `feat(cs-fundamentals): TCP vs UDP lesson`.

---

### Task 4: `tls`

**Files:**
- Create: `content/tracks/cs-fundamentals/lessons/tls.mdx`, `content/exercises/tls-quiz.yaml`, `content/exercises/diagnose-tls-clients-fail.yaml`
- Modify: `content/tracks/cs-fundamentals/track.yaml`, `src/lib/content/index.test.ts`, `e2e/layout.spec.ts`

**Lesson:** "TLS", `level: intermediate`, `prerequisites: [tcp-vs-udp]`.

**Cover:**
- What TLS gives: confidentiality, integrity and server authentication (and client authentication with mTLS).
- What it doesn't hide: IPs, the SNI hostname by default (hedge on Encrypted Client Hello), and traffic sizes and timing.
- Symmetric vs asymmetric cryptography, and why both are used: an asymmetric key exchange, then fast symmetric AEAD ciphers such as AES-GCM or ChaCha20-Poly1305.
- **Key exchange.** (EC)DHE and forward secrecy: why a later key leak can't decrypt recorded traffic.
- **Certificates.**
  - A certificate binds a public key to names (the SAN).
  - It is signed by a CA, and the client verifies the signature chain up to a root in its trust store.
  - The client checks the hostname against the SAN, and checks validity dates.
  - Revocation is hedged: OCSP and CRLs exist, and browser behaviour varies.
- **The TLS 1.3 handshake** takes 1 round trip, compared with 2 for TLS 1.2. ClientHello and ServerHello carry key shares. Agree with the first-visit timeline in `client-server-http.mdx`.
- **Session resumption** and 0-RTT early data. 0-RTT data can be replayed, so use it only for idempotent requests (hedged).
- ALPN picks the HTTP version during the handshake.
- TLS termination at a load balancer: link `[Load balancing](/system-design/load-balancing/)`. mTLS between services.
- The cost today is mostly handshakes, not bulk encryption, which is hardware-accelerated on most modern CPUs (hedged).

**Example:** two parts.
1. Handshake latency at an illustrative 80 ms RTT:
   - new connection with TLS 1.3 = TCP 1 + TLS 1 + request 1 = 3 RTT = 240 ms;
   - with TLS 1.2, 4 RTT = 320 ms;
   - resumed with 0-RTT, 2 RTT = 160 ms, since the request rides with the TLS handshake after the TCP one.
2. Python `ssl.create_default_context()` wrapping a socket to a server:
   - print `version()` and `cipher()`, and the peer certificate's subject and SAN;
   - show that turning off `check_hostname` or verification is the classic mistake.

**Diagnose prompt `diagnose-tls-clients-fail`:**
- **Scenario.** A certificate is renewed at 02:00 by a new automation job, and then:
  - 0% of desktop browser requests fail;
  - 100% of requests from the company's Java backend jobs and from partners using `curl` fail with "unable to get local issuer certificate" / "PKIX path building failed";
  - these clients account for 35% of the API's 40,000 requests per minute, so about 14,000 failures per minute.
- **Cause.** The new job installed `cert.pem` (the leaf only) instead of `fullchain.pem`.
- **Ask the learner to:**
  - explain chain building and why the server must send intermediates;
  - explain why browsers still worked (cached intermediates and AIA fetching, hedged by browser);
  - confirm it with `openssl s_client -connect host:443 -servername host -showcerts`, which shows only depth 0;
  - give fixes: serve the full chain, add a deploy-time check, and monitor from a non-browser client;
  - say why adding the intermediate to every client's trust store is the wrong fix.
- **The lesson must NOT discuss:**
  - which side supplies intermediate certificates;
  - missing intermediates, or the "full chain";
  - AIA fetching and browser intermediate caching;
  - `openssl s_client`;
  - the difference between browser and non-browser clients in validation.
- **The lesson may:** describe a chain as leaf → intermediate → root, and say that the client verifies it up to a trusted root.

**Commit:** `feat(cs-fundamentals): TLS lesson`.

---

### Task 5: `http-versions`

**Files:**
- Create: `content/tracks/cs-fundamentals/lessons/http-versions.mdx`, `content/exercises/http-versions-quiz.yaml`, `content/exercises/diagnose-uneven-backend-load.yaml`
- Modify: `content/tracks/cs-fundamentals/track.yaml`: append the slug and delete Networking's now-empty `comingSoon` key.
- Modify: `src/lib/content/index.test.ts`, `e2e/layout.spec.ts`, `e2e/tracks.spec.ts`

**Lesson:** "HTTP/1.1, HTTP/2 and HTTP/3", `level: intermediate`, `prerequisites: [tcp-vs-udp, tls]`.
- **Cover.** Go one layer deeper than the one-liners in `client-server-http.mdx`, and agree with them.
  - **HTTP/1.1**
    - Text framing; keep-alive.
    - One request in flight per connection in practice, so browsers open several connections per host (typically about 6; hedged).
    - Application-level head-of-line blocking.
    - Workarounds of that era: domain sharding, concatenated bundles and sprites.
  - **HTTP/2**
    - Binary frames, streams, multiplexing and HPACK header compression.
    - Per-stream flow control and priorities (hedged: the priority scheme was simplified in later RFCs).
    - Server push is effectively deprecated; major browsers removed it (hedged).
    - One TCP connection, so a lost segment stalls every stream. Point back to the "TCP vs UDP" lesson.
  - **HTTP/3 and QUIC**
    - QUIC runs over UDP and has TLS 1.3 built in, so the transport and crypto handshake together take 1 RTT for a new connection, plus 0-RTT on resumption.
    - Loss recovery is per stream.
    - Connection IDs allow migration across a network change, such as wifi to cellular.
    - QPACK.
    - Discovery via `Alt-Svc` (or DNS HTTPS records, hedged), with a fallback to HTTP/2 when UDP is blocked.
  - When each wins, and when HTTP/3 doesn't help: a single large download on a clean network.
  - ALPN negotiates h2. Point back to the "TLS" lesson.
- **Example:** load 30 small assets from one host at an illustrative 100 ms RTT, ignoring bandwidth and server time. Show all the arithmetic.
  - **HTTP/1.1 with 6 connections:**
    - setup is 1 RTT for TCP plus 1 for TLS 1.3, done in parallel;
    - then ⌈30 ÷ 6⌉ = 5 sequential rounds;
    - 2 + 5 = 7 RTT = 700 ms.
  - **HTTP/2 on one connection:** 2 RTT of setup + 1 round for all 30 = 3 RTT = 300 ms, ignoring the congestion window.
  - **HTTP/3:** 1 RTT of setup + 1 = 2 RTT = 200 ms.
  - Then show, with `curl --http1.1`, `--http2` and `--http3` (hedged: `--http3` needs a curl built with HTTP/3 support), how to check which protocol a server negotiates (`curl -sI -o /dev/null -w '%{http_version}\n'`).
- **Diagnose prompt `diagnose-uneven-backend-load`:**
  - **Scenario.**
    - An internal gRPC service, which runs over HTTP/2, sits behind a layer-4 TCP load balancer.
    - The 4 client instances each open one long-lived connection and send about 500 requests per second over it, 2,000 requests per second in total.
    - At 10:00 the service was scaled from 3 to 6 pods because one pod sat at 90% CPU while the other two sat at 45%.
    - An hour later, the 3 new pods still show 0 requests per second, and the old pods are still at 90%, 45% and 45%.
  - **Ask the learner to:**
    - explain why an L4 balancer spreads connections, not requests;
    - explain why multiplexing makes a few connections carry everything;
    - work through the arithmetic: 4 connections over 3 pods can split no better than 2/1/1, so 1,000/500/500 requests per second, which matches 90%/45%/45% CPU; after scaling, existing connections don't move, so the new pods get none;
    - show how to confirm it: per-pod connection counts and request rates, and `ss` on the pods;
    - give fixes with trade-offs: an HTTP/2-aware L7 proxy that balances per request, client-side load balancing across all pods, or a maximum connection age so that GOAWAY makes clients reconnect and rebalance (hedged by framework).
  - **The lesson must NOT discuss:** load balancing of long-lived or multiplexed connections, gRPC, connection-level vs request-level balancing, GOAWAY or connection age limits.
  - **Already covered elsewhere:** the System Design load-balancing lesson defines L4 vs L7 in general. That is allowed background. Grep it to confirm that it doesn't discuss HTTP/2 or gRPC connection pinning.
- **Extra e2e (Review Focus 1):** in `e2e/tracks.spec.ts`, check on `/cs-fundamentals/` that "HTTP/1.1, HTTP/2 and HTTP/3" is a link to `/cs-fundamentals/http-versions/`. "Coming soon" text must still appear, from the Databases module.
- **Commit:** `feat(cs-fundamentals): HTTP versions lesson`.
