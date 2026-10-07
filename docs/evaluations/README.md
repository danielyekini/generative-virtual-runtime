# Evaluations

An evaluation run records what one implementation revision reproduced. It is not the specification. Support claims live in `packages/schema/capabilities/registry.json`. Language changes live in `docs/languages/`.

The newest run is [2026-10-07T211534Z](2026-10-07T211534Z/report.md).

Next Baseline must pin the implementation from [implementation-pin.json](implementation-pin.json) (dirty snapshot under `2026-10-07T211534Z/source-snapshot/` for the arc-length spatialCurve fix, or a later clean commit that includes it). Compare with `2026-10-07T211534Z`. Next cause unless overridden: `visual.midCycle.residual` (LOT-01 Celebrations).

| Run | Captured | Languages under test | Result |
| --- | --- | --- | --- |
| [2026-10-07T211534Z](2026-10-07T211534Z/report.md) | 2026-10-07T21:15:34Z | MotionScript 0.4.0, Scene IR 0.4.0 (wire `0.2`) | spatialCurve arc-length; LOT-01 mid-cycle improved (q25 beyond 0.033→0.011); residual remains; VISUAL_UNVERIFIED gate; stop blocker |
| [2026-10-07T210442Z](2026-10-07T210442Z/report.md) | 2026-10-07T21:04:42Z | MotionScript 0.4.0, Scene IR 0.4.0 (wire `0.2`) | gradientStroke 0.4.0 + solid placement; LOT-07 rings restored; LOT-06 background fixed; LOT-01 mid-cycle deferred; stop budget-exhausted |
| [2026-10-07T194646Z](2026-10-07T194646Z/report.md) | 2026-10-07T19:46:46Z | MotionScript 0.3.0, Scene IR 0.3.0 (wire `0.2`) | Import exact LOT-00+01+06+07; pathMorph 0.3.0; LOT-00 visual confirmed; LOT-01/06/07 visual not a pass; stop blocker → matte |
| [2026-10-07T183125Z](2026-10-07T183125Z/report.md) | 2026-10-07T18:31:25Z | MotionScript 0.2.0, Scene IR 0.2.0 (wire `0.2`) | Import exact LOT-00+LOT-01; LOT-00 visual confirmed; LOT-01 visual not a pass; stop blocker → pathMorph |
| [2026-10-07-baseline](2026-10-07-baseline/report.md) | 2026-10-07T14:29:58.967Z | MotionScript 0.1.0, Scene IR 0.1.0 (wire `0.1`) | PASS 0, PARTIAL 6, FAIL 4, BLOCKED 0 |

`2026-10-07-baseline` is historical. Do not edit it. Do not use it as `comparedWith` once a newer run exists.

Manifest / results / evidence for the newest run live under `2026-10-07T211534Z/`.

`evaluation/evidence/` is scratch space for the harness. Copy a finished run into a new `docs/evaluations/<run-id>/` directory. Do not point the index at the scratch directory.

## What belongs in Git

| Commit to Git | Store outside Git |
| --- | --- |
| Reports and stop/continuation records | Videos |
| Manifests, source hashes and implementation pins | Dependencies, caches and build outputs |
| Machine-readable results and gate settings | Large source snapshots (`working-tree.patch`, full trees) |
| Harness code and small regression fixtures | Large or redistribution-restricted corpus copies (`evidence/sources/`) |
| PNG evidence (`evidence/captures/`, `evidence/failure-samples/`) | Harness scratch `evaluation/evidence/` |

Corpus bytes are pinned by SHA-256 in each run’s `manifest.json` / `loop.json`. Large regenerated scene dumps (`compiled-scene.json`, `imported-scene.json`, `diagnostic-scene.json`) stay outside Git.
