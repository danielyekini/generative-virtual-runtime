import { telemetry } from "../telemetry";
import { compileMotionScript, createIncrementalProgram, type IncrementalProgram } from "@gvr/compiler";
import {
  ImportRegistry,
  fixtureAdapter,
  formatImportReport,
  importSource,
  retainedScene,
  type ImportResult,
} from "@gvr/format-import-core";
import { lottieAdapter } from "@gvr/format-lottie";
import { svgAdapter } from "@gvr/format-svg";
import { emitMotionScript } from "@gvr/motionscript-emitter";
import { AnimationRuntime, PlaybackClock, RuntimeClock, StreamingRuntime } from "@gvr/runtime";
import { validateSceneIR, type SceneIR } from "@gvr/schema";
import type { GvrBridge, GvrCompare } from "../bridge";
import { describeFrame, describeScene, sameItems } from "../describe";
import {
  fixtureExamples,
  frameScripts,
  lottieExamples,
  motionExamples,
  sceneScripts,
  streamCaptions,
  svgExamples,
  testScripts,
  type MotionExample,
  type SourceExample,
} from "../examples";
import type { Shell } from "../shell";
import { clampTime, collectKeyTimes, isStaticScene, readFrameMs, stepKey } from "../timeline";

type Lane = "script" | "import" | "stream";
type Picture = "compiled" | "roundtrip" | "both";
type StreamPhase = "idle" | "setup" | "wait" | "dwell" | "rest" | "done";

const catalogs: Record<string, SourceExample[]> = {
  fixture: fixtureExamples,
  lottie: lottieExamples,
  svg: svgExamples,
};

const formatLabels: Record<string, string> = {
  motionscript: "MotionScript",
  fixture: "Fixture",
  lottie: "Lottie",
  svg: "SVG",
};

const sizePresets = [
  { id: "window", label: "Window", width: 0, height: 0 },
  { id: "16:9", label: "16:9", width: 960, height: 540 },
  { id: "ultrawide", label: "Ultrawide", width: 1200, height: 480 },
  { id: "portrait", label: "Portrait", width: 420, height: 760 },
  { id: "tiny", label: "Tiny", width: 320, height: 200 },
];

const registry = new ImportRegistry();
registry.register(fixtureAdapter);
registry.register(lottieAdapter);
registry.register(svgAdapter);

function must<T extends HTMLElement>(id: string): T {
  const element = document.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`studio markup missing #${id}`);
  return element;
}

function option(value: string, label: string): HTMLOptionElement {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = label;
  return element;
}

export function createWorkspace(shell: Shell) {
  const playClock = new RuntimeClock();
  const streamClock = new PlaybackClock();
  const testSelect = must<HTMLSelectElement>("test-scripts");
  const testCaption = must<HTMLElement>("test-caption");
  const picture = must<HTMLElement>("picture");
  const sizeSelect = must<HTMLSelectElement>("canvas-size");
  const dprSelect = must<HTMLSelectElement>("canvas-dpr");
  const streamToggle = must<HTMLInputElement>("stream-toggle");
  const streamConfig = must<HTMLElement>("stream-config");
  const streamSource = must<HTMLSelectElement>("stream-source");
  const streamPreset = must<HTMLSelectElement>("stream-preset");
  const streamRun = must<HTMLButtonElement>("stream-run");
  const streamPop = must<HTMLButtonElement>("stream-pop");
  const formatSelect = must<HTMLSelectElement>("source-format");
  const importSelect = must<HTMLSelectElement>("import-presets");
  const importOpen = must<HTMLButtonElement>("import-open");
  const importPlay = must<HTMLButtonElement>("import-play");
  const importSplit = must<HTMLButtonElement>("import-split");

  let lane: Lane = "script";
  let pictureMode: Picture = "compiled";
  let scriptId = "preset:bunny";
  let source = motionExamples[0]?.source ?? "";
  let compiledText = "";
  let sceneA: SceneIR | undefined;
  let sceneB: SceneIR | undefined;
  let script = "";
  let compileMessages: string[] = [];
  let compileOk = false;
  let roundTripNote = "Press Compile to build Scene IR.";
  let failedStep: string | null = null;
  let runtimeA: AnimationRuntime | undefined;
  let runtimeB: AnimationRuntime | undefined;

  let formatId = "motionscript";
  let compiledFormat = "motionscript";
  let sourceName = "source";
  const importIndex: Record<string, number> = { fixture: 0, lottie: 0, svg: 0 };
  let split = false;
  let result: ImportResult | undefined;
  let importScript = "";
  let importSceneB: SceneIR | undefined;
  let importCompileOk = false;
  let importCompileDiagnostics = "";
  let shown: SceneIR | undefined;
  let attempted = "";
  let attemptedFixtureId = "";
  let displayedSceneId = "";
  let importFailed = false;
  let importedFormat = formatId;
  let importRuntimeA: AnimationRuntime | undefined;
  let importRuntimeB: AnimationRuntime | undefined;
  let frameMs = 1000 / 30;
  let customImport = false;

  let streamExample = motionExamples[0] ?? fail("no stream examples");
  let streamProgram: IncrementalProgram = createIncrementalProgram(telemetry);
  let streamRuntime = new StreamingRuntime(telemetry);
  let streamCursor = 0;
  let streamPhase: StreamPhase = "idle";
  let streamDwellUntil = 0;
  let streamBuffer = streamExample.source;

  function fail(message: string): never {
    throw new Error(message);
  }

  function catalog(): SourceExample[] {
    return catalogs[formatId] ?? fixtureExamples;
  }

  function allScripts(): { key: string; item: MotionExample }[] {
    return [
      ...motionExamples.map((item) => ({ key: `preset:${item.id}`, item })),
      ...sceneScripts.map((item) => ({ key: `scene:${item.id}`, item })),
      ...frameScripts.map((item) => ({ key: `frame:${item.id}`, item })),
    ];
  }

  function currentScript(): MotionExample | undefined {
    return allScripts().find((entry) => entry.key === scriptId)?.item;
  }

  function sizeOf(box: HTMLElement): { width: number; height: number } {
    const preset = sizePresets.find((entry) => entry.id === sizeSelect.value);
    if (preset && preset.width > 0 && pictureMode !== "both" && !(lane === "import" && split)) {
      return { width: preset.width, height: preset.height };
    }
    return { width: box.clientWidth, height: box.clientHeight };
  }

  function dpr(): number {
    if (dprSelect.value === "1") return 1;
    if (dprSelect.value === "2") return 2;
    return window.devicePixelRatio || 1;
  }

  function scriptDirty(): boolean {
    return shell.sourceValue() !== compiledText || formatId !== compiledFormat;
  }

  function importDirty(): boolean {
    return shell.sourceValue() !== attempted || formatId !== importedFormat;
  }

  function stopStream(): void {
    streamPhase = "idle";
    streamClock.stop();
    streamProgram.dispose();
    streamRuntime.dispose();
    streamProgram = createIncrementalProgram(telemetry);
    streamRuntime = new StreamingRuntime(telemetry);
    streamCursor = 0;
    if (lane === "stream") lane = "script";
  }

  function fillSelects(): void {
    testSelect.replaceChildren();
    for (const group of testScripts) {
      const block = document.createElement("optgroup");
      block.label = group.group;
      const prefix = group.group === "Presets" ? "preset" : group.group === "Scenes" ? "scene" : "frame";
      for (const item of group.items) block.append(option(`${prefix}:${item.id}`, item.label));
      testSelect.append(block);
    }
    testSelect.value = scriptId;
    sizeSelect.replaceChildren(...sizePresets.map((entry) => option(entry.id, entry.label)));
    streamPreset.replaceChildren(...motionExamples.map((item) => option(item.id, item.label)));
    formatSelect.replaceChildren(
      option("motionscript", "MotionScript"),
      ...registry.formats().map((adapter) => option(adapter.formatId, formatLabels[adapter.formatId] ?? adapter.formatId)),
    );
    formatSelect.value = formatId;
    importSelect.replaceChildren();
    for (const [id, items] of Object.entries(catalogs)) {
      const block = document.createElement("optgroup");
      block.label = formatLabels[id] ?? id;
      items.forEach((item, index) => block.append(option(`${id}:${index}`, item.label)));
      importSelect.append(block);
    }
    importSelect.value = "lottie:0";
  }

  function syncChrome(): void {
    streamConfig.hidden = !streamToggle.checked;
    streamPreset.hidden = streamSource.value !== "preset";
    streamRun.textContent = streamPhase === "idle" || streamPhase === "done" ? "Run" : "Stop";
    streamPop.textContent = shell.popoutVisible() ? "Dock source" : "Pop out";
    importSplit.setAttribute("aria-pressed", String(split));
    for (const button of Array.from(picture.querySelectorAll("button"))) {
      const mode = button.dataset.picture;
      button.setAttribute("aria-pressed", String(mode === pictureMode));
      if (button instanceof HTMLButtonElement) button.disabled = lane === "stream";
    }
    const caption = lane === "import"
      ? sourceName
      : lane === "stream"
        ? (streamCaptions[streamExample.id] ?? streamExample.caption)
        : (currentScript()?.caption ?? "Compile MotionScript, or pick a test script.");
    if (testCaption.textContent !== caption) testCaption.textContent = caption;
  }

  function compile(): void {
    source = shell.sourceValue();
    compiledText = source;
    compiledFormat = "motionscript";
    formatId = "motionscript";
    const compiled = compileMotionScript(source, telemetry);
    compileMessages = compiled.diagnostics.map((item) => item.message);
    compileOk = compiled.ok;
    sceneA = compiled.scene && validateSceneIR(compiled.scene).ok ? compiled.scene : undefined;
    runtimeA = sceneA ? new AnimationRuntime(sceneA, telemetry) : undefined;
    script = "";
    sceneB = undefined;
    runtimeB = undefined;
    failedStep = sceneA ? null : "ira";
    if (!sceneA) {
      roundTripNote = "The source did not produce a Scene IR, so nothing was emitted.";
    } else {
      script = emitMotionScript(sceneA);
      const again = compileMotionScript(script, telemetry);
      if (!again.ok || !again.scene) {
        failedStep = "irb";
        roundTripNote = "The emitted MotionScript did not compile back into Scene IR.";
        compileMessages = [...compileMessages, ...again.diagnostics.map((item) => item.message)];
      } else {
        sceneB = again.scene;
        runtimeB = new AnimationRuntime(sceneB, telemetry);
        const mismatch = compareScenes(sceneA, sceneB);
        if (mismatch) {
          failedStep = "play";
          roundTripNote = `Scene IR B drifted from Scene IR A: ${mismatch}.`;
        } else {
          failedStep = null;
          roundTripNote = "Scene IR A and Scene IR B draw the same frames.";
        }
      }
    }
    playClock.pause();
    playClock.seek(0);
  }

  function compareScenes(left: SceneIR, right: SceneIR): string {
    const before = new AnimationRuntime(left, telemetry);
    const after = new AnimationRuntime(right, telemetry);
    const times = [0, left.timeline.durationMs / 2, left.timeline.durationMs];
    for (const time of times) {
      const mismatch = sameItems(before.evaluate(time).drawItems, after.evaluate(time).drawItems);
      if (mismatch) return `${mismatch} at ${time}ms`;
    }
    return "";
  }

  function loadScript(key: string): void {
    const found = allScripts().find((entry) => entry.key === key) ?? allScripts()[0];
    if (!found) return;
    stopStream();
    lane = "script";
    formatId = "motionscript";
    formatSelect.value = "motionscript";
    scriptId = found.key;
    testSelect.value = found.key;
    source = found.item.source;
    shell.setSourceValue(source);
    compile();
    draw();
  }

  function stepScript(direction: number): void {
    const items = allScripts();
    const at = Math.max(0, items.findIndex((entry) => entry.key === scriptId));
    const next = items[(at + direction + items.length) % items.length];
    if (next) loadScript(next.key);
  }

  function buildImportRoundTrip(imported: ImportResult): void {
    if (!imported.scene) {
      importScript = "";
      importSceneB = undefined;
      importCompileOk = false;
      importCompileDiagnostics = "Import produced no Scene IR.";
      return;
    }
    importScript = emitMotionScript(imported.scene);
    const again = compileMotionScript(importScript, telemetry);
    importSceneB = again.ok ? again.scene : undefined;
    importCompileOk = again.ok;
    importCompileDiagnostics = again.diagnostics.map((item) => `${item.code}\t${item.message}`).join("\n");
  }

  function applyImport(text: string, name: string, autoplay: boolean): void {
    const adapter = registry.get(formatId) ?? fixtureAdapter;
    const imported = importSource(adapter, text, { sourceName: name });
    result = imported;
    attempted = text;
    attemptedFixtureId = name;
    importedFormat = formatId;
    sourceName = name;
    const retained = retainedScene(shown, imported);
    importFailed = retained.importFailed;
    if (!retained.heldPrevious) {
      shown = retained.shown;
      if (shown) buildImportRoundTrip(imported);
      else {
        importScript = "";
        importSceneB = undefined;
        importCompileOk = false;
        importCompileDiagnostics = "Import produced no Scene IR.";
      }
      importRuntimeA = shown ? new AnimationRuntime(shown, telemetry) : undefined;
      importRuntimeB = importSceneB ? new AnimationRuntime(importSceneB, telemetry) : undefined;
    }
    displayedSceneId = shown?.sceneId ?? "";
    frameMs = formatId === "lottie" ? readFrameMs(text) : 1000 / 30;
    playClock.pause();
    if (!retained.heldPrevious) playClock.seek(0);
    if (autoplay && shown && !importFailed && !isStaticScene(shown)) playClock.play();
  }

  function loadImport(value: string, autoplay: boolean): void {
    const [id, indexText] = value.split(":");
    if (!id || !(id in catalogs)) return;
    stopStream();
    lane = "import";
    formatId = id;
    formatSelect.value = id;
    const items = catalog();
    const index = Number(indexText);
    const wrapped = ((Number.isFinite(index) ? index : 0) + items.length) % items.length;
    importIndex[formatId] = wrapped;
    const item = items[wrapped];
    if (!item) return;
    customImport = false;
    sourceName = item.file;
    shell.setSourceValue(item.source);
    importSelect.value = `${formatId}:${wrapped}`;
    applyImport(item.source, item.file, autoplay);
    draw();
  }

  function compileThroughFormat(): void {
    stopStream();
    formatId = formatSelect.value || "motionscript";
    if (formatId === "motionscript") {
      lane = "script";
      compile();
      return;
    }
    lane = "import";
    const text = shell.sourceValue();
    const fromCatalog = catalog().some((item) => item.source === text);
    customImport = !fromCatalog;
    if (!fromCatalog) sourceName = "pasted";
    applyImport(text, sourceName, false);
  }

  function playThroughFormat(): void {
    formatId = formatSelect.value || "motionscript";
    const text = shell.sourceValue();
    const sameScript = formatId === "motionscript" && text === compiledText && compiledFormat === "motionscript" && sceneA;
    const sameImport = formatId !== "motionscript" && text === attempted && formatId === importedFormat && Boolean(result?.ok && shown);
    if (sameScript && sceneA && !isStaticScene(sceneA)) {
      lane = "script";
      if (playClock.timeMs >= sceneA.timeline.durationMs) playClock.seek(0);
      playClock.play();
      draw();
      return;
    }
    if (sameImport && shown && !isStaticScene(shown)) {
      lane = "import";
      if (playClock.timeMs >= shown.timeline.durationMs) playClock.seek(0);
      playClock.play();
      draw();
      return;
    }
    compileThroughFormat();
    if (formatId === "motionscript" && sceneA && !isStaticScene(sceneA)) playClock.play();
    else if (formatId !== "motionscript" && shown && !isStaticScene(shown)) playClock.play();
    draw();
  }

  function stepImport(direction: number): void {
    const items = catalog();
    if (items.length === 0) return;
    const at = importIndex[formatId] ?? 0;
    loadImport(`${formatId}:${at + direction}`, false);
  }

  function publishStream(): void {
    for (const delta of streamProgram.drainDeltas()) streamRuntime.enqueue(delta);
    streamRuntime.flushCommands();
    const duration = streamRuntime.scene?.timeline.durationMs ?? 0;
    streamClock.setHorizon(streamRuntime.sealedThroughMs, duration, streamRuntime.authoringComplete);
  }

  function feedStream(count: number): void {
    const chunk = streamBuffer.slice(streamCursor, streamCursor + count);
    if (chunk.length === 0) return;
    streamCursor += chunk.length;
    streamProgram.push(chunk);
    publishStream();
  }

  function finishStream(): void {
    streamProgram.finish();
    publishStream();
    if (streamClock.playbackState === "stopped" || streamClock.playbackState === "paused") streamClock.play();
    streamPhase = "done";
  }

  function runStream(): void {
    if (streamPhase !== "idle" && streamPhase !== "done") {
      stopStream();
      draw();
      return;
    }
    lane = "stream";
    playClock.pause();
    streamProgram.dispose();
    streamRuntime.dispose();
    streamProgram = createIncrementalProgram(telemetry);
    streamRuntime = new StreamingRuntime(telemetry);
    streamCursor = 0;
    streamPhase = "setup";
    streamClock.stop();
    if (streamSource.value === "editor") {
      streamBuffer = shell.sourceValue();
    } else {
      streamExample = motionExamples.find((item) => item.id === streamPreset.value) ?? streamExample;
      streamBuffer = streamExample.source;
    }
    draw();
  }

  function shownScriptScene(): SceneIR | undefined {
    if (pictureMode === "roundtrip") return sceneB;
    return sceneA;
  }

  function activeSpan(): number {
    if (lane === "stream") return Math.max(streamRuntime.scene?.timeline.durationMs ?? 0, streamRuntime.sealedThroughMs);
    if (lane === "import") return shown?.timeline.durationMs ?? 0;
    return sceneA?.timeline.durationMs ?? sceneB?.timeline.durationMs ?? 0;
  }

  function bindClock(): void {
    shell.bindTransport({
      onPlay: () => {
        if (lane === "stream") {
          streamClock.play();
          draw();
          return;
        }
        playThroughFormat();
      },
      onPause: () => {
        if (lane === "stream") streamClock.pause();
        else playClock.pause();
        draw();
      },
      onSeek: (timeMs) => {
        if (lane === "stream") streamClock.seek(timeMs);
        else if (lane === "import") {
          if (shown && !isStaticScene(shown)) playClock.seek(clampTime(timeMs, shown.timeline.durationMs));
        } else if (!isStaticScene(shownScriptScene())) playClock.seek(clampTime(timeMs, activeSpan()));
        draw();
      },
      onRate: (rate) => {
        if (lane === "stream") streamClock.setRate(rate);
        else playClock.setRate(rate);
        draw();
      },
      onStep: (step, direction) => {
        if (lane === "stream") {
          const span = activeSpan();
          const next = step === "key"
            ? stepKey(collectKeyTimes(streamRuntime.scene, span), streamClock.timeMs, direction, span)
            : clampTime(streamClock.timeMs + direction * (1000 / 30), span);
          streamClock.pause();
          streamClock.seek(next);
        } else if (lane === "import") {
          if (!shown || isStaticScene(shown)) return;
          const span = shown.timeline.durationMs;
          const next = step === "key"
            ? stepKey(collectKeyTimes(shown, span), playClock.timeMs, direction, span)
            : clampTime(playClock.timeMs + direction * frameMs, span);
          playClock.pause();
          playClock.seek(next);
        } else {
          const span = activeSpan();
          const scene = sceneA ?? sceneB;
          if (isStaticScene(scene)) return;
          const next = step === "key"
            ? stepKey(collectKeyTimes(scene, span), playClock.timeMs, direction, span)
            : clampTime(playClock.timeMs + direction * (1000 / 30), span);
          playClock.pause();
          playClock.seek(next);
        }
        draw();
      },
    });
  }

  function paintPicture(frameA: ReturnType<AnimationRuntime["evaluate"]> | null, frameB: ReturnType<AnimationRuntime["evaluate"]> | null, splitView: boolean, titles: [string, string, string, string]): void {
    const ratio = dpr();
    shell.setMode(splitView ? "split" : "single");
    if (splitView) {
      shell.paint("a", frameA, shell.paneA.clientWidth, shell.paneA.clientHeight, ratio);
      shell.paint("b", frameB, shell.paneB.clientWidth, shell.paneB.clientHeight, ratio);
      shell.setPanes(titles[0], titles[1], titles[2], titles[3]);
    } else {
      const frame = pictureMode === "roundtrip" ? frameB : frameA;
      const size = sizeOf(shell.singleBox);
      shell.paint("single", frame, size.width, size.height, ratio);
    }
  }

  function flowState(id: string): "idle" | "done" | "live" | "failed" {
    const order = ["source", "ira", "script", "irb", "play"];
    if (failedStep === id) return "failed";
    const stop = failedStep ? order.indexOf(failedStep) : order.length;
    const index = order.indexOf(id);
    if (id === "play" && playClock.isPlaying && index < stop) return "live";
    if (index < stop && compiledText.length > 0) return "done";
    if (id === "source" && source.length > 0) return "done";
    return "idle";
  }

  function drawScript(): void {
    const span = activeSpan();
    const still = isStaticScene(shownScriptScene());
    if (span > 0 && playClock.timeMs >= span) {
      playClock.seek(span);
      playClock.pause();
    }
    const time = still ? 0 : clampTime(playClock.timeMs, span);
    if (still) playClock.seek(0);
    const frameA = runtimeA?.evaluate(time) ?? null;
    const frameB = runtimeB?.evaluate(time) ?? null;
    const splitView = pictureMode === "both";
    paintPicture(frameA, frameB, splitView, [
      "Compiled Scene IR",
      sceneA ? `${sceneA.sceneId} · ${sceneA.timeline.durationMs.toFixed(0)} ms` : "Scene IR A",
      "MotionScript round-trip",
      sceneB ? `${sceneB.sceneId} · ${sceneB.timeline.durationMs.toFixed(0)} ms` : "Scene IR B",
    ]);
    if (splitView) {
      shell.setPaneEmpty("a", frameA ? null : "Compile a program to see Scene IR A.");
      shell.setPaneEmpty("b", frameB ? null : "Round-trip is unavailable.");
    }
    const waiting = scriptDirty();
    const shownScene = shownScriptScene();
    shell.setTransport({
      hidden: false,
      enabled: span > 0 && !still,
      timeMs: time,
      durationMs: span,
      playing: playClock.isPlaying,
      rate: playClock.playbackRate,
      sync: splitView,
    });
    shell.setSourceMode("editor");
    shell.setSourceEditable(true);
    shell.setSourceNote(waiting ? `This text is waiting for Compile through ${formatLabels[formatId] ?? formatId}. The canvas stays on the last compile.` : (currentScript()?.caption ?? "MotionScript in the editor."));
    shell.setReport(currentScript()?.caption ?? "MotionScript", roundTripNote, failedStep ? "is-bad" : compiledText ? "exact" : "", compileMessages.join("\n"));
    shell.setFlow([
      { label: "Source", hint: formatLabels.motionscript ?? "MotionScript", state: flowState("source") },
      { label: "Scene IR A", hint: "compile", state: flowState("ira") },
      { label: "MotionScript", hint: "emit", state: flowState("script") },
      { label: "Scene IR B", hint: "compile again", state: flowState("irb") },
      { label: "Play", hint: pictureMode, state: flowState("play") },
    ]);
    shell.setScene(
      sceneB ? "Scene IR A is the compile. Scene IR B is the emit compiled again." : "Scene IR from the last compile.",
      [describeScene(sceneA, "Scene IR A"), describeScene(sceneB, "Scene IR B")].filter(Boolean).join("\n\n"),
    );
    shell.setScript(script ? "Canonical MotionScript emitted from Scene IR A." : "Compile a scene to emit MotionScript.", script);
    const frame = pictureMode === "roundtrip" ? frameB : frameA;
    shell.setFrames(frame ? "Resolved draw items at the player time." : "Compile a scene to inspect frames.", frame ? describeFrame(frame) : "");
    shell.setSession("One workspace. Test scripts, the editor, import, and streaming all share this canvas.", [
      shownScene?.sceneId ?? "no scene",
      compileOk ? "compiled" : compiledText ? "partial" : "waiting",
      `${compileMessages.length} diagnostics`,
      pictureMode,
      `window ${sizeSelect.value}`,
      `dpr ${dprSelect.value}`,
      waiting ? "editor changed" : "editor matches compile",
    ].join("\n"));
    shell.setStatus([
      shownScene?.sceneId ?? "no scene",
      waiting ? "editor changed" : compileOk ? "compiled" : compiledText ? "partial" : "waiting",
      span ? `t ${time.toFixed(1)}ms` : "",
      playClock.isPlaying ? "playing" : "paused",
      pictureMode,
      `${sizeSelect.value}`,
      `dpr ${dpr()}`,
    ].filter(Boolean).join("  ·  "));
  }

  function drawImport(): void {
    const dirty = importDirty();
    const still = isStaticScene(shown);
    const span = shown?.timeline.durationMs ?? 0;
    if (playClock.isPlaying && shown && playClock.timeMs >= span) {
      playClock.seek(span);
      playClock.pause();
    }
    const time = still ? 0 : clampTime(playClock.timeMs, span);
    if (still) playClock.seek(0);
    const frameA = importRuntimeA ? importRuntimeA.evaluate(time) : null;
    const frameB = importRuntimeB ? importRuntimeB.evaluate(time) : null;
    const splitView = split || pictureMode === "both";
    paintPicture(frameA, frameB, splitView, [
      "Imported Scene IR",
      shown ? `${shown.sceneId} · ${shown.timeline.durationMs.toFixed(0)} ms` : "Imported Scene IR, played directly",
      "MotionScript round-trip",
      importSceneB ? `${importSceneB.sceneId} · ${importSceneB.timeline.durationMs.toFixed(0)} ms` : "Emitted MotionScript, compiled and played",
    ]);
    if (splitView) {
      shell.setPaneEmpty("a", frameA ? null : "Import produced no Scene IR.");
      shell.setPaneEmpty("b", frameB ? null : importCompileDiagnostics || "Round-trip unavailable.");
    }
    const counts = result
      ? `exact ${result.fidelity.exact.length} · approximated ${result.fidelity.approximated.length} · dropped ${result.fidelity.dropped.length} · unsupported ${result.fidelity.unsupported.length}`
      : "";
    const failedCopy = importFailed
      ? shown
        ? `This import failed. The canvas is still showing ${shown.sceneId}.`
        : result && result.fidelity.exact.length === 0 && result.fidelity.approximated.length === 0
          ? `This import is not playable. ${counts}. The canvas is clear.`
          : "This import produced no Scene IR. The canvas is clear."
      : "";
    const summary = !result
      ? "Press Play to import this source into Scene IR."
      : importFailed
        ? dirty
          ? `The editor has changed. ${failedCopy}`
          : failedCopy
        : dirty
          ? `This text is waiting for Compile through ${formatLabels[formatId] ?? formatId}. The canvas stays on the last result.`
          : !shown
            ? "This import produced no Scene IR. The canvas is clear."
            : result.fidelity.overall === "exact"
              ? `Every reported feature came through unchanged. ${counts}.`
              : `The scene is playable. ${counts}.`;
    shell.setTransport({
      hidden: false,
      enabled: Boolean(shown) && !still,
      timeMs: time,
      durationMs: still ? 0 : span,
      playing: playClock.isPlaying,
      rate: playClock.playbackRate,
      sync: splitView,
    });
    shell.setSourceMode("editor");
    shell.setSourceEditable(true);
    shell.setSourceNote(
      importFailed && shown
        ? `Import of ${attemptedFixtureId || sourceName} failed. The canvas is still showing ${shown.sceneId}.`
        : dirty
          ? `This text is waiting for Compile through ${formatLabels[formatId] ?? formatId}. The canvas stays on the last result.`
          : `Compiled through ${formatLabels[importedFormat] ?? importedFormat}. Split plays the MotionScript round-trip beside it.`,
    );
    const showReport = Boolean(result) && (!dirty || importFailed);
    const reportBody = [
      showReport && result ? formatImportReport(result) : "",
      !importFailed && !importCompileOk && importCompileDiagnostics ? `ROUND_TRIP\n${importCompileDiagnostics}` : "",
    ].filter(Boolean).join("\n\n");
    shell.setReport(sourceName, summary, !result || (dirty && !importFailed) ? "" : result.fidelity.overall, reportBody);
    shell.setFlow([
      { label: "Source", hint: formatLabels[formatId] ?? formatId, state: shell.sourceValue().length > 0 ? "done" : "idle" },
      { label: "Import", hint: "Scene IR A", state: importFailed ? "failed" : !result || dirty ? "idle" : shown ? "done" : "failed" },
      { label: "Report", hint: showReport && result ? result.fidelity.overall : "diagnostics", state: showReport ? "done" : "idle" },
      { label: "Play", hint: splitView ? "both panes" : "canvas", state: shown ? (playClock.isPlaying ? "live" : "done") : "idle" },
    ]);
    shell.setScene(
      shown
        ? importFailed
          ? `Scene IR A is still ${shown.sceneId}. The report is the failed import of ${attemptedFixtureId}.`
          : "Scene IR A is the import. Scene IR B is the round-trip."
        : "Play a valid source to inspect Scene IR.",
      [describeScene(shown, "Scene IR A"), describeScene(importSceneB, "Scene IR B")].filter(Boolean).join("\n\n"),
    );
    shell.setScript(
      importScript ? (importCompileOk ? "Emitted from the imported scene. Compiling it produces Scene IR B." : "Emitted from the imported scene. Compiling it failed.") : "Play a valid source to emit MotionScript.",
      importScript,
    );
    shell.setFrames(frameA ? "Resolved draw items for the imported scene at the shared time." : "Import a scene to inspect frames.", frameA ? describeFrame(frameA) : "");
    shell.setSession("Import presets and an open file share the editor with the rest of the studio.", [
      `format ${formatId}`,
      `attempted ${attemptedFixtureId || sourceName}`,
      `displayed ${displayedSceneId || "none"}`,
      importFailed ? "import failed" : dirty ? "editor changed" : result?.fidelity.overall ?? "waiting",
      splitView ? "split" : "single",
      still ? "static, player disabled" : "",
    ].filter(Boolean).join("\n"));
    shell.setStatus([
      importFailed ? "failed" : dirty ? "waiting" : shown && result ? result.fidelity.overall : "waiting",
      `attempted ${attemptedFixtureId || "none"}`,
      `displayed ${displayedSceneId || "none"}`,
      shown ? `t ${time.toFixed(1)}ms` : "",
      playClock.isPlaying ? "playing" : "paused",
      splitView ? "split" : "single",
      formatId,
    ].filter(Boolean).join("  ·  "));
  }

  function drawStream(): void {
    const ratio = dpr();
    const size = sizeOf(shell.singleBox);
    const frame = streamRuntime.scene ? streamRuntime.evaluate(streamClock.timeMs) : null;
    shell.setMode("single");
    shell.paint("single", frame, size.width, size.height, ratio);
    const duration = streamRuntime.scene?.timeline.durationMs ?? 0;
    const playing = streamClock.playbackState === "playing";
    shell.setTransport({
      hidden: false,
      enabled: true,
      timeMs: streamClock.timeMs,
      durationMs: Math.max(duration, streamRuntime.sealedThroughMs, 1),
      playing,
      rate: streamClock.playbackRate,
      sync: false,
    });
    const diagnostics = streamProgram.diagnostics.map((item) => item.message).join("\n");
    if (streamSource.value === "preset") {
      shell.setSourceMode("stream");
      shell.setStreamFeed(streamBuffer.slice(0, streamCursor), streamBuffer.slice(streamCursor), diagnostics);
    } else {
      shell.setSourceMode("editor");
      shell.setSourceEditable(true);
    }
    const caption = streamSource.value === "editor"
      ? "Streaming the text in the editor."
      : (streamCaptions[streamExample.id] ?? streamExample.caption);
    shell.setSourceNote(`${caption} Fed ${streamCursor}/${streamBuffer.length}.`);
    shell.setReport(caption, "", diagnostics ? "is-bad" : "", diagnostics);
    shell.setFlow([
      { label: "Feed", hint: `${streamCursor}/${streamBuffer.length}`, state: streamCursor > 0 ? "done" : "idle" },
      { label: "Seal", hint: `${streamProgram.sealedThroughMs.toFixed(0)} ms`, state: streamProgram.sealedThroughMs > 0 ? "done" : "idle" },
      { label: "Play", hint: streamClock.playbackState, state: playing ? "live" : streamPhase === "done" ? "done" : "idle" },
    ]);
    shell.setScene(streamRuntime.scene ? "Scene IR accepted so far." : "No scene until a complete unit is accepted.", streamRuntime.scene ? JSON.stringify(streamRuntime.scene, null, 2) : "");
    shell.setScript("Streaming reads the chosen source as it arrives.", streamBuffer);
    shell.setFrames(frame ? "Resolved frame at the sealed playback time." : "The canvas stays empty until the first accepted scene.", frame ? describeFrame(frame) : "");
    shell.setSession("Streaming is a tool on the same document. Run a sealed test script, or stream whatever is in the editor.", [
      `phase ${streamPhase}`,
      `source ${streamSource.value}`,
      `units ${streamProgram.parsedUnits}`,
      `sealed ${streamProgram.sealedThroughMs.toFixed(0)} ms`,
      `playback ${streamClock.playbackState}`,
      `fed ${streamCursor}/${streamBuffer.length}`,
    ].join("\n"));
    shell.setStatus([
      streamSource.value === "editor" ? "editor" : streamExample.id,
      `sealed ${streamProgram.sealedThroughMs.toFixed(0)}ms`,
      `t ${streamClock.timeMs.toFixed(1)}ms`,
      streamClock.playbackState,
      `fed ${streamCursor}/${streamBuffer.length}`,
    ].join("  ·  "));
  }

  function draw(): void {
    syncChrome();
    if (lane === "stream") drawStream();
    else if (lane === "import") drawImport();
    else drawScript();
  }

  function applyExtra(extra: string): void {
    if (extra === "stream") {
      streamToggle.checked = true;
      must<HTMLElement>("tool-stream").scrollIntoView({ block: "nearest" });
    }
    if (extra === "import" || extra === "import/split") {
      must<HTMLElement>("tool-import").scrollIntoView({ block: "nearest" });
    }
    if (extra === "import/split" && !result) {
      split = true;
      loadImport("lottie:0", false);
    }
  }

  fillSelects();
  testSelect.addEventListener("change", () => loadScript(testSelect.value));
  must<HTMLButtonElement>("compile").addEventListener("click", () => {
    compileThroughFormat();
    draw();
  });
  picture.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || !target.dataset.picture) return;
    pictureMode = target.dataset.picture as Picture;
    draw();
  });
  sizeSelect.addEventListener("change", () => draw());
  dprSelect.addEventListener("change", () => draw());
  streamToggle.addEventListener("change", () => {
    if (!streamToggle.checked) stopStream();
    draw();
  });
  streamSource.addEventListener("change", () => draw());
  streamRun.addEventListener("click", () => runStream());
  streamPop.addEventListener("click", () => {
    shell.setPopoutVisible(!shell.popoutVisible());
    draw();
  });
  formatSelect.addEventListener("change", () => {
    formatId = formatSelect.value;
    draw();
  });
  importSelect.addEventListener("change", () => loadImport(importSelect.value, false));
  importOpen.addEventListener("click", () => shell.openFile(".ms,.json,.svg,application/json,image/svg+xml,text/plain"));
  importPlay.addEventListener("click", () => playThroughFormat());
  importSplit.addEventListener("click", () => {
    split = !split;
    if (split) lane = lane === "stream" ? lane : "import";
    draw();
  });

  return {
    activate(extra?: string) {
      shell.setMode(lane === "import" && (split || pictureMode === "both") ? "split" : pictureMode === "both" && lane === "script" ? "split" : "single");
      shell.setSourceMode(lane === "stream" && streamSource.value === "preset" ? "stream" : "editor");
      shell.setSourceEditable(true);
      if (!shell.sourceValue()) {
        formatId = "motionscript";
        formatSelect.value = "motionscript";
        shell.setSourceValue(currentScript()?.source || source);
      }
      if (formatId === "motionscript" && shell.sourceValue() !== compiledText) compile();
      shell.onSourceInput(() => draw());
      shell.onFile((file) => {
        void file.text().then((text) => {
          const name = file.name;
          if (name.endsWith(".svg")) formatId = "svg";
          else if (name.endsWith(".ms")) formatId = "motionscript";
          else if (name.endsWith(".json") && (formatId === "svg" || formatId === "motionscript")) formatId = "lottie";
          formatSelect.value = formatId;
          customImport = true;
          sourceName = name;
          shell.setSourceValue(text);
          compileThroughFormat();
          draw();
        });
      });
      bindClock();
      if (extra) applyExtra(extra);
      draw();
    },
    deactivate() {
      const text = shell.sourceValue();
      if (text) source = text;
      playClock.pause();
      streamClock.pause();
      shell.setPopoutVisible(false);
    },
    tick(now: number, delta: number) {
      if (lane !== "stream") {
        if (!playClock.isPlaying || shell.scrubbing) return;
        playClock.tick(delta);
        return;
      }
      let step = delta;
      if (streamPhase === "setup") {
        feedStream(40);
        if (streamProgram.sealedThroughMs > 0) {
          streamClock.play();
          streamPhase = "wait";
          step = 0;
        } else if (streamCursor >= streamBuffer.length) finishStream();
      } else if (streamPhase === "wait" && streamClock.playbackState === "waiting_for_content") {
        streamPhase = "dwell";
        streamDwellUntil = now + 900;
      } else if (streamPhase === "dwell" && now >= streamDwellUntil) {
        streamPhase = "rest";
      } else if (streamPhase === "rest") {
        feedStream(24);
        if (streamCursor >= streamBuffer.length) finishStream();
      }
      if (!shell.scrubbing && (streamClock.playbackState === "playing" || streamClock.playbackState === "waiting_for_content")) {
        streamClock.tick(step);
      }
    },
    draw,
    key(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey || event.altKey)) return false;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return false;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      if (lane === "import") stepImport(direction);
      else stepScript(direction);
      return true;
    },
    hook(): Partial<GvrBridge> {
      if (lane === "stream") {
        return {
          frame: streamRuntime.scene ? streamRuntime.evaluate(streamClock.timeMs) : undefined,
          seek: (sceneTimeMs: number) => {
            streamClock.seek(sceneTimeMs);
            draw();
          },
          probe: () => ({
            sceneId: streamRuntime.scene?.sceneId ?? "",
            timeMs: streamClock.timeMs,
            playing: streamClock.playbackState === "playing",
            rate: streamClock.playbackRate,
            degraded: streamRuntime.degraded,
            diagnostics: streamProgram.diagnostics.map((item) => item.message),
            origins: {},
            state: streamClock.playbackState,
            sealedThroughMs: streamProgram.sealedThroughMs,
            revision: streamProgram.revision,
            parsedUnits: streamProgram.parsedUnits,
            phase: streamPhase,
          }),
        };
      }
      if (lane === "import") {
        const compare: GvrCompare = {
          index: importIndex[formatId] ?? 0,
          id: customImport ? sourceName : catalog()[importIndex[formatId] ?? 0]?.id ?? sourceName,
          file: sourceName,
          overall: result?.fidelity.overall ?? "",
          durationMs: shown?.timeline.durationMs ?? 0,
          timeMs: playClock.timeMs,
          hasImported: Boolean(importRuntimeA),
          hasRoundTrip: Boolean(importRuntimeB),
          report: result ? formatImportReport(result) : "",
          seek: (sceneTimeMs: number) => {
            playClock.pause();
            playClock.seek(sceneTimeMs);
            draw();
          },
          next: () => stepImport(1),
          prev: () => stepImport(-1),
          openText: (name: string, text: string) => {
            customImport = true;
            sourceName = name;
            shell.setSourceValue(text);
            applyImport(text, name, false);
            draw();
          },
        };
        return {
          formatId,
          compare,
          frame: importRuntimeA?.evaluate(clampTime(playClock.timeMs, shown?.timeline.durationMs ?? 0)),
          sceneId: displayedSceneId,
          attemptedFixtureId,
          displayedSceneId,
          overall: result?.fidelity.overall,
          report: result ? formatImportReport(result) : "",
          script: importScript,
          scriptCompiles: importCompileOk,
          editor: shell.sourceValue(),
          dirty: importDirty(),
        };
      }
      const scene = shownScriptScene();
      const runtime = pictureMode === "roundtrip" ? runtimeB : runtimeA;
      return {
        frame: runtime?.evaluate(clampTime(playClock.timeMs, activeSpan())),
        compileOk,
        sourceDiagnostics: compileMessages,
        script,
        scriptCompiles: Boolean(sceneB),
        editor: shell.sourceValue(),
        dirty: scriptDirty(),
        sceneId: scene?.sceneId ?? "",
        seek: (sceneTimeMs: number) => {
          playClock.seek(clampTime(sceneTimeMs, activeSpan()));
          draw();
        },
        probe: () => ({
          sceneId: scene?.sceneId ?? "",
          timeMs: playClock.timeMs,
          playing: playClock.isPlaying,
          rate: playClock.playbackRate,
          degraded: runtime?.degraded ?? false,
          diagnostics: runtime?.lastDiagnostics.map((item) => item.message) ?? [],
          origins: {},
          compileOk,
          sourceDiagnostics: compileMessages,
          nodeCount: scene?.nodes.length ?? 0,
        }),
      };
    },
  };
}
