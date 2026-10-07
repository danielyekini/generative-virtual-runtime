import { CanvasRenderer } from "@gvr/canvas-renderer";
import { createIncrementalProgram, type IncrementalProgram } from "@gvr/compiler";
import { PlaybackClock, StreamingRuntime } from "@gvr/runtime";
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
  {
    id: "bunny",
    label: "Bunny",
    caption: "The file arrives in small pieces. Playback starts at the first seal, waits at 2s, then continues when the rest is sealed.",
    source: bunnySource,
  },
  { id: "ball", label: "Ball", caption: "The same ball program, fed one packet at a time.", source: ballSource },
  { id: "caption", label: "Caption", caption: "This program seals only when it completes, then plays from the start.", source: captionSource },
  { id: "nested", label: "Nested", caption: "The wheel is hidden until the whole group has arrived.", source: nestedSource },
  { id: "diagram", label: "Diagram", caption: "The diagram is compiled from packets, then played.", source: diagramSource },
  { id: "camera", label: "Camera", caption: "The camera seals the pan, waits, then receives the zoom.", source: cameraSource },
];

type Phase = "idle" | "setup" | "wait" | "dwell" | "rest" | "done";

const canvas = document.querySelector<HTMLCanvasElement>("#view");
const stage = document.querySelector<HTMLElement>("#stage");
const caption = document.querySelector<HTMLElement>("#caption");
const status = document.querySelector<HTMLElement>("#status");
const slider = document.querySelector<HTMLInputElement>("#time");
const diagnosticsBox = document.querySelector<HTMLElement>("#diagnostics");
const fed = document.querySelector<HTMLElement>("#fed");
const rest = document.querySelector<HTMLElement>("#rest");
const streamButton = document.querySelector<HTMLButtonElement>("#stream");
const sourceWindow = document.querySelector<HTMLElement>("#source-window");
const sourceBar = document.querySelector<HTMLElement>("#source-bar");
const sourceMin = document.querySelector<HTMLButtonElement>("#source-min");
if (!canvas || !stage || !caption || !status || !slider || !diagnosticsBox || !fed || !rest || !streamButton || !sourceWindow || !sourceBar || !sourceMin) {
  throw new Error("streaming markup missing");
}

let dragOffset: { x: number; y: number } | null = null;

sourceMin.addEventListener("click", () => {
  const minimized = sourceWindow.classList.toggle("is-min");
  sourceMin.textContent = minimized ? "Maximise" : "Minimise";
  if (minimized) {
    sourceWindow.dataset.width = sourceWindow.style.width;
    sourceWindow.style.width = "240px";
  } else {
    sourceWindow.style.width = sourceWindow.dataset.width || "";
  }
});

sourceBar.addEventListener("pointerdown", (event) => {
  if (event.target === sourceMin) return;
  const rect = sourceWindow.getBoundingClientRect();
  dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  sourceBar.setPointerCapture(event.pointerId);
});

sourceBar.addEventListener("pointermove", (event) => {
  if (!dragOffset) return;
  const width = sourceWindow.offsetWidth;
  const x = Math.min(window.innerWidth - 80, Math.max(0, event.clientX - dragOffset.x));
  const y = Math.min(window.innerHeight - 36, Math.max(0, event.clientY - dragOffset.y));
  sourceWindow.style.left = `${x}px`;
  sourceWindow.style.top = `${y}px`;
  sourceWindow.style.right = "auto";
  sourceWindow.style.width = `${width}px`;
});

sourceBar.addEventListener("pointerup", () => {
  dragOffset = null;
});

const renderer = new CanvasRenderer(canvas);
const clock = new PlaybackClock();
let example = examples[0] ?? fail("no examples");
let program: IncrementalProgram = createIncrementalProgram();
let runtime = new StreamingRuntime();
let cursor = 0;
let phase: Phase = "idle";
let dwellUntil = 0;
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
        reset();
        paintChoices();
      }),
    ),
  );
  transport.replaceChildren(
    button("Play", clock.playbackState === "playing", () => {
      lastWall = performance.now();
      clock.play();
      paintChoices();
    }),
    button("Pause", clock.playbackState === "paused", () => {
      clock.pause();
      paintChoices();
    }),
  );
}

function reset(): void {
  program = createIncrementalProgram();
  runtime = new StreamingRuntime();
  cursor = 0;
  phase = "idle";
  clock.stop();
  slider.value = "0";
  draw();
}

function publish(): void {
  for (const delta of program.drainDeltas()) runtime.enqueue(delta);
  runtime.flushCommands();
  const duration = runtime.scene?.timeline.durationMs ?? 0;
  clock.setHorizon(runtime.sealedThroughMs, duration, runtime.authoringComplete);
  slider.max = String(Math.max(duration, runtime.sealedThroughMs, 1));
}

function feed(count: number): void {
  const chunk = example.source.slice(cursor, cursor + count);
  if (chunk.length === 0) return;
  cursor += chunk.length;
  program.push(chunk);
  publish();
}

function finishFeed(): void {
  program.finish();
  publish();
  if (clock.playbackState === "stopped" || clock.playbackState === "paused") {
    lastWall = performance.now();
    clock.play();
  }
  phase = "done";
  paintChoices();
}

function draw(): void {
  const cssWidth = stage.clientWidth;
  const cssHeight = stage.clientHeight;
  renderer.resize(cssWidth, cssHeight, window.devicePixelRatio || 1);
  if (runtime.scene) renderer.render(runtime.evaluate(clock.timeMs));
  fed.textContent = example.source.slice(0, cursor);
  rest.textContent = example.source.slice(cursor);
  diagnosticsBox.textContent = program.diagnostics.map((item) => item.message).join("\n");
  caption.textContent = example.caption;
  slider.value = String(Math.min(Number(slider.max), Math.max(0, clock.timeMs)));
  status.textContent = [
    example.id,
    `units ${program.parsedUnits}`,
    `revision ${program.revision}`,
    `sealed ${program.sealedThroughMs.toFixed(0)}ms`,
    `t ${clock.timeMs.toFixed(1)}ms`,
    clock.playbackState,
    `fed ${cursor}/${example.source.length}`,
  ].join("  ·  ");
  window.__gvr = {
    canvas,
    probe: () => ({
      sceneId: runtime.scene?.sceneId ?? "",
      timeMs: clock.timeMs,
      playing: clock.playbackState === "playing",
      rate: clock.playbackRate,
      degraded: runtime.degraded,
      diagnostics: program.diagnostics.map((item) => item.message),
      origins: {},
      state: clock.playbackState,
      sealedThroughMs: program.sealedThroughMs,
      revision: program.revision,
      parsedUnits: program.parsedUnits,
      phase,
    }),
  };
}

function tick(now: number): void {
  let delta = Math.min(100, now - lastWall);
  lastWall = now;
  if (phase === "setup") {
    feed(40);
    if (program.sealedThroughMs > 0) {
      clock.play();
      phase = "wait";
      delta = 0;
      paintChoices();
    } else if (cursor >= example.source.length) finishFeed();
  } else if (phase === "wait" && clock.playbackState === "waiting_for_content") {
    phase = "dwell";
    dwellUntil = now + 900;
  } else if (phase === "dwell" && now >= dwellUntil) {
    phase = "rest";
  } else if (phase === "rest") {
    feed(24);
    if (cursor >= example.source.length) finishFeed();
  }
  if (!scrubbing && (clock.playbackState === "playing" || clock.playbackState === "waiting_for_content")) {
    clock.tick(delta);
  }
  draw();
  requestAnimationFrame(tick);
}

streamButton.addEventListener("click", () => {
  reset();
  phase = "setup";
  lastWall = performance.now();
  paintChoices();
});
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
paintChoices();
reset();
requestAnimationFrame(tick);

declare global {
  interface Window {
    __gvr?: {
      canvas: HTMLCanvasElement;
      probe?: () => {
        sceneId: string;
        timeMs: number;
        playing: boolean;
        rate: number;
        degraded: boolean;
        diagnostics: string[];
        origins: Record<string, { x: number; y: number }>;
        state?: string;
        sealedThroughMs?: number;
        revision?: number;
        parsedUnits?: number;
        phase?: string;
      };
    };
  }
}
