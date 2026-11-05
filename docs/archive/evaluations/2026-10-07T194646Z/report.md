# Evaluation 2026-10-07T194646Z

**Stop: blocker** — profile not a pass. Landed `geometry.pathMorph` (MotionScript / Scene IR 0.3.0). Next cause is `compositing.matte`. See `stop.json`.

This report describes this revision only. It is not the specification.

## Pins

| Item | Value |
| --- | --- |
| Git HEAD | `71f6e95100a773373e5cf1064a38eff48ab29a5f` (dirty tree — see `source-snapshot/`) |
| Subject | Allow evaluation pins to match ancestor commits. |
| Pin ancestor check | `920f1e2` is ancestor of HEAD |
| MotionScript | **0.3.0** (wire `0.2`) |
| Scene IR | **0.3.0** (wire `0.2`) |
| Packages | schema/compiler/runtime/canvas-renderer/motionscript-emitter/format-lottie/format-import-core all `0.1.0` |
| Reference | lottie-web 5.13.0, `goToAndStop(frame, true)`, DPR 1, background `#101014`, Chrome 154.0.8037.98 |
| Tolerances | number `0.001`, color `1/255`, pixel Euclidean RGB beyond `24` (inspection) |
| Compared with | `2026-10-07T183125Z` |

Corpus fixture SHA-256 values are in `manifest.json` and `loop.json`. Implementation hashes for dirty files are in `source-snapshot/files.json`.

## Causes attempted

### 1. `geometry.pathMorph` (attempts 1) — improved

Published MotionScript / Scene IR **0.3.0** (wire stays `"0.2"`, gated by `requiredCapabilities` / `requires` containing `geometry.pathMorph`). Added `valueType: "path"` tracks on channel `commands`, component-wise morph sampling, MotionScript path literals, and Lottie lowering for matching-topology animated `sh` (including `frame.s[0].v` key shape).

| Fixture | Before (`2026-10-07T183125Z`) | After |
| --- | --- | --- |
| LOT-06 | partial 43/0/0/24 | **exact** 67/0/0/0 |
| LOT-07 | partial 18/0/0/5 | **exact** 23/0/0/0 |

`npm test` and `npm run typecheck` passed. LOT-00 and LOT-01 remained import-exact (no regression).

## Before / after vs 2026-10-07T183125Z (Lottie import)

| Fixture | Prior fidelity / counts | This run |
| --- | --- | --- |
| LOT-00 | exact 33/0/0/0 | **exact** 33/0/0/0 |
| LOT-01 | exact 194/0/0/0 | **exact** 194/0/0/0 |
| LOT-02 | partial 51/0/0/9 | partial 51/0/0/9 |
| LOT-03 | failed (512 KiB) | failed (quarantined) |
| LOT-04 | partial 88/0/0/17 | partial 88/0/0/17 |
| LOT-05 | partial 25/0/0/12 | partial 25/0/0/12 |
| LOT-06 | partial 43/0/0/24 | **exact** 67/0/0/0 |
| LOT-07 | partial 18/0/0/5 | **exact** 23/0/0/0 |

Counts are `exact/approximated/dropped/unsupported`.

## Fixtures now exact (import)

- **LOT-00** — production exact (unchanged).
- **LOT-01** — production exact (unchanged).
- **LOT-06** — production exact (new this run); 24 path-morph tracks.
- **LOT-07** — production exact (new this run); 5 path-morph tracks.

LOT-03 remains quarantined over the 512 KiB ceiling.

Import `exact` is not a visual pass by itself. Visual numbers below are from `evidence/render-results.json` (lottie-web 5.13.0, DPR 1, Euclidean RGB beyond 24).

## Visual fidelity confirmation

Browser capture ran. Reference and native statuses were PASS for all four import-exact fixtures. Route was production compiled scenes.

### LOT-00 (confirmed — unchanged vs prior)

| Sample | meanDistance | fractionBeyond |
| --- | --- | --- |
| start | 1.093 | 0.000102 |
| q25 | 1.078 | 0.000065 |
| q50 | 1.073 | 0.000143 |
| q75 | 1.074 | 0.000116 |
| near_end | 1.080 | 0.000201 |

LOT-00 sampled window remains visually agreed inside the inspection threshold.

### LOT-01 (import exact; visual not a pass)

| Sample | meanDistance | fractionBeyond |
| --- | --- | --- |
| start | 0.840 | 0.00375 |
| q25 | 7.025 | **0.03295** |
| q50 | 4.764 | **0.02163** |
| q75 | 1.218 | 0.00580 |
| near_end | 0.000 | 0.00000 |

Mid-cycle pixel error remains material. Do **not** treat LOT-01 as visually exact for the declared profile.

### LOT-06 (import exact; visual not a pass)

| Sample | meanDistance | fractionBeyond |
| --- | --- | --- |
| start | 264.186 | **0.68184** |
| q25 | 265.350 | **0.68771** |
| q50 | 264.291 | **0.68549** |
| q75 | 265.453 | **0.68941** |
| near_end | 264.186 | **0.68184** |

Native draws the boxer and morph paths, but the sampled window is **not** visually agreed (large letterbox / background mismatch against the reference frame). Import exact alone is not a visual pass.

### LOT-07 (import exact; visual not a pass)

| Sample | meanDistance | fractionBeyond |
| --- | --- | --- |
| start | 121.179 | **0.62960** |
| q25 | 111.206 | **0.59352** |
| q50 | 102.624 | **0.55139** |
| q75 | 111.444 | **0.59453** |
| near_end | 120.627 | **0.62926** |

Native draws filled morph blobs; reference shows stroke rings. Likely residual `paint.gradientStroke` / stroke-vs-fill gap. Sampled window is **not** visually agreed.

## Next

Next invocation: Baseline pinned per `docs/evaluations/implementation-pin.json` (dirty snapshot under this run, or a later clean commit that includes this work). Compare with `2026-10-07T194646Z`. Next cause: `compositing.matte` for LOT-02 / LOT-05 unless the operator names another. Do not reopen `geometry.pathMorph` unless named.
