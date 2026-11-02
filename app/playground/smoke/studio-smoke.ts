/**
 * Studio Player and Library smoke (P001/P014): empty landing → Library page → open (no run)
 * → Run → tape seek → fullscreen (Esc and exit button) → Source edit → file
 * with a compile error → located diagnostic jump → import report → autoplay
 * and hash restore → legacy stream route. Real page, headless Chromium.
 *
 *   npm run smoke:studio            # writes work/studio-smoke/{summary.json,*.png}
 *   GVR_CHROME=/path/to/chrome npm run smoke:studio
 */
import { createServer } from "vite";
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Cdp } from "../../../evaluation/harness/cdp";
import { resolveChromeBinary } from "../../../evaluation/harness/chrome";

const root = resolve(import.meta.dirname, "../../..");
const out = resolve(root, "work/studio-smoke");
rmSync(resolve(out, "chrome-profile"), { recursive: true, force: true });
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
const base = `http://127.0.0.1:${port}`;
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
  await cdp.send("Page.enable", {}, sessionId);
  const errors: string[] = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.method === "Runtime.exceptionThrown") errors.push(JSON.stringify(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text));
  });
  const ev = async (expression: string): Promise<any> => {
    const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const shot = async (name: string) => {
    const image = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
    writeFileSync(resolve(out, `${name}.png`), Buffer.from(image.data, "base64"));
  };
  const key = async (keyName: string, code: string, vk: number, modifiers = 0) => {
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: keyName, code, windowsVirtualKeyCode: vk, modifiers }, sessionId);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: keyName, code, windowsVirtualKeyCode: vk, modifiers }, sessionId);
  };
  const click = async (x: number, y: number) => {
    for (const type of ["mousePressed", "mouseReleased"]) {
      await cdp.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }, sessionId);
    }
  };
  const navigate = async (path: string) => {
    await cdp.send("Page.navigate", { url: `${base}${path}` }, sessionId);
    for (let i = 0; i < 300 && !(await ev("!!window.__gvr").catch(() => false)); i++) await sleep(100);
    await sleep(200);
  };
  // The bridge republishes after each drawn frame; wait two frames so reads see the latest action.
  const player = () => ev("new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(window.__gvr.player))))");
  const visible = (selector: string) => ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; const r = el.getBoundingClientRect(); return !el.closest('[hidden]') && r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none'; })()`);

  // 1. Landing page
  await navigate("/");
  const landing = await player();
  const overflow = await ev("[document.documentElement.scrollWidth, document.documentElement.clientWidth]");
  check("no horizontal page overflow", overflow[0] <= overflow[1], overflow);
  check("landing is an empty player with nothing loaded", landing.programKey === null && landing.runState === "not-run" && !(await ev("!!window.__gvr.frame")), landing);
  check("landing shows Open Library in the header and on the canvas", (await visible("#open-library")) && (await visible("#empty-library")));
  check("Run is disabled until a program is loaded", await ev("document.querySelector('#run').disabled"));
  check("Source panel is closed by default", !landing.sourceOpen && !(await visible("#source-panel")), landing);
  check("old left rail and right dock are gone", await ev("!document.querySelector('#tools') && !document.querySelector('#dock')"));
  const tabs = await ev("[...document.querySelectorAll('.panel-tabs [role=tab]')].map(t => t.textContent.trim().split(' ')[0])");
  check("bottom panel has Diagnostics, Scene and Report tabs", JSON.stringify(tabs) === JSON.stringify(["Diagnostics", "Scene", "Report"]), tabs);
  const stream = await ev("({ disabled: document.querySelector('#stream').disabled, title: document.querySelector('#stream').title })");
  check("Stream action is present but disabled until P002", stream.disabled && /P002/.test(stream.title), stream);
  await shot("0-landing");

  // 2. Library page
  await ev("document.querySelector('#empty-library').click()");
  await sleep(150);
  check("Open Library opens the Library page", await ev("!document.querySelector('#library').hidden"));
  await ev(`(() => { const s = document.querySelector('#library-search'); s.value = 'binary tree'; s.dispatchEvent(new Event('input')); })()`);
  const found = await ev("[...document.querySelectorAll('#library-grid article')].map(b => b.dataset.key)");
  check("picker search filters programs", found.length === 1 && found[0] === "story:two-ways-through-a-binary-tree", found);
  await ev(`(() => { const s = document.querySelector('#library-search'); s.value = ''; s.dispatchEvent(new Event('input')); [...document.querySelectorAll('#library-collections button')].find(b => b.textContent.startsWith('Test frames')).click(); })()`);
  const frames = await ev("[...document.querySelectorAll('#library-grid article')].map(b => b.dataset.key)");
  check("collection chip narrows the picker", frames.length > 0 && frames.every((item: string) => item.startsWith("frame:")), frames);
  await ev(`[...document.querySelectorAll('#library-collections button')].find(b => b.textContent.startsWith('All')).click()`);
  await sleep(1500);
  await shot("1-library");
  await ev(`(() => { const c = document.querySelector('#library-grid article[data-key="sample:ball"]'); c.scrollIntoView(); return true; })()`);
  await sleep(500);
  check("thumbnail bitmap fits inside the responsive card", await ev(`(() => { const b = document.querySelector('article[data-key="sample:ball"] .program-preview'); const c = b.querySelector('canvas'); return c.getBoundingClientRect().width <= b.getBoundingClientRect().width + 1; })()`));
  const poster = await ev(`(() => { const c = document.querySelector('article[data-key="sample:ball"]'); const b = c.querySelector('.program-preview'); const r = b.getBoundingClientRect(); return {time: Number(c.querySelector('canvas').dataset.time), x: r.x, y: r.y, w: r.width}; })()`);
  await cdp.send("Input.dispatchMouseEvent", {type:"mouseMoved", x:poster.x + poster.w * .8, y:poster.y + 20}, sessionId);
  const scrub = await ev(`Number(document.querySelector('article[data-key="sample:ball"] canvas').dataset.time)`);
  check("pointer scrubbing samples a real later frame", scrub > poster.time, {poster, scrub});
  await cdp.send("Input.dispatchMouseEvent", {type:"mouseMoved", x:0, y:0}, sessionId);
  check("leaving restores the fixed thumbnail", await ev(`Number(document.querySelector('article[data-key="sample:ball"] canvas').dataset.time) === ${poster.time}`));
  await ev(`document.querySelector('article[data-key="sample:ball"] .favourite').click()`);
  await ev(`(() => { const t = document.querySelector('article[data-key="sample:ball"] input'); t.value = 'smoke-tag, élan'; t.dispatchEvent(new Event('change')); const s = document.querySelector('#library-search'); s.value = 'elan'; s.dispatchEvent(new Event('input')); })()`);
  check("editable tags participate in accent-insensitive search", await ev(`document.querySelectorAll('#library-grid article').length === 1 && document.querySelector('#library-grid article').dataset.key === 'sample:ball'`));
  await ev(`document.querySelector('#library-favourites').click()`);
  check("favourites filter uses the saved toggle", await ev(`document.querySelectorAll('#library-grid article').length === 1`));
  await ev(`document.querySelector('#library-favourites').click()`);
  await ev(`(() => { const s = document.querySelector('#library-search'); s.value = 'ball expression'; s.dispatchEvent(new Event('input')); document.querySelector('#library-grid article[data-key="sample:ball"] .program-preview').click(); })()`);
  await sleep(150);
  const opened = await player();
  check("opening loads the program without running it", opened.programKey === "sample:ball" && opened.runState === "not-run" && !(await ev("!!window.__gvr.frame")) && !(await ev("!document.querySelector('#library').hidden")), opened);
  check("header names the loaded program and waits for Run", (await ev("document.querySelector('#program-name').textContent")) === "Ball" && (await visible("#ready-run")) && !(await ev("document.querySelector('#run').disabled")));
  check("hash names the loaded program", (await ev("location.hash")) === "#p/sample%3Aball");
  await shot("2-loaded");

  // 3. Run
  await ev("document.querySelector('#run').click()");
  await sleep(600);
  const ran = await player();
  check("Run compiles and plays the loaded program", ran.runState === "ok" && ran.sceneId === "bouncing-ball" && ran.playing && ran.timeMs > 0, ran);
  check("Fullscreen is enabled after Run", !(await ev("document.querySelector('#fullscreen').disabled")));
  await ev("document.querySelector('#play').click()");
  const track = await ev("(() => { const r = document.querySelector('#track-time').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()");
  await click(track.x + track.w * 0.5, track.y + track.h / 2);
  const sought = await player();
  check("clicking the tape seeks to that fraction of the program", Math.abs(sought.timeMs - sought.durationMs * 0.5) < sought.durationMs * 0.02 && !sought.playing, sought);
  await shot("3-running");

  // 4. Fullscreen
  await ev("document.querySelector('#fullscreen').click()");
  await sleep(400);
  const full = await ev(`(() => { const r = document.querySelector('#canvas-area').getBoundingClientRect(); return { probe: window.__gvr.player, area: [r.width, r.height], bar: getComputedStyle(document.querySelector('#bar')).display, panel: getComputedStyle(document.querySelector('#panel')).display }; })()`);
  check("fullscreen shows the canvas only at window size", full.probe.fullscreen && full.area[0] === 1440 && full.area[1] === 900 && full.bar === "none" && full.panel === "none", full);
  check("fullscreen canvas fills the area; renderer contain-fits the logical viewport", full.probe.canvas.cssWidth === 1440 && full.probe.canvas.cssHeight === 900, full.probe.canvas);
  check("fullscreen has a visible exit control", await visible("#fs-exit"));
  await shot("4-fullscreen");
  await key("Escape", "Escape", 27);
  await sleep(300);
  const exited = await player();
  check("Escape leaves fullscreen", !exited.fullscreen && (await ev("getComputedStyle(document.querySelector('#bar')).display")) !== "none", exited);
  await ev("document.querySelector('#fullscreen').click()");
  await sleep(200);
  await ev("document.querySelector('#fs-exit').click()");
  await sleep(200);
  check("exit button leaves fullscreen", !(await player()).fullscreen);

  // 5. Source panel quick edit
  await ev("document.querySelector('#toggle-source').click()");
  await sleep(100);
  check("Source panel opens on the right with the loaded source", (await visible("#source-panel")) && (await ev("document.querySelector('#source').value.includes('bouncing-ball')")));
  await ev(`(() => { const box = document.querySelector('#source'); box.value += '\\n'; box.dispatchEvent(new Event('input')); })()`);
  const edited = await player();
  check("editing marks the program as edited since Run", edited.dirty && (await visible("#source-dirty")), edited);
  const draft = await ev("document.querySelector('#source').value");
  await ev("document.querySelector('#open-library').click()");
  await sleep(100);
  await ev("document.querySelector('#library-player').click()");
  check("page navigation preserves unsaved Player edits and loaded program", (await player()).dirty && await ev(`document.querySelector('#source').value === ${JSON.stringify(draft)}`));
  await key("Enter", "Enter", 13, 2);
  await sleep(200);
  check("Ctrl+Enter re-runs the edited source", !(await player()).dirty);

  // 6. Opened file with a compile error
  await ev("document.querySelector('#open-library').click()");
  await ev(`(() => { const input = document.querySelector('#library-file'); const dt = new DataTransfer(); dt.items.add(new File([${JSON.stringify(BROKEN)}], 'broken-upload.ms', { type: 'text/plain' })); input.files = dt.files; input.dispatchEvent(new Event('change')); })()`);
  await sleep(300);
  check("upload opens the full Library editor", await visible("#library-editor"));
  await ev("document.querySelector('#library-save').click()");
  await sleep(200);
  const uploaded = await player();
  check("opened file becomes the loaded program, not run", uploaded.programName === "broken-upload" && uploaded.format === "motionscript" && uploaded.runState === "not-run", uploaded);
  await ev("document.querySelector('#run').click()");
  await sleep(200);
  const failed = await player();
  const kept = await ev(`document.querySelector('#source').value === ${JSON.stringify(BROKEN)}`);
  check("failed Run lists located diagnostics and keeps the source", failed.runState !== "ok" && /^line 8, column 8 · BAD_COLOR/.test(failed.diagnostics[0] ?? "") && kept && failed.panelTab === "diagnostics", failed);
  const row = await ev("(() => { const b = document.querySelector('#diag-list button'); return b ? b.textContent : ''; })()");
  check("diagnostic row shows line, column, code, message and recovery", /Ln 8, Col 8/.test(row) && /BAD_COLOR/.test(row) && /Recovery:/.test(row), row);
  await ev("document.querySelector('#diag-list button').click()");
  const selection = await ev(`(() => { const b = document.querySelector('#source'); return { start: b.selectionStart, end: b.selectionEnd, focused: document.activeElement === b }; })()`);
  check("selecting a diagnostic jumps to its source span", selection.focused && selection.start === BROKEN.indexOf("#zz") && selection.end > selection.start, selection);
  await shot("5-diagnostics");

  // 7. Import through the Player (no round-trip)
  await ev("window.__gvr.open('import:lottie:animated_position')");
  await ev("document.querySelector('#run').click()");
  await ev("document.querySelector('#tab-report').click()");
  await sleep(200);
  const imported = await player();
  const report = await ev("document.querySelector('#report').textContent");
  check("imports run through the Player with a fidelity report", imported.format === "lottie" && imported.sceneId !== "" && /^STATUS\t/.test(report), { imported, report: report.slice(0, 80) });
  await shot("6-import-report");

  // 8. Autoplay option and hash restore
  await ev("(() => { const c = document.querySelector('#opt-autoplay'); c.checked = true; c.dispatchEvent(new Event('change')); })()");
  await ev("window.__gvr.open('frame:primitive-gallery')");
  const autoplayed = await player();
  check("Autoplay on open runs the program immediately", autoplayed.programKey === "frame:primitive-gallery" && autoplayed.runState !== "not-run" && autoplayed.sceneId !== "", autoplayed);
  await ev("(() => { const c = document.querySelector('#opt-autoplay'); c.checked = false; c.dispatchEvent(new Event('change')); })()");
  await navigate("/#p/story%3Athrough-the-blue");
  const restored = await player();
  check("loading by hash restores the program without running it (autoplay off)", restored.programKey === "story:through-the-blue" && restored.runState === "not-run", restored);
  await navigate("/");
  const recent = await ev("[...document.querySelectorAll('#recent-list button')].map(b => b.textContent)");
  check("landing lists recent programs", recent[0] === "Through the Blue" && recent.includes("Ball"), recent);

  await navigate("/#library");
  check("Library route restores saved favourites and tags", await ev(`document.querySelector('article[data-key="sample:ball"] .favourite').getAttribute('aria-pressed') === 'true' && document.querySelector('article[data-key="sample:ball"] input').value.includes('smoke-tag')`));
  check("My programs survive reload", await ev(`[...document.querySelectorAll('#library-grid article')].some(c => c.querySelector('h3').textContent === 'broken-upload')`));
  await ev(`document.querySelector('#library-paste').click()`);
  await ev(`(() => { const b = document.querySelector('#library-source'); b.value = 'scene "saved-draft" {};'; const t = document.querySelector('#library-name'); t.value = 'Saved draft'; })()`);
  await ev(`document.querySelector('#library-player').click()`);
  await ev(`document.querySelector('#open-library').click()`);
  check("Library authoring draft survives page navigation", await ev(`document.querySelector('#library-source').value.includes('saved-draft')`));
  // Simulate quota failure at the browser boundary, preserving the real editor.
  await ev(`window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(){throw new DOMException('full', 'QuotaExceededError')}; document.querySelector('#library-save').click();`);
  check("failed save reports storage failure and keeps editor source", await visible('#library-error') && await visible('#library-editor') && await ev(`document.querySelector('#library-source').value.includes('saved-draft') && location.hash === '#library'`));
  await ev(`Storage.prototype.setItem = window.originalSetItem; document.querySelector('#library-save').click();`);
  check("Paste saves to My programs and opens without running", (await player()).programName === "Saved draft" && (await player()).runState === "not-run");
  await ev(`document.querySelector('#open-library').click(); document.querySelector('#library-new').click();`);
  check("New opens a full blank editor", await visible('#library-editor') && await ev(`document.querySelector('#library-source').value === ''`));
  await shot("7-library-editor");
  await ev(`(() => { const t = document.querySelector('#library-source'); t.value = ''; document.querySelector('#library-cancel').click(); const input = document.querySelector('#library-file'); const dt = new DataTransfer(); dt.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect width="80" height="60" fill="red"/></svg>'], 'saved-logo.svg')); input.files = dt.files; input.dispatchEvent(new Event('change')); })()`);
  await sleep(150);
  await ev(`document.querySelector('#library-save').click()`);
  const svgKey = (await player()).programKey;
  await navigate(`/#p/${encodeURIComponent(svgKey)}`);
  check("uploaded SVG retains its format after reload", (await player()).format === 'svg' && (await player()).runState === 'not-run');
  await ev(`document.querySelector('#run').click()`);
  check("saved SVG still imports through Player Run", (await player()).sceneId !== '');
  await ev(`document.querySelector('#open-library').click(); document.querySelector('#library-sort').value = 'duration'; document.querySelector('#library-sort').dispatchEvent(new Event('change'));`);
  for (let i=0; i<300 && await ev(`document.querySelector('#library-count').textContent.includes('Reading')`); i++) await sleep(100);
  const durations = await ev(`[...document.querySelectorAll('#library-grid article')].map(c => { const t = c.querySelector('.program-duration').textContent; return t === 'Static' ? 0 : t.endsWith(' s') ? Number(t.slice(0,-2)) : null; }).filter(t => t !== null)`);
  check("duration sort resolves and orders playable programs", durations.length > 0 && durations.every((n: number, i: number) => i === 0 || n >= durations[i-1]), durations);
  await ev(`document.querySelector('#library-sort').value = 'recent'; document.querySelector('#library-sort').dispatchEvent(new Event('change'));`);
  check("recent sort puts the latest opened program first", await ev(`document.querySelector('#library-grid article').dataset.key === ${JSON.stringify(svgKey)}`));
  await ev(`document.querySelector('#library-search').value = 'no-matching-program-986'; document.querySelector('#library-search').dispatchEvent(new Event('input'));`);
  check("empty results explain how to recover", await visible('#library-empty'));
  await ev(`document.querySelector('#library-search').value = ''; document.querySelector('#library-search').dispatchEvent(new Event('input'));`);
  await cdp.send("Emulation.setDeviceMetricsOverride", {width:390, height:844, deviceScaleFactor:1, mobile:false}, sessionId);
  await sleep(200);
  check("Library fits a narrow viewport", await ev(`document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.querySelector('#library').scrollWidth <= document.querySelector('#library').clientWidth`));
  await shot('8-library-narrow');
  await cdp.send("Emulation.setDeviceMetricsOverride", {width:1440, height:900, deviceScaleFactor:1, mobile:false}, sessionId);


  // Blur from a tag edit must not remove the Open button before its click.
  await ev(`document.querySelector('#library-sort').value = 'name'; document.querySelector('#library-sort').dispatchEvent(new Event('change'));`);
  await ev(`(() => { const c = document.querySelector('article[data-key="sample:ball"]'); c.scrollIntoView(); const t = c.querySelector('input'); t.focus(); t.value = 'last-tag-edit'; })()`);
  const openRect = await ev(`(() => { const b = document.querySelector('article[data-key="sample:ball"] .program-card-body > .library-toolbar:last-child button'); const r = b.getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}; })()`);
  await click(openRect.x, openRect.y);
  check("Open still works when clicking it blurs an edited tag field", (await player()).programKey === 'sample:ball' && await ev(`document.querySelector('#library').hidden`));

  // 9. Temporary legacy route keeps streaming working
  await navigate("/legacy.html#stream");
  await ev("(() => { const t = document.querySelector('#stream-toggle'); t.checked = true; t.dispatchEvent(new Event('change')); const p = document.querySelector('#stream-preset'); p.value = 'bunny'; p.dispatchEvent(new Event('change')); document.querySelector('#stream-run').click(); })()");
  await sleep(2500);
  const streamed = await ev("window.__gvr.probe ? window.__gvr.probe() : null");
  check("legacy stream workbench still streams until P002", Boolean(streamed) && streamed.sealedThroughMs > 0 && streamed.parsedUnits > 0, streamed);
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
