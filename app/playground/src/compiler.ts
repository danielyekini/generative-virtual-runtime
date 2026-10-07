import { CanvasRenderer } from "@gvr/canvas-renderer";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime, RuntimeClock } from "@gvr/runtime";
import { validateSceneIR, type SceneIR } from "@gvr/schema";
import ballSource from "../../../fixtures/motionscript/ball.ms?raw";
import bunnySource from "../../../fixtures/motionscript/bunny.ms?raw";
import cameraSource from "../../../fixtures/motionscript/camera.ms?raw";
import captionSource from "../../../fixtures/motionscript/caption.ms?raw";
import diagramSource from "../../../fixtures/motionscript/diagram.ms?raw";
import nestedSource from "../../../fixtures/motionscript/nested.ms?raw";

interface Example {
  id: string;
  label: string;
  caption: string;
  source: string;
}

const examples: Example[] = [
  { id: "bunny", label: "Bunny", caption: "Nested rabbit, hop, then a sealed zoom.", source: bunnySource },
  { id: "ball", label: "Ball", caption: "A ball travels and bounces on an expression.", source: ballSource },
  { id: "caption", label: "Caption", caption: "A caption rises and fades in.", source: captionSource },
  { id: "nested", label: "Nested", caption: "A wheel and its spoke rotate together.", source: nestedSource },
  { id: "diagram", label: "Diagram", caption: "The sample follows the same two quadratics the curve is drawn with.", source: diagramSource },
  { id: "camera", label: "Camera", caption: "The camera pans, seals, then zooms. The caption stays on screen.", source: cameraSource },
];

const canvas = document.querySelector<HTMLCanvasElement>("#view");
const stage = document.querySelector<HTMLElement>("#stage");
const caption = document.querySelector<HTMLElement>("#caption");
const status = document.querySelector<HTMLElement>("#status");
const slider = document.querySelector<HTMLInputElement>("#time");
const sourceBox = document.querySelector<HTMLTextAreaElement>("#source");
const diagnosticsBox = document.querySelector<HTMLElement>("#diagnostics");
const compileButton = document.querySelector<HTMLButtonElement>("#compile");
if (!canvas || !stage || !caption || !status || !slider || !sourceBox || !diagnosticsBox || !compileButton) {
  throw new Error("compiler markup missing");
}

const renderer = new CanvasRenderer(canvas);
const clock = new RuntimeClock();
let example = examples[0] ?? fail("no examples");
let scene: SceneIR | undefined;
let runtime: AnimationRuntime | undefined;
let compileMessages: string[] = [];
let compileOk = false;
let scrubbing = false;
let lastWall = performance.now();

function fail(message: string): never {
  throw new Error(message);
}

function button(label: string, pressed: boolean, onClick: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.setAttribute("aria-pressed", String(pressed));
  element.addEventListener("click", onClick);
  return element;
}

function paintChoices(): void {
  const list = document.querySelector("#examples");
  const transport = document.querySelector("#transport");
  if (!list || !transport) return;
  list.replaceChildren(
    ...examples.map((item) =>
      button(item.label, item.id === example.id, () => {
        example = item;
        sourceBox.value = item.source;
        paintChoices();
        compileSource();
      }),
    ),
  );
  transport.replaceChildren(
    button("Play", clock.isPlaying, () => {
      if (!scene) return;
      if (clock.timeMs >= scene.timeline.durationMs) clock.seek(0);
      lastWall = performance.now();
      clock.play();
      paintChoices();
    }),
    button("Pause", !clock.isPlaying, () => {
      clock.pause();
      paintChoices();
    }),
  );
}

function compileSource(): void {
  const result = compileMotionScript(sourceBox.value);
  compileMessages = result.diagnostics.map((item) => item.message);
  compileOk = result.ok;
  diagnosticsBox.textContent = compileMessages.join("\n");
  if (result.scene && validateSceneIR(result.scene).ok) {
    scene = result.scene;
    runtime = new AnimationRuntime(scene);
    clock.pause();
    clock.seek(0);
    slider.max = String(scene.timeline.durationMs);
    slider.value = "0";
    paintChoices();
  }
  draw();
}

function draw(): void {
  const cssWidth = stage.clientWidth;
  const cssHeight = stage.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  renderer.resize(cssWidth, cssHeight, dpr);
  caption.textContent = example.caption;
  if (!scene || !runtime) {
    status.textContent = "Nothing accepted yet.";
    window.__gvr = { canvas, compileOk, sourceDiagnostics: compileMessages };
    return;
  }
  const frame = runtime.evaluate(clock.timeMs);
  renderer.render(frame);
  slider.value = String(Math.min(scene.timeline.durationMs, Math.max(0, clock.timeMs)));
  status.textContent = [
    scene.sceneId,
    compileOk ? "compiled" : "partial",
    `${compileMessages.length} diagnostics`,
    `t ${clock.timeMs.toFixed(1)}ms`,
    clock.isPlaying ? "playing" : "paused",
  ].join("  ·  ");
  window.__gvr = {
    canvas,
    frame,
    compileOk,
    sourceDiagnostics: compileMessages,
    seek: (sceneTimeMs: number) => {
      clock.seek(sceneTimeMs);
      draw();
    },
    probe: () => ({
      sceneId: scene?.sceneId ?? "",
      timeMs: clock.timeMs,
      playing: clock.isPlaying,
      rate: clock.playbackRate,
      degraded: runtime?.degraded ?? false,
      diagnostics: runtime?.lastDiagnostics.map((item) => item.message) ?? [],
      origins: {},
      compileOk,
      sourceDiagnostics: compileMessages,
      nodeCount: scene?.nodes.length ?? 0,
    }),
  };
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

compileButton.addEventListener("click", compileSource);
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
sourceBox.value = example.source;
paintChoices();
compileSource();
requestAnimationFrame(tick);

declare global {
  interface Window {
    __gvr?: {
      canvas: HTMLCanvasElement;
      logicalToDevice?: (x: number, y: number) => { x: number; y: number };
      frame?: import("@gvr/schema").ResolvedFrame;
      seek?: (sceneTimeMs: number) => void;
      compileOk?: boolean;
      sourceDiagnostics?: string[];
      probe?: () => {
        sceneId: string;
        timeMs: number;
        playing: boolean;
        rate: number;
        degraded: boolean;
        diagnostics: string[];
        origins: Record<string, { x: number; y: number }>;
        compileOk?: boolean;
        sourceDiagnostics?: string[];
        nodeCount?: number;
      };
    };
  }
}
