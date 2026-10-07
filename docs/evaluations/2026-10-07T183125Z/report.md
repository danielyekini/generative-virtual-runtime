# Evaluation 2026-10-07T183125Z

**Stop: blocker** — profile not a pass. Next cause is `geometry.pathMorph` (path track valueType). See `stop.json`.

This report describes this revision only. It is not the specification.

## Pins

| Item | Value |
| --- | --- |
| Git HEAD | none (no commits on main) |
| MotionScript | 0.2.0 (wire `0.2`) |
| Scene IR | 0.2.0 (wire `0.2`) |
| Packages | schema/compiler/runtime/canvas-renderer/motionscript-emitter/format-lottie/format-import-core all `0.1.0` |
| Reference | lottie-web 5.13.0, `goToAndStop(frame, true)`, DPR 1, background `#101014`, Chrome 154.0.8037.98 |
| Tolerances | number `0.001`, color `1/255`, pixel Euclidean RGB beyond `24` (inspection) |
| Compared with | `2026-10-07-baseline` |

Corpus fixture SHA-256 values are in `manifest.json` and `loop.json`.

## Causes attempted

### 1. `effect.gaussianBlur.static` (attempts 2) — improved

Lowered one static Gaussian Blur (ty 29) onto `GroupCompositing.effect` with radius `blurriness * 0.3` (lottie-web 5.13.0). Blank-named Repeat Edge accepted.

| Fixture | Before (this run start) | After |
| --- | --- | --- |
| LOT-02 | exact 46 / unsupported 14 | exact 51 / unsupported 9 (5 static blurs exact) |
| LOT-04 | exact 83 / unsupported 22 | exact 88 / unsupported 17 (5 static blurs exact; 17 animated remain) |

Importer-only relative to language: `effects.blur` already in Scene IR 0.2.0. Registry + conformance updated.

### 2. `stroke.width.nonPositive` (attempts 1) — improved

Omit Lottie strokes with static width `<= 0` so validation no longer rejects fill-only shapes.

Unblocked LOT-01 past `Stroke width must be positive`; next failure was track timing.

### 3. `track.startOutsideDuration` (attempts 2) — improved

Clamp root tracks to `[0, durationMs]` with remapped keys; skip zero-length visibility show/hide pairs.

| Fixture | Before | After |
| --- | --- | --- |
| LOT-01 | failed, no scene | **exact**, scene + 95 tracks |
| LOT-05 | failed, no scene | **partial**, scene (12 matte unsupported remain) |

## Before / after vs 2026-10-07-baseline (Lottie import)

| Fixture | Baseline fidelity / counts | This run |
| --- | --- | --- |
| LOT-00 | degraded 27/6/0/0 | **exact** 33/0/0/0 |
| LOT-01 | failed | **exact** 194/0/0/0 |
| LOT-02 | partial 20/16/0/18 | partial 51/0/0/9 |
| LOT-03 | failed (512 KiB) | failed (quarantined) |
| LOT-04 | partial 3/0/0/2 | partial 88/0/0/17 |
| LOT-05 | partial 2/0/0/1 | partial 25/0/0/12 (scene now) |
| LOT-06 | partial 14/39/0/24 | partial 43/0/0/24 |
| LOT-07 | partial 18/0/0/11 | partial 18/0/0/5 |

Counts are `exact/approximated/dropped/unsupported`. Baseline was Motionscript/Scene IR 0.1; this run is on 0.2 wire with additional importer work beyond this loop’s three causes.

## Fixtures now exact (import)

- **LOT-00** — production exact; pipeline PASS through runtime.
- **LOT-01** — production exact; pipeline PASS through runtime (new this run).

LOT-03 remains quarantined over the 512 KiB ceiling.

Import `exact` is not a visual pass by itself. Visual numbers below are from `evidence/render-results.json` (lottie-web 5.13.0, DPR 1, Euclidean RGB beyond 24).

## Visual fidelity confirmation

Browser capture ran. Reference and native statuses were PASS for both exact fixtures. Route was production compiled scenes.

### LOT-00 (confirmed improved vs baseline)

| Sample | meanDistance | fractionBeyond | Baseline fractionBeyond (same harness) |
| --- | --- | --- | --- |
| start | 1.093 | 0.000102 | 0.000102 |
| q25 | 1.078 | 0.000065 | **0.131** |
| q50 | 1.073 | 0.000143 | 0.000143 |
| q75 | 1.074 | 0.000116 | **0.144** |
| near_end | 1.080 | 0.000201 | 0.010 |

Quarter-cycle pan mismatch from the baseline report is gone. LOT-00 visual agreement is confirmed for this revision inside the inspection threshold across the sampled window.

### LOT-01 (import exact; visual not a pass)

| Sample | meanDistance | fractionBeyond |
| --- | --- | --- |
| start | 0.840 | 0.00375 |
| q25 | 7.025 | **0.03295** |
| q50 | 4.764 | **0.02163** |
| q75 | 1.218 | 0.00580 |
| near_end | 0.000 | 0.00000 |

LOT-01 now draws against a working reference (baseline had no production scene). Mid-cycle pixel error remains material. Do **not** treat LOT-01 as visually exact for the declared profile.

## Tests

`npm test` (154) and `npm run typecheck` passed. `packages/schema/src/registry.test.ts` passed. Browser capture ran (`drive-browser.ts`).

## Continuation

Next invocation: new Baseline pinned per `docs/evaluations/implementation-pin.json` (git `4e4af51` or a dirty-tree snapshot), compare with `2026-10-07T183125Z`, start cause `geometry.pathMorph` for LOT-06/LOT-07 unless the operator names another. Path morph is a new language version entry, not a package-only bump. Do not reopen completed causes above unless named.
