# Bounded spatial graphics: planar 2.5D layers (E010)

Decision: 2 November 2026. [Issue #29](https://github.com/danielyekini/generative-virtual-runtime/issues/29).
Decision + runtime demonstrator. No MotionScript / Scene IR version bump and no
registry claim: `@gvr/runtime` `projectSpatialFrame` and its helpers are a
host-level prototype (`packages/runtime/src/spatial.ts`, tests in
`spatial.test.ts`). Language wiring is E028
([#107](https://github.com/danielyekini/generative-virtual-runtime/issues/107)).

## Requirement

M5 teaching stories need bounded spatial depth: a two-sided sheet that folds
along creases (Crane), walls, a door and a roof seen under a slow orbit (Home),
and words receding into a canyon under a dolly (Echo). Today all three are baked.
The Home story projects every part into keyed 2D paths with 191 `commands`
tracks, using 83% of the 512 KiB source budget. Its painter order is tuned by
hand for one orbit, with no back faces
(`docs/authoring/stories/from-blueprint-to-home/proposal.md`).

Spatial output must stay deterministic and headless-renderable. It must compose
with persistent entities (0.6.0+), drawable bindings (0.7.0) and input (0.10.0):
**what is painted must be what is hit**.

## Alternatives

1. **Affine/skew only** (extend the 2D `Transform` with skew). This is the
   strongest current-system option. Canvas-native, exact, and hit-testing already
   inverts affine matrices. An orthographic hinge is affine: `scale.x = cos θ`
   plus skew. But it has no foreshortening, dolly or depth order. Every fold,
   wall and roof stays author-computed, and the reverse face would need a
   hand-switched node. It solves Echo's uniform scaling (already possible) but
   not Home or the Crane. Rejected as the contract. Its exact case survives as
   the orthographic and picture-parallel modes below.
2. **Planar 2.5D layers** (chosen). Ordinary 2D drawables become planar
   surfaces with rigid 3D placement, hinges and a layer camera. Projection
   produces ordinary resolved draw items: projected paths, or exact affine
   matrices where the projection is affine. Painter order inside a layer is
   resolved from plane tests. Renderers and `hitTest` are unchanged.
3. **Optional 3D backend** (WebGL meshes, z-buffer, lighting). Exact occlusion
   and intersections, but renderer-specific. It needs GPU picking or a parallel
   CPU ray-caster for input, a mesh/material IR and asynchronous resources. It
   also has nondeterministic rasterisation across GPUs, and headless parity
   needs a software GL. Rejected for M5. Its revisit trigger is listed below.

## Contract (implementation-bound)

- **Coordinates.** x right, y down, z away from the viewer (right-handed).
  Plane space is the 2D layout: each item's `logicalMatrix` output, z = 0.
  Rotations are radians by the right-hand rule. For z, that is clockwise on
  screen, matching 2D `rotation`.
- **Surface placement.** `local = H × T(position) × T(pivot) × Rz × Ry × Rx × S × T(−pivot)`,
  where `H` is an optional hinge: a rotation about the in-plane line `from → to`
  in parent coordinates. `parent` composes another surface's placement first
  (rigid attachment: a flap on a sheet, a door on a wall). Parents must be in
  the same layer and must not form cycles.
- **Camera.** Perspective or orthographic. View = `Rᵀ × T(−eye)` with
  `R = Ry(yaw) × Rx(pitch) × Rz(roll)`.
  - Perspective maps a view point to `c + f·(x, y)/z`.
  - Orthographic maps it to `c + zoom·(x, y)`.
  - The default eye `(width/2, height/2, −f)`, with `f` = 1000, reproduces the
    2D frame exactly for unplaced surfaces. A layer is therefore additive and
    old frames are untouched.
  - `orbitCamera` provides target, distance, yaw and pitch. Dolly changes the
    distance or eye; zoom changes `f`.
- **Projection modes.**
  - `affine-exact`: orthographic, or a plane parallel to the picture plane. The
    item keeps its geometry kind (text, image and gradients stay exact). Only
    its matrix changes. This covers Echo: upright words at depth `z` scale by
    exactly `f/(f+z)`.
  - `projected`: a tilted plane under perspective. Geometry flattens to a path
    in logical coordinates, with 16 segments per curve, quarter-ellipse or
    rounded corner (the same bound as hit-testing). Fill rules are preserved.
    Stroke width and gradient geometry follow the local area scale at the
    surface centre; Canvas 2D has no variable-width strokes.
  - `affine-approx`: text or image on a tilted perspective plane uses the
    affine tangent of the projection at its centre. It reports the info
    diagnostic `SPATIAL_AFFINE_APPROXIMATION`.
- **Two-sided surfaces.** Facing comes from the 3D normal `tx × ty` against the
  eye ray; 2D mirroring inside the layout does not flip it. The reverse face
  paints `back` (else the front appearance). `backface: "hidden"` removes the
  item, so it neither paints nor hits.
- **Depth order.** Order is resolved per layer and per compositing scope, and
  never across isolated scopes. Surfaces refill their original paint slots, so
  non-surface items such as captions keep theirs. The render tree is rebuilt in
  the same order, keeping painting and hit-testing consistent. For each pair
  with overlapping projected bounds, plane-side tests (Newell) add "A paints
  before B" constraints:
  - A lies entirely on the far side of B's plane, or B entirely on the near side
    of A's plane.
  - Coplanar overlapping pairs keep authored order: a door on its wall, a
    folded flap on its sheet, decals.
  - A topological sort then breaks ties by farther mean depth first, then
    authored order.
  - Cycles break by depth and report `SPATIAL_ORDER_CYCLE`.
  - Interpenetrating pairs report `SPATIAL_SURFACES_INTERSECT`. There is no
    splitting; E016 owns seams and splitting.
- **Input.** `hitTest` runs over the projected frame unchanged. The topmost
  painted item is the nearest correctly ordered surface, and back-culled or
  near-culled surfaces never hit. `unprojectToSurface` intersects the eye ray
  with the surface plane to recover plane and original local coordinates.
  `surfaceDragDelta` gives the exact in-plane drag delta between two pointer
  positions. The current `dragSpace` hook receives no pointer position, so a
  single affine Jacobian would be wrong under perspective. E028 extends the hook.
- **Bounds and resources (fail closed).** Defaults are 1024 surfaces per frame,
  4096 flattened vertices per surface and 65,536 per frame. Exceeding them
  reports `SPATIAL_LIMIT_EXCEEDED`, and the affected surfaces (or all spatial
  layers, for the surface cap) are not drawn rather than drawn wrongly.
  Pairwise sorting is O(n²) up to 256 surfaces per scope; beyond that it falls
  back to depth only (`SPATIAL_DEPTH_ONLY_SORT`). A surface crossing the
  perspective near plane (default 1) is culled whole (`SPATIAL_NEAR_CULLED`);
  there is no clipping in this bound. Invalid cameras are rejected
  (`SPATIAL_INVALID_CAMERA`), and their layer is left in 2D. The layer adds no
  decoded resources.
- **Determinism.** Output is a pure function of the frame, layers and limits.
  Repeated projection is deep-equal.

## Portable IR and old-reader rejection (for E028)

E028 adds Scene IR `spatialLayers` (layer id, root group, camera) and a
per-node `surface`: parent, 3D position/pivot/rotation/scale, hinge, `back`
and `backface`. Animatable scalar channels cover z, the x/y rotations, the hinge
angle and the camera values. All of this is gated by the new capability
`space.planar25d` in MotionScript / Scene IR 0.12.0, with wire `"0.2"`.
Readers before 0.12 reject the unknown capability token, as with every additive
release since 0.3.0, and validators reject the unknown keys. The validator
enforces the static bounds above: surface count and hinge-line non-degeneracy,
plus finite and positive camera values.

Projection happens at frame resolution, so `ResolvedFrame` stays the
renderer/host contract. Entities, bindings and the input overlay act on the 2D
layout and on surface channels. Exclusive channel ownership (E002) extends to
the new channels unchanged.

## Evidence (this run)

- `spatial.test.ts`: 24 tests.
  - Default cameras reproduce 2D exactly (perspective and orthographic), and
    projection is deterministic.
  - Crane: a negative hinge lifts the flap toward the viewer and paints it on
    top. Past 90° it shows the reverse colour. At 180° it lies exactly mirrored
    across the crease, coplanar and on top: it is hit, and the uncovered base is
    bare. Folding away paints the flap under the base. Orthographic folds stay
    affine-exact.
  - Home: with an orbiting camera, occlusion overrides declaration order, and
    the front wall and door are hit. Orbiting behind swaps the order and shows
    the reverse face. Opening the door exposes the wall to hits. Projected
    corners match the analytic projection, and unprojection round-trips with
    exact floor drag deltas.
  - Echo: deeper words are uniformly smaller, upright, exact and painted
    behind, and a dolly matches the perspective ratio. Tilted text reports the
    approximation.
  - Failure cases: near cull, hidden back faces, stroke scaling, surface and
    vertex limits, intersection reports, parent cycles, unknown parents,
    duplicates, invalid cameras, and scope-local sorting with the render tree
    equal to the draw list.
- The production `CanvasRenderer` in headless Chromium rendered Crane fold
  angles 0/45/135/180°, Home front/door-open/behind and the Echo recession.
  Hit probes passed 9/9, and pixel colours matched the expected faces.
  Evidence is in `docs/runs/engine/a19397e7-a982-42b7-b4d4-2a8194f8ec71/`.

## Critical pass

- *Streaming.* Projection reads whatever frame is presented. Surfaces added or
  removed after a seal are just present or absent draw items. A layer naming a
  surface that is not painted in this frame is skipped silently: hidden or
  removed items are normal lifetime, not errors.
- *Cancellation and dispose.* The projection is stateless, so there is nothing
  to cancel. The input lifetime rules (E007) apply to projected targets, because
  culled surfaces are absent draw items.
- *Compatibility.* There is no wire, language or registry change. Frames without
  layers are returned unchanged (deep-equal), and default cameras are the identity for z = 0.
- *Known limits.*
  - Whole-surface near culling (no clipping).
  - Painter order cannot represent interpenetration or long overlapping cycles.
    Both are reported, and E016 owns splitting.
  - Strokes and gradients under projected perspective use a centre scale.
  - Text and images on tilted perspective planes are affine approximations.
  - The text depth box uses the em-box estimate.
  - No lighting or shading: the Crane's contact shadows stay authored 2D.
  - No mesh solids: a house is panels, not volumes.

## Child work

- **E028** ([#107](https://github.com/danielyekini/generative-virtual-runtime/issues/107)):
  version `space.planar25d`. This covers Scene IR/MotionScript 0.12.0, the
  registry, conformance, runtime frame integration, the pointer-aware drag hook,
  spatial diagnostics in observation, and a Studio sample with browser probes.
- E016 (#35) takes over seam-free shared edges and intersection splitting on top
  of this order contract. E011 (#30) physics adopts these coordinate
  conventions for any scoped 3D.

## Revisit

- If a story needs solid meshes, lighting, more than 1024 surfaces, or exact
  intersections that splitting cannot bound, reopen the 3D-backend alternative
  as a separate renderer behind the same `ResolvedFrame`/hit contract. It would
  need its own CPU ray-cast hit path.
- If near-plane culling visibly fails a camera move, add polygon clipping to
  the projection before raising any limit.
