# Engine run 6b578e8c: E030 space.planarSeams (MotionScript / Scene IR 0.15.0)

Run `6b578e8c-3dbc-4984-b1f9-094499bb1945`, 2 November 2026. [Issue #112](https://github.com/danielyekini/generative-virtual-runtime/issues/112).
Base: `e5a6e2c` (after E033 `audio.generative` 0.14.0; rebased from `4849441`, so this release is 0.15.0). Branch: `claude/nifty-cannon-f2esde`.

## Result

- **Language:** MotionScript / Scene IR **0.15.0**, capability `space.planarSeams`, wire `"0.2"`.
  An opt-in `seams { split; epsilon; maxFragments; edge a b; }` block inside `spatialLayer`
  lowers to `SpatialLayerDefinition.seams`. No new reserved word. Validator, accept,
  emitter round-trip and compile diagnostics are covered.
- **Runtime:** `projectSpatialFrame` splits true intersections by clipping each surface's
  item-space outline against the other's view-space plane, which is exact. Fragments
  re-enter the plane-test topological sort and keep their node id, appearance and hit
  target. The render tree expands in place. Unsplittable surfaces (stroke, text, image,
  open) and over-budget pairs fall back to the E010 warning. Declared seams report
  `SPATIAL_SEAM_OPEN` when the view-space edges stop coinciding. Host `orderHint`
  breaks ties only. Layers without `seams` are unchanged.
- **Design corrections vs the E016 prototype** (recorded in the decision note):
  - The cut is the exact plane line, not a centroid bisector.
  - Shared edges no longer suppress intersections, because concave L-panels can share
    an edge and still cross.
  - The fragment budget applies per layer.
  - Fragments overlap the cut by 0.5 px in paint only, which removes anti-aliased hairlines.
- **Studio:** `spatial-seams` sample shows crossing panels, a hinge seam, and a drifting
  flap that opens its declared seam.
- **Emitter fix (found here):** `formatAngle` accepted degree roundings within 1e-9
  relative, so radian hinge angles (-0.9) drifted on round-trip. It now emits `deg` only
  when the value parses back bit-exactly, and `rad` otherwise.

## Verification

- `npm run verify` exit 0 (456 Vitest tests; all typechecks; Studio build; IR manifest;
  33 ops tests; capability index).
- Pixel oracle (unprojected nearest hit vs `hitTest`): 0 mismatches for perspective,
  orthographic, concave shared-edge and three-way crossings. Unsplit frames show mismatches.
- Production CanvasRenderer in headless Chromium
  (`packages/runtime/scripts/seams-studio-probe.mts`, `GVR_CHROME` set to
  Playwright Chromium 1243): `seams-split` 0/1604 wrong pixels, `seams-unsplit`
  586/1604, `seams-drift` 0/1604 plus `SPATIAL_SEAM_OPEN`.
  See `seams-studio-probe.json` and the PNGs next to this summary.

## Not done / follow-ups

Authored or animated order channels, boolean union, near-plane clipping and splitting of
stroked or text surfaces remain outside 0.14.0 (version notes). Human visual judgement
is not required: pixel-level evidence covers the claim.
