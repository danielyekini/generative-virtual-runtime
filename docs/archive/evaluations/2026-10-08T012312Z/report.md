# Fidelity evaluation 2026-10-08T012312Z

Stop: **budget-exhausted**. **fidelityPassed: false; authoringPassed: not evaluated.**

The operator delegated definition of the visual gate and subsequently authorised pushing completed changes to main. Policy 1.0 is frozen in `evaluation/gate-settings.json` and `docs/evaluations/visual-acceptance-policy.md`: RGB distance >24, maximum hot fraction 0.5% per frame and 0.2% window mean, 32px offset tile foreground gate 10%, mandatory material review, opaque #101014 alpha and trustworthy repeated references. These are conservative engineering defaults, not proof that existing output passes. Tolerances were not widened.

Compared with newest prior run 2026-10-08T010229Z; initial HEAD 65c04025082f8f88ae6e7af7f39427c585064745. All ten original corpus hashes remain unchanged. Accepted LOT-00–07 and inherited LOT-03 source-budget quarantine remain; SVG is excluded. Published MotionScript/Scene IR remain 0.5.0, wire 0.2. Only emitter package release advances to 0.1.1; no syntax or semantic contract release.

## Verified corrections

Emitter duration formatting previously independently rounded fractional timing values, producing three Wave INVALID_TIMING diagnostics. Exact JavaScript temporal doubles now survive emission, so Wave compiles with zero diagnostics. Direct and emitted/compiled resolved states agree for seven non-quarantined fixtures over scheduled frames, key boundaries, segment midpoints and deterministic shuffled seeks under numeric 0.001 and colour 1/255 tolerances. This resolves the measured emitter defect, not whole-corpus visual fidelity.

Browser capture now uses separate temporary Chrome profiles, process-group cleanup and bounded CDP requests that reject on socket closure. Partial evidence and browser logs survive interruptions. Two interrupted schedules were preserved before a complete bounded schedule succeeded. Reused-profile interference is a hypothesis, not a proven root cause; OOM counters were zero. The pipeline records current released language versions rather than legacy defaults, and reference playback explicitly enables subframes.

181 tests including registry conformance pass; repository and strict harness typechecks pass. Original fixtures were hash-verified. Browser execution uses Chromium 151.0.7922.173, lottie-web 5.13.0 canvas, DPR 1 and matched timestamps/backgrounds. Both native routes were captured separately. Reference timing control and repeat identity are recorded independently from visual status.

| Fixture | Scheduled frames per route | Window mean hot fraction | Visual status |
| --- | --- | --- | --- |
| LOT-00 | 240/240 + 3 extras | 0.000126067 | Numeric pass; material review NOT_RUN, VISUAL_UNVERIFIED |
| LOT-01 | 121/121 + 6 extras | 0.002259711 | FAIL |
| LOT-06 | 24/24 + 3 extras | 0.019119325 | FAIL |
| LOT-07 | 150/150 + 5 extras | 0.053073708 | FAIL |
| LOT-02 / LOT-04 | Sampled only | Not certified | Conversion partial; sampled FAIL |
| LOT-05 | Sampled only | Not certified | Partial conversion; repeated reference differs, BLOCKED |
| LOT-03 | Reference diagnostic samples | Not certified | Source-budget quarantine; reference UNVERIFIED, BLOCKED |

Wave q50 remains 0.0516125. Full-window contact sheets were inspected and show stroke/paint discrepancies. Source groups have two strokes but the current parser retains one: production import's `exact` label is explicitly overridden by KNOWN_LOSS for corpus acceptance. Numeric direct/compiled agreement does not excuse source interpretation loss. Other failing fixtures were retained. Raster captures cover every scheduled frame of the four previously exact imports and selected boundary/subframe checks; every IR boundary/midpoint is covered semantically, not necessarily rasterised. No full corpus visual pass or performance certification is claimed.

## Attempts, stop and continuation

Four cycles were counted, with cause history retained in loop.json: gate definition, emitter timing, harness recovery and one multiple-stroke correction attempt. The stroke attempt was not fully verified when the wall-time overrun was discovered on resumption. Its source patch remains locally retained and the entire attempt was reverted to the last browser-verified checkpoint. No new implementation cycle was started after discovering expiry. Final verification and stop recording followed. The invocation exceeded its 60-minute limit; this is recorded rather than treating elapsed time as a fresh budget.

Next: phase A, `visual.wave.multipleStrokeLoss`, one attempt consumed, two remaining. Establish ordered native stroke passes using existing geometry, verify shared morph/group transforms/trim, then compare source/direct/compiled full windows and regressions. Transformed gradient coordinate-space differences are suspected separately and require evaluated source-state evidence before any representation decision. LOT-06 detail/pose and LOT-01 confetti remain subsequent findings. LOT-05 reference nondeterminism needs isolation; it cannot pass meanwhile. Phase D remains gated and no canonical authoring or training samples were produced.

Initial, gate-baseline and emitter-verified source/evidence stages are preserved locally, including interrupted captures. Final source bytes and hashes are archived separately. Git stores summaries, reproducible harness, policies, source manifests and representative images; full captures, archives and interrupted bulk evidence remain outside Git. The continuation pin names the final tested snapshot, not the original initial tree. Publishing commits is authorised by the operator's later instruction.
