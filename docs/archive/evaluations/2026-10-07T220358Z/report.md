# Evaluation 2026-10-07T220358Z

**Stop: budget-exhausted** — profile not a pass. Phase A follow-up from [Diagnose LOT-01 residual](958973f8-9dd5-45e6-872c-9da0aca76c0f): 3D spatial arc-length, stroke caps, first-key base (plus prior AE-near easing fix). Absolute visual gate remains **VISUAL_UNVERIFIED**. See `stop.json`.

This report describes this revision only. It is not the specification.

## Pins

| Item | Value |
| --- | --- |
| Git HEAD | `f9ec51e02d10786210f13285b983ef6db8290b53` (dirty — spatial Z + stroke/base/easing in `source-snapshot/`) |
| Compared with | `2026-10-07T215328Z` |
| MotionScript | **0.5.0** (wire `0.2`) |
| Scene IR | **0.5.0** (wire `0.2`) |
| Packages | schema/compiler/runtime/canvas-renderer/motionscript-emitter/format-lottie all `0.1.0` |
| Reference | lottie-web 5.13.0, `goToAndStop(frame, true)`, DPR 1, background `#101014`, Chrome 154.0.8037.98 |
| Tolerances | number `0.001`, color `1/255`, pixel Euclidean RGB beyond `24` (**inspection only**) |
| Observation | sampled `start/q25/q50/q75/near_end` |
| Wall budget | 60 minutes; implement cycles used: 1 |

## Cause attempted

### 1. `visual.midCycle.confetti.q50` / spatial Z (attempts 1) — improved

**Hypothesis (confirmed):** lottie-web measures spatial bezier length in **XYZ** when `to`/`ti` are 3-component; GVR dropped Z and sampled 2D-only. Celebrations has **106/133** spatial segments with nonzero Z. Secondary: solid strokes ignored `lc`/`lj` (butt vs round); animated position base used `{0,0}` so pre-first-key pose was `−anchor`.

**Fix (no language bump — completing published `geometry.spatialCurve`):**

1. Optional tangent `z` on Scene IR spatial out/in; Motionscript `(x, y, z)` spatial vectors; emitter round-trip.
2. `spatialCubicPoint` includes Z in chord length when present; returns XY only.
3. Importer keeps `to[2]` / `ti[2]`.
4. Solid stroke `lc`/`lj`/`ml` lowered.
5. Animated vec2 base seeded from first keyframe.

(Prior dirty AE-near easing diagonal fix from `2026-10-07T215328Z` is included in this snapshot.)

| Fixture | Sample | Before (`2026-10-07T215328Z`) | After |
| --- | --- | --- | --- |
| LOT-01 | start | beyond **0.00375**, mean 0.840 | beyond **0.00048**, mean **0.053** |
| LOT-01 | q25 | beyond **0.00614**, mean 0.970 | beyond **0.00309**, mean **0.511** |
| LOT-01 | q50 | beyond **0.00561**, mean 1.114 | beyond **0.00456**, mean **0.898** |
| LOT-01 | q75 | 0.00026 | 0.00021 |

start / q25 centroids ≈ **0.03 / 0.3** px. q50 still ≈ **(−2.3, −5.9)** px — residual remains. **Not** a visual pass.

## Before / after (Lottie import)

LOT-00/01/06/07 stay **exact**. `npm test` (172) and `npm run typecheck` passed. LOT-00/06/07 pixel metrics unchanged.

## Visual gate

**VISUAL_UNVERIFIED**. Strips under `evidence/failure-samples/`.

## Authoring

Phase D not started.

## Next

Pin dirty snapshot under this run (or a clean commit). Next cause: remaining LOT-01 q50 pose, LOT-07 mid-window, LOT-06 pose, `compositing.matte`, or visual gate calibration.
