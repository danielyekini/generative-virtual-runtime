/**
 * Studio probe for space.planarSeams: AnimationRuntime → CanvasRenderer in headless
 * Chrome, with pixels checked against the analytic nearest-surface oracle.
 *
 *   GVR_CHROME=/path/to/chrome node --import tsx packages/runtime/scripts/seams-studio-probe.mts [outdir]
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
const outDir = resolve(process.argv[2] || resolve(here, "seams-studio-out"));
mkdirSync(outDir, { recursive: true });
const profile = resolve(outDir, `chrome-profile-${process.pid}`);
rmSync(profile, { recursive: true, force: true });
mkdirSync(profile, { recursive: true });

const bundle = await esbuild.build({
  entryPoints: [resolve(here, "seams-studio-probe.entry.ts")],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  absWorkingDir: root,
  loader: { ".ms": "text" },
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
  await cdp.send("Page.navigate", { url: "data:text/html,<!doctype html><body style='margin:0;background:white'></body>" }, sessionId);
  await new Promise((r) => setTimeout(r, 100));
  const injected = await cdp.send(
    "Runtime.evaluate",
    { expression: bundle.outputFiles[0]!.text, awaitPromise: false, returnByValue: true },
    sessionId,
  );
  if (injected.exceptionDetails) throw new Error(JSON.stringify(injected.exceptionDetails));
  const evaluated = await cdp.send("Runtime.evaluate", { expression: "window.__seamsStudio", returnByValue: true }, sessionId);
  if (evaluated.exceptionDetails) throw new Error(JSON.stringify(evaluated.exceptionDetails));
  const shots = evaluated.result.value as { name: string; order: string[]; diagnostics: string[]; oracle: { checked: number; wrong: number } }[];
  for (const [index, shot] of shots.entries()) {
    const image = await cdp.send(
      "Page.captureScreenshot",
      { format: "png", clip: { x: 0, y: index * 360, width: 640, height: 360, scale: 1 } },
      sessionId,
    );
    writeFileSync(resolve(outDir, `${shot.name}.png`), Buffer.from(image.data, "base64"));
    console.log(`${shot.name}: oracle ${shot.oracle.wrong}/${shot.oracle.checked} wrong; order ${shot.order.join(" < ")}`);
    for (const message of shot.diagnostics) console.log(`  ${message}`);
  }
  writeFileSync(resolve(outDir, "seams-studio-probe.json"), `${JSON.stringify(shots, null, 2)}\n`);
  const split = shots.find((shot) => shot.name === "seams-split")!;
  process.exitCode = split.oracle.wrong === 0 && split.oracle.checked > 0 ? 0 : 1;
} finally {
  child.kill("SIGKILL");
  socket?.close();
}
