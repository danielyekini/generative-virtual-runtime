import {
  type Telemetry,
  DEFAULT_LIMITS,
  diagnostic,
  validateDelta,
  validateSceneIR,
  rootTimeMs,
  type ApplyResult,
  type Diagnostic,
  type ResolvedFrame,
  type SceneIR,
  type SceneIRDelta,
} from "@gvr/schema";
import { buildResolvedFrame } from "./frame";
import type { ObservedDeltaRef } from "./observation";
import { sampleScene } from "./sample";

/**
 * Applies revision-guarded scene deltas and evaluates the sealed prefix.
 * At the unsealed horizon, tracks and steps that start on that instant are held back.
 */
export class StreamingRuntime {
  revision = 0;
  sealedThroughMs = 0;
  authoringComplete = false;
  scene?: SceneIR;
  private readonly queue: ObservedDeltaRef[] = [];
  private queuedState?: CandidateState;
  private readonly rejected: Diagnostic[] = [];
  private readonly applied: ObservedDeltaRef[] = [];
  private readonly enqueuedAt: number[] = [];
  private disposedFlag = false;
  private degradedFlag = false;
  private diagnostics: Diagnostic[] = [];

  constructor(private readonly telemetry?: Telemetry) {}

  /** Invalid deltas retain existing diagnostics; stale observations are bounded by Telemetry. */
  get rejectedDiagnostics(): readonly Diagnostic[] { return this.rejected; }

  /** Accepted but not yet flushed deltas, with initiating unit spans. */
  get queuedDeltas(): readonly ObservedDeltaRef[] { return this.queue; }

  /** Recently applied deltas (bounded), newest last. */
  get appliedUnits(): readonly ObservedDeltaRef[] { return this.applied; }

  /** True after dispose/cancel; further enqueue/flush are no-ops. */
  get disposed(): boolean { return this.disposedFlag; }

  dispose(): void {
    this.disposedFlag = true;
    this.queue.length = 0;
    this.queuedState = undefined;
    this.enqueuedAt.length = 0;
    this.rejected.length = 0;
    this.applied.length = 0;
    this.diagnostics = [];
    this.scene = undefined;
    this.telemetry?.gauge('runtime.queue_deltas', 0);
    this.telemetry?.gauge('runtime.retained_nodes', 0);
  }

  get degraded(): boolean {
    return this.degradedFlag;
  }

  get lastDiagnostics(): readonly Diagnostic[] {
    return this.diagnostics;
  }

  enqueue(delta: SceneIRDelta): void {
    if (this.disposedFlag) return;
    const base = this.queuedState ?? {
      scene: this.scene,
      sealedThroughMs: this.sealedThroughMs,
      authoringComplete: this.authoringComplete,
    };
    const validated = validateDelta(delta, undefined, base.scene?.irVersion);
    if (!validated.ok) {
      this.reject(delta, validated.diagnostics);
      return;
    }
    if (delta.expectedRevision !== this.revision + this.queue.length) {
      this.telemetry?.count('runtime.stale_deltas');
      this.telemetry?.event('runtime.delta_stale', {unitId: delta.unitId, expectedRevision: delta.expectedRevision, requiredRevision: this.revision + this.queue.length});
      return;
    }
    if (this.queue.length >= DEFAULT_LIMITS.maxQueuedDeltas) {
      const issue = diagnostic({code:'RESOURCE_LIMIT', phase:'runtime', category:'resource', effect:'UNIT_REJECTED',message:`Runtime queue exceeds ${DEFAULT_LIMITS.maxQueuedDeltas} deltas.`});
      this.reject(delta, [issue]);
      return;
    }
    // Own only the new payload; previously accepted nested values are shared,
    // never edited. Caller mutation cannot invalidate an admitted queued scene.
    let owned: SceneIRDelta;
    try {
      owned = structuredClone(delta);
    } catch {
      this.reject(delta, [diagnostic({code: "INVALID_TYPE", phase: "validate", category: "type",
        message: "Delta payload must contain cloneable Scene IR values."})]);
      return;
    }
    const candidate = assemble(base, owned);
    if (!candidate.ok) {
      this.reject(delta, candidate.diagnostics);
      return;
    }
    this.queuedState = candidate.state;
    this.queue.push({
      unitId: owned.unitId,
      nextRevision: owned.nextRevision,
      sourceSpan: owned.sourceSpan,
    });
    if (this.telemetry) this.enqueuedAt.push(this.telemetry.now());
    this.telemetry?.count('runtime.accepted_deltas');
    this.telemetry?.gauge('runtime.queue_deltas', this.queue.length);
  }

  flushCommands(): ApplyResult[] {
    const results: ApplyResult[] = [];
    for (const delta of this.queue.splice(0)) {
      if (this.telemetry) this.telemetry.observe('runtime.queue_wait_ms', this.telemetry.now() - this.enqueuedAt.shift()!);
      const revision = delta.nextRevision!;
      results.push({ revision, unitId: delta.unitId, ok: true });
      this.applied.push({ unitId: delta.unitId, revision, sourceSpan: delta.sourceSpan });
    }
    if (this.applied.length > DEFAULT_LIMITS.maxQueuedDeltas) {
      this.applied.splice(0, this.applied.length - DEFAULT_LIMITS.maxQueuedDeltas);
    }
    if (this.queuedState) {
      this.scene = this.queuedState.scene;
      this.sealedThroughMs = this.queuedState.sealedThroughMs;
      this.authoringComplete = this.queuedState.authoringComplete;
      this.revision = results[results.length - 1]!.revision;
      this.queuedState = undefined;
    }
    this.telemetry?.gauge('runtime.queue_deltas', this.queue.length);
    this.telemetry?.gauge('runtime.retained_nodes', this.scene?.nodes.length ?? 0);
    return results;
  }

  evaluate(sceneTimeMs: number): ResolvedFrame {
    return this.telemetry ? this.telemetry.measure('frame.evaluate_ms', () => this.evaluateInner(sceneTimeMs)) : this.evaluateInner(sceneTimeMs);
  }
  private evaluateInner(sceneTimeMs: number): ResolvedFrame {
    if (!this.scene) throw new Error("Streaming runtime has no scene yet.");
    const beyond = !this.authoringComplete && sceneTimeMs > this.sealedThroughMs;
    if (beyond) this.telemetry?.count('runtime.horizon_wait_evaluations');
    const time = beyond ? this.sealedThroughMs : sceneTimeMs;
    const atFrontier = !this.authoringComplete && time === this.sealedThroughMs;
    const sampled = sampleScene(this.scene, time, atFrontier ? { excludeStartsAtMs: this.sealedThroughMs } : undefined);
    this.diagnostics = sampled.diagnostics;
    if (sampled.diagnostics.length > 0) this.degradedFlag = true;
    return buildResolvedFrame(this.scene, sampled, time, this.revision);
  }

  private recordRejected(diagnostics: readonly Diagnostic[]): void {
    this.rejected.push(...diagnostics.slice(-DEFAULT_LIMITS.maxQueuedDeltas));
    if (this.rejected.length > DEFAULT_LIMITS.maxQueuedDeltas) this.rejected.splice(0,this.rejected.length - DEFAULT_LIMITS.maxQueuedDeltas);
  }

  private reject(delta: SceneIRDelta, diagnostics: readonly Diagnostic[]): void {
    const attributed = diagnostics.map((issue) => ({...issue,
      generationId: delta?.generationId, unitId: delta?.unitId, sourceSpan: delta?.sourceSpan}));
    this.recordRejected(attributed);
    this.telemetry?.count('runtime.rejected_deltas');
    this.telemetry?.event('runtime.delta_rejected', {unitId: delta?.unitId, diagnostics: attributed.slice(0, 4)});
  }
}

interface CandidateState {
  scene?: SceneIR;
  sealedThroughMs: number;
  authoringComplete: boolean;
}

type CandidateResult = {ok: true; state: CandidateState} | {ok: false; diagnostics: Diagnostic[]};

/** No writes to base or its nested values: rejection simply discards these containers. */
function assemble(base: CandidateState, delta: SceneIRDelta): CandidateResult {
  let scene = base.scene && {...base.scene, nodes: [...base.scene.nodes],
    timeline: {...base.scene.timeline, tracks: [...base.scene.timeline.tracks], steps: [...base.scene.timeline.steps]}};
  let sealedThroughMs = base.sealedThroughMs;
  let authoringComplete = base.authoringComplete;
  const fail = (code: Diagnostic["code"], message: string, path: string): CandidateResult => ({
    ok: false, diagnostics: [diagnostic({code, phase: "validate", category: code === "MISSING_REQUIRED" ? "reference" : "temporal", message, path})],
  });
  for (const [index, operation] of delta.operations.entries()) {
    const path = `operations[${index}]`;
    if (authoringComplete) return fail("INVALID_TIMING", "The program is already complete.", path);
    if (operation.op === "CREATE_SCENE") {
      if (sealedThroughMs > 0) return fail("INVALID_TIMING", "Base definitions are frozen after the first seal.", path);
      const {durationMs, ...header} = operation.scene;
      scene = {...header, nodes: scene?.nodes ?? [],
        timeline: {durationMs, tracks: scene?.timeline.tracks ?? [], steps: scene?.timeline.steps ?? []}};
    } else {
      if (!scene) return fail("MISSING_REQUIRED", "CREATE_SCENE must precede scene operations.", path);
      if (operation.op === "ADD_NODES") {
        if (sealedThroughMs > 0) return fail("INVALID_TIMING", "Base definitions are frozen after the first seal.", path);
        scene.nodes.push(...operation.nodes);
      } else if (operation.op === "ADD_TRACKS") {
        scene.timeline.tracks.push(...operation.tracks);
      } else if (operation.op === "ADD_STEPS") {
        scene.timeline.steps.push(...operation.steps);
      } else if (operation.op === "SEAL_TIMELINE") {
        if (operation.horizonMs <= sealedThroughMs + 1e-9 || operation.horizonMs > scene.timeline.durationMs) {
          return fail("SEAL_BLOCKED", "A seal must advance within the scene duration.", path);
        }
        sealedThroughMs = operation.horizonMs;
      } else if (operation.op === "COMPLETE_PROGRAM") {
        authoringComplete = true;
        sealedThroughMs = Math.max(sealedThroughMs, scene.timeline.durationMs);
      }
    }
  }
  if (!scene) return fail("MISSING_REQUIRED", "A delta must establish a scene.", "operations");
  const validated = validateSceneIR(scene);
  if (!validated.ok) return validated;
  // Check new writers against the frontier at their position in the transaction,
  // not the final frontier: a batch may add writers and then seal them.
  let frontier = base.sealedThroughMs;
  for (const [index, operation] of delta.operations.entries()) {
    if (operation.op === "SEAL_TIMELINE") frontier = operation.horizonMs;
    if (operation.op === "ADD_TRACKS") {
      for (const track of operation.tracks) {
        const start = track.timingScopeId ? rootTimeMs(scene.timingScopes ?? [], track.timingScopeId, track.startMs) : track.startMs;
        const end = track.timingScopeId ? rootTimeMs(scene.timingScopes ?? [], track.timingScopeId, track.startMs + track.durationMs) : track.startMs + track.durationMs;
        if (Math.min(start!, end!) + 1e-9 < frontier) {
          return fail("INVALID_TIMING", `Track ${track.id} writes before the seal at ${frontier}ms.`, `operations[${index}].tracks`);
        }
      }
    } else if (operation.op === "ADD_STEPS" && operation.steps.some((step) => step.timeMs + 1e-9 < frontier)) {
      return fail("INVALID_TIMING", `A step writes before the seal at ${frontier}ms.`, `operations[${index}].steps`);
    }
  }
  return {ok: true, state: {scene, sealedThroughMs, authoringComplete}};
}
