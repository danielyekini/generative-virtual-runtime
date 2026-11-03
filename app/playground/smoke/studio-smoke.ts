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
  const move = async (x: number, y: number) => {
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId);
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
  check("Library is a blue text-only button just left of the side-panel toggle", await ev("(() => { const b = document.querySelector('#open-library'); const t = document.querySelector('#toggle-side-panel'); return b.nextElementSibling === t && b.textContent.trim() === 'Library' && b.classList.contains('primary') && b.getBoundingClientRect().left > innerWidth / 2; })()"));
  check("Run is disabled until a program is loaded", await ev("document.querySelector('#run').disabled"));
  check("Source panel is closed by default", !landing.sourceOpen && !(await visible("#source-panel")), landing);
  check("old left rail and right dock are gone", await ev("!document.querySelector('#tools') && !document.querySelector('#dock')"));
  const tabs = await ev("[...document.querySelectorAll('.panel-tabs [role=tab]')].map(t => t.textContent.trim().split(' ')[0])");
  check("bottom panel has Diagnostics, Stream, Scene and Report tabs", JSON.stringify(tabs) === JSON.stringify(["Diagnostics", "Stream", "Scene", "Report"]), tabs);
  const stream = await ev("({ disabled: document.querySelector('#stream').disabled, title: document.querySelector('#stream').title })");
  check("Stream action is disabled until a native program is loaded", stream.disabled && /MotionScript/.test(stream.title), stream);
  check("Generate sits gapped right of the centered Run/Stream group", await ev(`(() => {
    const run = document.querySelector('#run');
    const stream = document.querySelector('#stream');
    const generate = document.querySelector('#generate');
    const actions = document.querySelector('.run-actions');
    if (!run || !stream || !generate || !actions) return false;
    const mid = actions.getBoundingClientRect();
    const pageMid = innerWidth / 2;
    return generate.previousElementSibling?.classList.contains('run-group')
      && Math.abs((mid.left + mid.right) / 2 - pageMid) < 80
      && generate.getBoundingClientRect().left > stream.getBoundingClientRect().right + 4;
  })()`));
  await ev("document.querySelector('#generate').click()");
  await sleep(100);
  const generateOpen = await player();
  check("Generate opens the full-height side panel with transcript + composer", Boolean(generateOpen.generateMode) && (await visible("#generate-chrome")) && (await visible("#generate-prompt")) && !(await visible("#source-chrome")) && (await ev(`(() => {
    const panel = document.querySelector('#source-panel');
    const dock = document.querySelector('#panel');
    if (!panel || !dock) return false;
    const pr = panel.getBoundingClientRect();
    const dr = dock.getBoundingClientRect();
    return pr.top < dr.top && Math.abs(pr.bottom - document.querySelector('#status').getBoundingClientRect().top) < 8;
  })()`)), generateOpen);
  check("Generate composer defaults to Director + pinned qwen model", await ev(`document.querySelector('#generate-approach').value === 'director' && document.querySelector('#generate-model').value === 'qwen2.5-coder:14b'`));
  check("Generate header uses the sparkle AI icon", await ev(`Boolean(document.querySelector('#generate .generate-ai-icon'))`));
  check("Generate composer toolbar sits inside the prompt shell", await ev(`(() => {
    const shell = document.querySelector('.generate-prompt-shell');
    const toolbar = document.querySelector('.generate-toolbar');
    const send = document.querySelector('#generate-send');
    if (!(shell instanceof HTMLElement) || !(toolbar instanceof HTMLElement) || !(send instanceof HTMLElement)) return false;
    const s = shell.getBoundingClientRect();
    const t = toolbar.getBoundingClientRect();
    const b = send.getBoundingClientRect();
    return t.top >= s.top - 1 && t.bottom <= s.bottom + 1 && b.bottom <= s.bottom + 1 && b.top >= s.top - 1;
  })()`));
  check("Generate story quality pack chips fill the composer", await ev(`(() => {
    const pack = document.querySelector('#generate-quality-pack');
    const chips = [...(pack?.querySelectorAll('button.generate-pack-chip') ?? [])];
    const composer = document.querySelector('#generate-prompt');
    if (!pack || !composer || chips.length < 5) return false;
    chips[0].click();
    return composer.value.length > 40 && chips[0].classList.contains('is-selected');
  })()`));
  check("Generate offers the ⋯ tools menu and detail view dropdown", await ev(`Boolean(document.querySelector('#generate-menu')) && !document.querySelector('#generate-copy-transcript') && document.querySelector('#generate-detail-view') instanceof HTMLSelectElement`));
  const streaming = await ev(`(() => {
    const output = Array.from({ length: 80 }, (_, i) => "scene line " + i).join("\\n");
    const director = '{"beats":["greeting"]}';
    const frames = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    const bubble = () => document.querySelector(".generate-bubble.is-model");
    window.__gvr.seedGeneratePreview("hi", director, output);
    return frames().then(() => {
      const first = bubble();
      window.__gvr.seedGeneratePreview("hi", director, output + "\\nscene line 80");
      return frames().then(() => {
        const second = bubble();
        second.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
        return frames().then(() => {
          const body = document.querySelector("#generate-detail-body");
          const select = document.querySelector("#generate-detail-view");
          const user = document.querySelector(".generate-bubble.is-user");
          window.__gvr.seedGeneratePreview("hi", director, output, true);
          return frames().then(() => {
            const outputText = body.textContent || "";
            const scrolled = body.scrollHeight > body.clientHeight + 8 && body.clientHeight > 40;
            body.scrollTop = 12;
            window.__gvr.seedGeneratePreview("hi", director, output + "\\nscene line extra", true);
            return frames().then(() => {
              const heldScroll = Math.abs(body.scrollTop - 12) < 4;
              select.value = "director";
              select.dispatchEvent(new Event("change", { bubbles: true }));
              return frames().then(() => {
                const directorText = body.textContent || "";
                select.focus();
                window.__gvr.seedGeneratePreview("hi", director, output + "\\nscene line extra", true);
                return frames().then(() => ({
                  sameNode: first === second && second instanceof HTMLButtonElement,
                  userTag: user && user.tagName,
                  userOpacity: user ? getComputedStyle(user).opacity : null,
                  detailOpen: !document.querySelector("#generate-detail").hidden,
                  outputHasScene: outputText.includes("scene line 0") && !outputText.includes("beats"),
                  directorLabel: select.querySelector('option[value="director"]').textContent,
                  directorEnabled: !select.querySelector('option[value="director"]').disabled,
                  directorBody: directorText,
                  focused: document.activeElement === select,
                  scrolled,
                  heldScroll,
                  box: { client: body.clientHeight, scroll: body.scrollHeight, top: body.scrollTop },
                }));
              });
            });
          });
        });
      });
    });
  })()`);
  check(
    "Generate streaming keeps the model bubble and opens detail on press",
    streaming.sameNode === true && streaming.detailOpen === true,
    streaming,
  );
  check(
    "Generate user bubbles stay full opacity",
    streaming.userTag === "DIV" && streaming.userOpacity === "1",
    streaming,
  );
  check(
    "Generate detail shows the selected stream and a stable Director option",
    streaming.outputHasScene === true &&
      streaming.directorLabel === "Director" &&
      streaming.directorEnabled === true &&
      streaming.directorBody.includes("beats") &&
      !streaming.directorBody.includes("pending") &&
      !streaming.directorBody.includes("scene line"),
    streaming,
  );
  check(
    "Fully expanded generation detail scrolls and keeps the reader's place",
    streaming.scrolled === true && streaming.heldScroll === true && streaming.focused === true,
    streaming,
  );
  // P026: the header icon toggles the side panel in Generate too, without leaving Generate.
  const sideToggle = () => ev(`(() => { const t = document.querySelector('#toggle-side-panel'); return { pressed: t.getAttribute('aria-pressed'), label: t.getAttribute('aria-label'), title: t.title }; })()`);
  const generateToggleBefore = await sideToggle();
  await ev("document.querySelector('#toggle-side-panel').click()");
  const generateHidden = await player();
  const generateToggleClosed = await sideToggle();
  check(
    "Side-panel toggle closes the Generate panel without leaving Generate",
    generateToggleBefore.pressed === "true" && generateToggleBefore.label === "Close side panel"
      && generateHidden.generateMode && !generateHidden.sidePanelOpen && !(await visible("#source-panel"))
      && generateToggleClosed.pressed === "false" && generateToggleClosed.label === "Open side panel" && !/source/i.test(generateToggleClosed.title),
    { generateToggleBefore, generateHidden, generateToggleClosed },
  );
  await ev("document.querySelector('#toggle-side-panel').click()");
  const generateShown = await player();
  check("Side-panel toggle reopens the Generate chrome (not Source)", generateShown.generateMode && generateShown.sidePanelOpen && (await visible("#generate-chrome")) && !(await visible("#source-chrome")), generateShown);
  await ev("document.querySelector('#generate-close').click()");
  await sleep(50);
  check("Leaving Generate closes the generate chrome", await ev(`!window.__gvr.player.generateMode && document.querySelector('#generate-chrome').hidden`));
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
  const posterColours = await ev(`(() => { const c = document.querySelector('#view'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const seen = new Set(); for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); return seen.size; })()`);
  check("loaded program shows its Studio thumbnail on the canvas before Run", posterColours > 1 && !(await ev("!!window.__gvr.frame")), posterColours);
  check("Fullscreen sits icon-only at the right of the transport", await ev("(() => { const b = document.querySelector('#fullscreen'); return b.closest('#transport') !== null && b.textContent.trim() === '' && !!b.querySelector('svg') && b.getAttribute('aria-label') === 'Fullscreen' && !document.querySelector('#bar #fullscreen'); })()"));
  check("Settings lives at the far right of the status bar", await ev("(() => { const o = document.querySelector('#options'); const s = document.querySelector('#status').getBoundingClientRect(); return o.closest('#status') !== null && !document.querySelector('#bar #options') && s.right - o.getBoundingClientRect().right < 16; })()"));
  check("Settings uses a larger status-bar icon (P026)", await ev("(() => { const i = document.querySelector('#options svg'); const r = i?.getBoundingClientRect(); return Boolean(r) && r.width >= 18 && r.height >= 18 && document.querySelector('#options').getAttribute('aria-label') === 'Settings'; })()"));
  check("Studio pages declare the GVR favicon", await ev("(async () => { const l = document.querySelector('link[rel=icon]'); if (!l) return false; const r = await fetch(l.href); return r.ok && (await r.text()).includes('<svg'); })()"));
  await ev("document.querySelector('#options').click()");
  check("status-bar Settings menu opens upward inside the window", await ev("(() => { const r = document.querySelector('#options-pop').getBoundingClientRect(); return !document.querySelector('#options-pop').hidden && r.top >= 0 && r.bottom <= document.querySelector('#status').getBoundingClientRect().top + 1 && r.right <= innerWidth; })()"));
  await shot("2b-settings");
  await ev("document.querySelector('#options').click()");
  await shot("2-loaded");

  // 3. Run
  await ev("document.querySelector('#run').click()");
  await sleep(600);
  const ran = await player();
  check("Run compiles and plays the loaded program", ran.runState === "ok" && ran.sceneId === "bouncing-ball" && ran.playing && ran.timeMs > 0, ran);
  check("Fullscreen is enabled after Run", !(await ev("document.querySelector('#fullscreen').disabled")));
  check("floating playback stays in the canvas until the pointer moves", await ev(`(() => {
    const playback = document.querySelector('#playback');
    const speed = document.querySelector('#speed');
    const full = document.querySelector('#opt-full-tape');
    const area = document.querySelector('#canvas-area').getBoundingClientRect();
    const box = playback.getBoundingClientRect();
    return playback.closest('#canvas-area')
      && !playback.classList.contains('is-revealed')
      && playback.classList.contains('is-line')
      && box.bottom <= area.bottom + 1
      && box.top > area.top
      && speed.closest('#options-pop')
      && full instanceof HTMLInputElement
      && !full.checked;
  })()`));
  await ev("document.querySelector('#play').click()");
  const track = await ev("(() => { const r = document.querySelector('#track-time').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()");
  await move(track.x + track.w * 0.5, track.y + track.h / 2);
  await sleep(30);
  await click(track.x + track.w * 0.5, track.y + track.h / 2);
  const sought = await player();
  check("clicking the tape seeks to that fraction of the program", Math.abs(sought.timeMs - sought.durationMs * 0.5) < sought.durationMs * 0.02 && !sought.playing, sought);
  for (let i = 0; i < 40 && (await player()).tape?.pending; i++) await sleep(20);
  const tapeRun = (await player()).tape;
  check("Run mode fills the whole frame tape with thumbnail tiles", tapeRun && tapeRun.tiles > 4 && tapeRun.drawn === tapeRun.tiles && tapeRun.failed === 0, tapeRun);
  const ahead = await ev("(() => { const a = document.querySelector('#tape-ahead').getBoundingClientRect(), t = document.querySelector('#track-time').getBoundingClientRect(); return { left: (a.left - t.left) / t.width, width: a.width / t.width }; })()");
  check("frames ahead of the playhead are greyed until played", Math.abs(ahead.left - 0.5) < 0.03 && Math.abs(ahead.width - 0.5) < 0.03, ahead);
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
  await ev("document.querySelector('#toggle-side-panel').click()");
  await sleep(100);
  check("Source panel opens on the right with the loaded source", (await visible("#source-panel")) && (await ev("document.querySelector('#source').value.includes('bouncing-ball')")));
  // P026: the dock/side-panel corner handle resizes both at once.
  if (!(await player()).panelOpen) { await ev("document.querySelector('#panel-toggle').click()"); await sleep(50); }
  const cornerBefore = await player();
  const corner = await ev(`(() => {
    const c = document.querySelector('#corner-resize').getBoundingClientRect();
    const dock = document.querySelector('#panel-resize').getBoundingClientRect();
    const edge = document.querySelector('#source-resize').getBoundingClientRect();
    return { x: c.left + c.width / 2, y: c.top + c.height / 2, dockY: dock.top + dock.height / 2, edgeX: edge.left + edge.width / 2, cursor: getComputedStyle(document.querySelector('#corner-resize')).cursor };
  })()`);
  check("Corner handle sits where the bottom dock meets the side panel", (await visible("#corner-resize")) && Math.abs(corner.x - corner.edgeX) <= 2 && Math.abs(corner.y - corner.dockY) <= 2, corner);
  await move(corner.x, corner.y);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: corner.x, y: corner.y, button: "left", clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: corner.x - 20, y: corner.y - 15, button: "left", buttons: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: corner.x - 40, y: corner.y - 30, button: "left", buttons: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: corner.x - 40, y: corner.y - 30, button: "left", clickCount: 1 }, sessionId);
  const cornerAfter = await player();
  check(
    "Dragging the corner resizes the side panel and bottom dock together",
    cornerAfter.sourceWidth === cornerBefore.sourceWidth + 40 && cornerAfter.panelHeight === cornerBefore.panelHeight + 30,
    { before: [cornerBefore.sourceWidth, cornerBefore.panelHeight], after: [cornerAfter.sourceWidth, cornerAfter.panelHeight] },
  );
  const cornerFollow = await ev(`(() => {
    const c = document.querySelector('#corner-resize').getBoundingClientRect();
    const dock = document.querySelector('#panel-resize').getBoundingClientRect();
    const edge = document.querySelector('#source-resize').getBoundingClientRect();
    return Math.abs(c.left + c.width / 2 - (edge.left + edge.width / 2)) <= 2 && Math.abs(c.top + c.height / 2 - (dock.top + dock.height / 2)) <= 2;
  })()`);
  check("Corner handle follows the resized edges", cornerFollow);
  await shot("5a-corner-resize");
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

  // P004. The same Player source drives explicit Split Run and optional comparison.
  await ev("window.__gvr.open('sample:ball'); document.querySelector('#toggle-split').click()");
  const splitOpened = await player();
  check("Split expands the single Source editor with explicit formats", splitOpened.split && splitOpened.sourceOpen && await visible('#split-controls') && await ev(`document.querySelectorAll('#source').length === 1 && document.querySelector('#split-format').options.length === 4`));
  check("Split comparison defaults off with no emitted script", !splitOpened.comparison && !splitOpened.comparisonSceneId && await ev(`window.__gvr.script === undefined && document.querySelector('#comparison').hidden`));
  const setFormat = (format: string) => ev(`(() => { const s = document.querySelector('#split-format'); s.value = ${JSON.stringify(format)}; s.dispatchEvent(new Event('change')); })()`);
  const setSource = (source: string) => ev(`(() => { const s = document.querySelector('#source'); s.value = ${JSON.stringify(source)}; s.dispatchEvent(new Event('input')); })()`);
  const preset = (key: string) => ev(`(() => { const s = document.querySelector('#split-presets'); s.value = ${JSON.stringify(key)}; s.dispatchEvent(new Event('change')); })()`);
  const nativeDraft = (await ev("document.querySelector('#source').value")) + '\n// draft kept across formats';
  await setSource(nativeDraft);
  await setFormat('svg');
  await setSource('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="20" fill="red"/></svg>');
  const svgDraft = await ev("document.querySelector('#source').value");
  await setFormat('motionscript');
  check("format switches restore separate native and SVG drafts", await ev(`document.querySelector('#source').value === ${JSON.stringify(nativeDraft)}`));
  await setFormat('svg');
  check("returning to SVG preserves its independent draft and waits for Run", (await player()).runState === 'not-run' && await ev(`document.querySelector('#source').value === ${JSON.stringify(svgDraft)}`));
  await ev("document.querySelector('#run').click()");
  check("pasted SVG runs through the existing importer", (await player()).format === 'svg' && (await player()).runState !== 'failed' && !!(await player()).sceneId);
  await ev("document.querySelector('#split-compare').click()");
  const compared = await player();
  check("explicit comparison builds and displays the second scene", compared.comparison && !!compared.comparisonSceneId && await visible('#compare-view') && await ev(`window.__gvr.script.length > 0 && document.querySelector('#report').textContent.includes('not comparison with an original SVG/Lottie renderer')`), compared);
  await shot('9-split-svg-compare');
  await ev("document.querySelector('#split-compare').click()");
  check("turning comparison off removes its runtime and emitted result", !(await player()).comparison && !(await player()).comparisonSceneId && await ev(`window.__gvr.script === undefined && document.querySelector('#comparison').hidden`));
  for (const [format, key] of [['lottie','import:lottie:animated_position'], ['fixture','import:fixture:exact'], ['motionscript','sample:ball']]) {
    await setFormat(format!);
    await preset(key!);
    check(`${format} preset loads without running`, (await player()).runState === 'not-run');
    await ev("document.querySelector('#run').click()");
    check(`${format} Split Run produces a real rendered frame`, (await player()).runState !== 'failed' && await ev(`window.__gvr.frame.drawItems.length > 0 && document.querySelector('#view').width > 1`));
  }
  await ev("window.__gvr.seek(500)");
  await player();
  await ev("document.querySelector('#split-compare').click()");
  await player();
  await ev("window.__gvr.seek(500)");
  await player();
  check("native comparison uses the same playhead and renders matching pixels", await ev(`document.querySelector('#view').toDataURL() === document.querySelector('#compare-view').toDataURL()`));
  check("comparison canvases align vertically and use identical backing dimensions", await ev(`(() => { const a = document.querySelector('#view'), b = document.querySelector('#compare-view'); return a.width === b.width && a.height === b.height && Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) < 1; })()`));
  await shot('10-split-native-compare');
  await ev("document.querySelector('#split-compare').click()");
  await player();
  const previousScene = (await player()).sceneId;
  await setSource('this is not MotionScript');
  await ev("document.querySelector('#run').click()");
  const retained = await player();
  check("failed Run retains previous successful scene and the rejected draft", retained.runState === 'failed' && retained.sceneId === previousScene && await ev(`document.querySelector('#source').value === 'this is not MotionScript' && !document.querySelector('#failed').hidden && document.querySelector('#failed-note').textContent.includes('previous successful scene')`), retained);
  await shot('11-split-retained-failure');
  await ev("document.querySelector('#toggle-split').click()");
  await player();
  await ev("document.querySelector('#toggle-split').click()");
  check("closing/reopening Split keeps edits and comparison stays off", !(await player()).comparison && await ev(`document.querySelector('#source').value === 'this is not MotionScript'`));
  await setFormat('svg');
  await ev(`(() => { const input = document.querySelector('#split-file'); const dt = new DataTransfer(); dt.items.add(new File([${JSON.stringify(svgDraft)}], 'split-source.svg')); input.files = dt.files; input.dispatchEvent(new Event('change')); })()`);
  await sleep(100);
  check("Open file uses the selected format and waits for Run", (await player()).programName === 'split-source.svg' && (await player()).runState === 'not-run' && await ev(`document.querySelector('#source').value === ${JSON.stringify(svgDraft)}`));
  await ev(`(() => { window.savedFileText = File.prototype.text; File.prototype.text = () => new Promise(resolve => { window.resolveSlowFile = resolve; }); const input = document.querySelector('#split-file'); const dt = new DataTransfer(); dt.items.add(new File(['stale'], 'slow.svg')); input.files = dt.files; input.dispatchEvent(new Event('change')); })()`);
  await setFormat('motionscript');
  await ev(`window.resolveSlowFile('stale'); File.prototype.text = window.savedFileText`);
  await player();
  check("late file reads cannot overwrite a newer format draft", (await player()).format === 'motionscript' && await ev(`document.querySelector('#source').value === 'this is not MotionScript'`));
  await setFormat('svg');
  await ev(`(() => { File.prototype.text = async () => { throw new Error('read denied'); }; const input = document.querySelector('#split-file'); const dt = new DataTransfer(); dt.items.add(new File([''], 'denied.svg')); input.files = dt.files; input.dispatchEvent(new Event('change')); })()`);
  await sleep(100);
  check("file read errors are visible and preserve the draft", await visible('#split-error') && await ev(`document.querySelector('#split-error').textContent.includes('read denied') && document.querySelector('#source').value === ${JSON.stringify(svgDraft)}`));
  await ev(`File.prototype.text = window.savedFileText`);
  await ev("document.querySelector('#open-library').click()");
  await sleep(100);
  await ev("document.querySelector('#library-player').click()");
  check("Library navigation preserves the selected Split draft", (await player()).split && (await player()).format === 'svg' && await ev(`document.querySelector('#source').value === ${JSON.stringify(svgDraft)}`));

  await cdp.send("Emulation.setDeviceMetricsOverride", {width:800, height:900, deviceScaleFactor:1, mobile:false}, sessionId);
  await sleep(150);
  check("Split controls fit the editor at a narrower viewport", await ev(`(() => { const a = document.querySelector('#split-controls'), b = document.querySelector('#source-panel'); return a.scrollWidth <= b.clientWidth && document.documentElement.scrollWidth <= document.documentElement.clientWidth; })()`));
  await shot('12-split-narrow');
  await cdp.send("Emulation.setDeviceMetricsOverride", {width:1440, height:900, deviceScaleFactor:1, mobile:false}, sessionId);

  // P002: one loaded program, real Worker arrival, independent arrival/playback controls.
  await navigate("/");
  const streamScript = `scene "live-source" { version "0.1"; viewport (400, 300); background #101014; duration 2s; };
  // Unicode arrival 🌙
  circle c { radius 20; fill #ffffff; };
  animate c.position.x { from 0; to 100; duration 1s; };
  seal 1s;
  animate c.position.x { from 100; to 200; start 1s; duration 1s; };
  seal 2s;
  complete;`;
  await ev(`window.__gvr.open('motion:bunny')`);
  // Library keys may change; create an explicit MotionScript draft through Split.
  await ev(`document.querySelector('#toggle-split').click(); document.querySelector('#source').value = ${JSON.stringify(streamScript)}; document.querySelector('#source').dispatchEvent(new Event('input')); document.querySelector('#arrival-rate').value = '20'; document.querySelector('#arrival-size').value = '2';`);
  await player();
  await ev("document.querySelector('#stream').click()");
  await sleep(300);
  let live = await ev("window.__gvr.stream");
  check("Stream starts current draft with a real partial arrival", live && live.receivedCharacters > 0 && live.receivedCharacters < live.totalCharacters, live);
  check("Stream exposes no unarrived source", await ev(`document.querySelector('#stream-source').textContent.replace(/[◌▷✓✕]/g, '') === ${JSON.stringify(streamScript)}.slice(0, window.__gvr.stream.receivedCharacters)`));
  await ev("document.querySelector('#arrival-pause').click()");
  await sleep(100);
  const pausedCursor = await ev("window.__gvr.stream.receivedCharacters");
  await sleep(300);
  check("Pause arrival stops Worker delivery", await ev("window.__gvr.stream.arrivalPaused && window.__gvr.stream.receivedCharacters") === pausedCursor);
  await ev("document.querySelector('#arrival-step').click()");
  await sleep(150);
  check("Step delivers one bounded chunk and stays paused", await ev(`window.__gvr.stream.arrivalPaused && window.__gvr.stream.receivedCharacters === ${pausedCursor + 8}`));
  check("stream controls live only in the Stream dropdown", await ev("['arrival-rate', 'arrival-pause', 'arrival-step', 'arrival-mode'].every(id => document.getElementById(id).closest('#stream-pop')) && !document.querySelector('#bar > #stream-controls, .run-actions > #stream-controls')"));
  await ev("document.querySelector('#stream-menu').click()");
  check("Stream dropdown shows rate, pause/step and Advanced fields", await visible('#arrival-rate') && await visible('#arrival-pause') && await visible('#arrival-step') && await visible('#arrival-mode') && await visible('#arrival-seed'));
  check("Partial arrival shows waiting instead of a false failure", !(await visible('#failed')) && await visible('#ready'));
  check("Stream header fits desktop width", await ev("document.documentElement.scrollWidth <= document.documentElement.clientWidth"));
  await shot('13-stream-arriving');
  await ev("document.querySelector('#arrival-rate').value = '200'; document.querySelector('#arrival-stall-every').value = '1'; document.querySelector('#arrival-stall-ms').value = '200'; document.querySelector('#arrival-jitter').value = '25'; document.querySelector('#arrival-seed').value = '99'; document.querySelector('#stream').click()");
  await sleep(120);
  check("Advanced stalls are real producer pauses with honest status", await ev("document.querySelector('#stream-summary').textContent.includes('scheduled arrival stall') && window.__gvr.stream.receivedCharacters < 24"));
  // Restart at Instant: old pending producer must not leak into the new session.
  await ev("document.querySelector('#arrival-rate').value = '0'; document.querySelector('#stream').click()");
  for (let i = 0; i < 100 && !(await ev("window.__gvr.stream?.arrivalDone")); i++) await sleep(50);
  live = await ev("window.__gvr.stream");
  check("Instant simulated arrival completes native compilation", live?.authoringComplete && live.receivedCharacters === streamScript.length && live.appliedRevision > 0, live);
  check("Source has accepted units ahead of playhead", await ev("!!document.querySelector('#stream-source .stream-queued')"));
  const tapeStream = (await player()).tape;
  check("Stream mode draws frame tiles only for the resolved range", tapeStream && tapeStream.drawn > 0 && tapeStream.drawn <= tapeStream.tiles, tapeStream);
  await ev("document.querySelector('.stream-body').style.flex = 'none'; document.querySelector('.stream-body').style.height = '40px'"); await player();
  await ev("(() => { const s = document.querySelector('#stream-scroll'); s.scrollTop = 0; s.dispatchEvent(new Event('scroll')); })()"); await player();
  check("scrolling up stops following and offers Jump to latest", await visible("#stream-follow") && await ev("document.querySelector('#stream-scroll').scrollTop === 0"));
  await ev("document.querySelector('#stream-follow').click()"); await player();
  check("Jump to latest returns to the newest arrived text", !(await visible("#stream-follow")) && await ev("(() => { const s = document.querySelector('#stream-scroll'); return s.scrollHeight - s.scrollTop - s.clientHeight <= 4; })()"));
  await ev("document.querySelector('.stream-body').style.flex = ''; document.querySelector('.stream-body').style.height = ''");
  await ev("document.querySelector('#stream-popout').click()"); await player();
  const pop = await ev(`(() => { const w = window.open('', 'gvr-arrived-source'); const span = w.document.querySelector('#stream-source span[data-state]'); return { cues: w.document.querySelectorAll('#stream-source .stream-cue').length, colour: span ? w.getComputedStyle(span).color : '', legend: w.document.body.textContent.includes('◌ arrived') }; })()`);
  check("pop-out keeps state icons, colours and the legend", pop.cues > 0 && pop.colour !== "" && pop.colour !== "rgb(0, 0, 0)" && pop.legend, pop);
  await ev("window.__gvr.seek(2000)"); await player();
  check("Playback resolves applied unit spans", await ev("!!document.querySelector('#stream-source .stream-resolved') && !document.querySelector('#stream-source .stream-queued')"));
  await shot('14-stream-resolved');
  await ev("document.querySelector('#play').click()"); await player();
  check("Completed stream can replay from zero", (await player()).playing && (await player()).timeMs < 1000);
  await cdp.send("Emulation.setDeviceMetricsOverride", {width:800, height:900, deviceScaleFactor:1, mobile:false}, sessionId);
  await sleep(100);
  check("Stream controls fit a narrow viewport", await ev("document.documentElement.scrollWidth <= document.documentElement.clientWidth"));
  await shot('16-stream-narrow');
  await cdp.send("Emulation.setDeviceMetricsOverride", {width:1440, height:900, deviceScaleFactor:1, mobile:false}, sessionId);
  await ev("document.querySelector('#run').click()"); await player();
  check("Run leaves Stream mode and removes monitoring controls", await ev("!window.__gvr.stream && document.querySelector('#stream-controls').hidden && document.querySelector('#tab-stream').hidden"));
  check("Run retains exact draft after streaming", await ev(`document.querySelector('#source').value === ${JSON.stringify(streamScript)}`));
  // Rejected text stays in arrived source with diagnostic cue.
  await ev(`document.querySelector('#source').value = ${JSON.stringify(streamScript.replace('#ffffff', '#zz'))}; document.querySelector('#stream').click();`);
  for (let i = 0; i < 100 && !(await ev("window.__gvr.stream?.arrivalDone")); i++) await sleep(50);
  check("Rejected arrived source has red diagnostic markers", await ev("!!document.querySelector('#stream-source .stream-rejected') && window.__gvr.sourceDiagnostics.length > 0"));
  await shot('15-stream-rejected');
  // Non-native drafts are still run via existing importers, with Stream unavailable.
  await ev("document.querySelector('#split-format').value = 'svg'; document.querySelector('#split-format').dispatchEvent(new Event('change'));");
  await player();
  check("Changing program cancels arrival; imports use Run", await ev("!window.__gvr.stream && document.querySelector('#stream').disabled"));

  // Main integration: keep newly released input and audio services on Stream's clock.
  await ev("document.querySelector('#split-format').value = 'motionscript'; document.querySelector('#split-format').dispatchEvent(new Event('change'));"); await player();
  const interactiveScript = `scene "stream-input" { version "0.2"; viewport (400, 300); background #101014; duration 2s; };
  circle lamp { position (100, 100); radius 30; fill #ffffff; opacity 0.2; };
  interact lamp { focusable true; on click toggle opacity 1 0.2; };
  seal 1s;
  complete;`;
  await ev(`document.querySelector('#source').value = ${JSON.stringify(interactiveScript)}; document.querySelector('#stream').click()`);
  for (let i = 0; i < 100 && !(await ev("window.__gvr.stream?.arrivalDone")); i++) await sleep(50);
  const lampPoint = await ev(`(() => { const r = document.querySelector('#view').getBoundingClientRect(); const fit = Math.min(r.width / 400, r.height / 300); return {x:r.left + (r.width - 400 * fit) / 2 + 100 * fit, y:r.top + (r.height - 300 * fit) / 2 + 100 * fit}; })()`);
  await click(lampPoint.x, lampPoint.y); await player();
  check("Stream applies native pointer input overlays", await ev("window.__gvr.frame?.drawItems.find(item => item.nodeId === 'lamp')?.opacity === 1"));
  const audioScript = `scene "stream-audio" { version "0.2"; viewport (400, 300); background #101014; duration 2s; };
  audio Click "/audio/click.wav" 80ms;
  circle lamp { position (100, 100); radius 30; fill #ffffff; };
  cue First narration Click at 0ms;
  seal 250ms;
  cue Later effects Click at 500ms;
  seal 1s;
  complete;`;
  await ev(`document.querySelector('#source').value = ${JSON.stringify(audioScript)}; document.querySelector('#stream').click()`);
  for (let i = 0; i < 100 && !(await ev("window.__gvr.stream?.arrivalDone")); i++) await sleep(50);
  await sleep(750);
  const audioProbe = (await player()).audio;
  check("Stream starts decoded audio on its playback clock", Boolean(audioProbe?.log.some((line: string) => line.includes('start First#0'))), audioProbe);
  check("Stream appends audio cues after the first seal", Boolean(audioProbe?.log.some((line: string) => line.includes('start Later#0'))), audioProbe);
  await ev("document.querySelector('#play').click()"); await player();
  check("Stream audio follows playback pause", (await player()).audio?.voices.length === 0);
  const exportedAudio = await ev("(() => { const wav = window.__gvr.exportAudio(); return wav && {bytes: wav.wav.length, durationMs: wav.durationMs}; })()");
  check("Stream audio retains the existing offline export path", exportedAudio?.bytes > 44 && exportedAudio?.durationMs === 2000, exportedAudio);

  // 8b. Generate tools (P027): model gate, ⋯ copy granularity, system prompts, Library exit
  await navigate("/");
  await ev("document.querySelector('#generate').click()");
  for (let i = 0; i < 50 && !(await ev("/not ready/.test(document.querySelector('#generate-model').title)")); i++) await sleep(100);
  check("Generate greys the model and blocks Send until a model is ready", await ev(`(() => {
    const model = document.querySelector('#generate-model');
    const send = document.querySelector('#generate-send');
    const prompt = document.querySelector('#generate-prompt');
    prompt.value = 'kept while blocked';
    send.click();
    return model.disabled && send.disabled && model.closest('.generate-chip').classList.contains('is-unready')
      && window.__gvr.player.generateMessages === 0 && prompt.value === 'kept while blocked';
  })()`));
  await ev(`(() => {
    const real = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).endsWith('/api/tags')
      ? Promise.resolve(new Response(JSON.stringify({ models: [{ name: 'qwen2.5-coder:14b' }] }), { headers: { 'Content-Type': 'application/json' } }))
      : real(input, init);
    return true;
  })()`);
  for (let i = 0; i < 80 && (await ev("document.querySelector('#generate-send').disabled")); i++) await sleep(100);
  check("Send and the model selector unlock once the model answers ready", await ev(`!document.querySelector('#generate-send').disabled && !document.querySelector('#generate-model').disabled && !document.querySelector('#generate-model').closest('.generate-chip').classList.contains('is-unready')`));
  await ev(`window.__gvr.seedGeneratePreview("tools prompt", '{"intent":"tools"}', 'scene "tools" {}')`);
  await ev("document.querySelector('#generate-menu').click()");
  const toolsMenu = await ev(`(() => {
    const pop = document.querySelector('#generate-menu-pop');
    const r = pop.getBoundingClientRect();
    const items = [...pop.querySelectorAll('#generate-menu-main [role=menuitem]')].map((b) => b.textContent.replace('›', '').trim());
    return { open: !pop.hidden, items, inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 };
  })()`);
  check("⋯ menu opens with Copy and System prompts inside the window", toolsMenu.open && JSON.stringify(toolsMenu.items) === JSON.stringify(["Copy", "System prompts…"]) && toolsMenu.inside, toolsMenu);
  await ev("document.querySelector('#generate-menu-copy').click()");
  const copyMenu = await ev(`(() => {
    const boxes = [...document.querySelectorAll('#generate-copy-parts input')];
    return { visible: !document.querySelector('#generate-copy-menu').hidden && document.querySelector('#generate-menu-main').hidden,
      labels: boxes.map((b) => b.parentElement.textContent.trim()), checked: boxes.filter((b) => b.checked).map((b) => b.value) };
  })()`);
  check("Copy submenu offers six parts with prompts + MotionScript checked by default", copyMenu.visible && copyMenu.labels.length === 6 && JSON.stringify(copyMenu.checked) === JSON.stringify(["prompts", "motionscript"]), copyMenu);
  await shot("16-generate-copy-menu");
  const copied = await ev(`new Promise((done) => {
    navigator.clipboard.writeText = (text) => { done(text); return Promise.resolve(); };
    const director = document.querySelector('#generate-copy-parts input[value=director]');
    director.checked = true; director.dispatchEvent(new Event('change'));
    document.querySelector('#generate-copy-run').click();
  })`);
  check("Copy selected builds the chosen payload", copied.includes("## User\ntools prompt") && copied.includes("### Director response") && copied.includes('scene "tools" {}'), copied);
  check("A successful copy closes the ⋯ menu", await ev("new Promise((done) => setTimeout(() => done(document.querySelector('#generate-menu-pop').hidden), 50))"));
  await ev("document.querySelector('#generate-menu').click(); document.querySelector('#generate-menu-prompts').click()");
  await player();
  const prompts = await ev(`(() => {
    const text = document.querySelector('#generate-prompts-text');
    return { open: !document.querySelector('#generate-prompts').hidden, transcriptHidden: document.querySelector('#generate-middle').hidden,
      kind: document.querySelector('#generate-prompts-kind').value, state: document.querySelector('#generate-prompts-state').textContent,
      director: text.value.startsWith('You are a MotionScript director planner'), composer: !document.querySelector('.generate-composer').closest('[hidden]') };
  })()`);
  check("System prompts opens the Director prompt in an editor above the composer", prompts.open && prompts.transcriptHidden && prompts.kind === "director" && prompts.state === "default" && prompts.director && prompts.composer, prompts);
  await ev(`(() => { const t = document.querySelector('#generate-prompts-text'); t.focus(); t.value = 'Plan in three beats.'; t.dispatchEvent(new Event('input')); })()`);
  await player();
  check("Editing marks the system prompt as a session-only edit", await ev(`document.querySelector('#generate-prompts-state').textContent.includes('edited') && !document.querySelector('#generate-prompts-reset').disabled`));
  await shot("17-generate-system-prompts");
  await ev(`(() => { const k = document.querySelector('#generate-prompts-kind'); k.value = 'motionscript'; k.dispatchEvent(new Event('change')); })()`);
  await player();
  check("MotionScript system prompt shows the bundled authoring reference", await ev(`document.querySelector('#generate-prompts-text').value.includes('MotionScript authoring reference') && document.querySelector('#generate-prompts-state').textContent === 'default'`));
  await ev(`(() => { const k = document.querySelector('#generate-prompts-kind'); k.value = 'director'; k.dispatchEvent(new Event('change')); })()`);
  await player();
  await ev("document.querySelector('#generate-prompts-reset').click()");
  await player();
  check("Reset restores the default Director prompt", await ev(`document.querySelector('#generate-prompts-text').value.startsWith('You are a MotionScript director planner') && document.querySelector('#generate-prompts-state').textContent === 'default'`));
  await ev("document.querySelector('#generate-prompts-close').click()");
  await player();
  check("Closing the editor returns to the transcript", await ev(`document.querySelector('#generate-prompts').hidden && !document.querySelector('#generate-middle').hidden`));
  await ev("document.querySelector('#open-library').click()");
  await sleep(150);
  await ev(`(() => { const s = document.querySelector('#library-search'); s.value = 'ball expression'; s.dispatchEvent(new Event('input')); document.querySelector('#library-grid article[data-key="sample:ball"] .program-preview').click(); })()`);
  await sleep(150);
  const libraryExit = await player();
  check("Library load while in Generate exits to the Source panel", !libraryExit.generateMode && libraryExit.sourceOpen && libraryExit.programKey === "sample:ball" && (await visible("#source-chrome")) && !(await visible("#generate-chrome")), libraryExit);

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
