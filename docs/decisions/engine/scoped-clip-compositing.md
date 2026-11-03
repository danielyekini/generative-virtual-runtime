# Scoped clip compositing (E012)

Decision: 3 November 2026. [Issue #31](https://github.com/danielyekini/generative-virtual-runtime/issues/31).
Design + versioned clip-first implementation (MotionScript / Scene IR 0.16.0).
Track mattes stay deferred.

## Requirement

Native stories need bounded clipping so content can be masked to a shape without
authors computing intersection polygons by hand. Existing group scopes already
carry isolation, blend and blur. Registry rows `compositing.mask` /
`compositing.matte` are unsupported. Spatial seam clipping is geometric and
unrelated to authoring masks. Hit-testing currently ignores clips
([native-input.md](native-input.md)).

Authoring gates (3 November 2026): prefer high-level intent over calculator
geometry; keep generation and streaming honest.

## Alternatives

1. **Status quo (withhold / no clip).** Strongest current-system option for
   adapters: Lottie mattes are withheld; masks are inventoried. Rejected as the
   sole native contract — stories keep inventing fake cut geometry.
2. **Track mattes first (`compositing.matte`).** Familiar from After Effects /
   Lottie (`tt`). Powerful for luminance reveals, but needs a second painted
   layer, matte modes, and offscreen sampling. Higher authoring and runtime
   cost; worse first-step generation surface. Deferred.
3. **Full offscreen mask stack (alpha/luma + nest + feather).** Completes a
   design-tool feature set. Rejected for this slice: requires true layer
   compositing the canvas renderer does not have yet (`save`/`restore` only).
4. **Clip-path on a group scope referencing drawable geometry (chosen).**
   Promote `compositing.mask` as a path clip. Authors write `clip <id>;` on a
   group; the referenced node’s resolved outline becomes the clip region for
   that render scope. Reuses the existing scope model; Canvas `clip()` is
   sufficient; nested scopes compose; seams stay scope-local.

## Contract

- **Capability:** `compositing.mask` (pending id promoted). Wire stays `"0.2"`.
  Gate with `requires` / `requiredCapabilities`.
- **Syntax:** group property `clip <geometryNodeId>;`. `clip` is reserved.
  Implies a compositing scope; `isolated` defaults to true when omitted (same
  pattern as blend/blur).
- **Scene IR:** `GroupCompositing.clip?: { geometryId: string }`.
- **Clip sources:** `rectangle`, `circle`, `ellipse`, `polygon`, `path` only.
  Text, image, line and group are rejected (`INVALID_GEOMETRY` /
  `UNKNOWN_TARGET`). The source node paints normally unless the author sets
  `visible false` (typical for dedicated clip shapes).
- **Resolved frame:** render-tree scopes may carry
  `clip: { geometry, logicalMatrix }` in viewport space. Draw items stay flat;
  the renderer applies `clip()` per scope. Nested clips intersect.
- **Hit testing:** a pointer hits a leaf only when the point lies inside every
  ancestor clip (same geometry rules as fill hit-testing, curves at 16
  segments).
- **Spatial / seams:** clip scopes remain ordinary compositing scopes; seam
  fragment membership and paint order stay inside the scope.
- **Adapters:** Lottie `masksProperties` and track mattes stay unsupported /
  withheld. No proactive importer expansion.
- **Not in this release:** track mattes, alpha/luma masks, feathered edges,
  inverted clips, animated clip-path morph beyond ordinary geometry tracks,
  offscreen isolated blend layers.

## Critical pass

- *Streaming.* Clip ids resolve against the assembled scene; late nodes that
  become clip sources are valid once present. Missing ids fail closed.
- *Cancellation.* Stateless on the frame; no retained mask buffers.
- *Failure.* Unknown or non-geometry clip targets are diagnostics, not silent
  full-frame draws.
- *Authoring.* One keyword and a node id; no path-boolean arithmetic.
- *Generation.* Models already emit groups and shapes; `clip Hole;` is a short
  additive line.
- *Studio.* Fixture `fixtures/motionscript/clip-mask.ms` is a Library preset.

## Child work

- **E036** (filed with this decision): justified track mattes
  (`compositing.matte`) after clip-first evidence and any offscreen-layer need.

## Language wiring (this change, 0.16.0)

`compositing.mask` lands with the syntax and representation above. Registry
support is exact for the native clip-path scope; Lottie/SVG adapter rows stay
unsupported / untested as recorded.
