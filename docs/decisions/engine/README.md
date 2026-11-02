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
  on `input`-owned channels and deterministic replay; language wiring is E025.
