# Evaluation 2026-10-07T213004Z

**Stop: budget-exhausted** — profile not a pass. Phase B `geometry.animatedTrim` (0.5.0) removed the lingering red trim path on LOT-01. Absolute visual gate remains **VISUAL_UNVERIFIED** (inspection threshold only). See `stop.json`.

This report describes this revision only. It is not the specification.

## Pins

| Item | Value |
| --- | --- |
| Git HEAD | `441e2048e79ca94e668beec6e8e9c69cf4ed0b3a` (dirty — animated trim + prior arc-length spatial fix in `source-snapshot/`) |
| Compared with | `2026-10-07T211534Z` |
| MotionScript | **0.5.0** (wire `0.2`) |
| Scene IR | **0.5.0** (wire `0.2`) |
| Packages | schema/compiler/runtime/canvas-renderer/motionscript-emitter/format-lottie/format-import-core all `0.1.0` |
| Reference | lottie-web 5.13.0, `goToAndStop(frame, true)`, DPR 1, background `#101014`, Chrome 154.0.8037.98 |
| Tolerances | number `0.001`, color `1/255`, pixel Euclidean RGB beyond `24` (**inspection only**; no aggregate acceptance rule) |
| Observation | sampled `start/q25/q50/q75/near_end` |
| Wall budget | 60 minutes; implement cycles used: 1 |

## Cause attempted

### 1. `visual.midCycle.residual` (attempts 1) — improved

**Hypothesis (confirmed):** LOT-01's red squiggle is a `tm` trim path. The importer treated animated 1D key values `s: [n]` as non-numbers and fell back to defaults (`end=100`), baking a static full-path trim. Reference animates start/end 0→100 so the stroke is gone by mid/late cycle; native kept drawing it. q75 content area ratio was **4.68** with a large centroid delta.

**Fix:**

1. Unwrap one-element Lottie scalar arrays in `readScalarProperty`.
2. Lower animated `tm` to `trim.start` / `trim.end` / `trim.offset` tracks.
3. Publish **geometry.animatedTrim** in MotionScript / Scene IR **0.5.0** (wire stays `0.2`).
4. Runtime merges sampled trim channels over static `geometryOperators`.
5. `trimCommands` interpolates cut points at the window ends (partial windows no longer collapse to empty).

| Fixture | Sample | Before (`2026-10-07T211534Z`) | After |
| --- | --- | --- | --- |
| LOT-01 | q25 | mean 1.789, fractionBeyond **0.01066** | mean 1.204, fractionBeyond **0.00763** |
| LOT-01 | q50 | mean 2.181, fractionBeyond **0.01098** | mean 1.418, fractionBeyond **0.00698** |
| LOT-01 | q75 | mean 0.800, fractionBeyond **0.00426** | mean **0.037**, fractionBeyond **0.00026** |
| LOT-01 | start / near_end | unchanged class | unchanged |

q75 content area ratio **4.68 → 0.90**; q50 centroid delta magnitude dropped sharply. Residual confetti pose/AA mismatch remains — **not** a visual pass.

## Before / after vs 2026-10-07T211534Z (Lottie import)

| Fixture | Prior | This run |
| --- | --- | --- |
| LOT-00 | exact 33/0/0/0 | **exact** (unchanged class) |
| LOT-01 | exact 194/0/0/0 | **exact** 197/0/0/0 (trim tracks) |
| LOT-02 | partial | partial (unchanged class) |
| LOT-03 | failed (quarantined) | failed (quarantined) |
| LOT-04 | partial | partial |
| LOT-05 | partial | partial |
| LOT-06 | exact | **exact** |
| LOT-07 | exact | **exact** |

`npm test` (168) and `npm run typecheck` passed. No import regression on previously exact fixtures. LOT-00 / LOT-07 pixel metrics unchanged.

## Visual fidelity confirmation

Browser capture ran. Route: production compiled scenes. Pixel threshold 24 is inspection-only. **VISUAL_UNVERIFIED** for absolute profile PASS.

### LOT-00 (confirmed — unchanged)

Unchanged from prior run (mean ~1.07–1.09, fractionBeyond ≤ 0.0002).

### LOT-01 (import exact; visual improved, not a pass)

| Sample | meanDistance | fractionBeyond |
| --- | --- | --- |
| start | 0.840 | 0.00375 |
| q25 | 1.204 | **0.00763** |
| q50 | 1.418 | **0.00698** |
| q75 | 0.037 | **0.00026** |
| near_end | 0.000 | 0.00000 |

Strips: `evidence/failure-samples/LOT-01-q25-strip.png`, `LOT-01-q50-strip.png`, `LOT-01-q75-strip.png`.

### LOT-06 / LOT-07

LOT-07 unchanged. LOT-06 fractionBeyond moved slightly lower (same residual class; not claimed as a dedicated fix).

## Authoring

Phase D not started (fidelity gate not met).

## Next

Next Baseline: dirty snapshot under this run (animated trim 0.5.0 + prior arc-length spatial) or a clean commit that includes both. Compare with `2026-10-07T213004Z`. Suggested next cause: remaining LOT-01 mid-cycle confetti pose/AA, or LOT-07 mid-window, or LOT-06 pose, or `compositing.matte`. Optionally calibrate aggregate visual acceptance thresholds before claiming a profile PASS.
