import type { Diagnostic, SourceSpan } from "@gvr/schema";
import type { PlaybackState } from "./playback";

/**
 * Host-facing streaming/execution observation (E018).
 *
 * Units are MotionScript declaration units and Scene IR deltas. They are not
 * source lines and not animation frames; hosts must not invent that mapping.
 */
export type StreamingUnitOutcome = "parsed" | "accepted" | "queued" | "applied" | "rejected";

export interface StreamingUnitObservation {
  /** Scene IR delta unit id when known; absent for parse-only records. */
  unitId?: number;
  outcome: StreamingUnitOutcome;
  /** Inclusive source span from the initiating declaration or delta, when known. */
  sourceSpan?: SourceSpan;
  /** Applied or intended next revision when the outcome carries one. */
  revision?: number;
}

export interface StreamingExecutionObservation {
  /** UTF-8 bytes accepted by the incremental compiler so far. */
  receivedBytes: number;
  /** Declaration units the compiler has attempted to apply (session counter). */
  parsedUnits: number;
  /** Deltas waiting in the compiler pending buffer (not yet drained). */
  pendingCompileDeltas: number;
  /** Deltas waiting in the runtime queue (accepted, not yet flushed). */
  queuedRuntimeDeltas: number;
  /** Last applied runtime revision (0 before the first flush). */
  appliedRevision: number;
  /** Sealed scene-time horizon from the runtime when present, else the compiler. */
  sealedThroughMs: number;
  /** True once COMPLETE_PROGRAM has been applied (or authoring finished). */
  authoringComplete: boolean;
  /** Playhead scene time from the optional playback clock. */
  playheadMs: number;
  /** Playback state; `waiting_for_content` is the sealed-horizon wait signal. */
  playbackState: PlaybackState | "unbound";
  /** True when playhead is held because content is not sealed past the current time. */
  waitingForContent: boolean;
  /** True when the compiler and/or runtime has been disposed (cancel/teardown). */
  cancelled: boolean;
  /** Bounded recent unit outcomes with spans; newest last. */
  recentUnits: readonly StreamingUnitObservation[];
  /** Runtime-rejected diagnostics (bounded), each attributed when possible. */
  rejectedDiagnostics: readonly Diagnostic[];
}

/** Compact delta identity used in queue/applied observation rings. */
export interface ObservedDeltaRef {
  unitId: number;
  nextRevision?: number;
  revision?: number;
  sourceSpan: SourceSpan;
}

/** Duck-typed incremental compiler surface used by the aggregator. */
export interface StreamingCompileObservationSource {
  readonly receivedBytes: number;
  readonly parsedUnits: number;
  readonly sealedThroughMs: number;
  readonly completed: boolean;
  readonly disposed: boolean;
  peekPendingDeltas(): readonly { unitId: number; nextRevision: number; sourceSpan: SourceSpan }[];
}

/** Duck-typed streaming runtime surface used by the aggregator. */
export interface StreamingRuntimeObservationSource {
  readonly revision: number;
  readonly sealedThroughMs: number;
  readonly authoringComplete: boolean;
  readonly disposed: boolean;
  readonly scene?: unknown;
  readonly queuedDeltas: readonly ObservedDeltaRef[];
  readonly appliedUnits: readonly ObservedDeltaRef[];
  readonly rejectedDiagnostics: readonly Diagnostic[];
}

/** Duck-typed playback clock surface used by the aggregator. */
export interface StreamingPlaybackObservationSource {
  readonly timeMs: number;
  readonly playbackState: PlaybackState;
}

export interface StreamingObservationSources {
  program?: StreamingCompileObservationSource;
  runtime?: StreamingRuntimeObservationSource;
  clock?: StreamingPlaybackObservationSource;
  /** Cap for recentUnits (default 32). */
  recentLimit?: number;
}

/** Snapshot host-visible streaming/execution state without inventing line/frame maps. */
export function observeStreamingExecution(sources: StreamingObservationSources): StreamingExecutionObservation {
  const limit = Math.max(1, Math.min(sources.recentLimit ?? 32, 256));
  const program = sources.program;
  const runtime = sources.runtime;
  const clock = sources.clock;

  const pending = program?.peekPendingDeltas() ?? [];
  const queued = runtime?.queuedDeltas ?? [];
  const applied = runtime?.appliedUnits ?? [];
  const rejected = runtime?.rejectedDiagnostics ?? [];

  const recent: StreamingUnitObservation[] = [];
  for (const delta of pending) {
    recent.push({
      unitId: delta.unitId,
      outcome: "accepted",
      sourceSpan: delta.sourceSpan,
      revision: delta.nextRevision,
    });
  }
  for (const item of queued) {
    recent.push({
      unitId: item.unitId,
      outcome: "queued",
      sourceSpan: item.sourceSpan,
      revision: item.nextRevision,
    });
  }
  for (const item of applied) {
    recent.push({
      unitId: item.unitId,
      outcome: "applied",
      sourceSpan: item.sourceSpan,
      revision: item.revision,
    });
  }
  for (const issue of rejected) {
    recent.push({
      unitId: issue.unitId,
      outcome: "rejected",
      sourceSpan: issue.sourceSpan,
    });
  }

  const playbackState = clock?.playbackState ?? "unbound";
  return {
    receivedBytes: program?.receivedBytes ?? 0,
    parsedUnits: program?.parsedUnits ?? 0,
    pendingCompileDeltas: pending.length,
    queuedRuntimeDeltas: queued.length,
    appliedRevision: runtime?.revision ?? 0,
    sealedThroughMs: runtime?.scene != null ? runtime.sealedThroughMs : program?.sealedThroughMs ?? 0,
    authoringComplete: runtime?.authoringComplete ?? program?.completed ?? false,
    playheadMs: clock?.timeMs ?? 0,
    playbackState,
    waitingForContent: playbackState === "waiting_for_content",
    cancelled: Boolean(program?.disposed || runtime?.disposed),
    recentUnits: recent.slice(-limit),
    rejectedDiagnostics: rejected,
  };
}
