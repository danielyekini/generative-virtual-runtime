# Streaming execution observation (host contract)

Authority: [E018 decision](../decisions/engine/streaming-observation-contract.md),
`observeStreamingExecution` in `@gvr/runtime`. Product owns visual adapters
(P002/P005); engine owns these semantics.

## Snapshot fields

| Field | Meaning |
| --- | --- |
| `receivedBytes` | UTF-8 bytes accepted by `IncrementalProgram.push` |
| `parsedUnits` | Compiler declaration units attempted |
| `pendingCompileDeltas` | Emitted deltas not yet drained |
| `queuedRuntimeDeltas` | Admitted deltas not yet flushed |
| `appliedRevision` | Last flushed runtime revision |
| `sealedThroughMs` | Sealed scene-time horizon |
| `authoringComplete` | `COMPLETE_PROGRAM` applied / finish completed |
| `playheadMs` / `playbackState` | From `PlaybackClock` when bound |
| `waitingForContent` | Playhead held at the sealed horizon |
| `cancelled` | Compiler and/or runtime disposed |
| `recentUnits` | Bounded unit outcomes with `sourceSpan` |
| `rejectedDiagnostics` | Runtime rejection ring |

## Units

Outcomes `parsed` / `accepted` / `queued` / `applied` / `rejected` refer to
MotionScript declaration units and Scene IR deltas only. Do not map them to
source lines or animation frames.

## Usage

After each push, drain/enqueue, flush, clock tick or cancel, call
`observeStreamingExecution({ program, runtime, clock })`. Compose the existing
owners; do not require a single façade.
