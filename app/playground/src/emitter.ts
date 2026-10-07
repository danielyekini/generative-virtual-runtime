import { CanvasRenderer } from "@gvr/canvas-renderer";
import { compileMotionScript } from "@gvr/compiler";
import { emitMotionScript } from "@gvr/motionscript-emitter";
import { AnimationRuntime, RuntimeClock } from "@gvr/runtime";
import type { ResolvedDrawItem, SceneIR } from "@gvr/schema";
import ballSource from "../../../fixtures/motionscript/ball.ms?raw";
import bunnySource from "../../../fixtures/motionscript/bunny.ms?raw";
import cameraSource from "../../../fixtures/motionscript/camera.ms?raw";
import captionSource from "../../../fixtures/motionscript/caption.ms?raw";
import diagramSource from "../../../fixtures/motionscript/diagram.ms?raw";
import nestedSource from "../../../fixtures/motionscript/nested.ms?raw";

interface Example {
  id: string;
  label: string;
  source: string;
}

const examples: Example[] = [
  { id: "bunny", label: "Bunny", source: bunnySource },
  { id: "ball", label: "Ball", source: ballSource },
  { id: "caption", label: "Caption", source: captionSource },
  { id: "nested", label: "Nested", source: nestedSource },
  { id: "diagram", label: "Diagram", source: diagramSource },
  { id: "camera", label: "Camera", source: cameraSource },
];

const canvas = document.querySelector<HTMLCanvasElement>("#view");
const stage = document.querySelector<HTMLElement>("#stage");
const status = document.querySelector<HTMLElement>("#status");
const slider = document.querySelector<HTMLInputElement>("#time");
const sourceBox = document.querySelector<HTMLTextAreaElement>("#source");
const irBox = document.querySelector<HTMLElement>("#ir");
const result = document.querySelector<HTMLElement>("#result");
const examplesBox = document.querySelector<HTMLElement>("#examples");
const transport = document.querySelector<HTMLElement>("#transport");
if (!canvas || !stage || !status || !slider || !sourceBox || !irBox || !result || !examplesBox || !transport) {
  throw new Error("emitter markup missing");
}

const renderer = new CanvasRenderer(canvas);
const clock = new RuntimeClock();
let example = examples[0]!;
let scene: SceneIR | undefined;
let runtime: AnimationRuntime | undefined;
let scrubbing = false;
let lastWall = performance.now();
let roundTrip = "";

for (const item of examples) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = item.label;
  button.addEventListener("click", () => {
    example = item;
    show();
  });
  examplesBox.append(button);
}

const play = document.createElement("button");
play.type = "button";
play.textContent = "Play";
play.addEventListener("click", () => {
  lastWall = performance.now();
  clock.play();
  paintChoices();
});
const pause = document.createElement("button");
pause.type = "button";
pause.textContent = "Pause";
pause.addEventListener("click", () => {
  clock.pause();
  paintChoices();
});
transport.append(play, pause);

function paintChoices(): void {
  for (const button of examplesBox.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.textContent === example.label));
  }
  play.setAttribute("aria-pressed", String(clock.isPlaying));
  pause.setAttribute("aria-pressed", String(!clock.isPlaying));
}

function markFlow(failedAt: string | null): void {
  const order = ["step-source", "step-ira", "step-script", "step-irb", "step-play"];
  const stop = failedAt ? order.indexOf(failedAt) : order.length;
  for (const [index, id] of order.entries()) {
    const item = document.querySelector(`#${id}`);
    item?.classList.toggle("is-done", index < stop);
    item?.classList.toggle("is-failed", id === failedAt);
    item?.classList.remove("is-live");
  }
}

function show(): void {
  const original = compileMotionScript(example.source);
  if (!original.ok || !original.scene) {
    sourceBox.value = example.source;
    irBox.textContent = original.diagnostics.map((item) => item.message).join("\n");
    roundTrip = "The hand-authored file did not compile, so nothing was emitted.";
    result.textContent = roundTrip;
    result.classList.add("is-bad");
    markFlow("step-ira");
    scene = undefined;
    runtime = undefined;
    return;
  }
  const emitted = emitMotionScript(original.scene);
  sourceBox.value = emitted;
  const again = compileMotionScript(emitted);
  if (!again.ok || !again.scene) {
    irBox.textContent = again.diagnostics.map((item) => item.message).join("\n");
    roundTrip = "The emitted MotionScript did not compile back into Scene IR.";
    result.textContent = roundTrip;
    result.classList.add("is-bad");
    markFlow("step-irb");
    scene = undefined;
    runtime = undefined;
    return;
  }
  const mismatch = compare(original.scene, again.scene);
  irBox.textContent = JSON.stringify(again.scene, null, 2);
  scene = again.scene;
  runtime = new AnimationRuntime(scene);
  clock.pause();
  clock.seek(0);
  slider.max = String(scene.timeline.durationMs);
  slider.value = "0";
  if (mismatch) {
    roundTrip = `Scene IR B drifted from Scene IR A: ${mismatch}.`;
    result.classList.add("is-bad");
    markFlow("step-play");
  } else {
    roundTrip = "Scene IR A and Scene IR B draw the same frames. The canvas draws Scene IR B.";
    result.classList.remove("is-bad");
    markFlow(null);
  }
  result.textContent = roundTrip;
  paintChoices();
  draw();
}

function compare(left: SceneIR, right: SceneIR): string {
  const before = new AnimationRuntime(left);
  const after = new AnimationRuntime(right);
  const times = [0, left.timeline.durationMs / 2, left.timeline.durationMs];
  for (const time of times) {
    const mismatch = sameItems(before.evaluate(time).drawItems, after.evaluate(time).drawItems);
    if (mismatch) return `${mismatch} at ${time}ms`;
  }
  return "";
}

function sameItems(left: readonly ResolvedDrawItem[], right: readonly ResolvedDrawItem[]): string {
  if (left.length !== right.length) return `draw count ${left.length} != ${right.length}`;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]!;
    const b = right[index]!;
    if (a.nodeId !== b.nodeId) return a.nodeId;
    for (let cell = 0; cell < a.logicalMatrix.length; cell += 1) {
      if (Math.abs((a.logicalMatrix[cell] ?? 0) - (b.logicalMatrix[cell] ?? 0)) > 1e-3) return `${a.nodeId} drifted`;
    }
  }
  return "";
}

function draw(): void {
  const cssWidth = stage.clientWidth;
  const cssHeight = stage.clientHeight;
  renderer.resize(cssWidth, cssHeight, window.devicePixelRatio || 1);
  if (!scene || !runtime) return;
  renderer.render(runtime.evaluate(clock.timeMs));
  slider.value = String(Math.min(scene.timeline.durationMs, Math.max(0, clock.timeMs)));
  document.querySelector("#step-play")?.classList.toggle("is-live", clock.isPlaying);
  status.textContent = [scene.sceneId, `t ${clock.timeMs.toFixed(1)}ms`, clock.isPlaying ? "playing Scene IR B" : "paused"].join("  ·  ");
}

function tick(now: number): void {
  const delta = Math.min(100, now - lastWall);
  lastWall = now;
  if (clock.isPlaying && !scrubbing && scene) {
    clock.tick(delta);
    if (clock.timeMs >= scene.timeline.durationMs) {
      clock.seek(scene.timeline.durationMs);
      clock.pause();
      paintChoices();
    }
    draw();
  }
  requestAnimationFrame(tick);
}

slider.addEventListener("input", () => {
  clock.seek(Number(slider.value));
  draw();
});
slider.addEventListener("pointerdown", () => {
  scrubbing = true;
});
window.addEventListener("pointerup", () => {
  scrubbing = false;
  lastWall = performance.now();
});

new ResizeObserver(() => draw()).observe(stage);
show();
requestAnimationFrame(tick);
