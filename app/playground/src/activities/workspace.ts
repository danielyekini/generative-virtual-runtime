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
import type { GvrBridge, GvrCompare, GvrProgram } from "../bridge";
import {
  MINE_COLLECTION,
  STORAGE_KEY,
  collectionsOf,
  decodeMine,
  encodeMine,
  filterLibrary,
  locateDiagnostics,
  mineEntry,
  programNameFromFile,
  selectionFor,
  type LocatedDiagnostic,
  type ProgramEntry,
} from "../library";
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
type ProgramState = "not-executed" | "running" | "paused" | "edited" | "failed" | "import" | "stream";

const NEW_PROGRAM_SOURCE = `scene "untitled" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 3s;
};
circle dot {
  position (640, 360);
  radius 60;
  fill #84cc16;
};
animate dot.position.x {
  from 320;
  to 960;
  duration 3s;
  ease easeInOut;
};
`;

const stateLabels: Record<ProgramState, string> = {
  "not-executed": "Not executed",
  running: "Running",
  paused: "Executed · paused",
  edited: "Edited since execution",
  failed: "Execution failed",
  import: "Import utility",
  stream: "Stream utility",
};

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

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
  const librarySearch = must<HTMLInputElement>("library-search");
  const libraryFilters = must<HTMLElement>("library-filters");
  const libraryList = must<HTMLUListElement>("library-list");
  const libraryNote = must<HTMLElement>("library-note");
  const libraryFile = must<HTMLInputElement>("library-file");
  const programBar = must<HTMLElement>("program-bar");
  const programOrigin = must<HTMLElement>("program-origin");
  const programName = must<HTMLElement>("program-name");
  const programStateLabel = must<HTMLElement>("program-state");
  const programCaption = must<HTMLElement>("program-caption");
  const executeButton = must<HTMLButtonElement>("execute");
  const fullscreenButton = must<HTMLButtonElement>("fullscreen");
  const stageMessage = must<HTMLElement>("stage-message");
  const sourceBox = must<HTMLTextAreaElement>("source");
  const sourceDiagnostics = must<HTMLOListElement>("source-diagnostics");
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
  let located: LocatedDiagnostic[] = [];
  let compileOk = false;
  let roundTripNote = "Press Execute to build Scene IR.";
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

  // One active program. The editor holds its working copy while editorOwner is "program".
  let mine: ProgramEntry[] = decodeMine(readStorage());
  let activeKey = "preset:bunny";
  let executedKey = "";
  let executedSource = "";
  let editorOwner: "program" | "import" = "program";
  const drafts = new Map<string, string>();
  let libraryText = "";
  let libraryCollection = "all";
  let presenting = false;
  let fallbackPresenting = false;
  let storageNote = "";

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

  const collectionNames: Record<string, string> = { preset: "Stories", scene: "Runtime scenes", frame: "Frames" };

  function installed(): ProgramEntry[] {
    return allScripts().map(({ key, item }) => ({
      key,
      label: item.label,
      caption: item.caption,
      collection: collectionNames[key.split(":")[0] ?? ""] ?? "Installed",
      origin: "installed" as const,
      source: item.source,
    }));
  }

  let installedEntries: ProgramEntry[] = [];

  function libraryEntries(): ProgramEntry[] {
    if (installedEntries.length === 0) installedEntries = installed();
    return [...mine, ...installedEntries];
  }

  function entryFor(key: string): ProgramEntry | undefined {
    return libraryEntries().find((entry) => entry.key === key);
  }

  function activeEntry(): ProgramEntry {
    return entryFor(activeKey) ?? libraryEntries()[0] ?? mineEntry("mine:empty", "Untitled program", "");
  }

  function persistMine(): void {
    if (mine.length === 0) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage unavailable: nothing to clear.
      }
      storageNote = "";
      return;
    }
    storageNote = writeStorage(encodeMine(mine))
      ? ""
      : "Browser storage is unavailable or full; your programs last for this session only.";
  }

  function stashDraft(): void {
    if (editorOwner !== "program" || lane === "import") return;
    const text = shell.sourceValue();
    const entry = entryFor(activeKey);
    if (!entry) return;
    if (entry.origin === "mine") {
      if (entry.source !== text) {
        entry.source = text;
        persistMine();
      }
      drafts.delete(activeKey);
    } else if (text !== entry.source) drafts.set(activeKey, text);
    else drafts.delete(activeKey);
  }

  /** Make a library entry the active program. Loading never executes. */
  function openProgram(key: string): void {
    const entry = entryFor(key);
    if (!entry) return;
    stashDraft();
    stopStream();
    activeKey = entry.key;
    lane = "script";
    editorOwner = "program";
    formatId = "motionscript";
    formatSelect.value = "motionscript";
    if (entry.key.startsWith("preset:") || entry.key.startsWith("scene:") || entry.key.startsWith("frame:")) {
      scriptId = entry.key;
      testSelect.value = entry.key;
    }
    shell.setSourceValue(drafts.get(entry.key) ?? entry.source);
    playClock.pause();
    playClock.seek(0);
    renderLibrary();
    draw();
  }

  /** Explicit execution of the editor source through the selected format. */
  function execute(): void {
    if (formatSelect.value === "motionscript") {
      editorOwner = "program";
      const entry = entryFor(activeKey);
      if (entry?.origin === "mine" && entry.source !== shell.sourceValue()) {
        entry.source = shell.sourceValue();
        persistMine();
        renderLibrary();
      }
    }
    compileThroughFormat();
    if (lane === "script" && sceneA && !isStaticScene(sceneA)) playClock.play();
    else if (lane === "import" && shown && !isStaticScene(shown)) playClock.play();
    draw();
  }

  function addMine(label: string, text: string): ProgramEntry {
    const key = `mine:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const entry = mineEntry(key, label, text);
    mine = [entry, ...mine];
    persistMine();
    return entry;
  }

  function renderLibrary(): void {
    const entries = libraryEntries();
    const groups = [{ name: "all", count: entries.length }, ...collectionsOf(entries)];
    if (!groups.some((group) => group.name === libraryCollection)) libraryCollection = "all";
    libraryFilters.replaceChildren(...groups.map((group) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.dataset.collection = group.name;
      chip.textContent = `${group.name === "all" ? "All" : group.name} ${group.count}`;
      chip.setAttribute("aria-pressed", String(group.name === libraryCollection));
      return chip;
    }));
    const shownEntries = filterLibrary(entries, { text: libraryText, collection: libraryCollection });
    libraryList.replaceChildren(...shownEntries.map((entry) => {
      const item = document.createElement("li");
      const open = document.createElement("button");
      open.type = "button";
      open.dataset.key = entry.key;
      open.className = "library-item";
      if (entry.key === activeKey) open.setAttribute("aria-current", "true");
      const title = document.createElement("span");
      title.className = "library-title";
      title.textContent = drafts.has(entry.key) ? `${entry.label} •` : entry.label;
      const meta = document.createElement("span");
      meta.className = "library-meta";
      meta.textContent = `${entry.collection} · ${entry.caption}`;
      open.title = drafts.has(entry.key) ? `${entry.caption}\nUnexecuted edits are kept for this session.` : entry.caption;
      open.append(title, meta);
      item.append(open);
      if (entry.origin === "mine") {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "library-remove";
        remove.dataset.remove = entry.key;
        remove.textContent = "×";
        remove.setAttribute("aria-label", `Remove ${entry.label} from My programs`);
        item.append(remove);
      }
      return item;
    }));
    const found = shownEntries.length;
    libraryNote.textContent = [
      found === 0 ? "No programs match. Clear the search or choose All." : `${found} of ${entries.length} programs`,
      storageNote,
    ].filter(Boolean).join(" ");
  }

  function programState(): ProgramState {
    if (lane === "import") return "import";
    if (lane === "stream") return "stream";
    if (executedKey !== activeKey) return "not-executed";
    if (!sceneA) return "failed";
    if (scriptDirty()) return "edited";
    return playClock.isPlaying ? "running" : "paused";
  }

  function paintProgramBar(): void {
    const state = programState();
    const entry = activeEntry();
    const utility = state === "import" || state === "stream";
    const name = state === "import"
      ? sourceName
      : state === "stream"
        ? (streamSource.value === "editor" ? `${entry.label} (editor)` : streamExample.label)
        : entry.label;
    const origin = state === "import"
      ? (formatLabels[importedFormat] ?? importedFormat)
      : state === "stream" ? "Stream" : entry.origin === "mine" ? "Yours" : "Installed";
    const caption = state === "failed"
      ? `${located.length} diagnostic${located.length === 1 ? "" : "s"}${located[0]?.line ? `, first at line ${located[0].line}` : ""}. The editor keeps your source; select a diagnostic to jump to it.`
      : state === "edited"
        ? "The canvas shows the last execution. Execute again to run your edits."
        : state === "not-executed"
          ? "Loaded into the editor. Press Execute (Ctrl/⌘+Enter) to run it."
          : state === "import"
            ? "The canvas shows an import utility result, not the active native program. Open a library program to return."
            : state === "stream"
              ? "The canvas shows the stream utility."
              : entry.caption;
    if (programName.textContent !== name) programName.textContent = name;
    if (programOrigin.textContent !== origin) programOrigin.textContent = origin;
    if (programStateLabel.textContent !== stateLabels[state]) programStateLabel.textContent = stateLabels[state];
    programBar.dataset.state = state;
    if (programCaption.textContent !== caption) programCaption.textContent = caption;
    executeButton.textContent = utility && state === "stream" ? "Execute" : formatId === "motionscript" ? "Execute" : `Execute as ${formatLabels[formatId] ?? formatId}`;
    executeButton.disabled = lane === "stream";
    fullscreenButton.textContent = presenting ? "Exit fullscreen" : "Fullscreen";
    fullscreenButton.setAttribute("aria-pressed", String(presenting));
  }

  function paintDiagnostics(): void {
    const show = lane === "script" && executedKey === activeKey && located.length > 0 && !sourceBox.hidden;
    sourceDiagnostics.hidden = !show;
    if (!show) {
      if (sourceDiagnostics.childElementCount) sourceDiagnostics.replaceChildren();
      return;
    }
    const signature = located.map((item) => item.text).join("\n");
    if (sourceDiagnostics.dataset.signature === signature) return;
    sourceDiagnostics.dataset.signature = signature;
    sourceDiagnostics.replaceChildren(...located.map((item, index) => {
      const row = document.createElement("li");
      const jump = document.createElement("button");
      jump.type = "button";
      jump.dataset.index = String(index);
      jump.className = `diagnostic is-${item.severity}`;
      const where = document.createElement("span");
      where.className = "diagnostic-where";
      where.textContent = item.line ? `Line ${item.line}:${item.column}` : "No location";
      const message = document.createElement("span");
      message.className = "diagnostic-message";
      message.textContent = `${item.code} · ${item.message}`;
      const recovery = document.createElement("span");
      recovery.className = "diagnostic-recovery";
      recovery.textContent = item.recovery;
      jump.append(where, message, recovery);
      jump.disabled = item.start === undefined;
      row.append(jump);
      return row;
    }));
  }

  function jumpTo(item: LocatedDiagnostic): void {
    const text = shell.sourceValue();
    const range = selectionFor(item, text);
    if (!range) return;
    sourceBox.focus();
    sourceBox.setSelectionRange(range.start, range.end);
    const line = text.slice(0, range.start).split("\n").length - 1;
    const lineHeight = Number.parseFloat(getComputedStyle(sourceBox).lineHeight) || 17;
    sourceBox.scrollTop = Math.max(0, line * lineHeight - sourceBox.clientHeight / 3);
  }

  function setPresenting(next: boolean): void {
    if (next === presenting) return;
    if (next) {
      const request = shell.stage.requestFullscreen?.bind(shell.stage);
      const fallback = () => {
        fallbackPresenting = true;
        presenting = true;
        shell.stage.classList.add("is-presenting");
        draw();
      };
      if (!request) {
        fallback();
        return;
      }
      request().then(() => {
        presenting = true;
        shell.stage.classList.add("is-presenting");
        draw();
      }, fallback);
      return;
    }
    presenting = false;
    shell.stage.classList.remove("is-presenting");
    if (fallbackPresenting) fallbackPresenting = false;
    else if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    draw();
  }

  function sizeOf(box: HTMLElement): { width: number; height: number } {
    const preset = sizePresets.find((entry) => entry.id === sizeSelect.value);
    if (!presenting && preset && preset.width > 0 && pictureMode !== "both" && !(lane === "import" && split)) {
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
    paintProgramBar();
  }

  function compile(): void {
    source = shell.sourceValue();
    compiledText = source;
    compiledFormat = "motionscript";
    formatId = "motionscript";
    const compiled = compileMotionScript(source, telemetry);
    executedKey = activeKey;
    executedSource = source;
    located = locateDiagnostics(compiled.diagnostics, source);
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
    stashDraft();
    stopStream();
    lane = "script";
    editorOwner = "program";
    formatId = "motionscript";
    formatSelect.value = "motionscript";
    scriptId = found.key;
    activeKey = found.key;
    testSelect.value = found.key;
    drafts.delete(found.key);
    source = found.item.source;
    shell.setSourceValue(source);
    compile();
    renderLibrary();
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
    stashDraft();
    stopStream();
    lane = "import";
    editorOwner = "import";
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
    stashDraft();
    stopStream();
    formatId = formatSelect.value || "motionscript";
    if (formatId === "motionscript") {
      lane = "script";
      compile();
      return;
    }
    lane = "import";
    editorOwner = "import";
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
        if (lane === "script") {
          // Play resumes the last execution; only Execute compiles.
          if (executedKey === activeKey && sceneA && !isStaticScene(sceneA)) {
            if (playClock.timeMs >= sceneA.timeline.durationMs) playClock.seek(0);
            playClock.play();
          }
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
    const executed = executedKey === activeKey;
    const frameA = executed ? (runtimeA?.evaluate(time) ?? null) : null;
    const frameB = executed ? (runtimeB?.evaluate(time) ?? null) : null;
    const splitView = pictureMode === "both";
    paintPicture(frameA, frameB, splitView, [
      "Compiled Scene IR",
      sceneA ? `${sceneA.sceneId} · ${sceneA.timeline.durationMs.toFixed(0)} ms` : "Scene IR A",
      "MotionScript round-trip",
      sceneB ? `${sceneB.sceneId} · ${sceneB.timeline.durationMs.toFixed(0)} ms` : "Scene IR B",
    ]);
    if (splitView) {
      shell.setPaneEmpty("a", frameA ? null : "Execute a program to see Scene IR A.");
      shell.setPaneEmpty("b", frameB ? null : "Round-trip is unavailable.");
    }
    const waiting = scriptDirty();
    const shownScene = executedKey === activeKey ? shownScriptScene() : undefined;
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
    const state = programState();
    shell.setSourceNote(
      state === "not-executed"
        ? `${activeEntry().label}: not executed yet. Edit freely, then Execute (Ctrl/⌘+Enter).`
        : state === "failed"
          ? "Execution failed. Your source is unchanged; select a diagnostic below to jump to it."
          : waiting
            ? `This text is waiting for Execute (${formatLabels[formatId] ?? formatId}). The canvas stays on the last execution.`
            : activeEntry().caption,
    );
    shell.setReport(activeEntry().label, roundTripNote, failedStep ? "is-bad" : compiledText ? "exact" : "", compileMessages.join("\n"));
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
    shell.setScript(script ? "Canonical MotionScript emitted from Scene IR A." : "Execute a program to emit MotionScript.", script);
    const frame = pictureMode === "roundtrip" ? frameB : frameA;
    shell.setFrames(frame ? "Resolved draw items at the player time." : "Execute a program to inspect frames.", frame ? describeFrame(frame) : "");
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
      stateLabels[state].toLowerCase(),
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
      ? "Press Execute to import this source into Scene IR."
      : importFailed
        ? dirty
          ? `The editor has changed. ${failedCopy}`
          : failedCopy
        : dirty
          ? `This text is waiting for Execute (${formatLabels[formatId] ?? formatId}). The canvas stays on the last result.`
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
          ? `This text is waiting for Execute (${formatLabels[formatId] ?? formatId}). The canvas stays on the last result.`
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

  function stageMessageText(): string {
    if (lane !== "script" || pictureMode === "both") return "";
    const state = programState();
    if (state === "not-executed") return `${activeEntry().label} is loaded but not executed. Press Execute.`;
    if (state === "failed") return located.length > 0
      ? `Execution failed with ${located.length} diagnostic${located.length === 1 ? "" : "s"}. Nothing is playing.`
      : "Execution produced no valid Scene IR. Nothing is playing.";
    return "";
  }

  function draw(): void {
    syncChrome();
    if (lane === "stream") drawStream();
    else if (lane === "import") drawImport();
    else drawScript();
    const message = stageMessageText();
    stageMessage.hidden = message === "";
    if (stageMessage.textContent !== message) stageMessage.textContent = message;
    paintDiagnostics();
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
  librarySearch.addEventListener("input", () => {
    libraryText = librarySearch.value;
    renderLibrary();
  });
  librarySearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const first = libraryList.querySelector<HTMLButtonElement>("button.library-item");
      if (first?.dataset.key) {
        event.preventDefault();
        openProgram(first.dataset.key);
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      libraryList.querySelector<HTMLButtonElement>("button.library-item")?.focus();
    }
  });
  libraryFilters.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || !target.dataset.collection) return;
    libraryCollection = target.dataset.collection;
    renderLibrary();
  });
  libraryList.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("button") : null;
    if (!target) return;
    if (target.dataset.remove) {
      const removed = mine.find((entry) => entry.key === target.dataset.remove);
      if (!removed || !window.confirm(`Remove "${removed.label}" from My programs? This cannot be undone.`)) return;
      mine = mine.filter((entry) => entry !== removed);
      drafts.delete(removed.key);
      persistMine();
      if (activeKey === removed.key) {
        // The editor keeps the removed text until another program is opened.
        editorOwner = "import";
        openProgram(libraryEntries()[0]?.key ?? "preset:bunny");
      } else renderLibrary();
      return;
    }
    if (target.dataset.key) openProgram(target.dataset.key);
  });
  libraryList.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(libraryList.querySelectorAll<HTMLButtonElement>("button.library-item"));
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    event.preventDefault();
    if (event.key === "ArrowUp" && at === 0) librarySearch.focus();
    else items[Math.min(items.length - 1, Math.max(0, at + (event.key === "ArrowDown" ? 1 : -1)))]?.focus();
  });
  must<HTMLButtonElement>("library-upload").addEventListener("click", () => {
    libraryFile.value = "";
    libraryFile.click();
  });
  libraryFile.addEventListener("change", () => {
    const file = libraryFile.files?.[0];
    if (file) void uploadProgram(file);
  });
  must<HTMLButtonElement>("library-new").addEventListener("click", () => {
    const entry = addMine("Untitled program", NEW_PROGRAM_SOURCE);
    libraryText = "";
    librarySearch.value = "";
    openProgram(entry.key);
    sourceBox.focus();
  });
  executeButton.addEventListener("click", () => execute());
  fullscreenButton.addEventListener("click", () => setPresenting(!presenting));
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && presenting && !fallbackPresenting) {
      presenting = false;
      shell.stage.classList.remove("is-presenting");
      draw();
    }
  });
  document.addEventListener("keydown", (event) => {
    // Escape leaves presentation from any focus, including the fallback mode.
    if (event.key === "Escape" && presenting && document.body.dataset.surface === "studio") {
      event.preventDefault();
      setPresenting(false);
    }
  });
  sourceBox.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && document.body.dataset.surface === "studio") {
      event.preventDefault();
      execute();
    }
  });
  sourceDiagnostics.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-index]") : null;
    const item = target ? located[Number(target.dataset.index)] : undefined;
    if (item) jumpTo(item);
  });

  async function uploadProgram(file: File): Promise<void> {
    let text: string;
    try {
      text = await file.text();
    } catch {
      libraryNote.textContent = `Could not read ${file.name}.`;
      return;
    }
    const entry = addMine(programNameFromFile(file.name), text);
    libraryText = "";
    librarySearch.value = "";
    libraryCollection = MINE_COLLECTION;
    openProgram(entry.key);
  }
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
        shell.setSourceValue(drafts.get(activeKey) ?? activeEntry().source ?? source);
      }
      renderLibrary();
      shell.onSourceInput(() => draw());
      shell.onFile((file) => {
        void file.text().then((text) => {
          const name = file.name;
          if (name.endsWith(".ms")) {
            const entry = addMine(programNameFromFile(name), text);
            openProgram(entry.key);
            return;
          }
          stashDraft();
          editorOwner = "import";
          if (name.endsWith(".svg")) formatId = "svg";
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
      if (presenting) setPresenting(false);
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
      if (!(event.metaKey || event.ctrlKey || event.altKey) && (event.key === "f" || event.key === "F")) {
        setPresenting(!presenting);
        return true;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        execute();
        return true;
      }
      if (!(event.metaKey || event.ctrlKey || event.altKey)) return false;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return false;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      if (lane === "import") stepImport(direction);
      else stepScript(direction);
      return true;
    },
    hook(): Partial<GvrBridge> {
      return { ...laneHook(), program: programHook() };
    },
  };

  function programHook(): GvrProgram {
    const entry = activeEntry();
    return {
      key: entry.key,
      name: entry.label,
      origin: entry.origin,
      state: programState(),
      executed: executedKey === activeKey,
      presenting,
      diagnostics: executedKey === activeKey
        ? located.map(({ line, column, code, message, recovery }) => ({ line, column, code, message, recovery }))
        : [],
      library: filterLibrary(libraryEntries(), { text: libraryText, collection: libraryCollection })
        .map(({ key, label, collection }) => ({ key, label, collection })),
      open: (key: string) => openProgram(key),
      execute: () => execute(),
      search: (text: string, collection = "all") => {
        libraryText = text;
        librarySearch.value = text;
        libraryCollection = collection;
        renderLibrary();
      },
    };
  }

  function laneHook(): Partial<GvrBridge> {
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
        frame: executedKey === activeKey ? runtime?.evaluate(clampTime(playClock.timeMs, activeSpan())) : undefined,
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
  }
}
