# Engine run a19397e7: E010 bounded spatial graphics (planar 2.5D layers)

Run `a19397e7-a982-42b7-b4d4-2a8194f8ec71`, 2 November 2026. [Issue #29](https://github.com/danielyekini/generative-virtual-runtime/issues/29).
Base: `ffde4e0d0246455e72aa9a746f9a8491445bf928`. Branch: `claude/charming-goldberg-2mo5u5`.
Route: no untriaged requests; review clock last run before E026 (one terminal run since), so no orchestrator pass was due.

## Result

- **Decision:** [docs/decisions/engine/spatial-graphics.md](../../../decisions/engine/spatial-graphics.md).
  - Compared affine/skew, planar 2.5D and an optional 3D backend against Crane/Home/Echo.
  - Chose planar 2.5D layers, projected into ordinary `ResolvedFrame` draw items.
  - The contract fixes:
    - coordinate conventions;
    - surface placement and hinges;
    - perspective/orthographic cameras (default camera = 2D identity);
    - exact/projected/approximate modes;
    - two-sided faces;
    - plane-test depth order per compositing scope;
    - fail-closed bounds;
    - unprojection for input;
    - the portable IR sketch and old-reader rejection via `space.planar25d`.
- **Prototype:** `packages/runtime/src/spatial.ts`, exported from `@gvr/runtime`:
  - `projectSpatialFrame`, `orbitCamera`, `unprojectToSurface`, `surfaceDragDelta`, `projectSurfacePoint`;
  - Mat4 helpers.
- **No language change:** no version bump or registry claim.
- **Child:** E028 [#107](https://github.com/danielyekini/generative-virtual-runtime/issues/107), versioning, Candidate.

## Verification

- `packages/runtime/src/spatial.test.ts`: 24 tests (listed in the decision's Evidence section).
- **Production renderer:** `node docs/runs/engine/a19397e7-a982-42b7-b4d4-2a8194f8ec71/spatial-render.cjs <outdir>`.
  - Uses an esbuild bundle of `spatial-render.entry.ts`, `CanvasRenderer`, and headless Chromium at 640×360, DPR 1.
  - **PASS 9/9** hit probes, with pixel colours matching the expected faces.
  - Crane flap at 0/45° shows ivory (255,248,230); at 135/180° it shows the reverse blue (89,115,179).
  - Home front wall and door are hit from the front view; the back wall is hit when viewed from behind.
  - Echo nearest word is hit, and the depth order is W4 < … < W0.
  - Images: `crane-*.png`, `home-*.png`, `echo.png`, `contact-sheet.png`. Probe data: `spatial-render.json`.
- **Full gate:** `npm run verify` **exit 0** on the final tree.
  - 377 Vitest tests in 51 files.
  - All typechecks and the Studio build.
  - IR manifest.
  - 33 ops tests.
  - Capability index fresh.

## Not done / follow-ups

E028 owns:

- language/IR wiring;
- runtime frame integration;
- the pointer-aware drag hook;
- observation diagnostics;
- the Studio sample.

Near-plane clipping, intersection splitting and seams belong to E016 (#35). Lighting and meshes are out of bound (see the decision's revisit triggers).

**Project board:** this cloud session has no Project write access. Intended statuses are stated in the issue bodies: E010 Done, E028 Candidate.
