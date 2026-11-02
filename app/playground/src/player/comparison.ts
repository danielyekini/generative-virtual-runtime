/** Explicit opt-in Scene IR → MotionScript → Scene IR inspection, not source fidelity certification. */
import { emitMotionScript } from "@gvr/motionscript-emitter";
import type { SceneIR } from "@gvr/schema";
import { runProgram, type RunOutcome } from "./run";

export interface Comparison {
  script: string;
  outcome?: RunOutcome;
  report: string;
}

export function compareScene(scene: SceneIR): Comparison {
  try {
    const script = emitMotionScript(scene);
    const outcome = runProgram(script, "motionscript", "MotionScript round-trip");
    return {
      script, outcome,
      report: [
        "MOTIONSCRIPT ROUND-TRIP",
        "Left: original compiled/imported Scene IR. Right: emitted and recompiled MotionScript.",
        "This is not comparison with an original SVG/Lottie renderer or a visual fidelity certification.",
        outcome.summary, outcome.report,
      ].join("\n"),
    };
  } catch (error) {
    return { script: "", report: `MotionScript round-trip unavailable: ${error instanceof Error ? error.message : String(error)}` };
  }
}
