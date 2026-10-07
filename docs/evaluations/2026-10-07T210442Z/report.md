# Evaluation 2026-10-07T210442Z

**Stop: budget-exhausted** — profile not a pass. Operator-named Phase A/B visual causes partially fixed. See `stop.json`.

This report describes this revision only. It is not the specification.

## Pins

| Item | Value |
| --- | --- |
| Git HEAD | `797a4301656d3382296f208823cf2acf18bcb48f` (dirty — solid placement fix in `source-snapshot/`) |
| Ancestor clean commit with languages | `904bc78` (pathMorph 0.3.0 + gradientStroke 0.4.0) |
| MotionScript | **0.4.0** (wire `0.2`) |
| Scene IR | **0.4.0** (wire `0.2`) |
| Packages | schema/compiler/runtime/canvas-renderer/motionscript-emitter/format-lottie/format-import-core all `0.1.0` |
| Reference | lottie-web 5.13.0, `goToAndStop(frame, true)`, DPR 1, background `#101014`, Chrome 154.0.8037.98 |
| Tolerances | number `0.001`, color `1/255`, pixel Euclidean RGB beyond `24` (inspection) |
| Compared with | `2026-10-07T194646Z` |
| Operator override | Visual discrepancies on Wave / Punches / Celebrations before `compositing.matte` |

## Causes attempted

### 1. `paint.gradientStroke` (attempts 1) — improved

Published MotionScript / Scene IR **0.4.0** (wire stays `"0.2"`, gated by `requiredCapabilities` / `requires` containing `paint.gradientStroke`). Lottie `gs` was incorrectly lowered as fill gradients; rings became filled blobs. Now `gs` → stroke with gradient colour; `gf` remains fill-only; sibling solid `st` drops when `gs` is present.

| Fixture | Before (`2026-10-07T194646Z` visual) | After |
| --- | --- | --- |
| LOT-07 q50 | meanDistance 102.624, fractionBeyond **0.551** | meanDistance 19.476, fractionBeyond **0.146** |
| LOT-07 start | meanDistance 121.179, fractionBeyond **0.630** | meanDistance 2.865, fractionBeyond **0.060** |

Import stays exact (27/0/0/0). Native draws stroke rings; residual mid-window error remains (morph/timing), so LOT-07 is **not** a visual pass.

### 2. `lottie.solidPlacement` (attempts 1) — improved

Importer-only correction (no language bump). Solid rectangles were placed at `(−sw/2, −sh/2)` under a layer whose pivot cancels when unrotated, so White Solid covered only the top-left quadrant of LOT-06. Solids now occupy layer-local `[0, sw] × [0, sh]`.

| Fixture | Before | After |
| --- | --- | --- |
| LOT-06 start | meanDistance 264.186, fractionBeyond **0.682** | meanDistance 2.529, fractionBeyond **0.023** |
| LOT-06 q50 | meanDistance 264.291, fractionBeyond **0.685** | meanDistance 3.206, fractionBeyond **0.030** |

Background/letterbox mismatch is largely gone. Residual pose mismatch (guard vs punch) remains — **not** a visual pass. Sample strip: `evidence/failure-samples/LOT-06-q50-strip.png`.

## Before / after vs 2026-10-07T194646Z (Lottie import)

| Fixture | Prior fidelity / counts | This run |
| --- | --- | --- |
| LOT-00 | exact 33/0/0/0 | **exact** 33/0/0/0 |
| LOT-01 | exact 194/0/0/0 | **exact** 194/0/0/0 |
| LOT-02 | partial 51/0/0/9 | partial 52/0/0/9 |
| LOT-03 | failed (512 KiB) | failed (quarantined) |
| LOT-04 | partial 88/0/0/17 | partial 88/0/0/17 |
| LOT-05 | partial 25/0/0/12 | partial 25/0/0/12 |
| LOT-06 | exact 67/0/0/0 | **exact** 67/0/0/0 |
| LOT-07 | exact 23/0/0/0 | **exact** 27/0/0/0 (gradient-stroke notes) |

`npm test` (162) and `npm run typecheck` passed.

## Visual fidelity confirmation

Browser capture ran. Route was production compiled scenes. Pixel threshold 24 is inspection-only.

### LOT-00 (confirmed — unchanged)

| Sample | meanDistance | fractionBeyond |
| --- | --- | --- |
| start | 1.093 | 0.00010 |
| q25 | 1.078 | 0.00007 |
| q50 | 1.073 | 0.00014 |
| q75 | 1.074 | 0.00012 |
| near_end | 1.080 | 0.00020 |

### LOT-01 (import exact; visual not a pass — unchanged this run)

| Sample | meanDistance | fractionBeyond |
| --- | --- | --- |
| start | 0.840 | 0.00375 |
| q25 | 7.025 | **0.03295** |
| q50 | 4.764 | **0.02162** |
| q75 | 1.218 | 0.00580 |
| near_end | 0.000 | 0.00000 |

Mid-cycle confetti discrepancy remains. Operator-named; not attempted this invocation after two visual causes.

### LOT-06 (import exact; visual not a pass — background improved)

| Sample | meanDistance | fractionBeyond |
| --- | --- | --- |
| start | 2.529 | 0.02320 |
| q25 | 3.705 | 0.02909 |
| q50 | 3.206 | 0.02960 |
| q75 | 3.925 | 0.03037 |
| near_end | 2.529 | 0.02320 |

Background/fit mismatch fixed. Pose/morph residual remains.

### LOT-07 (import exact; visual not a pass — stroke rings restored)

| Sample | meanDistance | fractionBeyond |
| --- | --- | --- |
| start | 2.865 | 0.05998 |
| q25 | 17.691 | **0.13754** |
| q50 | 19.476 | **0.14551** |
| q75 | 18.592 | **0.14249** |
| near_end | 6.650 | 0.08742 |

Filled-blob bug fixed. Mid-window morph/colour residual remains.

## Next

Next Baseline: dirty snapshot under this run (solid placement) or a clean commit that includes it. Compare with `2026-10-07T210442Z`. Suggested next cause: `visual.midCycle` on LOT-01 (Celebrations), or residual LOT-06 pose / LOT-07 morph, unless the operator returns to `compositing.matte`.
