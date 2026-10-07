# Evaluation 2026-10-07T211534Z

**Stop: blocker** — profile not a pass. Phase A `visual.midCycle` improved via arc-length spatial sampling. Absolute visual gate remains **VISUAL_UNVERIFIED** (inspection threshold only). See `stop.json`.

This report describes this revision only. It is not the specification.

## Pins

| Item | Value |
| --- | --- |
| Git HEAD | `441e2048e79ca94e668beec6e8e9c69cf4ed0b3a` (dirty — arc-length spatial fix in `source-snapshot/`) |
| MotionScript | **0.4.0** (wire `0.2`) |
| Scene IR | **0.4.0** (wire `0.2`) |
| Packages | schema/compiler/runtime/canvas-renderer/motionscript-emitter/format-lottie/format-import-core all `0.1.0` |
| Reference | lottie-web 5.13.0, `goToAndStop(frame, true)`, DPR 1, background `#101014`, Chrome 154.0.8037.98 |
| Tolerances | number `0.001`, color `1/255`, pixel Euclidean RGB beyond `24` (**inspection only**; no aggregate acceptance rule) |
| Compared with | `2026-10-07T210442Z` |
| Observation | sampled `start/q25/q50/q75/near_end` |

## Cause attempted

### 1. `visual.midCycle` (attempts 1) — improved

**Hypothesis (confirmed):** `geometry.spatialCurve` sampled position cubics with the raw bezier parameter. After Effects / lottie-web advance eased progress by **arc length** along the cubic (`buildBezierData` / `segmentLength * perc`). Celebrations has 95 spatial position tracks with large tangents, so mid-cycle poses drifted while endpoints still matched.

**Fix (no language bump):** `spatialCubicPoint` in `@gvr/schema` (150-segment polyline, matching lottie-web `defaultCurveSegments`); runtime `sampleKeyframes` uses it. Registry `geometry.spatialCurve` support marked supported with conformance tests. Completing a published 0.2.0 capability.

| Fixture | Sample | Before (`2026-10-07T210442Z`) | After |
| --- | --- | --- | --- |
| LOT-01 | q25 | mean 7.025, fractionBeyond **0.03295** | mean 1.789, fractionBeyond **0.01066** |
| LOT-01 | q50 | mean 4.764, fractionBeyond **0.02162** | mean 2.181, fractionBeyond **0.01098** |
| LOT-01 | start | 0.840 / 0.00375 | unchanged |
| LOT-01 | near_end | 0 / 0 | unchanged |

Content-centroid delta at q25 shrank from about (−25, +14) px to (−7, +6) px. Residual is mostly native-heavier halos / outline mismatch — **not** a visual pass.

## Before / after vs 2026-10-07T210442Z (Lottie import)

| Fixture | Prior | This run |
| --- | --- | --- |
| LOT-00 | exact 33/0/0/0 | **exact** 33/0/0/0 |
| LOT-01 | exact 194/0/0/0 | **exact** 194/0/0/0 |
| LOT-02 | partial 52/0/0/9 | partial 52/0/0/9 |
| LOT-03 | failed (quarantined) | failed (quarantined) |
| LOT-04 | partial 88/0/0/17 | partial (unchanged class) |
| LOT-05 | partial 25/0/0/12 | partial (unchanged class) |
| LOT-06 | exact 67/0/0/0 | **exact** 67/0/0/0 |
| LOT-07 | exact 27/0/0/0 | **exact** 27/0/0/0 |

`npm test` (164) and `npm run typecheck` passed. No import regression on previously exact fixtures.

## Visual fidelity confirmation

Browser capture ran. Route: production compiled scenes. Pixel threshold 24 is inspection-only. **VISUAL_UNVERIFIED** for absolute profile PASS (no documented aggregate/local-region gate).

### LOT-00 (confirmed — unchanged)

| Sample | meanDistance | fractionBeyond |
| --- | --- | --- |
| start | 1.093 | 0.00010 |
| q25 | 1.078 | 0.00007 |
| q50 | 1.073 | 0.00014 |
| q75 | 1.074 | 0.00012 |
| near_end | 1.080 | 0.00020 |

### LOT-01 (import exact; visual improved, not a pass)

| Sample | meanDistance | fractionBeyond |
| --- | --- | --- |
| start | 0.840 | 0.00375 |
| q25 | 1.789 | **0.01066** |
| q50 | 2.181 | **0.01098** |
| q75 | 0.800 | 0.00426 |
| near_end | 0.000 | 0.00000 |

Strip: `evidence/failure-samples/LOT-01-q25-strip.png` (baseline strip retained as `baseline-LOT-01-q25-strip.png`).

### LOT-06 / LOT-07 (unchanged class — not visual passes)

LOT-06 pose residual and LOT-07 mid-window residual match the prior run’s magnitude (minor LOT-06 noise only).

## Authoring

Phase D not started (fidelity gate not met).

## Next

Next Baseline: dirty snapshot under this run (arc-length spatial fix) or a clean commit that includes it. Compare with `2026-10-07T211534Z`. Suggested next cause: `visual.midCycle.residual` on LOT-01, or LOT-07 mid-window / LOT-06 pose, or `compositing.matte`. Optionally calibrate aggregate visual acceptance thresholds before claiming a profile PASS.
