import { CanvasRenderer } from "@gvr/canvas-renderer";
import { containFit, transformPoint, type ResolvedFrame } from "@gvr/schema";
import { FRAME_CATALOG, buildFrames } from "../../../fixtures/frame-cases";

const frames = buildFrames();
const canvas = document.querySelector<HTMLCanvasElement>("#view");
const stage = document.querySelector<HTMLElement>("#stage");
const caption = document.querySelector<HTMLElement>("#caption");
const status = document.querySelector<HTMLElement>("#status");
const reverseButton = document.querySelector<HTMLButtonElement>("#reverse");
if (!canvas || !stage || !caption || !status || !reverseButton) throw new Error("playground markup missing");

const renderer = new CanvasRenderer(canvas);
const presets = [
  { id: "window", label: "Window", width: 0, height: 0 },
  { id: "16:9", label: "16:9", width: 960, height: 540 },
  { id: "ultrawide", label: "Ultrawide", width: 1200, height: 480 },
  { id: "portrait", label: "Portrait", width: 420, height: 760 },
  { id: "tiny", label: "Tiny", width: 320, height: 200 },
];

let frameId: (typeof FRAME_CATALOG)[number]["id"] = "primitive-gallery";
let presetId = "window";
let dprMode: "device" | "1" | "2" = "device";
let reversed = false;

function selectedDpr(): number {
  if (dprMode === "1") return 1;
  if (dprMode === "2") return 2;
  return window.devicePixelRatio || 1;
}

function currentFrame(): ResolvedFrame {
  const frame = frames[frameId];
  if (!frame) throw new Error(`missing frame ${frameId}`);
  if (!reversed) return frame;
  return { ...frame, drawItems: [...frame.drawItems].reverse() };
}

function cssSize(): { width: number; height: number } {
  const preset = presets.find((entry) => entry.id === presetId);
  if (preset && preset.width > 0) return { width: preset.width, height: preset.height };
  return { width: stage.clientWidth, height: stage.clientHeight };
}

function draw(): void {
  const frame = currentFrame();
  const size = cssSize();
  const dpr = selectedDpr();
  renderer.resize(size.width, size.height, dpr);
  renderer.render(frame);
  const fit = containFit(frame.viewport, size.width, size.height);
  const catalog = FRAME_CATALOG.find((entry) => entry.id === frameId);
  caption.textContent = catalog?.caption ?? "";
  status.textContent = [
    frameId,
    `css ${Math.round(size.width)}×${Math.round(size.height)}`,
    `backing ${canvas.width}×${canvas.height}`,
    `dpr ${dpr}`,
    `fit ${fit.scale.toFixed(3)}`,
    `offset ${fit.offsetX.toFixed(1)}, ${fit.offsetY.toFixed(1)}`,
    reversed ? "order reversed" : "authored order",
  ].join("  ·  ");
  const logicalToDevice = (x: number, y: number) => {
    const point = transformPoint(fit.matrix, x, y);
    return { x: point.x * dpr, y: point.y * dpr };
  };
  window.__gvr = { canvas, logicalToDevice, frame };
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
  const fixtureHost = document.querySelector("#fixtures");
  const sizeHost = document.querySelector("#sizes");
  const densityHost = document.querySelector("#density");
  if (!fixtureHost || !sizeHost || !densityHost) return;
  fixtureHost.replaceChildren(
    ...FRAME_CATALOG.map((entry) =>
      button(entry.label, entry.id === frameId, () => {
        frameId = entry.id;
        reversed = false;
        paintChoices();
        draw();
      }),
    ),
  );
  sizeHost.replaceChildren(
    ...presets.map((entry) =>
      button(entry.label, entry.id === presetId, () => {
        presetId = entry.id;
        paintChoices();
        draw();
      }),
    ),
  );
  densityHost.replaceChildren(
    ...(["device", "1", "2"] as const).map((mode) =>
      button(mode === "device" ? "Device DPR" : `${mode}×`, dprMode === mode, () => {
        dprMode = mode;
        paintChoices();
        draw();
      }),
    ),
  );
  reverseButton.hidden = frameId !== "z-order";
  reverseButton.setAttribute("aria-pressed", String(reversed));
}

reverseButton.addEventListener("click", () => {
  reversed = !reversed;
  paintChoices();
  draw();
});

new ResizeObserver(() => {
  if (presetId === "window") draw();
}).observe(stage);

paintChoices();
draw();

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
