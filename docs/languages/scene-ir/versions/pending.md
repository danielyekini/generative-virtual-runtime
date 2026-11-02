# Scene IR pending

Editable. Draft. Not the current release.

These are candidate contract ideas, not an execution queue or an instruction to
implement every listed construct. The charter and selected live native issue own
scope, priority and acceptance; unsupported adapter coverage creates no work.
Legacy-format expansion or fidelity work requires a fresh explicit user request.
See the [scope decision](../../../decisions/2026-11-02-native-proposal-scope.md).

Not yet in a published Scene IR version:

- compositing.matte
- compositing.mask
- transform.skew
- transform.autoOrient
- geometry.repeater
- geometry.mergePaths
- text.animators

`geometry.animatedTrim` landed in Scene IR 0.5.0.
`entities.durableRevisions` landed in Scene IR 0.6.0 (`APPLY_ENTITY_PATCH`).
`entities.drawableBindings` landed in Scene IR 0.7.0 (`REGISTER_GEOMETRY` / `BIND_GEOMETRY` on `APPLY_ENTITY_PATCH`).
`paint.animatedSolid` landed in Scene IR 0.8.0 (`fill.*` / `stroke.*` / `stroke.width` channels).
MotionScript declarative entity sugar paired as Scene IR 0.9.0 (no new IR ops).
`input.bindings` (scene `interactions`) landed in Scene IR 0.10.0.
`audio.cues` (audio resources, `audioCues`, `ADD_AUDIO_CUES`) landed in Scene IR 0.11.0.

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
