/**
 * Studio probe for space.planar25d: AnimationRuntime → CanvasRenderer in headless Chrome.
 *
 *   node --import tsx packages/runtime/scripts/spatial-studio-probe.mts [outdir]
 */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { Cdp } from "../../../evaluation/harness/cdp";
import { resolveChromeBinary } from "../../../evaluation/harness/chrome";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const outDir = resolve(process.argv[2] || resolve(here, "spatial-studio-out"));
mkdirSync(outDir, { recursive: true });
const profile = resolve(outDir, `chrome-profile-${process.pid}`);
rmSync(profile, { recursive: true, force: true });
mkdirSync(profile, { recursive: true });

const bundle = await esbuild.build({
  entryPoints: [resolve(here, "spatial-studio-probe.entry.ts")],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  absWorkingDir: root,
});

const child = spawn(
  resolveChromeBinary(),
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

let socket: WebSocket | undefined;
try {
  const url = await new Promise<string>((ok, fail) => {
    let log = "";
    child.stderr!.on("data", (chunk) => {
      log += chunk;
      const match = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) ok(match[1]!);
    });
    child.on("error", fail);
    setTimeout(() => fail(new Error(`Chrome did not start: ${log}`)), 20000);
  });
  socket = new WebSocket(url);
  await new Promise<void>((ok) => {
    socket!.onopen = () => ok();
  });
  const cdp = new Cdp(socket, 60000);
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 700, height: 2000, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Page.navigate", { url: "data:text/html,<!doctype html><body style='margin:0;background:#fff'></body>" }, sessionId);
  await new Promise((r) => setTimeout(r, 100));
  const injected = await cdp.send(
    "Runtime.evaluate",
    { expression: bundle.outputFiles[0]!.text, awaitPromise: false, returnByValue: true },
    sessionId,
  );
  if (injected.exceptionDetails) throw new Error(JSON.stringify(injected.exceptionDetails));
  const evaluated = await cdp.send(
    "Runtime.evaluate",
    { expression: "window.__spatialStudio", returnByValue: true },
    sessionId,
  );
  if (evaluated.exceptionDetails) throw new Error(JSON.stringify(evaluated.exceptionDetails));
  const shots = evaluated.result.value as {
    name: string;
    order: string[];
    probes: { label: string; expectHit?: string; hit?: string; pixel: number[] }[];
  }[];

  let failures = 0;
  for (const shot of shots) {
    const image = await cdp.send(
      "Page.captureScreenshot",
      {
        format: "png",
        clip: { x: 0, y: shots.indexOf(shot) * 360, width: 640, height: 360, scale: 1 },
      },
      sessionId,
    );
    writeFileSync(resolve(outDir, `${shot.name}.png`), Buffer.from(image.data, "base64"));
    for (const probe of shot.probes) {
      const okHit = probe.expectHit === undefined || probe.hit === probe.expectHit;
      if (!okHit) failures += 1;
      console.log(
        `${okHit ? "PASS" : "FAIL"} ${shot.name} ${probe.label} hit=${probe.hit} pixel=${probe.pixel.join(",")}`,
      );
    }
    console.log(`     ${shot.name} order: ${shot.order.join(" < ")}`);
  }
  writeFileSync(resolve(outDir, "spatial-studio-probe.json"), `${JSON.stringify(shots, null, 2)}\n`);
  process.exitCode = failures ? 1 : 0;
} finally {
  child.kill("SIGKILL");
  socket?.close();
}
