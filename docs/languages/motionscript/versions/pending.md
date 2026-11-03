# MotionScript pending

Editable. Draft. Not the current release.

These are candidate contract ideas, not an execution queue or an instruction to
implement every listed construct. The charter and selected live native issue own
scope, priority and acceptance; unsupported adapter coverage creates no work.
Legacy-format expansion or fidelity work requires a fresh explicit user request.
See the [scope decision](../../../decisions/2026-11-02-native-proposal-scope.md).

Not yet in a published MotionScript version:

- compositing.matte
- transform.skew
- transform.autoOrient
- geometry.repeater
- geometry.mergePaths
- text.animators

`geometry.animatedTrim` landed in MotionScript 0.5.0.
`entities.durableRevisions` landed in MotionScript 0.6.0; declarative entity/behaviour statements completed in 0.9.0.
`entities.drawableBindings` landed in MotionScript 0.7.0; declarative geometry/bind statements completed in 0.9.0.
`paint.animatedSolid` landed in MotionScript 0.8.0 (requires token + `fill.*` / `stroke.*` / `stroke.width` tracks).
Declarative entity sugar landed in MotionScript 0.9.0.
`input.bindings` (interaction targets and bounded input actions) landed in MotionScript 0.10.0.
`audio.cues` (audio resources and narration/effects/music cues) landed in MotionScript 0.11.0.
`space.planar25d` (`spatialLayer` declarations: camera and surfaces) landed in MotionScript 0.12.0.
`physics.planar2d` (`physics` world: bodies/joints/authored constraints) landed in MotionScript 0.13.0.
`audio.generative` (generative audio resources and `audio.narration` / `audio.effects` sugar) landed in MotionScript 0.14.0.
`space.planarSeams` (`seams` blocks inside `spatialLayer`) landed in MotionScript 0.15.0.
`compositing.mask` (`clip` on groups) landed in MotionScript 0.16.0.

Promoting one of them is a new version file, a registry update, and conformance tests in the same change. This note stops being the place those ids live once that version is released.

## Spatial Z representation audit

The implementation accepts optional spatial tangent `z` and MotionScript `(x, y, z)` tangents, but the published 0.2.0 spatial-curve contract does not explicitly introduce either representation. Arc-length corrections to existing 2D curves are implementation fixes; accepting a third component is a new contract. A candidate minor release must document and gate this representation, including older-reader rejection and migration tests, before it is claimed as released. Current language pointers remain 0.6.0; no additional release is authorised for this audit in this run. Existing ungated acceptance is an unresolved compatibility issue.

## Compatible assembled-delta validation repair (E001)

Streaming admission validates the assembled accepted/queued candidate, including
root and non-root transform parents, before publishing scene/revision/seal state.
Transform-parent emission uses existing atomic batches to preserve declaration
order with forward references; compiler contextual validation occurs at the outer
batch boundary. No syntax, representation or sampling rule changes; released
language/wire pointers remain unchanged. See
[decision](../../../decisions/engine/assembled-delta-validation.md) and its tests.
