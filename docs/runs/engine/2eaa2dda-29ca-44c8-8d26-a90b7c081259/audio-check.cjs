// E026 built-Studio audio check (headless Chromium via preinstalled Playwright).
// Usage: npm run build -w @gvr/playground && (cd app/playground && npx vite preview --port 4173) &
//        node docs/runs/engine/<run>/audio-check.cjs [baseUrl]
const { chromium } = require("playwright");
const base = process.argv[2] ?? "http://localhost:4173/";
const results = {};
const check = (name, ok, detail) => { results[name] = { ok: Boolean(ok), detail }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage();
  const probe = () => page.evaluate(() => window.__gvr?.player);
  await page.goto(`${base}#p/${encodeURIComponent("sample:audio-lesson")}`);
  await page.click("#run");
  await page.waitForFunction(() => window.__gvr?.player?.runState === "ok", null, { timeout: 15000 });
  await page.waitForFunction(() => (window.__gvr?.player?.audio?.log ?? []).filter((l) => l.startsWith("decoded")).length === 3, null, { timeout: 15000 });
  let p = await probe();
  check("decoded three resources", true, p.audio.log.filter((l) => l.startsWith("decoded")));
  // Play from the start.
  await page.evaluate(() => { window.__gvr.seek(0); });
  await page.click("#play");
  await wait(600);
  p = await probe();
  check("context running", p.audio.context === "running", p.audio.context);
  check("narration and ducked music start", p.audio.log.some((l) => l.startsWith("start Explain#0")) && p.audio.log.some((l) => /^start Music#0 .*gain=0\.(600|210)/.test(l)), p.audio.log.filter((l) => l.startsWith("start")));
  await wait(2200);
  p = await probe();
  const starts = p.audio.log.filter((l) => l.startsWith("start"));
  check("clicks start on cue", ["Tap1#0", "Tap2#0"].every((k) => starts.some((l) => l.startsWith(`start ${k}`))), starts);
  check("music loop iterations are separate voices", starts.some((l) => l.startsWith("start Music#1")) && starts.some((l) => l.startsWith("start Music#2")), starts);
  check("clock advanced while playing", p.playing && p.timeMs > 2000, p.timeMs);
  // Pause silences every voice.
  await page.click("#play");
  await wait(200);
  p = await probe();
  check("pause silences voices", !p.playing && p.audio.voices.length === 0, p.audio.voices);
  // Seek then resume restarts voices at the scheduled offset.
  await page.evaluate(() => window.__gvr.seek(1500));
  const before = (await probe()).audio.log.length;
  await page.click("#play");
  await wait(150);
  p = await probe();
  const resumed = p.audio.log.slice(Math.max(0, before - 200 + (p.audio.log.length >= 200 ? 0 : 0))).filter((l) => l.startsWith("start Explain#0"));
  const last = resumed[resumed.length - 1] ?? "";
  const offset = Number(/offset=(\d+)/.exec(last)?.[1]);
  check("resume after seek re-enters narration at scheduled offset", Math.abs(offset - 1300) < 120 && /resume|enter|resync/.test(last), last);
  await page.click("#play");
  // Export: deterministic offline WAV of the declared schedule.
  const exported = await page.evaluate(() => {
    const result = window.__gvr.exportAudio();
    if (!result) return null;
    const bytes = result.wav;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const tag = String.fromCharCode(...bytes.slice(0, 4)) + String.fromCharCode(...bytes.slice(8, 12));
    const frames = (bytes.length - 44) / 4;
    const rms = (fromMs, toMs) => {
      let sum = 0; let n = 0;
      for (let f = Math.floor((fromMs * 44100) / 1000); f < Math.floor((toMs * 44100) / 1000); f += 1) { const s = view.getInt16(44 + f * 4, true) / 32768; sum += s * s; n += 1; }
      return Math.sqrt(sum / Math.max(1, n));
    };
    let hash = 2166136261;
    for (const b of bytes) { hash ^= b; hash = Math.imul(hash, 16777619) >>> 0; }
    return { tag, bytes: bytes.length, frames, sampleRate: result.sampleRate, durationMs: result.durationMs, rmsNarration: rms(600, 900), rmsAfter: rms(3500, 3900), rmsClick: rms(3000, 3040), fnv1a: hash.toString(16) };
  });
  check("export is a 4 s stereo WAV", exported && exported.tag === "RIFFWAVE" && exported.frames === 4 * 44100, exported);
  check("export carries narration and effects energy", exported && exported.rmsNarration > 0.05 && exported.rmsClick > exported.rmsAfter, exported);
  const again = await page.evaluate(() => { const r = window.__gvr.exportAudio(); let h = 2166136261; for (const b of r.wav) { h ^= b; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); });
  check("export is deterministic", again === exported.fnv1a, again);

  // Failed required narration holds playback visibly.
  const failing = await browser.newPage();
  await failing.route("**/audio/narration.wav", (route) => route.fulfill({ status: 404, body: "" }));
  await failing.goto(`${base}#p/${encodeURIComponent("sample:audio-lesson")}`);
  await failing.click("#run");
  await failing.waitForFunction(() => (window.__gvr?.player?.audio?.log ?? []).some((l) => l.startsWith("failed Narration")), null, { timeout: 15000 });
  await failing.evaluate(() => window.__gvr.seek(0));
  await failing.click("#play");
  await wait(500);
  const held = await failing.evaluate(() => ({ player: window.__gvr.player, status: document.getElementById("status").textContent }));
  check("failed required narration blocks playback", !held.player.playing && held.player.timeMs < 50 && held.player.audio.note.includes("failed"), { timeMs: held.player.timeMs, note: held.player.audio.note, status: held.status });
  await browser.close();
  const failed = Object.entries(results).filter(([, v]) => !v.ok);
  console.log(JSON.stringify(results, null, 2));
  console.log(failed.length === 0 ? `PASS ${Object.keys(results).length} checks` : `FAIL ${failed.map(([k]) => k).join(", ")}`);
  process.exit(failed.length === 0 ? 0 : 1);
})().catch((error) => { console.error(error); process.exit(1); });
