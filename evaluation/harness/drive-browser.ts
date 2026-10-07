/**
 * Renders every render job in headless Chrome.
 * Reference: lottie-web 5.13 canvas, or the browser SVG document for SMIL.
 * Native: production CanvasRenderer + AnimationRuntime on the saved scene.
 *
 *   npx tsx evaluation/harness/drive-browser.ts
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromeVersion, resolveChromeBinary } from "./chrome";
import { classifyCapture } from "./render-status";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../package.json"));
const { PNG } = require("pngjs") as typeof import("pngjs");

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const evidence = resolve(repo, "evaluation/evidence");
const pageUrl = "http://127.0.0.1:5199/";

interface Job {
  id: string;
  format: string;
  samples: { id: string; label: string }[];
  sceneKind: string;
  cssWidth: number;
  cssHeight: number;
}

class Cdp {
  private id = 0;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  constructor(private socket: WebSocket) {
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: { message: string } };
      if (!message.id || !this.pending.has(message.id)) return;
      const waiter = this.pending.get(message.id)!;
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
    });
  }
  send(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<any> {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
}

function pngFromDataUrl(value: string): PNG {
  const base64 = value.replace(/^data:image\/png;base64,/, "");
  return PNG.sync.read(Buffer.from(base64, "base64"));
}

function compare(reference: PNG, native: PNG): { comparable: boolean; width: number; height: number; nativeWidth: number; nativeHeight: number; meanDistance: number; fractionBeyond: number; diff?: PNG } {
  if (reference.width !== native.width || reference.height !== native.height) {
    return { comparable: false, width: reference.width, height: reference.height, nativeWidth: native.width, nativeHeight: native.height, meanDistance: Number.NaN, fractionBeyond: Number.NaN };
  }
  const diff = new PNG({ width: reference.width, height: reference.height });
  let sum = 0;
  let beyond = 0;
  const pixels = reference.width * reference.height;
  for (let index = 0; index < pixels; index += 1) {
    const offset = index * 4;
    const dr = Math.abs(reference.data[offset] - native.data[offset]);
    const dg = Math.abs(reference.data[offset + 1] - native.data[offset + 1]);
    const db = Math.abs(reference.data[offset + 2] - native.data[offset + 2]);
    const distance = Math.hypot(dr, dg, db);
    sum += distance;
    const hot = distance > 24;
    if (hot) beyond += 1;
    if (hot) {
      diff.data[offset] = 255;
      diff.data[offset + 1] = 40;
      diff.data[offset + 2] = 40;
    } else {
      const gray = (reference.data[offset] + reference.data[offset + 1] + reference.data[offset + 2]) / 3;
      diff.data[offset] = gray;
      diff.data[offset + 1] = gray;
      diff.data[offset + 2] = gray;
    }
    diff.data[offset + 3] = 255;
  }
  return { comparable: true, width: reference.width, height: reference.height, nativeWidth: native.width, nativeHeight: native.height, meanDistance: sum / pixels, fractionBeyond: beyond / pixels, diff };
}

function strip(reference: PNG, native: PNG | null, diff: PNG | null): PNG {
  const width = reference.width + (native?.width ?? reference.width) + (diff?.width ?? 0);
  const height = Math.max(reference.height, native?.height ?? 0, diff?.height ?? 0);
  const image = new PNG({ width, height });
  image.data.fill(20);
  blit(image, reference, 0, 0);
  if (native) blit(image, native, reference.width, 0);
  if (diff) blit(image, diff, reference.width + (native?.width ?? 0), 0);
  return image;
}

function blit(target: PNG, source: PNG, x: number, y: number): void {
  for (let row = 0; row < source.height; row += 1) {
    for (let col = 0; col < source.width; col += 1) {
      const from = (row * source.width + col) * 4;
      const to = ((row + y) * target.width + (col + x)) * 4;
      target.data[to] = source.data[from];
      target.data[to + 1] = source.data[from + 1];
      target.data[to + 2] = source.data[from + 2];
      target.data[to + 3] = 255;
    }
  }
}

async function evaluate<T>(cdp: Cdp, sessionId: string, expression: string): Promise<T> {
  const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails.exception?.description || result.exceptionDetails));
  }
  return result.result.value as T;
}

async function screenshot(cdp: Cdp, sessionId: string, clip: { x: number; y: number; width: number; height: number }): Promise<PNG> {
  const shot = await cdp.send(
    "Page.captureScreenshot",
    { format: "png", clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: 1 }, captureBeyondViewport: false },
    sessionId,
  );
  return PNG.sync.read(Buffer.from(shot.data, "base64"));
}

async function waitForChrome(port: number): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        const body = (await response.json()) as { webSocketDebuggerUrl: string };
        return body.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome is still starting.
    }
    await delay(250);
  }
  throw new Error("Chrome DevTools port did not open.");
}

async function main(): Promise<void> {
  const chromePath = resolveChromeBinary();
  console.log(`Using browser: ${chromePath} (${chromeVersion(chromePath)})`);
  const jobs = (JSON.parse(readFileSync(resolve(evidence, "render-jobs.json"), "utf8")) as { jobs: Job[] }).jobs;
  const vite = spawn("npx", ["vite", "--config", "evaluation/harness/vite.config.ts"], { cwd: repo, stdio: ["ignore", "pipe", "pipe"] });
  let viteLog = "";
  vite.stdout?.on("data", (chunk) => {
    viteLog += chunk.toString();
  });
  vite.stderr?.on("data", (chunk) => {
    viteLog += chunk.toString();
  });
  const userData = resolve(tmpdir(), "gvr-eval-chrome");
  mkdirSync(userData, { recursive: true });
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--remote-debugging-port=9333",
      `--user-data-dir=${userData}`,
      "--no-first-run",
      "--window-size=2400,1600",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    await waitForHttp(pageUrl);
    const socketUrl = await waitForChrome(9333);
    const socket = new WebSocket(socketUrl);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve());
      socket.addEventListener("error", () => reject(new Error("Chrome socket failed")));
    });
    const cdp = new Cdp(socket);
    const created = await cdp.send("Target.createTarget", { url: pageUrl });
    const attached = await cdp.send("Target.attachToTarget", { targetId: created.targetId, flatten: true });
    const sessionId = attached.sessionId as string;
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 2400, height: 1600, deviceScaleFactor: 1, mobile: false }, sessionId);
    await waitUntil(async () => evaluate<boolean>(cdp, sessionId, "Boolean(window.__ready)"), "harness page");

    const userAgent = await evaluate<string>(cdp, sessionId, "navigator.userAgent");
    const lottieControl = await evaluate<{ start: string | null; mid: string | null; note: string }>(cdp, sessionId, "window.runLottieControl()");
    const lottieDiff = lottieControl.start && lottieControl.mid ? compare(pngFromDataUrl(lottieControl.start), pngFromDataUrl(lottieControl.mid)) : null;
    const svgStartBox = await evaluate<{ x: number; y: number; width: number; height: number }>(cdp, sessionId, "window.runSvgControl()");
    const svgStart = await screenshot(cdp, sessionId, svgStartBox);
    const svgEndBox = await evaluate<{ x: number; y: number; width: number; height: number }>(cdp, sessionId, "window.seekSvgControl(2)");
    const svgEnd = await screenshot(cdp, sessionId, svgEndBox);
    const svgDiff = compare(svgStart, svgEnd);
    const controls = {
      userAgent,
      deviceScaleFactor: 1,
      lottieWeb: "5.13.0 canvas renderer, loop false, autoplay false, goToAndStop(frame, true)",
      lottieControl: { note: lottieControl.note, fractionBeyond: lottieDiff?.fractionBeyond ?? null, timeControlWorks: (lottieDiff?.fractionBeyond ?? 0) > 0.001 },
      svgControl: {
        method: "SVGSVGElement.setCurrentTime on an inline SMIL fixture, then Page.captureScreenshot",
        fractionBeyond: svgDiff.fractionBeyond,
        timeControlWorks: svgDiff.fractionBeyond > 0.01,
      },
    };
    writeFileSync(resolve(evidence, "captures/control-svg-start.png"), PNG.sync.write(svgStart));
    writeFileSync(resolve(evidence, "captures/control-svg-end.png"), PNG.sync.write(svgEnd));
    console.log("controls", JSON.stringify(controls));

    const rendered = [];
    for (const job of jobs) {
      console.log(`render ${job.id}`);
      const fixtureDir = resolve(evidence, "captures", job.id);
      mkdirSync(fixtureDir, { recursive: true });
      let prepared: { ok: boolean; notes: string[]; reference: string; native: boolean };
      try {
        prepared = await evaluate(cdp, sessionId, `window.prepare(${JSON.stringify(job.id)})`);
      } catch (error) {
        rendered.push({ id: job.id, referenceStatus: "FAIL", nativeStatus: "NOT_REACHED", error: error instanceof Error ? error.message : String(error), frames: [] });
        continue;
      }
      const frames = [];
      for (let index = 0; index < job.samples.length; index += 1) {
        const sample = job.samples[index];
        const frame: Record<string, unknown> = { id: sample.id, label: sample.label };
        try {
          const sought = await evaluate<{ ok: boolean; ms: number; note: string }>(cdp, sessionId, `window.seek("reference", ${index})`);
          frame.referenceSeek = sought;
          let reference: PNG | null = null;
          if (prepared.reference === "canvas") {
            const url = await evaluate<string | null>(cdp, sessionId, "window.referencePNG()");
            if (url) reference = pngFromDataUrl(url);
          } else if (prepared.reference === "screenshot") {
            const rect = await evaluate<{ x: number; y: number; width: number; height: number } | null>(cdp, sessionId, "window.referenceRect()");
            if (rect) reference = await screenshot(cdp, sessionId, rect);
          }
          if (reference) {
            writeFileSync(resolve(fixtureDir, `${sample.id}-reference.png`), PNG.sync.write(reference));
            frame.reference = { width: reference.width, height: reference.height, path: `captures/${job.id}/${sample.id}-reference.png` };
          } else frame.reference = null;
          if (prepared.native) {
            const nativeSeek = await evaluate<{ ok: boolean; ms: number; note: string }>(cdp, sessionId, `window.seek("native", ${index})`);
            frame.nativeSeek = nativeSeek;
            const url = await evaluate<string | null>(cdp, sessionId, "window.nativePNG()");
            if (url && nativeSeek.ok) {
              const native = pngFromDataUrl(url);
              writeFileSync(resolve(fixtureDir, `${sample.id}-native.png`), PNG.sync.write(native));
              frame.native = { width: native.width, height: native.height, path: `captures/${job.id}/${sample.id}-native.png`, sceneKind: job.sceneKind };
              if (reference) {
                const metrics = compare(reference, native);
                if (metrics.diff) writeFileSync(resolve(fixtureDir, `${sample.id}-diff.png`), PNG.sync.write(metrics.diff));
                writeFileSync(resolve(fixtureDir, `${sample.id}-strip.png`), PNG.sync.write(strip(reference, native, metrics.diff ?? null)));
                frame.diff = {
                  comparable: metrics.comparable,
                  meanDistance: metrics.meanDistance,
                  fractionBeyond: metrics.fractionBeyond,
                  threshold: "Euclidean RGB distance > 24 counts as a differing pixel. This threshold is for inspection, not a pass rule.",
                  diffPath: metrics.diff ? `captures/${job.id}/${sample.id}-diff.png` : null,
                  stripPath: `captures/${job.id}/${sample.id}-strip.png`,
                };
              }
            }
          } else if (reference) {
            writeFileSync(resolve(fixtureDir, `${sample.id}-strip.png`), PNG.sync.write(strip(reference, null, null)));
            frame.native = null;
            frame.stripPath = `captures/${job.id}/${sample.id}-strip.png`;
          }
        } catch (error) {
          frame.error = error instanceof Error ? error.message : String(error);
        }
        frames.push(frame);
        console.log(`  ${sample.id}`, frame.error ?? frame.diff ?? frame.reference ?? "no reference");
      }
      const logs = await evaluate<string[]>(cdp, sessionId, "window.logs()");
      writeFileSync(resolve(fixtureDir, "browser-log.txt"), logs.join("\n"));
      const nativeFrames = frames.filter((frame) => frame.native);
      const classified = classifyCapture({
        sceneKind: job.sceneKind,
        logs,
        referenceFrames: frames.filter((frame) => frame.reference).length,
        nativeFrames: nativeFrames.length,
        nativePrepared: prepared.native,
      });
      rendered.push({
        id: job.id,
        sceneKind: job.sceneKind,
        executionRoute: classified.executionRoute,
        prepared,
        referenceStatus: classified.referenceStatus,
        nativeStatus: classified.nativeStatus,
        logs: logs.slice(0, 40),
        frames,
      });
    }
    mkdirSync(resolve(evidence, "captures"), { recursive: true });
    writeFileSync(resolve(evidence, "render-results.json"), JSON.stringify({ controls, fixtures: rendered, viteLogTail: viteLog.slice(-2000) }, null, 2));
    console.log("wrote render-results.json");
  } finally {
    stop(chrome);
    stop(vite);
  }
}

async function waitForHttp(url: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await delay(250);
  }
  throw new Error(`No response from ${url}`);
}

async function waitUntil(check: () => Promise<boolean>, label: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if (await check()) return;
    } catch {
      // Page is still loading.
    }
    await delay(250);
  }
  throw new Error(`${label} was not ready.`);
}

function stop(child: ChildProcess): void {
  if (!child.killed) child.kill("SIGTERM");
}

mkdirSync(resolve(evidence, "captures"), { recursive: true });
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
