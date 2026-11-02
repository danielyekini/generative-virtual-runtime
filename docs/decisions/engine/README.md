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
