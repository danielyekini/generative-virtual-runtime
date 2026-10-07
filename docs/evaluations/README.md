# Evaluations

An evaluation run records what one implementation revision reproduced. It is not the specification. Support claims live in `packages/schema/capabilities/registry.json`. Language changes live in `docs/languages/`.

The newest run is [2026-10-07T221955Z](2026-10-07T221955Z/report.md).

Next Baseline must use [implementation-pin.json](implementation-pin.json): HEAD `f609273cea310b64733a535642e9e7f17d22a88a` plus this run’s final evidence snapshot. Compare with `2026-10-07T221955Z`. Resolve missing original corpus, visual gate calibration and Linux reference browser configuration before resuming `visual.midCycle.confetti.q50`. Prior attempt history is retained.

| Run | Captured | Languages under test | Result |
| --- | --- | --- | --- |
| [2026-10-07T221955Z](2026-10-07T221955Z/report.md) | 2026-10-07T22:19:55.750446+00:00 | MotionScript 0.5.0, Scene IR 0.5.0 (wire `0.2`) | 172 tests + typecheck + registry passed; corpus BLOCKED (0/8 sources); VISUAL_UNVERIFIED; 0/2104 frames; design-escalation |
| [2026-10-07T220358Z](2026-10-07T220358Z/report.md) | 2026-10-07T22:03:58Z | MotionScript 0.5.0, Scene IR 0.5.0 (wire `0.2`) | spatial-Z arc-length + stroke caps + first-key base; LOT-01 start/q25/q50 improved (beyond 0.0038→0.0005 / 0.0061→0.0031 / 0.0056→0.0046); VISUAL_UNVERIFIED gate; stop budget-exhausted |
| [2026-10-07T215328Z](2026-10-07T215328Z/report.md) | 2026-10-07T21:53:28Z | MotionScript 0.5.0, Scene IR 0.5.0 (wire `0.2`) | AE-near easing diagonal fix; LOT-01 q25/q50 improved (beyond 0.0076→0.0061 / 0.0070→0.0056); q25 pose near-matched; VISUAL_UNVERIFIED gate; stop budget-exhausted |
| [2026-10-07T213004Z](2026-10-07T213004Z/report.md) | 2026-10-07T21:30:04Z | MotionScript 0.5.0, Scene IR 0.5.0 (wire `0.2`) | animatedTrim 0.5.0; LOT-01 trim stroke fixed (q75 beyond 0.004→0.0003); mid-cycle confetti residual remains; VISUAL_UNVERIFIED gate; stop budget-exhausted |
| [2026-10-07T211534Z](2026-10-07T211534Z/report.md) | 2026-10-07T21:15:34Z | MotionScript 0.4.0, Scene IR 0.4.0 (wire `0.2`) | spatialCurve arc-length; LOT-01 mid-cycle improved (q25 beyond 0.033→0.011); residual remains; VISUAL_UNVERIFIED gate; stop blocker |
| [2026-10-07T210442Z](2026-10-07T210442Z/report.md) | 2026-10-07T21:04:42Z | MotionScript 0.4.0, Scene IR 0.4.0 (wire `0.2`) | gradientStroke 0.4.0 + solid placement; LOT-07 rings restored; LOT-06 background fixed; LOT-01 mid-cycle deferred; stop budget-exhausted |
| [2026-10-07T194646Z](2026-10-07T194646Z/report.md) | 2026-10-07T19:46:46Z | MotionScript 0.3.0, Scene IR 0.3.0 (wire `0.2`) | Import exact LOT-00+01+06+07; pathMorph 0.3.0; LOT-00 visual confirmed; LOT-01/06/07 visual not a pass; stop blocker → matte |
| [2026-10-07T183125Z](2026-10-07T183125Z/report.md) | 2026-10-07T18:31:25Z | MotionScript 0.2.0, Scene IR 0.2.0 (wire `0.2`) | Import exact LOT-00+LOT-01; LOT-00 visual confirmed; LOT-01 visual not a pass; stop blocker → pathMorph |
| [2026-10-07-baseline](2026-10-07-baseline/report.md) | 2026-10-07T14:29:58.967Z | MotionScript 0.1.0, Scene IR 0.1.0 (wire `0.1`) | PASS 0, PARTIAL 6, FAIL 4, BLOCKED 0 |

`2026-10-07-baseline` is historical. Do not edit it. Do not use it as `comparedWith` once a newer run exists.

Manifest / results / evidence for the newest run live under `2026-10-07T221955Z/`.

`evaluation/evidence/` is scratch space for the harness. Copy a finished run into a new `docs/evaluations/<run-id>/` directory. Do not point the index at the scratch directory.

## What belongs in Git

| Commit to Git | Store outside Git |
| --- | --- |
| Reports and stop/continuation records | Full frame captures and videos |
| Manifests, source hashes and implementation pins | Large image-diff collections |
| Machine-readable results and gate settings | Dependencies, caches and build outputs |
| Harness code and small regression fixtures | Large source snapshots |
| A few representative failure images (`evidence/failure-samples/`) | Large or redistribution-restricted assets |

Full captures may remain on disk under `evidence/captures/` for local debugging; `.gitignore` keeps them out of the repository. Corpus bytes are pinned by SHA-256 in each run’s `manifest.json` / `loop.json`, not by re-storing large `evidence/sources/` copies.
