import type { Telemetry, Diagnostic, ResolvedFrame, SceneIR } from "@gvr/schema";
import { buildResolvedFrame } from "./frame";
import { sampleScene, type SampledScene } from "./sample";
import { projectSceneSpatial } from "./spatial-scene";

/** Host overlay over one sample, for example InputSession.applyTo. */
export type SampleOverlay = (sampled: SampledScene, sceneTimeMs: number) => SampledScene;

/**
 * Evaluates one complete SceneIR. MotionScript and timeline deltas are not
 * applied here. evaluate(scene, t) depends only on t, never on earlier calls.
 * When the scene declares spatialLayers, the resolved frame is projected with
 * projectSpatialFrame before return so every host paints and hit-tests the
 * same 2.5D presentation.
 */
export class AnimationRuntime {
  private degradedFlag = false;
  private diagnostics: Diagnostic[] = [];

  constructor(readonly scene: SceneIR, private readonly telemetry?: Telemetry) {}

  get degraded(): boolean {
    return this.degradedFlag;
  }

  /** Diagnostics produced by the most recent evaluate call. */
  get lastDiagnostics(): readonly Diagnostic[] {
    return this.diagnostics;
  }

  evaluate(sceneTimeMs: number, overlay?: SampleOverlay): ResolvedFrame {
    return this.telemetry ? this.telemetry.measure('frame.evaluate_ms', () => this.evaluateInner(sceneTimeMs, overlay)) : this.evaluateInner(sceneTimeMs, overlay);
  }
  private evaluateInner(sceneTimeMs: number, overlay?: SampleOverlay): ResolvedFrame {
    const raw = sampleScene(this.scene, sceneTimeMs);
    const sampled = overlay ? overlay(raw, sceneTimeMs) : raw;
    const frame = buildResolvedFrame(this.scene, sampled, sceneTimeMs);
    const projected = projectSceneSpatial(this.scene, frame);
    this.diagnostics = [...sampled.diagnostics, ...projected.diagnostics];
    if (this.diagnostics.length > 0) this.degradedFlag = true;
    return projected.frame;
  }
}
