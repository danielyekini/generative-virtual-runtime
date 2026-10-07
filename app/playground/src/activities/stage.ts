import { PresentationController, type GeneratedOffer } from "@gvr/runtime";
import type { SceneIR } from "@gvr/schema";
import generatedScene from "../../../../fixtures/system/generated.json";
import orbitScene from "../../../../fixtures/system/orbit.json";
import pulseScene from "../../../../fixtures/system/pulse.json";
import tideScene from "../../../../fixtures/system/tide.json";
import type { GvrBridge } from "../bridge";
import { describeFrame } from "../describe";
import type { Shell } from "../shell";

const MODEL_DELAY_MS = 1000;

export function createStage(shell: Shell) {
  const generated = generatedScene as SceneIR;
  const presentation = new PresentationController({
    scenes: [
      { id: "pulse", scene: pulseScene as SceneIR },
      { id: "orbit", scene: orbitScene as SceneIR },
      { id: "tide", scene: tideScene as SceneIR },
    ],
  });
  const offer: GeneratedOffer = {
    scene: generated,
    sealedThroughMs: generated.timeline.durationMs,
    resourcesReady: true,
  };
  let pending = 0;
  let anchor: "center" | "bottom" = "center";
  const seen: string[] = [];

  function clearTimer(): void {
    window.clearTimeout(pending);
    pending = 0;
  }

  function submit(): void {
    clearTimer();
    const generationId = presentation.submit();
    if (!generationId) return;
    pending = window.setTimeout(() => {
      pending = 0;
      presentation.receive(generationId, offer);
    }, MODEL_DELAY_MS);
  }

  function cancel(): void {
    clearTimer();
    presentation.cancel();
    anchor = "center";
  }

  function draw(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = shell.stage.clientWidth;
    const height = shell.stage.clientHeight;
    const view = presentation.view;
    const complete = view.phase === "generated_scene" && view.status === "Generated scene complete.";
    if (view.phase === "initial_input") anchor = "center";
    if (complete) anchor = "bottom";
    shell.canvases.system.style.opacity = String(view.systemOpacity);
    shell.canvases.generated.style.opacity = String(view.generatedOpacity);
    if (view.systemFrame && view.systemOpacity > 0) shell.paint("system", view.systemFrame, width, height, dpr);
    else if (view.systemOpacity === 0) shell.canvases.system.style.opacity = "0";
    if (view.generatedFrame && view.generatedOpacity > 0) shell.paint("generated", view.generatedFrame, width, height, dpr);
    const promptVisible = view.phase === "initial_input" || view.phase === "dismissing_input" || complete;
    shell.prompt.classList.toggle("is-leaving", view.phase === "dismissing_input");
    shell.prompt.classList.toggle("is-bottom", anchor === "bottom" && (complete || view.phase === "dismissing_input"));
    shell.prompt.classList.toggle("is-gone", !promptVisible);
    shell.showCancel(view.phase !== "initial_input" && !complete);
    shell.setTransport({ hidden: true, enabled: false, timeMs: 0, durationMs: 0, playing: false, rate: 1, sync: false });
    if (seen[seen.length - 1] !== view.phase) seen.push(view.phase);
    const frame = view.generatedOpacity > 0 ? view.generatedFrame : view.systemFrame;
    shell.setSourceMode("note");
    shell.setSourceNote("The prompt is on the canvas. This activity does not take a source file.");
    shell.setReport("A prepared scene stands in for the model. The handoff itself is the presentation controller.", view.status, "", "");
    shell.setFlow([]);
    shell.setScene("System scenes and the stand-in are precompiled. They are not the imported studio document.", "");
    shell.setScript("Generation is mocked. MotionScript from the model is not connected yet.", "");
    shell.setFrames(frame ? "The picture currently composited on the stage." : "The canvas is waiting for a scene.", frame ? describeFrame(frame) : "");
    shell.setSession("Stage mocks the model with a one second delay and a stand-in scene. Cancel, the crossfade, and readiness are real.", [
      `phase ${view.phase}`,
      `generation ${view.generationId ?? "—"}`,
      `system ${view.systemSceneId ?? "—"} ${view.systemTimeMs.toFixed(0)} ms  opacity ${view.systemOpacity.toFixed(2)}`,
      `generated ${view.generatedSceneId ?? "—"} ${view.generatedTimeMs.toFixed(0)} ms  opacity ${view.generatedOpacity.toFixed(2)}`,
      view.status,
      complete ? "prompt returned to the bottom" : anchor === "bottom" ? "prompt leaving the bottom" : "prompt centered",
      `seen ${seen.join(" → ")}`,
    ].join("\n"));
    shell.setStatus([
      view.phase,
      `system ${view.systemSceneId ?? "—"} ${view.systemTimeMs.toFixed(0)}ms`,
      `generated ${view.generatedSceneId ?? "—"} ${view.generatedTimeMs.toFixed(0)}ms`,
      view.status,
    ].join("  ·  "));
  }

  return {
    activate() {
      shell.setMode("present");
      shell.onCancel(() => {
        cancel();
        draw();
      });
      shell.promptForm.onsubmit = (event) => {
        event.preventDefault();
        submit();
      };
    },
    deactivate() {
      shell.promptForm.onsubmit = null;
    },
    tick(_now: number, delta: number) {
      presentation.tick(delta);
    },
    draw() {
      draw();
    },
    key(event: KeyboardEvent) {
      if (event.key !== "Escape") return false;
      const view = presentation.view;
      const complete = view.phase === "generated_scene" && view.status === "Generated scene complete.";
      if (view.phase === "initial_input" || complete) return false;
      event.preventDefault();
      cancel();
      return true;
    },
    hook(): Partial<GvrBridge> {
      const view = presentation.view;
      return {
        phase: view.phase,
        generationId: view.generationId,
        systemSceneId: view.systemSceneId,
        generatedSceneId: view.generatedSceneId,
        systemTimeMs: view.systemTimeMs,
        generatedTimeMs: view.generatedTimeMs,
        systemOpacity: view.systemOpacity,
        generatedOpacity: view.generatedOpacity,
        status: view.status,
        seen: [...seen],
        frame: view.generatedFrame ?? view.systemFrame ?? undefined,
      };
    },
  };
}
