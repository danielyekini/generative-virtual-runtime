# Evaluation 2026-10-07T215328Z

**Stop: budget-exhausted** — profile not a pass. Phase A `visual.midCycle.confetti` improved by preserving mild AE temporal easings. Absolute visual gate remains **VISUAL_UNVERIFIED** (inspection threshold only). See `stop.json`.

This report describes this revision only. It is not the specification.

## Pins

| Item | Value |
| --- | --- |
| Git HEAD | `f9ec51e02d10786210f13285b983ef6db8290b53` (dirty — AE-near easing fix in `source-snapshot/`) |
| Compared with | `2026-10-07T213004Z` |
| MotionScript | **0.5.0** (wire `0.2`) |
| Scene IR | **0.5.0** (wire `0.2`) |
| Packages | schema/compiler/runtime/canvas-renderer/motionscript-emitter/format-lottie/format-import-core all `0.1.0` |
| Reference | lottie-web 5.13.0, `goToAndStop(frame, true)`, DPR 1, background `#101014`, Chrome 154.0.8037.98 |
| Tolerances | number `0.001`, color `1/255`, pixel Euclidean RGB beyond `24` (**inspection only**; no aggregate acceptance rule) |
| Observation | sampled `start/q25/q50/q75/near_end` |
| Wall budget | 60 minutes; implement cycles used: 1 |

## Cause attempted

### 1. `visual.midCycle.confetti` (attempts 1) — improved

**Hypothesis (confirmed):** `easingFromHandles` treated handles within 0.05 of AE’s `(0.167,0.167)–(0.833,0.833)` as linear even when `y ≠ x`. Celebrations had **17** such mild easings (max `|y−x|` ≈ 0.049). Mid-cycle confetti pose drifted while endpoints still matched.

**Fix (no language bump):** classify linear only when both handles lie on the `y = x` diagonal (`|ox−oy|` and `|ix−iy|` &lt; 0.01). Mild AE-near curves become `easing.cubicBezier`. Fixture `easing_ae_near_linear` covers the regression.

| Fixture | Sample | Before (`2026-10-07T213004Z`) | After |
| --- | --- | --- | --- |
| LOT-01 | q25 | mean 1.204, fractionBeyond **0.00763** | mean **0.970**, fractionBeyond **0.00614** |
| LOT-01 | q50 | mean 1.418, fractionBeyond **0.00698** | mean **1.114**, fractionBeyond **0.00561** |
| LOT-01 | start / q75 / near_end | unchanged class | unchanged |

q25 content centroid delta ≈ **(−0.30, +0.25)** px; area ratio ≈ **0.999**. Residual at q25 is mostly edge AA. q50 still shows mild pose drift (centroid ≈ (−2.9, −5.5) px; area ratio ≈ 0.93). **Not** a visual pass.

After the fix Celebrations keyframe easings are `linear` 7 / `cubic` 128 / terminal `none` 97 — no remaining named-ease collapses on this fixture.

## Before / after vs 2026-10-07T213004Z (Lottie import)

| Fixture | Prior | This run |
| --- | --- | --- |
| LOT-00 | exact | **exact** (unchanged) |
| LOT-01 | exact 197/0/0/0 | **exact** 197/0/0/0 |
| LOT-02 | partial | partial |
| LOT-03 | failed (quarantined) | failed (quarantined) |
| LOT-04 | partial | partial |
| LOT-05 | partial | partial |
| LOT-06 | exact | **exact** |
| LOT-07 | exact | **exact** |

`npm test` (169) and `npm run typecheck` passed. No import or pixel regression on previously exact fixtures (LOT-00/06/07 fractionBeyond unchanged at every sample).

## Visual fidelity confirmation

Browser capture ran. Route: production compiled scenes. Pixel threshold 24 is inspection-only. **VISUAL_UNVERIFIED** for absolute profile PASS.

### LOT-00 (confirmed — unchanged)

Unchanged (fractionBeyond ≤ 0.0002).

### LOT-01 (import exact; visual improved, not a pass)

| Sample | meanDistance | fractionBeyond |
| --- | --- | --- |
| start | 0.840 | 0.00375 |
| q25 | 0.970 | **0.00614** |
| q50 | 1.114 | **0.00561** |
| q75 | 0.037 | 0.00026 |
| near_end | 0.000 | 0.00000 |

Strips: `evidence/failure-samples/LOT-01-q25-strip.png`, `LOT-01-q50-strip.png`.

### LOT-06 / LOT-07

Unchanged class — not visual passes.

## Authoring

Phase D not started (fidelity gate not met).

## Next

Next Baseline: dirty snapshot under this run (AE-near easing diagonal fix) or a clean commit that includes it. Compare with `2026-10-07T215328Z`. Suggested next cause: remaining LOT-01 q50 pose residual, LOT-07 mid-window, LOT-06 pose, `compositing.matte`, or visual gate calibration (q25 pose is near-matched; aggregate thresholds still undefined).
