# Fidelity baseline 2026-10-08T010229Z

Stop: **design-escalation**. **fidelityPassed: false; authoringPassed: not evaluated.**

The visual acceptance gate is uncalibrated: no approved aggregate or local-region/material-content bounds exist. The pasted request explicitly says to stop for calibration in this case. No implementation, language, registry, package, fixture or authoring changes were made. No commit or push. A 60-minute / eight-cycle / three-attempt budget was established; zero implementation cycles consumed.

Compared with the dynamically selected newest run `2026-10-07T230859Z`. Initial HEAD `65c04025082f8f88ae6e7af7f39427c585064745` is clean and descends from the prior tested implementation pin `d492dcbc50d55cad22b8c3a43b9f5cbcfd783a81`. Intervening changes are evaluation metadata and failure images, not execution-source changes. Initial and final source archives preserve actual bytes; final metadata changes are pinned separately. MotionScript and Scene IR remain 0.5.0, wire 0.2. Package versions and registry hash are in manifest.json.

## Baseline evidence

All ten corpus checksums pass when checked from fixtures/corpus (the documented root invocation fails because checksum paths are corpus-relative). Accepted profile remains LOT-00–07, with inherited LOT-03 size-budget quarantine. SVG captures from the default harness are ancillary and excluded. No failing fixture was removed.

174 tests, including three registry checks, pass; typecheck passes. Sandboxed tsx CLI IPC failed and caused one CLI test failure; the full suite passes with local IPC available. The pipeline succeeds through Node's tsx loader. Raw environment.json subprocess fields containing EPERM and legacy language constants are superseded by the independently checked pins in manifest.json, without altering raw evidence.

Chromium 151.0.7922.173 / lottie-web 5.13.0 canvas, DPR 1, matched seeks and #101014 background. Lottie timing control passes (fractionBeyond 0.08). Browser results are capture/execution statuses, not fidelity acceptance. Five samples per Lottie fixture were captured; the full-window gate was not run. LOT-03 reference remains UNVERIFIED and its native route diagnostic, so it cannot pass. Full resource readiness, alpha and repeatability certification remain incomplete.

| Fixture | Conversion | Round trip | Frame coverage |
| --- | --- | --- | --- |
| LOT-00 | exact | SAMPLED_AGREEMENT | 5/5 sampled |
| LOT-01 | exact | SAMPLED_AGREEMENT | 5/5 sampled |
| LOT-02 | partial | SAMPLED_AGREEMENT | 5/5 sampled |
| LOT-03 | QUARANTINED | NOT_RUN | 5/5 sampled |
| LOT-04 | partial | SAMPLED_AGREEMENT | 5/5 sampled |
| LOT-05 | partial | SAMPLED_AGREEMENT | 5/5 sampled |
| LOT-06 | exact | SAMPLED_AGREEMENT | 5/5 sampled |
| LOT-07 | KNOWN_LOSS | FAIL | 5/5 sampled |

Six fixtures have direct/compiled resolved-state agreement at the five baseline timestamps in reverse seek order under numeric 0.001 and colour 1/255 tolerances. Structural object/array contents, matrices, geometry and paint are compared recursively. This is sampled evidence, not complete key-boundary/segment-midpoint or full-window verification. The exact check script and outcomes are retained in evidence/.

Wave's emitted program fails with **three INVALID_TIMING diagnostics**. At least one confirmed rounding discrepancy is Group10 opacity: emitted start 1233.333333ms plus duration 3766.66667ms exceeds 5000ms by 0.000003ms. The compiler's partially returned scene is not an accepted route. Wave browser output uses imported IR; no Wave MotionScript fidelity is claimed. This newly observed correctness issue is recorded with zero attempts and needs narrow emitter/compiler diagnosis after calibration. Historical reports claiming paired native agreement do not override this reproducible result.

## Visual findings and retained causes

Wave q50 fractionBeyond is 0.0516125, matching the previous diagnostic baseline. Its q50 strip was visually inspected and retains paint/outline differences. Punches q50 is approximately 0.0193191 and Celebrations q50 0.0043625. These are inspection measurements above RGB distance 24, not acceptance bounds or evidence of progress in this no-change run. Previous full-window Wave evidence is not counted as current full-window coverage.

Wave retains the previously confirmed multiple-stroke loss. The registry's gradientStroke exact scope explicitly drops a sibling solid stroke; that scope cannot certify no-known-loss conversion for this whole fixture. Raw import exact is therefore recorded separately from conversionStatus KNOWN_LOSS. LOT-02/04/05 remain partial with unsupported semantics. Previous conversion successes and previous visual observations are retained independently; no new visual success is claimed.

## Next action

Calibrate and approve aggregate, local-region/material-content and alpha/background acceptance rules using repeat references and predeclared acceptable rasterisation controls, then freeze them before implementation. Resume supported correctness work: the Wave round-trip timing rejection and retained paint loss, followed by Punches detail/pose and Celebrations confetti findings. Prior cause attempts remain carried in loop.json. Phase D stays unevaluated until corpus fidelity passes.

Full raw evidence, immutable source fixtures, timing samples, outcomes, logs and snapshots are retained for continuation. Captures cover reference plus compiled IR for six imported fixtures and reference plus direct IR for Wave; separate direct-route PNGs for the six compiled fixtures were not captured. Missing routes/windows are not reported as zero error. No training samples or canonical authoring candidates were created.
