# Final fix wave report

Status: DONE.

- I1: rate-limiting lesson limit moved 100 -> 300/min (algorithm list, boundary burst 300+300 / 2x, instances 300 x N, atomicity 299/300/301, diagram 300/600/300); quiz Q1 (300 per minute, 600 requests) and redis-race (299/300). Hot-key pitfall now "plan for it before launch" (remedy dropped). Visualizer scenario untouched.
- I2: removed the drain sentence and "sticky" from replication-sharding; design-message-store-sharding k = 16, drain caveat kept. Reference trimmed to 296 words (was 382, over the cap).
- I3: RS quiz distractors/answers rebalanced. Correct choice is the longest in 0 of 5 questions.
- M1: RS answers 1,3,0,2,1; RL answers 3,1,0,2,1. No explanation refers to a letter or position.
- M2: threading comment added in check().
- M3: comments schema has bucket SMALLINT, PK (post_id, bucket, comment_id), note adjusted.
- M4: "most writes". M5: scaling order includes "a bigger machine" (mirrors sql-vs-nosql).
- M6: lease_until in emails table; pending row inserted in checkout transaction; reference 293 words.
- M7: ch-view colours #2563eb / #b45309 / #047857 / #9333ea (legend is text only, no colour match needed).
- M8: dynamic SVG aria-label from legend; child and legend-p aria-labels removed.
- M9: ch-steps computes changes first, suffix only when exactly one moved. M10: tb-steps refill wording derived from TB_REFILL_PER_SECOND. Captions unchanged, tests pass.
- M11: links `[...](/system-design/replication-sharding/)` in load-balancing and sql-vs-nosql (no existing internal-link precedent; no basePath in use).

## Word counts (wc -w)
Lessons: replication-sharding 1400, queues-streams 1398, rate-limiting 1388.
References: design-message-store-sharding 296, design-order-email-pipeline 293, design-api-rate-limiter 298.

## Quizzes (answer index; choice lengths)
RS: ryw 1 [47,46,49,42]; failover-loss 3 [59,68,65,65]; mod-vs-ch 0 [73,73,78,75]; quorum 2 [60,69,64,63]; range-hot 1 [49,48,45,52].
RL: fixed-window-boundary 3 [73,66,72,68]; token-bucket-burst 1 [68,71,66,74]; redis-race 0 [78,82,54,73]; nat-ip-key 2 [82,68,71,71]; retry-after-backoff 1 [80,72,77,71].

## Results
npm test: 32 files, 307 tests passed. typecheck: clean. lint: clean. e2e: 78 passed (log: scratchpad/e2e-sds-final.log).
