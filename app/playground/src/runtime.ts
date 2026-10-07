import { CanvasRenderer } from "@gvr/canvas-renderer";
import { AnimationRuntime, RuntimeClock } from "@gvr/runtime";
import { containFit, transformPoint, type ResolvedFrame } from "@gvr/schema";
import { buildRuntimeScenes, type RuntimeSceneEntry } from "../../../fixtures/runtime-scenes";

const entries = buildRuntimeScenes();
const canvas = document.querySelector<HTMLCanvasElement>("#view");
const stage = document.querySelector<HTMLElement>("#stage");
const caption = document.querySelector<HTMLElement>("#caption");
const status = document.querySelector<HTMLElement>("#status");
const slider = document.querySelector<HTMLInputElement>("#time");
if (!canvas || !stage || !caption || !status || !slider) throw new Error("runtime markup missing");

const renderer = new CanvasRenderer(canvas);
const clock = new RuntimeClock();
let entry: RuntimeSceneEntry = entries[0] ?? fail("no scenes");
let runtime = new AnimationRuntime(entry.scene);
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
  const scenes = document.querySelector("#scenes");
  const transport = document.querySelector("#transport");
  if (!scenes || !transport) return;
  scenes.replaceChildren(
    ...entries.map((item) =>
      button(item.label, item.id === entry.id, () => {
        entry = item;
        runtime = new AnimationRuntime(entry.scene);
        clock.pause();
        clock.seek(0);
        slider.max = String(entry.scene.timeline.durationMs);
        slider.value = "0";
        paintChoices();
        draw();
      }),
    ),
  );
  transport.replaceChildren(
    button("Play", clock.isPlaying, () => {
      if (clock.timeMs >= entry.scene.timeline.durationMs) clock.seek(0);
      lastWall = performance.now();
      clock.play();
      paintChoices();
    }),
    button("Pause", !clock.isPlaying, () => {
      clock.pause();
      paintChoices();
    }),
    button("1×", clock.playbackRate === 1, () => {
      clock.setRate(1);
      paintChoices();
    }),
    button("2×", clock.playbackRate === 2, () => {
      clock.setRate(2);
      paintChoices();
    }),
  );
}

function origins(frame: ResolvedFrame): Record<string, { x: number; y: number }> {
  const points: Record<string, { x: number; y: number }> = {};
  for (const id of entry.watch) {
    const item = frame.drawItems.find((draw) => draw.nodeId === id);
    if (!item) continue;
    points[id] = transformPoint(item.logicalMatrix, 0, 0);
  }
  return points;
}

function draw(): void {
  const frame = runtime.evaluate(clock.timeMs);
  const cssWidth = stage.clientWidth;
  const cssHeight = stage.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  renderer.resize(cssWidth, cssHeight, dpr);
  renderer.render(frame);
  const fit = containFit(frame.viewport, cssWidth, cssHeight);
  const points = origins(frame);
  caption.textContent = entry.caption;
  const watched = Object.entries(points)
    .map(([id, point]) => `${id} ${point.x.toFixed(2)}, ${point.y.toFixed(2)}`)
    .join("  ·  ");
  status.textContent = [
    entry.id,
    `t ${clock.timeMs.toFixed(1)}ms`,
    clock.isPlaying ? "playing" : "paused",
    `rate ${clock.playbackRate}`,
    runtime.degraded ? "degraded" : "clean",
    watched,
  ].join("  ·  ");
  slider.value = String(Math.min(entry.scene.timeline.durationMs, Math.max(0, clock.timeMs)));
  const logicalToDevice = (x: number, y: number) => {
    const point = transformPoint(fit.matrix, x, y);
    return { x: point.x * dpr, y: point.y * dpr };
  };
  window.__gvr = {
    canvas,
    logicalToDevice,
    frame,
    seek: (sceneTimeMs: number) => {
      clock.seek(sceneTimeMs);
      draw();
    },
    probe: () => ({
      sceneId: entry.id,
      timeMs: clock.timeMs,
      playing: clock.isPlaying,
      rate: clock.playbackRate,
      degraded: runtime.degraded,
      diagnostics: runtime.lastDiagnostics.map((item) => item.message),
      origins: origins(runtime.evaluate(clock.timeMs)),
    }),
  };
}

function tick(now: number): void {
  const delta = Math.min(100, now - lastWall);
  lastWall = now;
  if (clock.isPlaying && !scrubbing) {
    clock.tick(delta);
    if (clock.timeMs >= entry.scene.timeline.durationMs) {
      clock.seek(entry.scene.timeline.durationMs);
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
slider.max = String(entry.scene.timeline.durationMs);
paintChoices();
draw();
requestAnimationFrame(tick);

declare global {
  interface Window {
    __gvr?: {
      canvas: HTMLCanvasElement;
      logicalToDevice: (x: number, y: number) => { x: number; y: number };
      frame: ResolvedFrame;
      seek?: (sceneTimeMs: number) => void;
      probe?: () => {
        sceneId: string;
        timeMs: number;
        playing: boolean;
        rate: number;
        degraded: boolean;
        diagnostics: string[];
        origins: Record<string, { x: number; y: number }>;
      };
    };
  }
}
