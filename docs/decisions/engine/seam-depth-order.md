# Dynamic depth/paint order and seam-free surfaces (E016)

Decision: 2 November 2026. [Issue #35](https://github.com/danielyekini/generative-virtual-runtime/issues/35).
Decision + narrow runtime demonstrator. No MotionScript / Scene IR version bump
and no registry claim: `@gvr/runtime` `classifySurfacePair` / `splitIntersectingPair`
/ `resolveSeams` are a host-level prototype (`packages/runtime/src/seams.ts`,
tests in `seams.test.ts`). Language wiring is the follow-up implementation item
named below.

## Requirement

M5 spatial stories (Crane folds, Home orbit, shared wall/door edges) need
compositing that matches what the eye should see when planar surfaces meet or
cross. E010 already resolves plane-test paint order and **reports**
`SPATIAL_SURFACES_INTERSECT` / `SPATIAL_ORDER_CYCLE` without splitting. Teaching
content also wants animated ordering (bring-to-front, staged reveals) that must
not silently replace occlusion correctness. Scope: depth ties, two-sided panels,
shared edges / merge / union, and contour/rotation-aware morph counterexamples.

## Alternatives

1. **Report-only (E010 status quo).** Strongest current-system option. Correct
   when surfaces do not interpenetrate; false positives at hinge creases; true
   crossings stay wrong under the painter. Rejected as the sole contract once
   stories need exact contact lines.
2. **Animated `zIndex` / paint-order tracks as the occlusion model.** Cheap and
   familiar from 2D tools. Rejected for spatial correctness: a hand-authored
   order cannot track an orbiting camera or a folding hinge. Retained only as a
   **tie-break** inside coplanar / undecided pairs (see contract).
3. **Full 3D BSP / triangle mesh splitting with a depth buffer.** Exact for
   volumetric scenes but reopens the E010-rejected 3D backend (GPU picking,
   mesh IR, headless GL). Rejected for M5.
4. **Classify seams + split projected polygons on true intersections**
   (chosen). Keep E010 plane tests as the correctness source. Classify each
   overlapping pair as `ordered`, `coplanar-tie`, `shared-edge` or
   `intersect`. Shared edges (hinge creases / declared seams) suppress false
   intersection reports and keep authored/parent order. True intersections
   clip each projected outline along the projected plane–plane line and emit
   ordered fragments so the painter is exact without a z-buffer. Animated order
   channels may break ties only, never override a decided plane-test edge.

## Contract (implementation-bound)

- **Compositing correctness vs animated ordering.** Plane-test constraints from
  E010 are authoritative for occlusion. An animated order / `zIndex` channel
  may reorder only within a `coplanar-tie` or undecided pair. Applying it across
  a decided occlusion edge is a diagnostic (`SEAM_ORDER_OVERRIDE_REJECTED` in
  the prototype), not silent success.
- **Depth ties.** Coplanar overlapping surfaces keep authored paint slots
  (E010). Two-sided panels use facing + `backFill` already; seams do not invent
  a third face.
- **Shared edges.** A pair shares an edge when both projected outlines contain
  a segment that matches (endpoints within epsilon, either direction), or when
  a hinge `from→to` coincides with both outlines. Shared-edge pairs are not
  intersections; they paint by parent/authored order (child/decal after base).
- **Merge / union.** Prototype exposes `unionProjected` for coplanar outlines
  that should paint as one silhouette (optional authoring aid). It does not
  invent topology in Scene IR yet.
- **Intersections.** When both surfaces straddle each other's planes, compute
  the view-space plane–plane line, project it to 2D, and Sutherland–Hodgman
  clip each polygon into fragments on either side. Fragments inherit appearance
  and are ordered by the fragment centroid's plane test against the other
  surface. Caps: `maxFragmentsPerPair` (default 8); excess reports
  `SEAM_SPLIT_LIMIT` and keeps the E010 warning behaviour.
- **Contour / rotation-aware morph (counterexamples, not features).**
  - A keyed 2D morph that *looks* continuous across a fold but whose path
    endpoints drift off the hinge is a shared-edge failure: seams require
    geometric coincidence, not visual similarity.
  - Rotating one panel through another without splitting produces the existing
    `SPATIAL_SURFACES_INTERSECT` warning; with `resolveSeams` it becomes
    fragments instead of a lie.
  - Animated bring-to-front during an orbit cannot fix a crossing: the
    override is rejected when plane tests disagree.
- **Determinism.** Classification and clipping are pure functions of the
  projected surfaces and epsilon. No RNG.
- **Compatibility.** Default `projectSpatialFrame` behaviour is unchanged.
  Hosts opt into `resolveSeams` until language wiring lands.

Out of scope: soft shadows at seams, curved surface intersections, volumetric
meshes, and animated spatial track channels already deferred from 0.12.0.

## Critical pass

- *Streaming.* Seam resolution runs on the presented frame only; late-added
  surfaces classify on the next project.
- *Cancellation.* Stateless; nothing to dispose beyond the input frame.
- *Failure.* Over-limit splits fail closed to the E010 report path.
- *Ownership.* No new writer class; draw items remain ordinary projected
  geometry.

## Child work

- **E030** ([#112](https://github.com/danielyekini/generative-virtual-runtime/issues/112)):
  version seam/split support (capability token TBD, e.g. `space.planarSeams`) on
  top of `space.planar25d`, registry, conformance, runtime default or opt-in
  wiring, Studio counterexample sample.

## Revisit

- If fragment counts explode for teaching scenes, reconsider a software depth
  buffer behind the same `ResolvedFrame` contract rather than growing clip
  limits.
- If product needs boolean union as authoring syntax (not just a host helper),
  open a language decision rather than overloading seams.
