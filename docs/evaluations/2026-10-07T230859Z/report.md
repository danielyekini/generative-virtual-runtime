# Fidelity run 2026-10-07T230859Z

**VISUAL_UNVERIFIED. fidelityPassed: false. authoringPassed: not evaluated.**

Fetched main at 8b052901d4a9399104be6d1376dc7468197f97ab. Work used /workspace/gvr-main, an isolated worktree, preserving the original checkout and local run 2026-10-07T224852Z. Latest remote-index measurement is 2026-10-07T220358Z; main removed the later blocked run. Both facts are recorded explicitly. No commit or push. Sources match all ten corpus checksums; declared profile remains LOT-00 through LOT-07 with LOT-03's inherited quarantine. SVG captures in the initial default-harness run are ancillary, not accepted-profile results.

## Actual rendering and visual inspection

Generated reference, direct-IR and compiled-IR PNGs with lottie-web 5.13.0, Chromium 151.0.7922.173 (Debian 13), DPR 1, matched seeks and #101014 background. This browser differs from historical Chrome 154; before/after comparisons below use the same current browser. Visually inspected Wave q50, baseline-worst frame 16 and final-worst frame 2; Punches q50; Celebrations q50; and the two reference-control frames. Reference/native/diff strips show materially wrong ring poses before correction, much closer poses after, and remaining ring differences. Punches still has missing arm/face details and a wrong pose. Celebrations still has small confetti displacement. These observations are not visual PASS claims.

The initial synthetic timing control failed because its animated property omitted cubic handles. Adding valid handles changed the control's inspection fraction from 0 to 0.08; both control images visibly show the expected box movement. The driver now closes its DevTools socket and saves the control PNGs. Initial failed-control captures are retained and not treated as trustworthy acceptance evidence.

## Confirmed correction

Shape-group transforms were flattened to static defaults. For Wave's layer_1.Shape_5 at frame 75, no rotation track existed and the native matrix contained only the static 25-degree layer rotation, rather than the source's combined 205 degrees. Parser/lowering now preserve group position, scale, rotation and opacity using existing tracks, with first-key base values and explicit unsupported animated-anchor diagnostics. The small animated_group_transform fixture checks independent expected geometry and opacity under shuffled seeks and MotionScript round trip. Preserved easing work from the preceding local run remains applied. This is an importer correction; no new language release or wire representation is introduced.

| Fixture | q50 before | q50 after | Coverage |
| --- | ---: | ---: | --- |
| Wave | 14.5475% | 5.16125% | All 150 scheduled frames, plus 5 boundary/subframe samples, both native routes |
| Punches | 1.93191% | 1.93191% | 5 samples, both routes |
| Celebrations | 0.43625% | 0.43625% | 5 samples, both routes |
| LOT-00 | 0.01432% | 0.01432% | 5 samples, both routes |

Percentages count pixels above inspection RGB distance 24, not an acceptance threshold. Wave's worst full-window frame improved from frame 16 at 15.135625% to frame 2 at 6.108125%. Direct and compiled native PNGs are byte-identical at all 170 paired times. Repeated reference PNGs across those route preparations are also identical. This is repeatability evidence within this session, not calibration of acceptable cross-rasteriser differences. Other supported fixture samples show no image regression from the group correction.

## Verification and limits

174 tests, registry checks and typecheck pass. Two implementation cycles in this resumed invocation: reference-control correction and shape-group animation correction, each attempt 1; earlier easing attempt history is retained. Budget is 60 minutes, eight cycles, three attempts per cause. No matte, rendering-coverage or authoring work was added.

The fetched gate-settings.json still expressly says VISUAL_UNVERIFIED and requires aggregate/local-region acceptance rules. Its whileUnverified instruction permits diagnosis and strip review, not profile certification. No thresholds were widened or invented. Wave is full-window for this diagnostic capture; the remaining corpus is not. Alpha was composited on the declared background, not independently certified. Full-window captures, shuffled-seek semantic checks and material-content review for the whole corpus remain required.

Wave also has a confirmed source interpretation loss: layers 1/2 have both solid and gradient strokes, and layer 3 has two gradient strokes; the importer keeps one path stroke. Its raw import label exact is therefore not accepted as no-known-loss conversion evidence for the whole fixture. Remaining geometry/paint/timing contributions have not all been isolated against evaluated reference nodes. Punches and Celebrations remain open findings.

## Stop and continuation

Stop: design-escalation for the uncalibrated acceptance gate, with residual correctness findings retained. Calibrate/freeze a useful visual gate from repeat references and predeclared acceptable rasterisation controls; isolate Wave's remaining multi-paint and geometry discrepancies, then Punches and Celebrations. Do not start idiomatic authoring or new coverage until the declared fidelity profile passes.

Initial, pre-group and final implementation snapshots and hashes are retained in source-snapshot/. Before/after captures and raw results live under evidence/. Full images are local evidence, not intended bulk Git changes. measurements.json and results.json summarize the findings without duplicating every raw result.
