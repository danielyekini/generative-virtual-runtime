/**
 * Studio P001 smoke: library search → open → explicit execute → fullscreen →
 * exit → upload with a compile error → diagnostic jump, plus legacy and import
 * utility access. Runs the real Studio page in headless Chromium.
 *
 *   npm run smoke:studio            # writes work/studio-smoke/{summary.json,*.png}
 *   GVR_CHROME=/path/to/chrome npm run smoke:studio
 */
import { createServer } from "vite";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Cdp } from "../../../evaluation/harness/cdp";
import { resolveChromeBinary } from "../../../evaluation/harness/chrome";

const root = resolve(import.meta.dirname, "../../..");
const out = resolve(root, "work/studio-smoke");
mkdirSync(out, { recursive: true });

const BROKEN = `scene "broken-upload" {
  version "0.1";
  viewport (400, 300);
  duration 1s;
};
circle c {
  radius 10;
  fill #zz;
};
`;

const server = await createServer({
  root: resolve(root, "app/playground"),
  configFile: false,
  logLevel: "error",
  server: { host: "127.0.0.1", port: 0, fs: { allow: [root] } },
});
await server.listen();
const port = (server.httpServer!.address() as { port: number }).port;
const child = spawn(resolveChromeBinary(), [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=0",
  `--user-data-dir=${out}/chrome-profile`, "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

let socket: WebSocket | undefined;
const checks: { name: string; ok: boolean; detail?: unknown }[] = [];
function check(name: string, ok: boolean, detail?: unknown): void {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` ${JSON.stringify(detail)}`}`);
}
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

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
  await new Promise<void>((ok) => { socket!.onopen = () => ok(); });
  const cdp = new Cdp(socket, 60000);
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  const errors: string[] = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.method === "Runtime.exceptionThrown") errors.push(JSON.stringify(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text));
  });
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/#studio` }, sessionId);
  const ev = async (expression: string): Promise<any> => {
    const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const shot = async (name: string) => {
    const image = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
    writeFileSync(resolve(out, `${name}.png`), Buffer.from(image.data, "base64"));
  };
  // The bridge republishes every animation frame; wait two frames so reads see the latest action.
  const program = () => ev("new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done((({ open, execute, search, ...rest }) => rest)(window.__gvr.program)))))");
  for (let i = 0; i < 300 && !(await ev("!!window.__gvr?.program")); i++) await sleep(100);

  const overflow = await ev("[document.documentElement.scrollWidth, document.documentElement.clientWidth]");
  check("workbench has no horizontal page overflow", overflow[0] <= overflow[1], overflow);
  const initial = await program();
  check("starts with one active program, not executed", initial.state === "not-executed" && !initial.executed && (await ev("!window.__gvr.frame")), initial);

  await ev(`(() => { const s = document.querySelector('#library-search'); s.value = 'binary tree'; s.dispatchEvent(new Event('input')); })()`);
  const found = await ev(`Array.from(document.querySelectorAll('#library-list .library-item')).map(b => b.dataset.key)`);
  check("search filters the library", found.length === 1 && found[0] === "preset:two-ways-through-a-binary-tree", found);
  await ev(`(() => { [...document.querySelectorAll('#library-filters button')].find(b => b.dataset.collection === 'Frames').click(); })()`);
  const frames = await ev(`(() => { const s = document.querySelector('#library-search'); s.value = ''; s.dispatchEvent(new Event('input')); return [...document.querySelectorAll('#library-list .library-item')].map(b => b.dataset.key); })()`);
  check("collection filter narrows to Frames", frames.length > 0 && frames.every((key: string) => key.startsWith("frame:")), frames);
  await ev(`(() => { [...document.querySelectorAll('#library-filters button')].find(b => b.dataset.collection === 'all').click(); const s = document.querySelector('#library-search'); s.value = 'ball'; s.dispatchEvent(new Event('input')); document.querySelector('#library-list .library-item[data-key="preset:ball"]').click(); })()`);
  const opened = await program();
  const editorIsBall = await ev(`document.querySelector('#source').value.includes('bouncing-ball')`);
  check("opening loads source without executing", opened.key === "preset:ball" && opened.state === "not-executed" && editorIsBall, opened);

  await ev(`document.querySelector('#execute').click()`);
  await sleep(600);
  const ran = await program();
  const probe = await ev("window.__gvr.probe()");
  check("explicit Execute compiles and plays", ran.executed && ran.state === "running" && probe.sceneId === "bouncing-ball" && probe.timeMs > 0 && !probe.degraded, { ran, probe });
  await shot("1-executed");

  await ev(`document.querySelector('#fullscreen').click()`);
  await sleep(400);
  const presented = await ev(`(() => { const r = document.querySelector('#stage').getBoundingClientRect(); const c = document.querySelector('#view').getBoundingClientRect(); return { presenting: window.__gvr.program.presenting, native: document.fullscreenElement?.id ?? null, stage: [r.width, r.height], canvas: [c.width, c.height] }; })()`);
  check("fullscreen presents the stage at window size", presented.presenting && presented.stage[0] === 1440 && presented.stage[1] === 900, presented);
  const aspect = presented.canvas[0] / presented.canvas[1];
  check("fullscreen keeps the canvas filling the stage (contain-fit inside the renderer)", Math.abs(presented.canvas[0] - 1440) < 2 && Math.abs(presented.canvas[1] - 900) < 2, { aspect, presented });
  await shot("2-fullscreen");
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }, sessionId);
  await sleep(400);
  const exited = await ev(`({ presenting: window.__gvr.program.presenting, native: document.fullscreenElement?.id ?? null, width: document.querySelector('#stage').getBoundingClientRect().width })`);
  check("Escape exits fullscreen back to the workbench", !exited.presenting && exited.native === null && exited.width < 1440, exited);
  await ev(`document.querySelector('#fullscreen').click()`);
  await sleep(300);
  await ev(`document.querySelector('#fullscreen').click()`);
  await sleep(300);
  check("Exit button leaves fullscreen", !(await ev("window.__gvr.program.presenting")));

  await ev(`(() => { const box = document.querySelector('#source'); box.value += '\\n'; box.dispatchEvent(new Event('input')); })()`);
  check("editing marks the active program as edited", (await program()).state === "edited");

  await ev(`(() => { const input = document.querySelector('#library-file'); const dt = new DataTransfer(); dt.items.add(new File([${JSON.stringify(BROKEN)}], 'broken-upload.ms', { type: 'text/plain' })); input.files = dt.files; input.dispatchEvent(new Event('change')); })()`);
  await sleep(300);
  const uploaded = await program();
  check("upload adds to My programs and becomes active, unexecuted", uploaded.origin === "mine" && uploaded.name === "broken-upload" && uploaded.state === "not-executed" && uploaded.library.some((item: { collection: string }) => item.collection === "My programs"), uploaded);
  await ev(`document.querySelector('#execute').click()`);
  await sleep(200);
  const failed = await program();
  const kept = await ev(`document.querySelector('#source').value === ${JSON.stringify(BROKEN)}`);
  check("failed execution reports located diagnostics and keeps source", failed.state === "failed" && failed.diagnostics[0]?.line === 8 && failed.diagnostics[0]?.code === "BAD_COLOR" && kept && !(await ev("window.__gvr.frame")), failed);
  await ev(`document.querySelector('#source-diagnostics button').click()`);
  const selection = await ev(`(() => { const b = document.querySelector('#source'); return { start: b.selectionStart, end: b.selectionEnd, text: b.value.slice(b.selectionStart, b.selectionEnd), focused: document.activeElement === b }; })()`);
  check("diagnostic jumps to its source span", selection.focused && selection.start === BROKEN.indexOf("#zz") && selection.end > selection.start, selection);
  await shot("3-diagnostics");

  await ev(`(() => { const s = document.querySelector('#test-scripts'); s.value = 'preset:bunny'; s.dispatchEvent(new Event('change')); })()`);
  check("legacy test-script automation still loads and compiles", (await ev("window.__gvr.compileOk")) === true && (await program()).key === "preset:bunny");

  await ev(`(() => { const s = document.querySelector('#import-presets'); s.value = 'lottie:4'; s.dispatchEvent(new Event('change')); document.querySelector('#import-play').click(); })()`);
  await sleep(200);
  const imported = await ev(`({ state: window.__gvr.program.state, overall: window.__gvr.overall, format: window.__gvr.formatId })`);
  check("import utility stays reachable and is labelled as such", imported.state === "import" && Boolean(imported.overall), imported);
  await ev(`window.__gvr.program.open(window.__gvr.program.library.find(p => p.collection === 'My programs').key)`);
  await sleep(150);
  const back = await program();
  const restored = await ev(`document.querySelector('#source').value === ${JSON.stringify(BROKEN)}`);
  check("returning from import restores the program source", back.origin === "mine" && restored, back);
  await ev(`window.__gvr.program.open('preset:ball')`);
  await ev(`window.__gvr.program.search('')`);
  await sleep(150);
  const draft = await ev(`document.querySelector('#source').value.endsWith('\\n\\n') || document.querySelector('#source').value.endsWith('\\n')`);
  check("unexecuted edits to an installed program are kept as a draft", draft && (await ev(`document.querySelector('#library-list .library-item[data-key="preset:ball"] .library-title')?.textContent.endsWith('•') ?? false`)));
  check("no page errors", errors.length === 0, errors);
} finally {
  socket?.close();
  child.kill();
  await server.close();
}

const failed = checks.filter((item) => !item.ok);
writeFileSync(resolve(out, "summary.json"), `${JSON.stringify({ checks, passed: checks.length - failed.length, failed: failed.length }, null, 2)}\n`);
console.log(`${checks.length - failed.length}/${checks.length} checks passed. Screenshots: work/studio-smoke/`);
process.exit(failed.length === 0 ? 0 : 1);
