/**
 * Studio Player page (P001, docs/workstreams/product/studio-ux.md "Player").
 * One loaded program; nothing runs until Run (or the Autoplay option).
 */
import { CanvasRenderer } from "@gvr/canvas-renderer";
import { AnimationRuntime, RuntimeClock } from "@gvr/runtime";
import type { ResolvedFrame } from "@gvr/schema";
import type { GvrBridge, PlayerProbe } from "../bridge";
import { isTypingTarget } from "../bridge";
import { clearCanvas, describeFrame } from "../describe";
import { decodeMine, STORAGE_KEY, selectionFor, type LocatedDiagnostic, type ProgramEntry, type ProgramFormat } from "../library";
import { frameTelemetry, telemetry } from "../telemetry";
import { clampTime, collectKeyTimes, formatClock, isStaticScene, stepKey } from "../timeline";
import { FORMAT_LABELS, installedPrograms } from "./programs";
import { LibraryPage } from "./library-page";
import { compareScene, type Comparison } from "./comparison";
import { runProgram, type RunOutcome } from "./run";
import { describeSceneSummary } from "./scene-summary";
import {
  PANEL_TABS,
  RECENT_KEY,
  SETTINGS_KEY,
  decodeRecent,
  decodeSettings,
  pushRecent,
  read,
  write,
  type PanelTab,
} from "./settings";

function $<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`player markup missing #${id}`);
  return element as T;
}

function put(element: HTMLElement, value: string): void {
  if (element.textContent !== value) element.textContent = value;
}

const SIZE_PRESETS = [
  { id: "window", label: "Fill window", width: 0, height: 0 },
  { id: "16:9", label: "960×540 (16:9)", width: 960, height: 540 },
  { id: "ultrawide", label: "1200×480 (ultrawide)", width: 1200, height: 480 },
  { id: "portrait", label: "420×760 (portrait)", width: 420, height: 760 },
  { id: "tiny", label: "320×200 (tiny)", width: 320, height: 200 },
];

const ui = {
  run: $<HTMLButtonElement>("run"),
  openLibrary: $<HTMLButtonElement>("open-library"),
  programName: $("program-name"),
  programMeta: $("program-meta"),
  programState: $("program-state"),
  streamMenu: $<HTMLButtonElement>("stream-menu"),
  streamPop: $("stream-pop"),
  options: $<HTMLButtonElement>("options"),
  optionsPop: $("options-pop"),
  optAutoplay: $<HTMLInputElement>("opt-autoplay"),
  optSize: $<HTMLSelectElement>("opt-size"),
  optDpr: $<HTMLSelectElement>("opt-dpr"),
  toggleSplit: $<HTMLButtonElement>("toggle-split"),
  splitControls: $("split-controls"),
  splitFormat: $<HTMLSelectElement>("split-format"),
  splitPresets: $<HTMLSelectElement>("split-presets"),
  splitOpen: $<HTMLButtonElement>("split-open"),
  splitFile: $<HTMLInputElement>("split-file"),
  splitCompare: $<HTMLInputElement>("split-compare"),
  splitError: $("split-error"),
  comparison: $("comparison"),
  comparisonArea: $("comparison-area"),
  comparisonCanvas: $<HTMLCanvasElement>("compare-view"),
  comparisonNote: $("comparison-note"),
  toggleSource: $<HTMLButtonElement>("toggle-source"),
  fullscreen: $<HTMLButtonElement>("fullscreen"),
  canvasArea: $("canvas-area"),
  canvas: $<HTMLCanvasElement>("view"),
  empty: $("empty"),
  emptyLibrary: $<HTMLButtonElement>("empty-library"),
  recent: $("recent"),
  recentList: $("recent-list"),
  ready: $("ready"),
  readyTitle: $("ready-title"),
  readyNote: $("ready-note"),
  readyRun: $<HTMLButtonElement>("ready-run"),
  failed: $("failed"),
  failedNote: $("failed-note"),
  failedDiagnostics: $<HTMLButtonElement>("failed-diagnostics"),
  fsPlay: $<HTMLButtonElement>("fs-play"),
  fsClock: $("fs-clock"),
  fsExit: $<HTMLButtonElement>("fs-exit"),
  transport: $("transport"),
  play: $<HTMLButtonElement>("play"),
  frameBack: $<HTMLButtonElement>("frame-back"),
  frameFwd: $<HTMLButtonElement>("frame-fwd"),
  keyBack: $<HTMLButtonElement>("key-back"),
  keyFwd: $<HTMLButtonElement>("key-fwd"),
  clock: $("clock"),
  speed: $<HTMLSelectElement>("speed"),
  track: $("track-time"),
  tapeLoaded: $("tape-loaded"),
  tapeTicks: $("tape-ticks"),
  playhead: $("playhead"),
  sourcePanel: $("source-panel"),
  sourceResize: $("source-resize"),
  sourceFormat: $("source-format"),
  sourceDirty: $("source-dirty"),
  sourceRun: $<HTMLButtonElement>("source-run"),
  sourceClose: $<HTMLButtonElement>("source-close"),
  source: $<HTMLTextAreaElement>("source"),
  panel: $("panel"),
  panelResize: $("panel-resize"),
  panelToggle: $<HTMLButtonElement>("panel-toggle"),
  diagCount: $("diag-count"),
  diagNote: $("diag-note"),
  diagList: $("diag-list"),
  sceneNote: $("scene-note"),
  sceneSummary: $("scene-summary"),
  sceneFrame: $("scene-frame"),
  reportSummary: $("report-summary"),
  report: $("report"),
  status: $("status"),
};

const tabs = new Map<PanelTab, { tab: HTMLButtonElement; pane: HTMLElement }>(
  PANEL_TABS.map((id) => [id, { tab: $<HTMLButtonElement>(`tab-${id}`), pane: $(`pane-${id}`) }]),
);

const catalogue = [...installedPrograms(), ...decodeMine(read(STORAGE_KEY))];
const settings = decodeSettings(read(SETTINGS_KEY));
let recent = decodeRecent(read(RECENT_KEY));
const renderer = new CanvasRenderer(ui.canvas, telemetry);
const clock = new RuntimeClock();

let loaded: ProgramEntry | null = null;
// Drafts live only in this visit; explicit Library/preset/file loads replace that format's draft.
const drafts = new Map<ProgramFormat, ProgramEntry>();
let split = false;
let comparison: Comparison | null = null;
let comparisonRuntime: AnimationRuntime | null = null;
let comparisonRenderer: CanvasRenderer | null = null;
let fileReadId = 0;
let outcome: RunOutcome | null = null;
let runtime: AnimationRuntime | null = null;
let frame: ResolvedFrame | null = null;
let fullscreen = false;
let scrubbing = false;
let needsDraw = true;
let libraryVisible = false;
let lastWall = performance.now();
let ticksKey = "";

function saveSettings(): void {
  write(SETTINGS_KEY, JSON.stringify(settings));
}

// ---------------------------------------------------------------- program

function dirty(): boolean {
  if (!loaded) return false;
  return (outcome && outcome.format !== loaded.format) || ui.source.value !== (outcome?.source ?? loaded.source);
}

function durationMs(): number {
  return runtime?.scene.timeline.durationMs ?? 0;
}

function isStill(): boolean {
  return !runtime || isStaticScene(runtime.scene) || durationMs() <= 0;
}

function openProgram(entry: ProgramEntry, options: { fromHash?: boolean; waitForRun?: boolean } = {}): void {
  rememberDraft();
  fileReadId++;
  loaded = { ...entry };
  drafts.set(entry.format, loaded);
  comparison = null;
  comparisonRuntime = null;
  ui.splitError.hidden = true;
  outcome = null;
  runtime = null;
  frame = null;
  clock.pause();
  clock.seek(0);
  ui.source.value = entry.source;
  ui.source.disabled = false;
  if (catalogue.some((item) => item.key === entry.key)) {
    recent = pushRecent(recent, entry.key);
    write(RECENT_KEY, JSON.stringify(recent));
    const hash = `#p/${encodeURIComponent(entry.key)}`;
    if (!options.fromHash && location.hash !== hash) history.replaceState(null, "", hash);
  } else if (location.hash) {
    history.replaceState(null, "", location.pathname + location.search);
  }
  refreshPresets();
  if (settings.autoplay && !options.waitForRun) run();
  render();
}

function openKey(key: string): boolean {
  const entry = catalogue.find((item) => item.key === key);
  if (!entry) return false;
  openProgram(entry);
  return true;
}

function run(): void {
  if (!loaded) return;
  outcome = runProgram(ui.source.value, loaded.format, loaded.label, telemetry);
  rememberDraft();
  clock.pause();
  // Failure preserves the previous successful scene and playhead, with a visible notice.
  if (outcome.scene) {
    runtime = new AnimationRuntime(outcome.scene, telemetry);
    clock.seek(0);
    refreshComparison();
    if (!isStill()) clock.play();
  }
  if (loaded.format !== "motionscript") selectTab("report", true);
  if (outcome.diagnostics.some((item) => item.severity === "error" || item.severity === "fatal")) {
    selectTab("diagnostics", true);
  }
  render();
}

function togglePlay(): void {
  if (!runtime || isStill()) return;
  if (clock.isPlaying) clock.pause();
  else {
    if (clock.timeMs >= durationMs()) clock.seek(0);
    clock.play();
  }
  render();
}

function seek(timeMs: number): void {
  if (!runtime || isStill()) return;
  clock.seek(clampTime(timeMs, durationMs()));
  render();
}

function step(kind: "frame" | "key", direction: -1 | 1): void {
  if (!runtime || isStill()) return;
  const span = durationMs();
  const next = kind === "key"
    ? stepKey(collectKeyTimes(runtime.scene, span), clock.timeMs, direction, span)
    : clampTime(clock.timeMs + direction * (outcome?.frameMs ?? 1000 / 30), span);
  clock.pause();
  clock.seek(next);
  render();
}

// ---------------------------------------------------------------- Split

function rememberDraft(): void {
  if (loaded) drafts.set(loaded.format, { ...loaded, source: ui.source.value });
}

function refreshPresets(): void {
  const format = loaded?.format ?? "motionscript";
  ui.splitFormat.value = format;
  ui.splitPresets.replaceChildren(new Option("Choose preset…", ""), ...catalogue
    .filter((entry) => entry.origin === "installed" && entry.format === format)
    .map((entry) => new Option(entry.label, entry.key)));
}

function setSplit(open: boolean): void {
  split = open;
  settings.sourceOpen = open;
  if (open) {
    if (!loaded) selectFormat("motionscript");
    settings.sourceWidth = Math.max(settings.sourceWidth, Math.round(window.innerWidth * .45));
  } else {
    ui.splitCompare.checked = false;
    comparison = null;
    comparisonRuntime = null;
    fileReadId++;
  }
  saveSettings();
  render();
  if (open) ui.source.focus({ preventScroll: true });
}

function selectFormat(format: ProgramFormat): void {
  rememberDraft();
  const draft = drafts.get(format) ?? {
    key: `split:${format}`, label: `Untitled ${FORMAT_LABELS[format]}`,
    caption: "Split draft", collection: "Split drafts", origin: "mine" as const, format, source: "",
  };
  openProgram(draft, { waitForRun: true });
}

function refreshComparison(): void {
  comparison = null;
  comparisonRuntime = null;
  if (!split || !ui.splitCompare.checked || !runtime) return;
  comparison = compareScene(runtime.scene);
  comparisonRuntime = comparison.outcome?.scene ? new AnimationRuntime(comparison.outcome.scene) : null;
}

// ---------------------------------------------------------------- layout

function setSourceOpen(open: boolean): void {
  if (!open && split) { setSplit(false); return; }
  settings.sourceOpen = open;
  saveSettings();
  render();
  if (open) ui.source.focus({ preventScroll: true });
}

function selectTab(tab: PanelTab, open = true): void {
  settings.panelTab = tab;
  if (open) settings.panelOpen = true;
  saveSettings();
  render();
}

function enterFullscreen(): void {
  if (!runtime || fullscreen) return;
  fullscreen = true;
  document.body.classList.add("is-fullscreen");
  const request = ui.canvasArea.requestFullscreen?.bind(ui.canvasArea);
  if (request) request().catch(() => undefined);
  render();
}

function exitFullscreen(): void {
  if (!fullscreen) return;
  fullscreen = false;
  document.body.classList.remove("is-fullscreen");
  if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  render();
}

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && fullscreen) exitFullscreen();
});

function jumpTo(item: LocatedDiagnostic): void {
  const range = selectionFor(item, ui.source.value);
  setSourceOpen(true);
  if (!range) return;
  ui.source.focus({ preventScroll: true });
  ui.source.setSelectionRange(range.start, range.end);
  const before = ui.source.value.slice(0, range.start).split("\n").length - 1;
  const lineHeight = parseFloat(getComputedStyle(ui.source).lineHeight) || 18;
  ui.source.scrollTop = Math.max(0, before * lineHeight - ui.source.clientHeight / 3);
}

// Library and Player are separate routes in one document so navigation preserves drafts.
const library = new LibraryPage(catalogue, {
  open: (entry) => {
    showPlayer();
    if (entry.key !== loaded?.key) openProgram(entry);
    else history.replaceState(null, "", `#p/${encodeURIComponent(entry.key)}`);
  },
  back: () => {
    showPlayer();
    history.replaceState(null, "", loaded ? `#p/${encodeURIComponent(loaded.key)}` : location.pathname + location.search);
  },
});
function showPlayer(): void {
  libraryVisible = false;
  document.body.classList.remove("library-open");
  document.body.dataset.surface = "player";
  $("library").hidden = true;
  $("player").hidden = false;
  $("bar").hidden = false;
  $("status").hidden = false;
  render();
}
function openLibrary(fromHash = false): void {
  closeMenus();
  clock.pause();
  fileReadId++;
  libraryVisible = true;
  document.body.classList.add("library-open");
  document.body.dataset.surface = "library";
  $("player").hidden = true;
  $("bar").hidden = true;
  $("status").hidden = true;
  $("library").hidden = false;
  if (!fromHash && location.hash !== "#library") location.hash = "library";
  library.show();
  document.title = "Library · GVR Studio";
  render();
}

// ---------------------------------------------------------------- render

function canvasSize(): { width: number; height: number } {
  const preset = SIZE_PRESETS.find((entry) => entry.id === settings.canvasSize);
  const box = { width: ui.canvasArea.clientWidth, height: ui.canvasArea.clientHeight };
  // Compare both evaluated scenes at identical canvas sizes, without changing authored coordinates.
  if (!fullscreen && split && ui.splitCompare.checked && ui.comparisonArea.clientWidth > 0) {
    box.width = Math.min(box.width, ui.comparisonArea.clientWidth);
    box.height = Math.min(box.height, ui.comparisonArea.clientHeight);
  }
  if (!fullscreen && preset && preset.width > 0) {
    return { width: Math.min(preset.width, box.width), height: Math.min(preset.height, box.height) };
  }
  return box;
}

function dpr(): number {
  if (settings.dpr === "1") return 1;
  if (settings.dpr === "2") return 2;
  return window.devicePixelRatio || 1;
}

function paint(): void {
  if (libraryVisible) return;
  const size = canvasSize();
  renderer.resize(Math.max(1, size.width), Math.max(1, size.height), dpr());
  const time = isStill() ? 0 : clampTime(clock.timeMs, durationMs());
  frame = runtime ? runtime.evaluate(time) : null;
  if (frame) renderer.render(frame);
  else clearCanvas(ui.canvas);
  if (split && ui.splitCompare.checked && !fullscreen) {
    if (!comparisonRenderer) comparisonRenderer = new CanvasRenderer(ui.comparisonCanvas);
    comparisonRenderer.resize(Math.max(1, size.width), Math.max(1, size.height), dpr());
    if (comparisonRuntime) comparisonRenderer.render(comparisonRuntime.evaluate(clampTime(time, comparisonRuntime.scene.timeline.durationMs)));
    else clearCanvas(ui.comparisonCanvas);
  }
}

function stateBadge(): { text: string; tone: string } {
  if (!loaded) return { text: "", tone: "" };
  if (!outcome) return { text: "○ not run", tone: "" };
  const errors = outcome.diagnostics.filter((item) => item.severity === "error" || item.severity === "fatal").length;
  const base = outcome.state === "ok"
    ? { text: "✓ ran", tone: "is-ok" }
    : outcome.state === "recovered"
      ? { text: `⚠ ran with ${errors || outcome.diagnostics.length} issue${(errors || outcome.diagnostics.length) === 1 ? "" : "s"}`, tone: "is-warn" }
      : { text: "✕ run failed", tone: "is-bad" };
  return dirty() ? { text: `${base.text} · ● edited`, tone: base.tone } : base;
}

function renderHeader(): void {
  put(ui.programName, loaded ? loaded.label : "No program loaded");
  put(ui.programMeta, loaded ? `${loaded.collection} · ${FORMAT_LABELS[loaded.format]}` : "");
  const badge = stateBadge();
  ui.programState.hidden = !badge.text;
  put(ui.programState, badge.text);
  ui.programState.className = `badge ${badge.tone}`.trim();
  ui.run.disabled = !loaded;
  ui.sourceRun.disabled = !loaded;
  ui.fullscreen.disabled = !runtime;
  ui.toggleSplit.setAttribute("aria-pressed", String(split));
  ui.toggleSource.setAttribute("aria-pressed", String(settings.sourceOpen));
  if (!libraryVisible) document.title = loaded ? `${loaded.label} · GVR Studio` : "GVR Studio";
}

function renderOverlays(): void {
  ui.empty.hidden = Boolean(loaded);
  ui.ready.hidden = !loaded || Boolean(outcome);
  ui.failed.hidden = !outcome || Boolean(runtime);
  if (loaded && !outcome) {
    put(ui.readyTitle, loaded.label);
    put(ui.readyNote, settings.autoplay ? "Loaded." : "Loaded. Nothing runs until you press Run.");
  }
  const retainedFailure = outcome?.state === "failed" && Boolean(runtime);
  ui.failed.classList.toggle("has-retained-scene", retainedFailure);
  ui.failed.hidden = !outcome || (Boolean(runtime) && !retainedFailure);
  if (outcome?.state === "failed") {
    const first = outcome.diagnostics[0];
    const more = outcome.diagnostics.length > 1 ? ` (+${outcome.diagnostics.length - 1} more)` : "";
    put(ui.failedNote, first ? `${first.text.replace(/\.$/, "")}${more}. The source is unchanged.` : outcome.summary);
    if (retainedFailure) put(ui.failedNote, `${ui.failedNote.textContent} Showing the previous successful scene.`);
  }
  if (!loaded) {
    const items = recent.map((key) => catalogue.find((entry) => entry.key === key)).filter((entry): entry is ProgramEntry => Boolean(entry));
    ui.recent.hidden = items.length === 0;
    const key = items.map((entry) => entry.key).join("|");
    if (ui.recentList.dataset.key !== key) {
      ui.recentList.dataset.key = key;
      ui.recentList.replaceChildren(
        ...items.map((entry) => {
          const item = document.createElement("li");
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = entry.label;
          button.title = entry.caption;
          button.addEventListener("click", () => openProgram(entry));
          item.append(button);
          return item;
        }),
      );
    }
  }
}

function renderTransport(): void {
  const span = durationMs();
  const still = isStill();
  const time = still ? 0 : clampTime(clock.timeMs, span);
  ui.transport.classList.toggle("is-disabled", still);
  for (const control of [ui.play, ui.frameBack, ui.frameFwd, ui.keyBack, ui.keyFwd, ui.speed, ui.fsPlay]) control.disabled = still;
  const label = clock.isPlaying ? "❚❚" : "▶";
  put(ui.play, label);
  put(ui.fsPlay, label);
  ui.play.setAttribute("aria-label", clock.isPlaying ? "Pause" : "Play");
  ui.fsPlay.setAttribute("aria-label", clock.isPlaying ? "Pause" : "Play");
  const text = runtime
    ? still ? `static · ${formatClock(0)}` : `${formatClock(time)} / ${formatClock(span)}`
    : "—";
  put(ui.clock, text);
  put(ui.fsClock, text);
  const fraction = !still && span > 0 ? time / span : 0;
  ui.tapeLoaded.style.width = runtime ? "100%" : "0%";
  ui.playhead.style.left = `${(fraction * 100).toFixed(3)}%`;
  ui.playhead.hidden = !runtime;
  ui.track.setAttribute("aria-valuemax", String(Math.round(span)));
  ui.track.setAttribute("aria-valuenow", String(Math.round(time)));
  ui.track.setAttribute("aria-valuetext", text);
  ui.track.classList.toggle("is-disabled", still);
  const key = runtime && !still ? `${runtime.scene.sceneId}:${span}` : "";
  if (key !== ticksKey) {
    ticksKey = key;
    const times = runtime && !still ? collectKeyTimes(runtime.scene, span).slice(0, 400) : [];
    ui.tapeTicks.replaceChildren(
      ...times.map((at) => {
        const tick = document.createElement("i");
        tick.style.left = `${((at / span) * 100).toFixed(3)}%`;
        return tick;
      }),
    );
  }
}

function renderSource(): void {
  ui.sourcePanel.hidden = !settings.sourceOpen;
  ui.sourceResize.hidden = !settings.sourceOpen;
  ui.sourcePanel.style.width = `${Math.min(settings.sourceWidth, window.innerWidth * (split ? .6 : .7))}px`;
  document.body.classList.toggle("split-open", split);
  document.body.classList.toggle("has-comparison", split && ui.splitCompare.checked && !fullscreen);
  ui.splitControls.hidden = !split;
  ui.comparison.hidden = !split || !ui.splitCompare.checked || fullscreen;
  put(ui.comparisonNote, comparison ? comparison.outcome?.scene ? "Emitted/recompiled Scene IR; inspect Report / Compare for scope." : comparison.report : "Run a playable program to compare it.");
  put(ui.sourceFormat, loaded ? FORMAT_LABELS[loaded.format] : "");
  ui.sourceDirty.hidden = !dirty();
  put(ui.sourceDirty, outcome ? "● edited since Run" : "● edited");
}

let diagKey = "";
function renderPanel(): void {
  ui.panel.classList.toggle("is-collapsed", !settings.panelOpen);
  ui.panel.style.height = settings.panelOpen ? `${settings.panelHeight}px` : "";
  ui.panelResize.hidden = !settings.panelOpen;
  ui.panelToggle.setAttribute("aria-expanded", String(settings.panelOpen));
  ui.panelToggle.setAttribute("aria-label", settings.panelOpen ? "Collapse panel" : "Expand panel");
  put(ui.panelToggle, settings.panelOpen ? "▾" : "▴");
  for (const [id, { tab, pane }] of tabs) {
    tab.setAttribute("aria-selected", String(id === settings.panelTab));
    pane.hidden = !settings.panelOpen || id !== settings.panelTab;
  }
  const diagnostics = outcome?.diagnostics ?? [];
  put(ui.diagCount, diagnostics.length ? String(diagnostics.length) : "");
  put(
    ui.diagNote,
    !loaded
      ? "Open a program, then Run it to see diagnostics."
      : !outcome
        ? "Not run yet."
        : diagnostics.length === 0
          ? `No diagnostics. ${outcome.summary}`
          : `${outcome.summary} Select a row to jump to its source span.${dirty() ? " The source changed since this Run, so spans may be off." : ""}`,
  );
  const key = outcome ? `${outcome.source.length}:${diagnostics.map((item) => item.text).join("|")}` : "";
  if (key !== diagKey) {
    diagKey = key;
    ui.diagList.replaceChildren(
      ...diagnostics.map((item) => {
        const row = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = `diag sev-${item.severity}`;
        const sev = document.createElement("b");
        sev.textContent = item.severity === "error" || item.severity === "fatal" ? "✕ error" : item.severity === "warning" ? "⚠ warning" : "ℹ info";
        const where = document.createElement("span");
        where.className = "where";
        where.textContent = item.line !== undefined ? `Ln ${item.line}, Col ${item.column}` : "no span";
        const code = document.createElement("code");
        code.textContent = item.code;
        const message = document.createElement("span");
        message.className = "message";
        message.textContent = item.message;
        button.append(sev, where, code, message);
        if (item.recovery) {
          const recovery = document.createElement("small");
          recovery.textContent = `Recovery: ${item.recovery}`;
          button.append(recovery);
        }
        button.disabled = item.start === undefined;
        button.title = item.start === undefined ? "This diagnostic has no source span." : "Jump to the source span";
        button.addEventListener("click", () => jumpTo(item));
        row.append(button);
        return row;
      }),
    );
  }
  if (settings.panelOpen && settings.panelTab === "scene") {
    put(ui.sceneNote, runtime ? `Scene IR from the last Run. Resolved frame at the playhead.` : outcome ? "The last Run produced no Scene IR." : "Run a program to inspect its Scene IR.");
    put(ui.sceneSummary, runtime ? describeSceneSummary(runtime.scene) : "");
    put(ui.sceneFrame, frame ? describeFrame(frame) : "");
  }
  if (settings.panelOpen && settings.panelTab === "report") {
    put(ui.reportSummary, outcome ? outcome.summary : "Run a program to see its report.");
    put(ui.report, [outcome?.report, comparison?.report].filter(Boolean).join("\n\n"));
  }
}

function renderStatus(): void {
  const size = canvasSize();
  put(ui.status, [
    loaded ? loaded.label : "no program",
    outcome ? outcome.state : loaded ? "not run" : "",
    runtime ? runtime.scene.sceneId : "",
    runtime && !isStill() ? (clock.isPlaying ? "playing" : "paused") : "",
    `canvas ${Math.round(size.width)}×${Math.round(size.height)} css`,
    `dpr ${dpr()}`,
    fullscreen ? "fullscreen" : "",
  ].filter(Boolean).join("  ·  "));
}

function render(): void {
  needsDraw = true;
}

function draw(): void {
  paint();
  renderHeader();
  renderOverlays();
  renderTransport();
  renderSource();
  renderPanel();
  renderStatus();
  publish();
}

function probe(): PlayerProbe {
  return {
    programKey: loaded?.key ?? null,
    programName: loaded?.label ?? null,
    format: loaded?.format ?? null,
    runState: outcome?.state ?? "not-run",
    sceneId: runtime?.scene.sceneId ?? "",
    timeMs: isStill() ? 0 : clampTime(clock.timeMs, durationMs()),
    durationMs: durationMs(),
    playing: clock.isPlaying,
    dirty: dirty(),
    fullscreen,
    sourceOpen: settings.sourceOpen,
    split,
    comparison: split && ui.splitCompare.checked,
    comparisonSceneId: comparisonRuntime?.scene.sceneId ?? "",
    panelOpen: settings.panelOpen,
    panelTab: settings.panelTab,
    diagnostics: (outcome?.diagnostics ?? []).map((item) => item.text),
    canvas: {
      cssWidth: ui.canvas.clientWidth,
      cssHeight: ui.canvas.clientHeight,
      backingWidth: ui.canvas.width,
      backingHeight: ui.canvas.height,
    },
  };
}

function publish(): void {
  const bridge: GvrBridge = {
    activity: "player",
    canvas: ui.canvas,
    frame: frame ?? undefined,
    sceneId: runtime?.scene.sceneId ?? "",
    compileOk: outcome ? outcome.state === "ok" : undefined,
    sourceDiagnostics: outcome?.diagnostics.map((item) => item.text),
    editor: ui.source.value,
    dirty: dirty(),
    report: [outcome?.report, comparison?.report].filter(Boolean).join("\n\n"),
    script: comparison?.script,
    scriptCompiles: comparison?.outcome?.state === "ok",
    seek: (timeMs: number) => {
      clock.pause();
      seek(timeMs);
    },
    player: probe(),
    run,
    open: openKey,
  };
  window.__gvr = bridge;
}

// ---------------------------------------------------------------- wiring

function closeMenus(except?: HTMLElement): void {
  for (const [menu, button] of [[ui.streamPop, ui.streamMenu], [ui.optionsPop, ui.options]] as const) {
    if (menu === except) continue;
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }
}

function toggleMenu(menu: HTMLElement, button: HTMLButtonElement): void {
  const open = menu.hidden;
  closeMenus(menu);
  menu.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
}

ui.streamMenu.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleMenu(ui.streamPop, ui.streamMenu);
});
ui.options.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleMenu(ui.optionsPop, ui.options);
});
document.addEventListener("pointerdown", (event) => {
  const target = event.target;
  if (target instanceof Node && (ui.streamPop.contains(target) || ui.optionsPop.contains(target) || ui.streamMenu.contains(target) || ui.options.contains(target))) return;
  closeMenus();
});

ui.optSize.replaceChildren(...SIZE_PRESETS.map((preset) => new Option(preset.label, preset.id)));
ui.optSize.value = SIZE_PRESETS.some((preset) => preset.id === settings.canvasSize) ? settings.canvasSize : "window";
ui.optDpr.value = settings.dpr;
ui.optAutoplay.checked = settings.autoplay;
ui.optAutoplay.addEventListener("change", () => {
  settings.autoplay = ui.optAutoplay.checked;
  saveSettings();
  render();
});
ui.optSize.addEventListener("change", () => {
  settings.canvasSize = ui.optSize.value;
  saveSettings();
  render();
});
ui.optDpr.addEventListener("change", () => {
  const value = ui.optDpr.value;
  settings.dpr = value === "1" || value === "2" ? value : "device";
  saveSettings();
  render();
});

ui.openLibrary.addEventListener("click", () => openLibrary());
ui.emptyLibrary.addEventListener("click", () => openLibrary());

ui.run.addEventListener("click", run);
ui.readyRun.addEventListener("click", run);
ui.sourceRun.addEventListener("click", run);
ui.failedDiagnostics.addEventListener("click", () => selectTab("diagnostics", true));
ui.toggleSource.addEventListener("click", () => setSourceOpen(!settings.sourceOpen));
ui.sourceClose.addEventListener("click", () => setSourceOpen(false));
ui.source.addEventListener("input", () => { rememberDraft(); fileReadId++; render(); });
ui.toggleSplit.addEventListener("click", () => { closeMenus(); setSplit(!split); });
ui.splitFormat.addEventListener("change", () => selectFormat(ui.splitFormat.value as ProgramFormat));
ui.splitPresets.addEventListener("change", () => {
  const entry = catalogue.find((item) => item.key === ui.splitPresets.value && item.format === loaded?.format);
  if (entry) openProgram(entry, { waitForRun: true });
});
ui.splitOpen.addEventListener("click", () => {
  ui.splitFile.accept = loaded?.format === "svg" ? ".svg,image/svg+xml" : loaded?.format === "motionscript" ? ".ms,.motionscript,.txt,text/plain" : ".json,application/json";
  ui.splitFile.click();
});
ui.splitFile.addEventListener("change", async () => {
  const file = ui.splitFile.files?.[0];
  ui.splitFile.value = "";
  if (!file || !loaded) return;
  const format = loaded.format;
  const requestId = ++fileReadId;
  try {
    const source = await file.text();
    // A slow read must never overwrite a newer draft, format or Library selection.
    if (requestId !== fileReadId) return;
    openProgram({ key: `split:${format}`, label: file.name, caption: file.name, collection: "Split drafts", origin: "mine", format, source }, { waitForRun: true });
  } catch (error) {
    if (requestId !== fileReadId) return;
    put(ui.splitError, `Could not read ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
    ui.splitError.hidden = false;
  }
});
ui.splitCompare.addEventListener("change", () => { refreshComparison(); selectTab("report", true); });
ui.fullscreen.addEventListener("click", enterFullscreen);
ui.fsExit.addEventListener("click", exitFullscreen);
ui.canvas.addEventListener("dblclick", () => (fullscreen ? exitFullscreen() : enterFullscreen()));

let hoverTimer = 0;
ui.canvasArea.addEventListener("pointermove", () => {
  if (!fullscreen) return;
  ui.canvasArea.classList.add("is-hover");
  window.clearTimeout(hoverTimer);
  hoverTimer = window.setTimeout(() => ui.canvasArea.classList.remove("is-hover"), 1800);
});

ui.play.addEventListener("click", togglePlay);
ui.fsPlay.addEventListener("click", togglePlay);
ui.frameBack.addEventListener("click", () => step("frame", -1));
ui.frameFwd.addEventListener("click", () => step("frame", 1));
ui.keyBack.addEventListener("click", () => step("key", -1));
ui.keyFwd.addEventListener("click", () => step("key", 1));
ui.speed.addEventListener("change", () => {
  clock.setRate(Number(ui.speed.value) || 1);
  render();
});

function seekFromPointer(event: PointerEvent): void {
  const rect = ui.track.getBoundingClientRect();
  const fraction = rect.width > 0 ? Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) : 0;
  seek(fraction * durationMs());
}
ui.track.addEventListener("pointerdown", (event) => {
  if (isStill()) return;
  scrubbing = true;
  ui.track.setPointerCapture(event.pointerId);
  seekFromPointer(event);
});
ui.track.addEventListener("pointermove", (event) => {
  if (scrubbing) seekFromPointer(event);
});
ui.track.addEventListener("pointerup", () => {
  scrubbing = false;
});
ui.track.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    event.stopPropagation();
    step(event.shiftKey ? "key" : "frame", event.key === "ArrowLeft" ? -1 : 1);
  }
});

for (const [id, { tab }] of tabs) {
  tab.addEventListener("click", () => selectTab(id, true));
}
ui.panelToggle.addEventListener("click", () => {
  settings.panelOpen = !settings.panelOpen;
  saveSettings();
  render();
});

function dragResize(handle: HTMLElement, axis: "x" | "y", apply: (delta: number, start: number) => void, start: () => number): void {
  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const origin = axis === "x" ? event.clientX : event.clientY;
    const initial = start();
    handle.setPointerCapture(event.pointerId);
    const move = (next: PointerEvent) => {
      apply((axis === "x" ? next.clientX : next.clientY) - origin, initial);
      render();
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      saveSettings();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });
}
dragResize(ui.sourceResize, "x", (delta, initial) => {
  settings.sourceWidth = Math.round(Math.min(window.innerWidth * 0.7, Math.max(240, initial - delta)));
}, () => settings.sourceWidth);
dragResize(ui.panelResize, "y", (delta, initial) => {
  settings.panelHeight = Math.round(Math.min(window.innerHeight * 0.7, Math.max(96, initial - delta)));
}, () => settings.panelHeight);

window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    if (!libraryVisible) run();
    return;
  }
  if (libraryVisible) return;
  if (event.key === "Escape") {
    if (fullscreen) {
      event.preventDefault();
      exitFullscreen();
      return;
    }
    closeMenus();
    return;
  }
  if (isTypingTarget(event.target)) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (event.key === " ") {
    event.preventDefault();
    togglePlay();
  } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    step("key", event.key === "ArrowLeft" ? -1 : 1);
  } else if (key === "f") {
    if (fullscreen) exitFullscreen();
    else enterFullscreen();
  } else if (key === "e") {
    setSourceOpen(!settings.sourceOpen);
  } else if (key === "o") {
    event.preventDefault();
    openLibrary();
  }
});

function readHash(): void {
  if (location.hash === "#library") { openLibrary(true); return; }
  showPlayer();
  const match = /^#p\/(.+)$/.exec(location.hash);
  if (!match?.[1]) return;
  let key: string;
  try { key = decodeURIComponent(match[1]); } catch { return; }
  if (key === loaded?.key) return;
  const entry = catalogue.find((item) => item.key === key);
  if (entry) openProgram(entry, { fromHash: true });
}
window.addEventListener("hashchange", readHash);
window.addEventListener("resize", render);
new ResizeObserver(render).observe(ui.canvasArea);

readHash();
draw();

requestAnimationFrame(function loop(now: number) {
  const delta = Math.min(100, now - lastWall);
  lastWall = now;
  const work = () => {
    if (clock.isPlaying && !scrubbing && runtime) {
      clock.tick(delta);
      if (clock.timeMs >= durationMs()) {
        clock.seek(durationMs());
        clock.pause();
      }
      needsDraw = true;
    }
    if (needsDraw) {
      needsDraw = false;
      draw();
    }
  };
  if (frameTelemetry) frameTelemetry.frame(now, work);
  else work();
  requestAnimationFrame(loop);
});

declare global {
  interface Window {
    __gvr?: GvrBridge;
  }
}
