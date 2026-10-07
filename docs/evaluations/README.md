# Evaluations

An evaluation run records what one implementation revision reproduced. It is not the specification. Support claims live in `packages/schema/capabilities/registry.json`. Language changes live in `docs/languages/`.

The newest run is [2026-10-07T183125Z](2026-10-07T183125Z/report.md).

Next Baseline must pin the implementation from [implementation-pin.json](implementation-pin.json). Code tip is `4e4af51`; the tree may be dirty with policy/prompt updates — commit those or write a `source-snapshot/` before running. Compare with `2026-10-07T183125Z`. Next cause unless overridden: `geometry.pathMorph` (new language version entry — see compatibility policy).

| Run | Captured | Languages under test | Result |
| --- | --- | --- | --- |
| [2026-10-07T183125Z](2026-10-07T183125Z/report.md) | 2026-10-07T18:31:25Z | MotionScript 0.2.0, Scene IR 0.2.0 (wire `0.2`) | Import exact LOT-00+LOT-01; LOT-00 visual confirmed; LOT-01 visual not a pass; stop blocker → pathMorph |
| [2026-10-07-baseline](2026-10-07-baseline/report.md) | 2026-10-07T14:29:58.967Z | MotionScript 0.1.0, Scene IR 0.1.0 (wire `0.1`) | PASS 0, PARTIAL 6, FAIL 4, BLOCKED 0 |

`2026-10-07-baseline` is historical. Do not edit it. Do not use it as `comparedWith` once a newer run exists.

Manifest / results / evidence for the newest run live under `2026-10-07T183125Z/`.

`evaluation/evidence/` is scratch space for the harness. Copy a finished run into a new `docs/evaluations/<run-id>/` directory. Do not point the index at the scratch directory.
