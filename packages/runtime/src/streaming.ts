import {
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
  private degradedFlag = false;
  private diagnostics: Diagnostic[] = [];

  get degraded(): boolean {
    return this.degradedFlag;
  }

  get lastDiagnostics(): readonly Diagnostic[] {
    return this.diagnostics;
  }

  enqueue(delta: SceneIRDelta): void {
    const validated = validateDelta(delta);
    if (!validated.ok) {
      this.rejected.push(...validated.diagnostics);
      return;
    }
    if (delta.expectedRevision !== this.revision + this.queue.length) return;
    this.queue.push(delta);
  }

  flushCommands(): ApplyResult[] {
    const results: ApplyResult[] = [];
    for (const delta of this.queue.splice(0)) {
      this.apply(delta);
      results.push({ revision: this.revision, unitId: delta.unitId, ok: true });
    }
    return results;
  }

  evaluate(sceneTimeMs: number): ResolvedFrame {
    if (!this.scene) throw new Error("Streaming runtime has no scene yet.");
    const beyond = !this.authoringComplete && sceneTimeMs > this.sealedThroughMs;
    const time = beyond ? this.sealedThroughMs : sceneTimeMs;
    const atFrontier = !this.authoringComplete && time === this.sealedThroughMs;
    const sampled = sampleScene(this.scene, time, atFrontier ? { excludeStartsAtMs: this.sealedThroughMs } : undefined);
    this.diagnostics = sampled.diagnostics;
    if (sampled.diagnostics.length > 0) this.degradedFlag = true;
    return buildResolvedFrame(this.scene, sampled, time, this.revision);
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
