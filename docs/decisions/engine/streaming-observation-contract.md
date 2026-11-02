# Host streaming/execution observation contract (E018)

Decision: 2 November 2026. [Issue #37](https://github.com/danielyekini/generative-virtual-runtime/issues/37).
Satisfies product request [X001](https://github.com/danielyekini/generative-virtual-runtime/issues/55).
No MotionScript or Scene IR version bump: this publishes a host-facing read model
over existing compile/runtime/playback state.

## Requirement

Hosts (Studio/product adapters) need one explicit observation of source arrival,
parsed/accepted/rejected units with source spans, queued versus applied
revisions, the sealed horizon, and playhead/wait/cancel signals. Units must not
be framed as source lines or animation frames.

## Alternatives

1. Document-only mapping of today’s scattered getters. Rejected: received byte
   totals, queue membership and cancel/dispose are incomplete or private, so an
   adapter would invent missing fields.
2. A new owning `HostStreamingSession` that swallows compiler, runtime and clock.
   Deferred: playground/Studio already compose those objects; a forced façade
   would duplicate lifecycle without clarifying semantics.
3. Publish a typed snapshot plus small read-only accessors on the existing
   owners, with an aggregator hosts may call after each push/flush/tick.
   Chosen: preserves ownership, names units honestly, and is enough for P002/P005.

## Contract

`StreamingExecutionObservation` in `@gvr/runtime` reports:

- `receivedBytes` from the incremental compiler’s UTF-8 byte counter
- compile `parsedUnits`, pending deltas (with `unitId` + `sourceSpan`), sealed
  horizon and completion
- runtime applied `revision`, queued delta metadata, seal/completion, and
  rejected diagnostics attributed to initiating deltas
- playhead time and `PlaybackState` (`waiting_for_content` is the wait signal)
- `cancelled` when compiler and/or runtime have been disposed

Recent unit records use outcomes `parsed` / `accepted` / `queued` / `applied` /
`rejected` over declaration units and Scene IR deltas only. There is no
line↔frame index.

## Critical pass

Cancellation clears queues without applying them. Rejection retains accepted
history. Waiting holds playhead at the sealed horizon. Spans come from emitted
deltas/diagnostics, not reconstructed line maps. Product owns visual inspectors;
engine owns these semantics/data.

## Revisit

If hosts need a push-event stream or generation-scoped multiplexing beyond a
snapshot, design that as a later additive layer on this read model.
