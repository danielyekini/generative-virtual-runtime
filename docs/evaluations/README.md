# Evaluations

An evaluation run records what one implementation revision reproduced. It is not the specification. Support claims live in `packages/schema/capabilities/registry.json`. Language changes live in `docs/languages/`.

The newest run is [2026-10-08T140610Z](2026-10-08T140610Z/report.md).

Next Baseline reads [implementation-pin.json](implementation-pin.json). The merged committed implementation requires fresh visual verification; historical results apply to their recorded source snapshots. Continue phase A global layer paint order on LOT01 (0/3 attempts); spatial clipping correction retains 1/3 history and animated fill remains queued at 0/3. Corpus remains FAIL. No canonical promotion.

| Run | Captured | Languages under test | Result |
| --- | --- | --- | --- |
| [2026-10-08T140610Z](2026-10-08T140610Z/report.md) | 2026-10-08T15:08:19.064275+00:00 | MotionScript / Scene IR 0.5.0 | 194 tests + typechecks PASS; spatial cuts corrected; LOT01 local visual FAIL; phase A paint order next; budget-exhausted |
| [2026-10-08T123430Z](2026-10-08T123430Z/report.md) | 2026-10-08T13:33:46.603914+00:00 | MotionScript / Scene IR 0.5.0 | 186 tests + typechecks PASS; clipped cubic morph fixed; Wave full-window PASS; corpus FAIL/incomplete; budget-exhausted |
| [2026-10-08T103605Z](2026-10-08T103605Z/report.md) | 2026-10-08T12:17:22.256060+00:00 | MotionScript / Scene IR 0.5.0 | 191 tests + typechecks PASS; clipping and shape order corrected; animated fill loss explicit; corpus FAIL; full native capture with reference blockers; budget overrun |
| [2026-10-08T090908Z](2026-10-08T090908Z/report.md) | 2026-10-08T10:05:25.725844+00:00 | MotionScript / Scene IR 0.5.0 | 184 tests + typechecks PASS; Wave stroke loss corrected, gradient residual FAIL; LOT-00 local quality PASS/r000001; budget-exhausted |
| [2026-10-08T012312Z](2026-10-08T012312Z/report.md) | 2026-10-08T07:15:47.602552+00:00 | MotionScript / Scene IR 0.5.0 | 181 tests + typechecks PASS; Wave timing fixed; corpus visual FAIL; budget-exhausted |
| [2026-10-08T010229Z](2026-10-08T010229Z/report.md) | 2026-10-08T01:06:59.053118+00:00 | MotionScript / Scene IR 0.5.0 | Baseline; 174 tests + typecheck PASS; Wave round-trip FAIL; VISUAL_UNVERIFIED; design-escalation |
| [2026-10-07T230859Z](2026-10-07T230859Z/report.md) | 2026-10-07T23:15:23.757523+00:00 | MotionScript / Scene IR 0.5.0 | Wave full-window inspection improved; 174 tests + typecheck PASS; VISUAL_UNVERIFIED |
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

Manifest / results / evidence for the newest run live under `2026-10-08T103605Z/`.

`evaluation/evidence/` is scratch space for the harness. Copy a finished run into a new `docs/evaluations/<run-id>/` directory. Do not point the index at the scratch directory.

## Agent prerequisites (local and cloud)

Before a fidelity Baseline:

1. **Corpus** — `fixtures/corpus/` (LOT-00…07, SVG-01…02). Verify `shasum -a 256 -c fixtures/corpus/SHA256SUMS`. Do not use macOS Downloads paths.
2. **Gate settings** — read [visual-acceptance-policy.md](visual-acceptance-policy.md) and copy [`evaluation/gate-settings.json`](../../evaluation/gate-settings.json) into `loop.json` before implementation. The operator delegated policy 1.0: fixed frame/window/local/alpha rules plus material review and reference controls. Defining the gate does not pass existing fixtures. Sampled or incomplete evidence cannot certify full-window fidelity.
3. **Browser** — Chrome or Chromium via `evaluation/harness/chrome.ts`. Set `GVR_CHROME` (or `CHROME_PATH`) when discovery fails (typical on Linux cloud images). Record the resolved binary and version in `environment.json`.
4. **Commands** (repo root): `npx tsx evaluation/harness/run-pipeline.ts`, then `npx tsx evaluation/harness/drive-browser.ts` (after `cd evaluation && npm install` once for harness deps if needed).

For both native routes, run `npx tsx evaluation/harness/check-round-trip.ts` after the pipeline, then `npx tsx evaluation/harness/prepare-fidelity.ts --full` before the browser driver. The default driver jobs are sampled and cannot certify a full-window pass. `--full-exact` captures full windows for the affected/previously exact imports while retaining known partial conversion fixtures as explicit sampled diagnostics; those fixtures' visual coverage remains NOT_RUN. Do not quietly exclude them from the accepted corpus. Save each stage before regenerating scratch evidence. Browser failures retain partial results and Chrome logs and cannot count as passed.

## What belongs in Git

| Commit to Git | Store outside Git |
| --- | --- |
| Reports and stop/continuation records | Full frame captures and videos (optional locally under `evidence/captures/`) |
| Manifests, source hashes and implementation pins | Dependencies, caches and build outputs |
| Machine-readable results and gate settings (`evaluation/gate-settings.json`) | Large source snapshots (`working-tree.patch`, full trees) |
| Harness code and small regression fixtures | Scratch `evaluation/evidence/` |
| Canonical fidelity corpus (`fixtures/corpus/`) | |
| Representative failure images (`evidence/failure-samples/`) | |

Private-repo policy: the fidelity corpus is committed under `fixtures/corpus/` so every agent checkout can run the pipeline. Scratch copies under `docs/evaluations/*/evidence/sources/` and `evaluation/evidence/` remain gitignored.

## Workflow and program handoff

Use [the single fidelity prompt](lottie-fidelity-loop-prompt.md) and [report template](templates/fidelity-report.md). [Authoring workflow 1.1](../workflows/authoring-loop.md) has its own [index/continuation](../authoring/README.md) and [corpus registry](../../evaluation/authoring/README.md). A sample with actual per-sample verification/provenance may enter refinement independently of corpus fidelity completion. Every changed imported candidate is re-verified; shared defects return as fidelity findings with preserved attempt history. Follow the [immutable program rules](../authoring/sample-registry-spec.md), retaining generated originals and exact hash-associated evidence.

New fidelity reports omit authoringPassed. Historical results, statuses, snapshots and run links are preserved. The legacy Word generator `evaluation/harness/write-report.mjs` contains fixed baseline judgements/narrative; use it only to reproduce that historical report, never for a new certification. New runs use the live report template with current evidence and policy. Program/source hash metadata in the pipeline identifies bytes without assigning canonical revisions or verification.

Integration of remote a850d65 preserves its animated-fill diagnostics and shape paint-order correction. The merged implementation requires fresh full-corpus verification; prior run visual results apply to their original recorded snapshots. See integration-push.json.
