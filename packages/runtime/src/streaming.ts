import {
  type Telemetry,
  DEFAULT_LIMITS,
  diagnostic,
  validateDelta,
  type ApplyResult,
  type Diagnostic,
  type ResolvedFrame,
  type SceneHeader,
  type SceneIR,
  type SceneIRDelta,
} from "@gvr/schema";
import { buildResolvedFrame } from "./frame";
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
  private readonly queue: SceneIRDelta[] = [];
  private readonly rejected: Diagnostic[] = [];
  private readonly enqueuedAt: number[] = [];
  private disposed = false;
  private degradedFlag = false;
  private diagnostics: Diagnostic[] = [];

  constructor(private readonly telemetry?: Telemetry) {}

  /** Invalid deltas retain existing diagnostics; stale observations are bounded by Telemetry. */
  get rejectedDiagnostics(): readonly Diagnostic[] { return this.rejected; }

  dispose(): void {
    this.disposed = true;
    this.queue.length = 0;
    this.enqueuedAt.length = 0;
    this.rejected.length = 0;
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
    if (this.disposed) return;
    // Queued CREATE_SCENE headers establish the schema for later queued nodes,
    // even when the caller has not flushed the header yet.
    let wireVersion = this.scene?.irVersion ?? "0.1";
    for (const pending of [...this.queue, delta]) {
      if (!Array.isArray(pending.operations)) continue;
      for (const operation of pending.operations) {
        if (operation?.op === 'CREATE_SCENE' && (operation.scene?.irVersion === '0.1' || operation.scene?.irVersion === '0.2')) wireVersion = operation.scene.irVersion;
      }
    }
    const validated = validateDelta(delta, undefined, wireVersion);
    if (!validated.ok) {
      this.recordRejected(validated.diagnostics);
      this.telemetry?.count('runtime.rejected_deltas');
      this.telemetry?.event('runtime.delta_rejected', {unitId: delta.unitId, diagnostics: validated.diagnostics.slice(0,4)});
      return;
    }
    if (delta.expectedRevision !== this.revision + this.queue.length) {
      this.telemetry?.count('runtime.stale_deltas');
      this.telemetry?.event('runtime.delta_stale', {unitId: delta.unitId, expectedRevision: delta.expectedRevision, requiredRevision: this.revision + this.queue.length});
      return;
    }
    if (this.queue.length >= DEFAULT_LIMITS.maxQueuedDeltas) {
      const issue = diagnostic({code:'RESOURCE_LIMIT', phase:'runtime', category:'resource', effect:'UNIT_REJECTED',message:`Runtime queue exceeds ${DEFAULT_LIMITS.maxQueuedDeltas} deltas.`});
      this.recordRejected([issue]);
      this.telemetry?.count('runtime.rejected_deltas');
      this.telemetry?.event('runtime.delta_rejected', {unitId:delta.unitId,diagnostics:[issue]});
      return;
    }
    this.queue.push(delta);
    if (this.telemetry) this.enqueuedAt.push(this.telemetry.now());
    this.telemetry?.count('runtime.accepted_deltas');
    this.telemetry?.gauge('runtime.queue_deltas', this.queue.length);
  }

  flushCommands(): ApplyResult[] {
    const results: ApplyResult[] = [];
    for (const delta of this.queue.splice(0)) {
      if (this.telemetry) this.telemetry.observe('runtime.queue_wait_ms', this.telemetry.now() - this.enqueuedAt.shift()!);
      this.apply(delta);
      results.push({ revision: this.revision, unitId: delta.unitId, ok: true });
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

  private apply(delta: SceneIRDelta): void {
    for (const operation of delta.operations) {
      if (operation.op === "CREATE_SCENE") {
        const header = operation.scene;
        if (!this.scene) {
          this.scene = {
            irVersion: header.irVersion,
            sceneId: header.sceneId,
            viewport: header.viewport,
            background: header.background,
            resources: [...header.resources],
            nodes: [],
            cameras: header.cameras.map((camera) => ({ ...camera, position: { ...camera.position } })),
            initialCameraId: header.initialCameraId,
            timeline: { durationMs: header.durationMs, tracks: [], steps: [] },
          };
          copyCapabilityProfile(this.scene, header);
        } else {
          this.scene.sceneId = header.sceneId;
          this.scene.viewport = header.viewport;
          this.scene.background = header.background;
          this.scene.resources = [...header.resources];
          this.scene.cameras = header.cameras.map((camera) => ({ ...camera, position: { ...camera.position } }));
          this.scene.initialCameraId = header.initialCameraId;
          this.scene.timeline.durationMs = header.durationMs;
          copyCapabilityProfile(this.scene, header);
        }
      } else if (operation.op === "ADD_NODES") {
        this.scene?.nodes.push(...operation.nodes);
      } else if (operation.op === "ADD_TRACKS") {
        this.scene?.timeline.tracks.push(...operation.tracks);
      } else if (operation.op === "ADD_STEPS") {
        this.scene?.timeline.steps.push(...operation.steps);
      } else if (operation.op === "SEAL_TIMELINE") {
        this.sealedThroughMs = operation.horizonMs;
      } else if (operation.op === "COMPLETE_PROGRAM") {
        this.authoringComplete = true;
        if (this.scene) this.sealedThroughMs = Math.max(this.sealedThroughMs, this.scene.timeline.durationMs);
      }
    }
    this.revision = delta.nextRevision;
  }
}

function copyCapabilityProfile(scene: SceneIR, header: SceneHeader): void {
  if (header.irVersion !== "0.2") return;
  scene.compositions = header.compositions ?? [];
  scene.instances = header.instances ?? [];
  scene.timingScopes = header.timingScopes ?? [];
  scene.requiredCapabilities = header.requiredCapabilities ?? [];
  scene.geometryOperators = header.geometryOperators ?? [];
}
