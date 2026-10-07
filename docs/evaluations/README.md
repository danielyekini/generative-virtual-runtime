# Evaluations

An evaluation run records what one implementation revision reproduced. It is not the specification. Support claims live in `packages/schema/capabilities/registry.json`. Language changes live in `docs/languages/`.

The newest run is [2026-10-07T210442Z](2026-10-07T210442Z/report.md).

Next Baseline must pin the implementation from [implementation-pin.json](implementation-pin.json) (dirty snapshot under `2026-10-07T210442Z/source-snapshot/` for the solid-placement fix, or a later clean commit that includes it). Compare with `2026-10-07T210442Z`. Next cause unless overridden: `visual.midCycle` (LOT-01 Celebrations).

| Run | Captured | Languages under test | Result |
| --- | --- | --- | --- |
| [2026-10-07T210442Z](2026-10-07T210442Z/report.md) | 2026-10-07T21:04:42Z | MotionScript 0.4.0, Scene IR 0.4.0 (wire `0.2`) | gradientStroke 0.4.0 + solid placement; LOT-07 rings restored; LOT-06 background fixed; LOT-01 mid-cycle deferred; stop budget-exhausted |
| [2026-10-07T194646Z](2026-10-07T194646Z/report.md) | 2026-10-07T19:46:46Z | MotionScript 0.3.0, Scene IR 0.3.0 (wire `0.2`) | Import exact LOT-00+01+06+07; pathMorph 0.3.0; LOT-00 visual confirmed; LOT-01/06/07 visual not a pass; stop blocker → matte |
| [2026-10-07T183125Z](2026-10-07T183125Z/report.md) | 2026-10-07T18:31:25Z | MotionScript 0.2.0, Scene IR 0.2.0 (wire `0.2`) | Import exact LOT-00+LOT-01; LOT-00 visual confirmed; LOT-01 visual not a pass; stop blocker → pathMorph |
| [2026-10-07-baseline](2026-10-07-baseline/report.md) | 2026-10-07T14:29:58.967Z | MotionScript 0.1.0, Scene IR 0.1.0 (wire `0.1`) | PASS 0, PARTIAL 6, FAIL 4, BLOCKED 0 |

`2026-10-07-baseline` is historical. Do not edit it. Do not use it as `comparedWith` once a newer run exists.

Manifest / results / evidence for the newest run live under `2026-10-07T210442Z/`.

`evaluation/evidence/` is scratch space for the harness. Copy a finished run into a new `docs/evaluations/<run-id>/` directory. Do not point the index at the scratch directory.

## What belongs in Git

| Commit to Git | Store outside Git |
| --- | --- |
| Reports and stop/continuation records | Full frame captures, videos, and failure-sample images |
| Manifests, source hashes and implementation pins | Large image-diff collections |
| Machine-readable results and gate settings | Dependencies, caches and build outputs |
| Harness code and small regression fixtures | Large source snapshots |
|  | Large or redistribution-restricted assets |

Captures and failure samples may remain on disk under `evidence/captures/` or `evidence/failure-samples/` for local debugging; `.gitignore` keeps all evaluation image/video files out of the repository. Corpus bytes are pinned by SHA-256 in each run’s `manifest.json` / `loop.json`, not by re-storing large `evidence/sources/` copies.
