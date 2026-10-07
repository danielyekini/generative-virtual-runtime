import lottie from "lottie-web";
import { CanvasRenderer } from "@gvr/canvas-renderer";
import { AnimationRuntime } from "@gvr/runtime";
import type { SceneIR } from "@gvr/schema";

interface Sample {
  id: string;
  label: string;
  fraction: number;
  sourceTimeMs: number;
  lottieFrame?: number;
  svgTimeSec?: number;
}

interface Job {
  id: string;
  format: "lottie" | "svg";
  sourceUrl: string;
  sceneUrl: string | null;
  sceneKind: string;
  cssWidth: number;
  cssHeight: number;
  background: string;
  samples: Sample[];
}

interface Prepared {
  ok: boolean;
  notes: string[];
  reference: "canvas" | "screenshot" | "none";
  native: boolean;
}

const logs: string[] = [];
const stage = document.querySelector<HTMLDivElement>("#stage")!;
const nativeCanvas = document.querySelector<HTMLCanvasElement>("#native")!;
let jobs: Job[] = [];
let current: Job | undefined;
let player: { goToAndStop: (frame: number, isFrame: boolean) => void; destroy: () => void; renderer?: { canvas?: HTMLCanvasElement } } | undefined;
let svgRoot: SVGSVGElement | undefined;
let runtime: AnimationRuntime | undefined;
let renderer: CanvasRenderer | undefined;
let scene: SceneIR | undefined;
let referenceCanvas: HTMLCanvasElement | undefined;

function pushLog(kind: string, value: unknown): void {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  logs.push(`${kind}: ${text}`);
}

window.addEventListener("error", (event) => pushLog("error", event.message));
window.addEventListener("unhandledrejection", (event) => pushLog("rejection", String(event.reason)));
const originalError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  pushLog("console.error", args.map(String).join(" "));
  originalError(...args);
};
const originalWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  pushLog("console.warn", args.map(String).join(" "));
  originalWarn(...args);
};

const playerApi = (lottie as unknown as { loadAnimation?: typeof lottie.loadAnimation }).loadAnimation
  ? (lottie as unknown as { loadAnimation: typeof lottie.loadAnimation })
  : (lottie as unknown as { default: { loadAnimation: typeof lottie.loadAnimation } }).default;

async function boot(): Promise<void> {
  const response = await fetch("/render-jobs.json");
  const body = (await response.json()) as { jobs: Job[] };
  jobs = body.jobs;
  (window as unknown as { __ready: boolean }).__ready = true;
}

function reset(): void {
  player?.destroy();
  player = undefined;
  svgRoot = undefined;
  runtime = undefined;
  renderer?.dispose();
  renderer = undefined;
  scene = undefined;
  referenceCanvas = undefined;
  stage.replaceChildren();
  stage.style.display = "block";
  nativeCanvas.style.display = "block";
}

async function prepare(id: string): Promise<Prepared> {
  logs.length = 0;
  reset();
  current = jobs.find((job) => job.id === id);
  const notes: string[] = [];
  if (!current) return { ok: false, notes: ["missing job"], reference: "none", native: false };
  stage.style.width = `${current.cssWidth}px`;
  stage.style.height = `${current.cssHeight}px`;
  stage.style.background = current.background;
  const sourceResponse = await fetch(current.sourceUrl);
  if (!sourceResponse.ok) notes.push(`source HTTP ${sourceResponse.status}`);
  if (current.format === "lottie") {
    const data = await sourceResponse.json();
    stage.style.display = "block";
    referenceCanvas = undefined;
    const host = document.createElement("div");
    host.style.width = `${current.cssWidth}px`;
    host.style.height = `${current.cssHeight}px`;
    stage.append(host);
    const animation = playerApi.loadAnimation({
      container: host,
      renderer: "canvas",
      loop: false,
      autoplay: false,
      animationData: data,
      rendererSettings: { clearCanvas: true, preserveAspectRatio: "xMidYMid meet", dpr: 1 },
    });
    player = animation;
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      animation.addEventListener("DOMLoaded", finish);
      animation.addEventListener("data_failed", () => {
        notes.push("lottie-web data_failed");
        finish();
      });
      window.setTimeout(finish, 8000);
    });
    const canvas = host.querySelector("canvas");
    if (canvas) referenceCanvas = canvas;
    else notes.push("lottie-web did not create a canvas");
  } else {
    const text = await sourceResponse.text();
    const parsed = new DOMParser().parseFromString(text, "image/svg+xml");
    const root = parsed.documentElement;
    if (!(root instanceof SVGSVGElement)) {
      notes.push("DOMParser did not produce an SVG root");
    } else {
      root.setAttribute("width", String(current.cssWidth));
      root.setAttribute("height", String(current.cssHeight));
      stage.style.display = "block";
      stage.append(root);
      svgRoot = root;
      const images = [...root.querySelectorAll("image")];
      await Promise.all(
        images.map(async (image) => {
          try {
            if ("decode" in image && typeof image.decode === "function") await image.decode();
          } catch (error) {
            notes.push(`image decode failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        }),
      );
      try {
        root.setCurrentTime(0);
        root.pauseAnimations();
      } catch (error) {
        notes.push(`setCurrentTime failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  if (current.sceneUrl) {
    const sceneResponse = await fetch(current.sceneUrl);
    if (!sceneResponse.ok) notes.push(`scene HTTP ${sceneResponse.status}`);
    else {
      scene = (await sceneResponse.json()) as SceneIR;
      runtime = new AnimationRuntime(scene);
      renderer = new CanvasRenderer(nativeCanvas);
      renderer.resize(current.cssWidth, current.cssHeight, 1);
      nativeCanvas.style.left = `${current.cssWidth + 40}px`;
    }
  } else notes.push("no production scene to render");

  return {
    ok: notes.length === 0 || Boolean(referenceCanvas || svgRoot),
    notes,
    reference: referenceCanvas ? "canvas" : svgRoot ? "screenshot" : "none",
    native: Boolean(runtime && renderer),
  };
}

async function seek(which: "reference" | "native", index: number): Promise<{ ok: boolean; ms: number; note: string }> {
  if (!current) return { ok: false, ms: 0, note: "no fixture" };
  const sample = current.samples[index];
  if (!sample) return { ok: false, ms: 0, note: "no sample" };
  const start = performance.now();
  if (which === "reference") {
    if (player && sample.lottieFrame !== undefined) {
      player.goToAndStop(sample.lottieFrame, true);
      await frame();
      return { ok: Boolean(referenceCanvas), ms: performance.now() - start, note: `lottie frame ${sample.lottieFrame}` };
    }
    if (svgRoot && sample.svgTimeSec !== undefined) {
      try {
        svgRoot.setCurrentTime(sample.svgTimeSec);
      } catch (error) {
        return { ok: false, ms: performance.now() - start, note: error instanceof Error ? error.message : String(error) };
      }
      await frame();
      return { ok: true, ms: performance.now() - start, note: `svg time ${sample.svgTimeSec}` };
    }
    return { ok: false, ms: 0, note: "reference player unavailable" };
  }
  if (!runtime || !renderer || !scene) return { ok: false, ms: 0, note: "native runtime unavailable" };
  const timeMs = Math.min(sample.sourceTimeMs, scene.timeline.durationMs);
  try {
    const frameValue = runtime.evaluate(timeMs);
    renderer.render(frameValue);
  } catch (error) {
    return { ok: false, ms: performance.now() - start, note: error instanceof Error ? error.message : String(error) };
  }
  return {
    ok: true,
    ms: performance.now() - start,
    note: `native ${timeMs} ms of scene duration ${scene.timeline.durationMs} ms`,
  };
}

function referencePNG(): string | null {
  if (!referenceCanvas || !current) return null;
  const backing = document.createElement("canvas");
  backing.width = referenceCanvas.width;
  backing.height = referenceCanvas.height;
  const context = backing.getContext("2d");
  if (!context) return null;
  context.fillStyle = current.background;
  context.fillRect(0, 0, backing.width, backing.height);
  context.drawImage(referenceCanvas, 0, 0);
  return backing.toDataURL("image/png");
}

function nativePNG(): string | null {
  if (!renderer) return null;
  return nativeCanvas.toDataURL("image/png");
}

function referenceRect(): { x: number; y: number; width: number; height: number } | null {
  if (!svgRoot) return null;
  const rect = stage.getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

let controlSvg: SVGSVGElement | undefined;

async function runSvgControl(): Promise<{ x: number; y: number; width: number; height: number }> {
  reset();
  logs.length = 0;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "80");
  svg.setAttribute("height", "40");
  svg.setAttribute("viewBox", "0 0 80 40");
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", "0");
  rect.setAttribute("y", "0");
  rect.setAttribute("width", "80");
  rect.setAttribute("height", "40");
  rect.setAttribute("fill", "red");
  const animate = document.createElementNS("http://www.w3.org/2000/svg", "animate");
  animate.setAttribute("attributeName", "fill");
  animate.setAttribute("from", "red");
  animate.setAttribute("to", "blue");
  animate.setAttribute("dur", "2s");
  animate.setAttribute("fill", "freeze");
  rect.append(animate);
  svg.append(rect);
  stage.style.width = "80px";
  stage.style.height = "40px";
  stage.style.background = "#000000";
  stage.append(svg);
  controlSvg = svg;
  svg.setCurrentTime(0);
  svg.pauseAnimations();
  await frame();
  const box = stage.getBoundingClientRect();
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

async function seekSvgControl(timeSec: number): Promise<{ x: number; y: number; width: number; height: number }> {
  if (!controlSvg) throw new Error("SVG control is not prepared.");
  controlSvg.setCurrentTime(timeSec);
  await frame();
  const box = stage.getBoundingClientRect();
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

function frame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

async function runLottieControl(): Promise<{ start: string | null; mid: string | null; note: string }> {
  reset();
  const data = {
    v: "5.7.0",
    fr: 30,
    ip: 0,
    op: 30,
    w: 100,
    h: 100,
    nm: "control",
    layers: [
      {
        ty: 4,
        nm: "box",
        ind: 1,
        ip: 0,
        op: 30,
        st: 0,
        ks: {
          a: { a: 0, k: [0, 0] },
          p: { a: 1, k: [{ t: 0, s: [10, 50] }, { t: 30, s: [80, 50] }] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 },
        },
        shapes: [
          { ty: "rc", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [20, 20] }, r: { a: 0, k: 0 } },
          { ty: "fl", c: { a: 0, k: [1, 0, 0, 1] }, o: { a: 0, k: 100 } },
        ],
      },
    ],
  };
  const host = document.createElement("div");
  host.style.width = "100px";
  host.style.height = "100px";
  stage.style.width = "100px";
  stage.style.height = "100px";
  stage.append(host);
  const animation = playerApi.loadAnimation({
    container: host,
    renderer: "canvas",
    loop: false,
    autoplay: false,
    animationData: data,
    rendererSettings: { clearCanvas: true, dpr: 1 },
  });
  await new Promise<void>((resolve) => {
    animation.addEventListener("DOMLoaded", () => resolve());
    window.setTimeout(resolve, 3000);
  });
  const canvas = host.querySelector("canvas");
  if (!canvas) return { start: null, mid: null, note: "control canvas missing" };
  const snap = () => {
    const backing = document.createElement("canvas");
    backing.width = canvas.width;
    backing.height = canvas.height;
    const context = backing.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#101014";
    context.fillRect(0, 0, backing.width, backing.height);
    context.drawImage(canvas, 0, 0);
    return backing.toDataURL("image/png");
  };
  animation.goToAndStop(0, true);
  await frame();
  const start = snap();
  animation.goToAndStop(15, true);
  await frame();
  const mid = snap();
  animation.destroy();
  return { start, mid, note: `${canvas.width}x${canvas.height}` };
}

const api = {
  prepare,
  seek,
  referencePNG,
  nativePNG,
  referenceRect,
  logs: () => logs.slice(),
  runSvgControl,
  seekSvgControl,
  runLottieControl,
  userAgent: navigator.userAgent,
};
Object.assign(window, api);
void boot();
