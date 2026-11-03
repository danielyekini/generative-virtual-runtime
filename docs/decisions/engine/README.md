# Engine decisions

- [Assembled delta admission (E001)](assembled-delta-validation.md): detached
  candidate validation, queued-state ownership and dependency-complete batches.
- [Host streaming observation (E018)](streaming-observation-contract.md): typed
  host snapshot over compile/runtime/playback units, spans, seals and wait/cancel.
- [Persistent entities (E002)](persistent-entities.md): revisioned immutable
  entity patches, sealed left-limit topology, exclusive channel ownership and
  named behaviours; language wiring deferred to E004/E005.
- [Drawable reuse bindings (E005)](drawable-reuse-bindings.md): shared immutable
  geometry assets, instance bindings, per-instance ownership and streaming
  activation; language wiring deferred to a follow-up implementation issue.
- [Streaming authorship + declarative entities (E006)](streaming-authorship-and-declarative-entities.md):
  progressive unit/seal/writer contract, stream linter, model-facing generation
  inputs for P006; declarative entity/behaviour/bind design recorded, syntax deferred.
- [Animated solid paint channels (E009)](animated-paint-channels.md): gated
  `fill.*` / `stroke.*` / `stroke.width` scalars as MotionScript/Scene IR 0.8.0
  `paint.animatedSolid`.
- [Native input (E007)](native-input.md): painted-geometry hit-testing over the
  resolved frame, capture/hover/click/drag/wheel/focus routing, bounded actions
  on `input`-owned channels and deterministic replay; versioned as MotionScript /
  Scene IR 0.10.0 `input.bindings` by E025.
- [Audible media clock (E008)](audible-media-clock.md): scene-time master clock,
  pure audio schedule (narration/effects/music buses, loops, fades, ducking),
  reconciling `AudioSession` with resync/drift correction, required-resource
  hold, interaction one-shots and deterministic offline export; versioned as
  `audio.cues` (MotionScript / Scene IR 0.11.0) with the Studio Web Audio
  backend in E026.
- [Generative audio via ElevenLabs (steering → E031)](generative-audio-elevenlabs.md):
  user-adopted paid provider for timed narration/SFX; provider-abstracted
  design commissioned as E031; builds on `audio.cues` without replacing the
  scene-time clock.
- [Authoring friendliness + provider-brand abstraction (3 Nov 2026)](2026-11-03-authoring-and-provider-abstraction.md):
  vendor-neutral public package names; MotionScript language-change gate for
  human/generation/streaming-friendly authoring.
- [Bounded spatial graphics (E010)](spatial-graphics.md): planar 2.5D layers
  (rigid 3D surface placement, hinges, perspective/orthographic camera) projected
  into ordinary draw items; two-sided faces, plane-test depth order, fail-closed
  bounds and unprojection for input; versioning in E028 (`space.planar25d`).
- [Physics integration (E011)](physics-integration.md): planar fixed-step 2D
  rigid bodies/colliders/joints with physics-owned channel writes, checkpoints,
  event replay, seeds and cost; authored distance constraints retained as the
  non-dynamic alternative; versioning child E029 (`physics.planar2d`).
- [Seam depth/paint order (E016)](seam-depth-order.md): plane-test occlusion
  stays authoritative; shared-edge seams, projected intersection splits and
  coplanar union helper; animated order is tie-break only; versioning child E030.
- [Path attachment space (E039)](path-attachment-space.md):
  `geometry.pathSpace` maps an attachment through the path node's transform
  into the traveller's parent space; 0.17 path-local sampling remains when the
  capability is absent. Versioned as MotionScript / Scene IR 0.22.0.
- [Path progress / attachments / dashes (E015)](path-progress-geometry-authoring.md):
  shared arc-length metrics after morph/trim, host attach/orient/rolling/dash
  helpers; auto-orient ≠ rolling; uniform width stays `paint.animatedSolid`;
  width profiles deferred; language wiring in follow-up issues.
- [Alpha track mattes (E036)](track-mattes.md): `matte <nodeId>` keeps a group's
  pixels where another node's painted alpha is, including a group of shapes;
  luma, invert and feather stay out; MotionScript / Scene IR 0.19.0
  `compositing.matte`.
- [Dynamic text / numeric format / metrics (E013)](dynamic-text-and-metrics.md):
  split content+format from layout metrics and per-glyph animators; schema
  `formatNumber` / `measureTextLine` prototype; language wiring in E040/E041;
  `text.animators` stays deferred.
- [Local/named time, cycles and track composition (E014)](time-composition.md):
  cyclic timing scopes (unbounded loop with phase vs finite `repeat`), timed
  keys and named beats, the pinned gap/hold rule, unwrapped-degree rotation,
  exclusive cyclic channel ownership and a cycle seal rule; schema prototype,
  language wiring in E043/E044. E044 landed `timing.timedKeys` as MotionScript
  0.23.0 (MotionScript only; Scene IR unchanged). E043 landed
  `timing.cyclicScopes` as MotionScript 0.24.0 / Scene IR 0.23.0.
- [Image resource lifecycle (E019)](resource-lifecycle.md): host loader states +
  required-image startup hold, scene-scoped renderer cache with eviction and a
  decoded-bytes gauge, a `pixelated` sampling recipe, and a texture/repetition
  comparison (sprite frames next in E045, pattern paint deferred in E046).
