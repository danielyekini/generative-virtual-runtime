# Evaluations

An evaluation run records what one implementation revision reproduced. It is not the specification. Support claims live in `packages/schema/capabilities/registry.json`. Language changes live in `docs/languages/`.

The newest run is [2026-10-07T183125Z](2026-10-07T183125Z/report.md).

| Run | Captured | Languages under test | Result |
| --- | --- | --- | --- |
| [2026-10-07-baseline](2026-10-07-baseline/report.md) | 2026-10-07T14:29:58.967Z | MotionScript 0.1.0, Scene IR 0.1.0 (wire `0.1`) | PASS 0, PARTIAL 6, FAIL 4, BLOCKED 0 |

That run is historical. The working tree has since added Scene IR and MotionScript 0.2.0. Those additions are not results of this run. A later measurement needs a new directory. Do not edit `2026-10-07-baseline/`.

Manifest: [2026-10-07-baseline/manifest.json](2026-10-07-baseline/manifest.json). Results: [2026-10-07-baseline/results.json](2026-10-07-baseline/results.json). Evidence stays beside the report in `2026-10-07-baseline/evidence/`.

`evaluation/evidence/` is scratch space for the harness. Copy a finished run into a new `docs/evaluations/<run-id>/` directory. Do not point the index at the scratch directory.
