import type { Diagnostic, ResolvedFrame, SceneIR } from "@gvr/schema";
import { buildResolvedFrame } from "./frame";
import { sampleScene } from "./sample";

/**
 * Evaluates one complete SceneIR. MotionScript and timeline deltas are not
 * applied here. evaluate(scene, t) depends only on t, never on earlier calls.
 */
export class AnimationRuntime {
  private degradedFlag = false;
  private diagnostics: Diagnostic[] = [];

  constructor(readonly scene: SceneIR) {}

  get degraded(): boolean {
    return this.degradedFlag;
  }

  /** Diagnostics produced by the most recent evaluate call. */
  get lastDiagnostics(): readonly Diagnostic[] {
    return this.diagnostics;
  }

  evaluate(sceneTimeMs: number): ResolvedFrame {
    const sampled = sampleScene(this.scene, sceneTimeMs);
    this.diagnostics = sampled.diagnostics;
    if (sampled.diagnostics.length > 0) this.degradedFlag = true;
    return buildResolvedFrame(this.scene, sampled, sceneTimeMs);
  }
}
