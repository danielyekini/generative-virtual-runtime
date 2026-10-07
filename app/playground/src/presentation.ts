import { CanvasRenderer } from "@gvr/canvas-renderer";
import { PresentationController, type GeneratedOffer } from "@gvr/runtime";
import type { SceneIR } from "@gvr/schema";
import pulseScene from "../../../fixtures/system/pulse.json";
import orbitScene from "../../../fixtures/system/orbit.json";
import tideScene from "../../../fixtures/system/tide.json";
import generatedScene from "../../../fixtures/system/generated.json";

const stage = document.querySelector<HTMLElement>("#stage");
const systemCanvas = document.querySelector<HTMLCanvasElement>("#view-system");
const generatedCanvas = document.querySelector<HTMLCanvasElement>("#view-generated");
const prompt = document.querySelector<HTMLElement>("#prompt");
const caption = document.querySelector<HTMLElement>("#caption");
const status = document.querySelector<HTMLElement>("#status");
const cancelButton = document.querySelector<HTMLButtonElement>("#cancel");
if (!stage || !systemCanvas || !generatedCanvas || !prompt || !caption || !status || !cancelButton) {
  throw new Error("presentation markup missing");
}

const generated = generatedScene as SceneIR;
const presentation = new PresentationController({
  scenes: [
    { id: "pulse", scene: pulseScene as SceneIR },
    { id: "orbit", scene: orbitScene as SceneIR },
    { id: "tide", scene: tideScene as SceneIR },
  ],
});
const systemRenderer = new CanvasRenderer(systemCanvas);
const generatedRenderer = new CanvasRenderer(generatedCanvas);
const offer: GeneratedOffer = {
  scene: generated,
  sealedThroughMs: generated.timeline.durationMs,
  resourcesReady: true,
};

let lastWall = performance.now();
let pending = 0;
let cancelOnTransition = false;
let activeId: string | null = null;
const seen: string[] = [];

caption.textContent = "Submit starts a system scene immediately. The generated scene stays at time zero until the crossfade finishes.";

function clearPlan(): void {
  window.clearTimeout(pending);
  pending = 0;
  cancelOnTransition = false;
}

function begin(plan: "ready-200" | "ready-1000" | "ready-5000" | "fail" | "cancel-transition"): void {
  clearPlan();
  seen.length = 0;
  lastWall = performance.now();
  activeId = presentation.submit();
  if (!activeId) return;
  const generationId = activeId;
  if (plan === "fail") {
    pending = window.setTimeout(() => presentation.fail(generationId, "Generation failed."), 400);
    return;
  }
  cancelOnTransition = plan === "cancel-transition";
  const delay = plan === "ready-200" ? 200 : plan === "ready-5000" ? 5000 : 1000;
  pending = window.setTimeout(() => {
    presentation.receive(generationId, offer);
  }, delay);
}

for (const plan of ["ready-200", "ready-1000", "ready-5000", "fail", "cancel-transition"] as const) {
  document.querySelector(`#${plan}`)?.addEventListener("click", () => begin(plan));
}

cancelButton.addEventListener("click", () => {
  clearPlan();
  presentation.cancel();
});

document.querySelector("#reset")?.addEventListener("click", () => {
  clearPlan();
  activeId = null;
  presentation.restore();
});

document.querySelector("#prompt-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  begin("ready-1000");
});

function draw(): void {
  const cssWidth = stage.clientWidth;
  const cssHeight = stage.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  systemRenderer.resize(cssWidth, cssHeight, dpr);
  generatedRenderer.resize(cssWidth, cssHeight, dpr);
  const view = presentation.view;
  if (cancelOnTransition && view.phase === "transitioning") {
    cancelOnTransition = false;
    window.clearTimeout(pending);
    presentation.cancel();
  }
  const current = presentation.view;
  systemCanvas.style.opacity = String(current.systemOpacity);
  generatedCanvas.style.opacity = String(current.generatedOpacity);
  if (current.systemFrame && current.systemOpacity > 0) systemRenderer.render(current.systemFrame);
  if (current.generatedFrame && current.generatedOpacity > 0) generatedRenderer.render(current.generatedFrame);
  prompt.classList.toggle("is-leaving", current.phase === "dismissing_input");
  prompt.classList.toggle("is-gone", current.phase !== "initial_input" && current.phase !== "dismissing_input");
  if (seen[seen.length - 1] !== current.phase) seen.push(current.phase);
  cancelButton.disabled = current.phase === "initial_input";
  status.textContent = [
    current.phase,
    `system ${current.systemSceneId ?? "—"} ${current.systemTimeMs.toFixed(0)}ms`,
    `generated ${current.generatedSceneId ?? "—"} ${current.generatedTimeMs.toFixed(0)}ms`,
    current.status,
  ].join("  ·  ");
  window.__gvr = {
    phase: current.phase,
    generationId: current.generationId,
    systemSceneId: current.systemSceneId,
    generatedSceneId: current.generatedSceneId,
    systemTimeMs: current.systemTimeMs,
    generatedTimeMs: current.generatedTimeMs,
    systemOpacity: current.systemOpacity,
    generatedOpacity: current.generatedOpacity,
    status: current.status,
    seen: [...seen],
  };
}

function tick(now: number): void {
  const delta = Math.min(100, now - lastWall);
  lastWall = now;
  presentation.tick(delta);
  draw();
  requestAnimationFrame(tick);
}

new ResizeObserver(() => draw()).observe(stage);
draw();
requestAnimationFrame(tick);

declare global {
  interface Window {
    __gvr?: {
      phase: string;
      generationId: string | null;
      systemSceneId: string | null;
      generatedSceneId: string | null;
      systemTimeMs: number;
      generatedTimeMs: number;
      systemOpacity: number;
      generatedOpacity: number;
      status: string;
      seen: string[];
    };
  }
}
