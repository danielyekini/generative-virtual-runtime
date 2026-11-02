# Engine run f5e38467: E028 space.planar25d (MotionScript / Scene IR 0.12.0)

Run `f5e38467-ceab-4489-ae7e-63ec5b776299`, 2 November 2026. [Issue #107](https://github.com/danielyekini/generative-virtual-runtime/issues/107).
Base: `c1ab450` (E010). Branch: `engine/e028-planar25d-spatial-layers`.

## Result

- **Language:** MotionScript / Scene IR **0.12.0**, capability `space.planar25d`, wire `"0.2"`.
  - `spatialLayer` declarations lower to scene `spatialLayers` (camera + surfaces).
  - Validator, accept, CREATE_SCENE header, freeze-after-seal, emitter round-trip.
- **Runtime:** `AnimationRuntime` / `StreamingRuntime` project layers through `projectSpatialFrame` on every `evaluate`; spatial diagnostics on `lastDiagnostics`.
- **Input:** `dragPlaneDelta` on `InputSession` / `createSceneInputSession` uses `surfaceDragDelta` for surface `dragTranslate`.
- **Studio:** Crane / Home / Echo fixtures in the playground examples; Chromium probes via `packages/runtime/scripts/spatial-studio-probe.mts`.
- **Registry:** `space.planar25d` compiler + runtime **supported**. Animated spatial track channels remain outside this release (version notes).

## Verification

- `npm run verify` exit 0 (388 Vitest tests; typechecks; Studio build; IR manifest; ops; capability index).
- Studio probes (headless Chrome + production `CanvasRenderer`): **PASS 4/4**
  - `crane-45` flap hit=Flap
  - `home-front` wall=Front, door=Door
  - `echo` W0 hit=W0
  - Images: `crane-45.png`, `home-front.png`, `echo.png`; data: `spatial-studio-probe.json`.

## Not done / follow-ups

Animated spatial channels (surface z/rotations/hinge angle and spatial camera as track targets) are deferred per the 0.12.0 version notes; would need a later language bump if claimed.
