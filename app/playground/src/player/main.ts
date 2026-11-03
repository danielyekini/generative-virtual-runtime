/**
 * Studio Player page (P001, docs/workstreams/product/studio-ux.md "Player").
 * One loaded program; nothing runs until Run (or the Autoplay option).
 */
import { CanvasRenderer } from "@gvr/canvas-renderer";
import {
  AnimationRuntime,
  createSceneAudioSession,
  createSceneInputSession,
  encodeWav,
  logicalPointFromCss,
  mixAudio,
  RuntimeClock,
  sceneAudioResources,
  syncSceneAudioCues,
  type AudioSession,
  type InputEvent,
  type InputSession,
} from "@gvr/runtime";
import type { ResolvedFrame } from "@gvr/schema";
import type { GvrBridge, PlayerProbe } from "../bridge";
import { isTypingTarget } from "../bridge";
import { clearCanvas, describeFrame } from "../describe";
import { decodeMine, encodeMine, STORAGE_KEY, selectionFor, type LocatedDiagnostic, type ProgramEntry, type ProgramFormat } from "../library";
import { frameTelemetry, telemetry } from "../telemetry";
import { clampTime, collectKeyTimes, formatClock, isStaticScene, stepKey } from "../timeline";
import { FORMAT_LABELS, installedPrograms } from "./programs";
import { LibraryPage } from "./library-page";
import { compareScene, type Comparison } from "./comparison";
import { StreamSession, type SourceState } from "./stream-session";
import { FrameTape } from "./frame-tape";
import { createArrival, DEFAULT_ARRIVAL, type ArrivalOptions } from "./arrival";
import { runProgram, type RunOutcome } from "./run";
import { describeSceneSummary } from "./scene-summary";
import { WebAudioBackend } from "./web-audio";
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
import { playbackHotspotContains, PLAYBACK_IDLE_MS, showFrameTape } from "./playback-chrome";
import { GenerateController } from "./generate-session";
import { bindGeneratePanel, renderGeneratePanel, wireGeneratePanel } from "./generate-panel";

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
  generate: $<HTMLButtonElement>("generate"),
  generateClose: $<HTMLButtonElement>("generate-close"),
  sourceChrome: $("source-chrome"),
  generateChrome: $("generate-chrome"),
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
  fsExit: $<HTMLButtonElement>("fs-exit"),
  playback: $("playback"),
  fullTape: $<HTMLInputElement>("opt-full-tape"),
  tapeProgress: $("tape-progress"),
  transport: $("transport"),
  play: $<HTMLButtonElement>("play"),
  frameBack: $<HTMLButtonElement>("frame-back"),
  frameFwd: $<HTMLButtonElement>("frame-fwd"),
  keyBack: $<HTMLButtonElement>("key-back"),
  keyFwd: $<HTMLButtonElement>("key-fwd"),
  clock: $("clock"),
  speed: $<HTMLSelectElement>("speed"),
  track: $("track-time"),
  tapeFrames: $<HTMLCanvasElement>("tape-frames"),
  tapeAhead: $("tape-ahead"),
  tapeGap: $("tape-gap"),
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
  status: $("status-text"),
  streamScroll: $("stream-scroll"),
  streamFollow: $<HTMLButtonElement>("stream-follow"),
};

const tabs = new Map<PanelTab, { tab: HTMLButtonElement; pane: HTMLElement }>(
  PANEL_TABS.map((id) => [id, { tab: $<HTMLButtonElement>(`tab-${id}`), pane: $(`pane-${id}`) }]),
);

const catalogue = [...installedPrograms(), ...decodeMine(read(STORAGE_KEY))];
const settings = decodeSettings(read(SETTINGS_KEY));
let recent = decodeRecent(read(RECENT_KEY));
const renderer = new CanvasRenderer(ui.canvas, telemetry);
const tape = new FrameTape(ui.tapeFrames);
/** null follows the mode default: frames for Stream/Generate, a white line for Run. */
let fullTapeOverride: boolean | null = null;
/** Pointer is on the tape, so a white line expands to frame tiles for scrubbing. */
let tapeScrub = false;
let playbackIdle = 0;
/** Bumped per Run/Stream so the tape never reuses another session's tiles. */
let tapeSession = 0;
/** Studio poster for a loaded, not-yet-run program (same policy as Library thumbnails). */
let poster: { key: string; runtime: AnimationRuntime } | null = null;
const POSTER = 0.35;
/** Stream source follows arriving text until the user scrolls up. */
let streamFollow = true;
let popoutFollow = true;
const instantClock = new RuntimeClock();
let stream: StreamSession | null = null;
let arrival: Worker | null = null;
let popout: Window | null = null;
// One transport dispatches to the active mode. Playback and arrival pause separately.
const clock = {
  get playbackRate() { return stream?.clock.playbackRate ?? instantClock.playbackRate; },
  get timeMs() { return stream?.clock.timeMs ?? instantClock.timeMs; },
  get isPlaying() { return stream ? ["playing", "waiting_for_content"].includes(stream.clock.playbackState) : instantClock.isPlaying; },
  play() {
    if (stream) {
      if (stream.clock.playbackState === "complete") {
        const time = stream.clock.timeMs;
        stream.clock.stop();
        stream.clock.setHorizon(stream.runtime.sealedThroughMs, durationMs(), stream.runtime.authoringComplete);
        stream.clock.seek(time);
      }
      stream.clock.play();
    } else instantClock.play();
  },
  pause() { if (stream) stream.clock.pause(); else instantClock.pause(); },
  seek(t: number) { if (stream) stream.clock.seek(t); else instantClock.seek(t); },
  setRate(r: number) { if (stream) stream.clock.setRate(r); else instantClock.setRate(r); },
  tick(dt: number) { if (stream) stream.clock.tick(dt); else instantClock.tick(dt); },
};
function stopStream(): void {
  arrival?.terminate(); arrival = null;
  if (stream) {
    // A subsequent failed instant Run must retain a usable last accepted scene.
    const scene = stream.runtime.scene;
    runtime = scene ? new AnimationRuntime(scene, telemetry) : null;
    instantClock.pause(); instantClock.seek(stream.clock.timeMs); instantClock.setRate(stream.clock.playbackRate);
    stream.dispose(); stream = null;
  }
  popout?.close(); popout = null;
  if (settings.panelTab === "stream") settings.panelTab = "diagnostics";
  closeMenus();
}
function arrivalOptions(): ArrivalOptions {
  const number = (id: string, fallback: number, min: number, max: number) => {
    const value = Number($<HTMLInputElement>(id).value);
    return Number.isFinite(value) ? Math.floor(Math.max(min, Math.min(max, value))) : fallback;
  };
  const min = number("arrival-min", 4, 1, 16384);
  return { ...DEFAULT_ARRIVAL, rate: number("arrival-rate", 60, 0, 200),
    mode: $<HTMLSelectElement>("arrival-mode").value as ArrivalOptions["mode"],
    size: number("arrival-size", 4, 1, 4096), min,
    max: Math.max(min, number("arrival-max", 32, 1, 16384)),
    jitter: number("arrival-jitter", 0, 0, 100),
    stallEvery: number("arrival-stall-every", 0, 0, 10000),
    stallMs: number("arrival-stall-ms", 1000, 0, 60000), seed: number("arrival-seed", 1, 0, 4294967295) };
}
function runStream(): void {
  if (!loaded || loaded.format !== "motionscript") return;
  stopStream(); instantClock.pause();
  input?.dispose(); input = null; ui.canvas.tabIndex = -1;
  stopAudio();
  comparison = null; comparisonRuntime = null; ui.splitCompare.checked = false;
  const session = new StreamSession(ui.source.value);
  tapeSession++;
  streamFollow = true;
  session.clock.setRate(Number(ui.speed.value) || 1);
  stream = session; runtime = null; frame = null;
  rememberDraft();
  let servicesStarted = false;
  const source = session.source;
  outcome = { format: "motionscript", state: "ok", source, diagnostics: [], summary: "Simulated arrival started.", report: "", frameMs: 1000 / 30 };
  selectTab("stream", true);
  arrival = createArrival(source, arrivalOptions(), (data) => {
    if (stream !== session) return;
    if (data.stallMs !== undefined) session.stallUntil = performance.now() + data.stallMs;
    if (data.text !== undefined) session.push(data.text);
    if (data.end) { session.finish(); arrival?.terminate(); arrival = null; }
    const scene = session.runtime.scene;
    runtime = scene ? { scene, evaluate: (t, overlay) => session.runtime.evaluate(t, overlay) } : null;
    if (scene && (session.runtime.sealedThroughMs > 0 || session.runtime.authoringComplete)) {
      if (!servicesStarted) {
        input = scene.interactions?.length ? createSceneInputSession(scene, { wrapFocus: false }) : null;
        ui.canvas.tabIndex = input ? 0 : -1;
        startAudio(scene);
        servicesStarted = true;
      } else if (audio) syncSceneAudioCues(audio, scene);
    }
    outcome = { ...outcome!, scene, diagnostics: session.diagnostics,
      state: session.diagnostics.some(d => d.severity === "error" || d.severity === "fatal") ? scene ? "recovered" : "failed" : "ok",
      summary: session.done ? "Simulated arrival finished." : "Simulated arrival in progress.", report: "Engine observation is in the Stream tab." };
    render();
  });
  arrival.onerror = () => {
    if (stream !== session) return;
    arrival?.terminate(); arrival = null; session.done = true;
    outcome = { ...outcome!, state: "failed", summary: "Arrival Worker failed; press Stream to retry." };
    render();
  };
}


let loaded: ProgramEntry | null = null;
// Drafts live only in this visit; explicit Library/preset/file loads replace that format's draft.
const drafts = new Map<ProgramFormat, ProgramEntry>();
let split = false;
let comparison: Comparison | null = null;
let comparisonRuntime: AnimationRuntime | null = null;
let comparisonRenderer: CanvasRenderer | null = null;
let fileReadId = 0;
let outcome: RunOutcome | null = null;
let runtime: Pick<AnimationRuntime, "scene" | "evaluate"> | null = null;
/** Input session for scenes that declare `interact` targets (input.bindings). */
let input: InputSession | null = null;
/** Audio session for scenes that declare audio.cues; driven by the player clock. */
let audio: AudioSession | null = null;
const audioBackend = new WebAudioBackend();
let audioSeeked = false;
/** True while the required-audio gate (not the user) paused the clock. */
let audioHold = false;
let audioNote = "";
/** Required audio must be decoded this far ahead of the playhead. */
const AUDIO_LOOKAHEAD_MS = 250;
const EXPORT_SAMPLE_RATE = 44100;

let frame: ResolvedFrame | null = null;
let fullscreen = false;
let scrubbing = false;
let needsDraw = true;
let libraryVisible = false;
let lastWall = performance.now();
let ticksKey = "";
/** Generate mode (P019): side panel shows transcript + composer instead of Source. */
let generateMode = false;
/** Source-open preference restored when leaving Generate. */
let sourceOpenBeforeGenerate = false;

const generateUi = bindGeneratePanel($("generate-chrome"));
const generate = new GenerateController({
  onChange: () => render(),
  acceptProgram: (label, source) => {
    const key = `mine:generated-${Date.now().toString(36)}`;
    const entry: ProgramEntry = {
      key,
      label,
      caption: "Studio Generate",
      collection: "My programs",
      origin: "mine",
      format: "motionscript",
      source,
    };
    const mine = [...decodeMine(read(STORAGE_KEY)).filter((item) => item.key !== key), entry];
    write(STORAGE_KEY, encodeMine(mine));
    const existing = catalogue.findIndex((item) => item.key === key);
    if (existing >= 0) catalogue[existing] = entry;
    else catalogue.push(entry);
    openProgram(entry);
    run();
  },
});
wireGeneratePanel(generateUi, generate);

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
  return stream ? !runtime || durationMs() <= 0 : !runtime || isStaticScene(runtime.scene) || durationMs() <= 0;
}

function openProgram(entry: ProgramEntry, options: { fromHash?: boolean; waitForRun?: boolean } = {}): void {
  stopStream();
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
  stopAudio();
  clock.pause();
  clock.seek(0);
  ui.source.value = entry.source;
  ui.source.disabled = false;
  poster = posterFor(loaded);
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

function posterFor(entry: ProgramEntry): typeof poster {
  // Compile only to draw the Studio thumbnail; nothing plays and no outcome is recorded.
  try {
    const scene = runProgram(entry.source, entry.format, entry.label).scene;
    return scene ? { key: entry.key, runtime: new AnimationRuntime(scene) } : null;
  } catch {
    return null;
  }
}

function openKey(key: string): boolean {
  const entry = catalogue.find((item) => item.key === key);
  if (!entry) return false;
  openProgram(entry);
  return true;
}

function run(): void {
  if (!loaded) return;
  stopStream();
  outcome = runProgram(ui.source.value, loaded.format, loaded.label, telemetry);
  if (outcome.scene) tapeSession++;
  rememberDraft();
  clock.pause();
  // Failure preserves the previous successful scene and playhead, with a visible notice.
  if (outcome.scene) {
    runtime = new AnimationRuntime(outcome.scene, telemetry);
    input?.dispose();
    input = outcome.scene.interactions?.length ? createSceneInputSession(outcome.scene, { wrapFocus: false }) : null;
    // Interactive scenes take keyboard focus for Tab / Enter / bound keys.
    ui.canvas.tabIndex = input ? 0 : -1;
    startAudio(outcome.scene);
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
    if (clock.timeMs >= durationMs()) seek(0);
    audioBackend.resume();
    clock.play();
  }
  audioHold = false;
  render();
}

function seek(timeMs: number): void {
  if (!runtime || isStill()) return;
  clock.seek(clampTime(timeMs, durationMs()));
  audioSeeked = true;
  render();
}

// ---------------------------------------------------------------- audio

function stopAudio(): void {
  audio?.dispose();
  audio = null;
  audioHold = false;
  audioNote = "";
}

/** Lower declared cues into a session and start decoding (readiness feeds the gate). */
function startAudio(scene: NonNullable<RunOutcome["scene"]>): void {
  stopAudio();
  const resources = sceneAudioResources(scene);
  if (resources.length === 0 && !scene.audioCues?.length) return;
  const session = createSceneAudioSession(scene, { backend: audioBackend });
  audio = session;
  audioBackend.resume();
  void audioBackend.load(resources, (resourceId, state) => {
    if (audio !== session) return;
    session.setResourceState(resourceId, state);
    render();
  });
}

/**
 * Reconcile audio with the presented scene time once per frame. Scene time is
 * the master clock; a playing clock holds while required audio near the
 * playhead is loading or failed, and resumes at the same scene time.
 */
function syncAudio(wallDeltaMs: number): void {
  if (!audio || !runtime) return;
  const time = isStill() ? 0 : clampTime(clock.timeMs, durationMs());
  const readiness = audio.readiness(time, AUDIO_LOOKAHEAD_MS);
  const note = readiness.failed.length > 0
    ? `required audio ${readiness.failed.join(", ")} failed to load; playback blocked`
    : readiness.waitingFor.length > 0 ? `waiting for audio ${readiness.waitingFor.join(", ")}` : "";
  if (!readiness.ok && clock.isPlaying) {
    clock.pause();
    audioHold = true;
  } else if (readiness.ok && audioHold) {
    audioHold = false;
    clock.play();
  }
  if (note !== audioNote) {
    audioNote = note;
    render();
  }
  const playing = (stream ? stream.clock.playbackState === "playing" : clock.isPlaying) && !libraryVisible && !scrubbing;
  audio.sync({ sceneTimeMs: time, state: playing ? "playing" : "paused", rate: clock.playbackRate, wallDeltaMs, seeked: audioSeeked });
  audioSeeked = false;
}

/** Deterministic offline mix of the declared schedule (same gains/offsets as live playback). */
function exportAudio(): { wav: Uint8Array; sampleRate: number; channels: number; durationMs: number } | null {
  if (!audio || !runtime) return null;
  const channels = 2;
  const mixed = mixAudio(audio.schedule(), audioBackend.decoded(), { startMs: 0, endMs: durationMs(), sampleRate: EXPORT_SAMPLE_RATE, channels });
  return { wav: encodeWav(mixed, EXPORT_SAMPLE_RATE), sampleRate: EXPORT_SAMPLE_RATE, channels, durationMs: durationMs() };
}

function step(kind: "frame" | "key", direction: -1 | 1): void {
  if (!runtime || isStill()) return;
  const span = durationMs();
  const next = kind === "key"
    ? stepKey(collectKeyTimes(runtime.scene, span), clock.timeMs, direction, span)
    : clampTime(clock.timeMs + direction * (outcome?.frameMs ?? 1000 / 30), span);
  clock.pause();
  clock.seek(next);
  audioSeeked = true;
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
  if (open && generateMode) leaveGenerateMode(true);
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
  if (generateMode) {
    // Source toggle leaves Generate and restores ordinary Source chrome.
    leaveGenerateMode(open);
    return;
  }
  settings.sourceOpen = open;
  saveSettings();
  render();
  if (open) ui.source.focus({ preventScroll: true });
}

function enterGenerateMode(): void {
  if (generateMode) return;
  if (split) setSplit(false);
  sourceOpenBeforeGenerate = settings.sourceOpen;
  generateMode = true;
  settings.sourceOpen = true;
  saveSettings();
  render();
  generateUi.composer.focus({ preventScroll: true });
}

function leaveGenerateMode(openSource = sourceOpenBeforeGenerate): void {
  if (!generateMode) return;
  if (generate.state.running) generate.cancel();
  generate.closeDetail();
  generateMode = false;
  settings.sourceOpen = openSource;
  saveSettings();
  render();
  if (openSource) ui.source.focus({ preventScroll: true });
}

function toggleGenerateMode(): void {
  if (generateMode) leaveGenerateMode();
  else enterGenerateMode();
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
  audioHold = false;
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
  frame = stream ? stream.evaluate(inputOverlay()) : runtime ? runtime.evaluate(time, inputOverlay()) : null;
  if (frame) renderer.render(frame);
  else if (!outcome && poster && poster.key === loaded?.key) {
    const span = poster.runtime.scene.timeline.durationMs;
    renderer.render(poster.runtime.evaluate(span > 0 ? span * POSTER : 0));
  } else clearCanvas(ui.canvas);
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
  if (stream) return { text: `≋ ${stream.clock.playbackState} · ${stream.done ? "arrival done" : stream.paused ? "arrival paused" : "arriving"}`, tone: "" };
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
  $<HTMLButtonElement>("stream").disabled = !loaded || loaded.format !== "motionscript";
  $("stream").title = loaded?.format !== "motionscript" ? "Stream supports native MotionScript; use Run for imports." : "Simulate arrival of the current source";
  $("stream").setAttribute("aria-pressed", String(Boolean(stream)));
  $("stream-controls").hidden = !stream;
  ui.streamMenu.disabled = !loaded || loaded.format !== "motionscript";
  ui.streamMenu.setAttribute("aria-pressed", String(Boolean(stream)));
  tabs.get("stream")!.tab.hidden = !stream;
  $<HTMLButtonElement>("arrival-pause").disabled = !stream || stream.done;
  $<HTMLButtonElement>("arrival-step").disabled = !stream || stream.done;
  put($("arrival-pause"), stream?.paused ? "Resume arrival" : "Pause arrival");
  ui.sourceRun.disabled = !loaded;
  ui.fullscreen.disabled = !runtime;
  ui.toggleSplit.setAttribute("aria-pressed", String(split));
  ui.toggleSource.setAttribute("aria-pressed", String(settings.sourceOpen && !generateMode));
  ui.generate.setAttribute("aria-pressed", String(generateMode));
  if (!libraryVisible) document.title = loaded ? `${loaded.label} · GVR Studio` : "GVR Studio";
}

function renderOverlays(): void {
  ui.empty.hidden = Boolean(loaded);
  ui.ready.hidden = !loaded || Boolean(outcome);
  ui.readyRun.hidden = Boolean(stream);
  if (stream && !runtime && outcome?.state !== "failed") {
    ui.ready.hidden = false;
    put(ui.readyTitle, "Waiting for an executable prefix");
    put(ui.readyNote, stream.paused ? "Arrival is paused. Resume or step a chunk." : "Simulated source is arriving; playback waits for an accepted seal.");
  }
  ui.failed.hidden = !outcome || Boolean(runtime);
  if (loaded && !outcome) {
    put(ui.readyTitle, loaded.label);
    put(ui.readyNote, settings.autoplay ? "Loaded." : "Loaded. Nothing runs until you press Run.");
  }
  const retainedFailure = outcome?.state === "failed" && Boolean(runtime);
  ui.failed.classList.toggle("has-retained-scene", retainedFailure);
  ui.failed.hidden = !outcome || (Boolean(runtime) && !retainedFailure);
  if (stream && outcome?.state !== "failed") ui.failed.hidden = true;
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
  for (const control of [ui.play, ui.frameBack, ui.frameFwd, ui.keyBack, ui.keyFwd, ui.speed]) control.disabled = still;
  const label = clock.isPlaying ? "❚❚" : "▶";
  put(ui.play, label);
  ui.play.setAttribute("aria-label", clock.isPlaying ? "Pause" : "Play");
  const text = runtime
    ? still ? `static · ${formatClock(0)}` : `${formatClock(time)} / ${formatClock(span)}`
    : "—";
  put(ui.clock, text);
  const fraction = !still && span > 0 ? time / span : 0;
  ui.tapeProgress.style.width = `${(fraction * 100).toFixed(3)}%`;
  if (document.activeElement !== ui.fullTape) {
    ui.fullTape.checked = showFrameTape({
      stream: Boolean(stream),
      generate: generateMode,
      override: fullTapeOverride,
      scrubbing: false,
    });
  }
  renderTape(span, still, fraction);
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

/** Scene time whose frames are resolved now: whole scene in Run mode, the sealed horizon while streaming. */
function resolvedThroughMs(span: number): number {
  if (!runtime) return 0;
  if (!stream) return span;
  return stream.runtime.authoringComplete ? span : Math.min(span, stream.runtime.sealedThroughMs);
}

function renderTape(span: number, still: boolean, fraction: number): void {
  const frames = showFrameTape({
    stream: Boolean(stream),
    generate: generateMode,
    override: fullTapeOverride,
    scrubbing: tapeScrub,
  });
  ui.playback.classList.toggle("is-line", !frames);
  ui.playback.classList.toggle("is-frames", frames);
  const resolved = resolvedThroughMs(span);
  const resolvedFraction = !still && span > 0 ? Math.min(1, resolved / span) : 0;
  if (!frames || !runtime || still || libraryVisible) {
    if (!frames || !runtime || still) tape.clear();
  } else {
    const scene = runtime.scene;
    const evaluator = runtime;
    const more = tape.update({
      key: `${tapeSession}:${scene.sceneId}`,
      spanMs: span,
      resolvedThroughMs: resolved,
      aspect: scene.viewport.width / Math.max(1, scene.viewport.height),
      dpr: Math.min(2, dpr()),
      // Sampling a streaming runtime ahead of the playhead stays within its sealed prefix.
      evaluate: (timeMs) => evaluator.evaluate(Math.min(timeMs, resolved)),
    });
    if (more) needsDraw = true;
  }
  // Grey layer: resolved but not yet played. Normal tiles sit left of the playhead.
  const ahead = Math.max(0, resolvedFraction - fraction);
  ui.tapeAhead.style.left = `${(fraction * 100).toFixed(3)}%`;
  ui.tapeAhead.style.width = `${(ahead * 100).toFixed(3)}%`;
  const waiting = Boolean(stream?.observation.waitingForContent);
  ui.track.classList.toggle("is-waiting", waiting);
  // Red gap: playback is stalled at the resolved frontier waiting for content.
  ui.tapeGap.hidden = !waiting || still;
  ui.tapeGap.style.left = `${(resolvedFraction * 100).toFixed(3)}%`;
  const stats = tape.stats;
  ui.track.dataset.tiles = String(stats.tiles);
  ui.track.dataset.drawn = String(stats.drawn);
  ui.track.title = stream
    ? `Sealed ${stream.runtime.sealedThroughMs} ms · playhead ${stream.clock.timeMs.toFixed(0)} ms · waiting ${stream.waitingMs.toFixed(0)} ms · ${stats.drawn}/${stats.tiles} frame tiles`
    : runtime ? `Seek · ${stats.drawn}/${stats.tiles} frame tiles` : "Seek";
}

function renderSource(): void {
  const open = settings.sourceOpen || generateMode;
  ui.sourcePanel.hidden = !open;
  ui.sourceResize.hidden = !open;
  ui.sourcePanel.style.width = `${Math.min(settings.sourceWidth, window.innerWidth * (split ? .6 : .7))}px`;
  ui.sourcePanel.setAttribute("aria-label", generateMode ? "Generate" : "Source");
  document.body.classList.toggle("split-open", split);
  document.body.classList.toggle("has-comparison", split && ui.splitCompare.checked && !fullscreen);
  document.body.classList.toggle("generate-mode", generateMode);
  ui.sourceChrome.hidden = generateMode;
  ui.generateChrome.hidden = !generateMode;
  ui.splitControls.hidden = !split || generateMode;
  ui.comparison.hidden = !split || !ui.splitCompare.checked || fullscreen || generateMode;
  put(ui.comparisonNote, comparison ? comparison.outcome?.scene ? "Emitted/recompiled Scene IR; inspect Report / Compare for scope." : comparison.report : "Run a playable program to compare it.");
  put(ui.sourceFormat, loaded ? FORMAT_LABELS[loaded.format] : "");
  ui.sourceDirty.hidden = !dirty();
  put(ui.sourceDirty, outcome ? "● edited since Run" : "● edited");
  if (generateMode) renderGeneratePanel(generateUi, generate.state);
}

let diagKey = "";
function renderPanel(): void {
  if (!stream && settings.panelTab === "stream") settings.panelTab = "diagnostics";
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
  renderStream();
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

let lastStreamSegments: ReturnType<StreamSession["segments"]> | null = null;
let lastPopoutSegments: ReturnType<StreamSession["segments"]> | null = null;
const STREAM_CUES: Record<SourceState, string> = { arrived: "◌", queued: "▷", resolved: "✓", rejected: "✕" };
const STREAM_LEGEND = "◌ arrived · ▷ accepted / queued ahead of playhead · ✓ resolved at playhead · ✕ rejected. Highlights follow declaration spans, not frames.";
const POPOUT_CSS = `
  html, body { margin: 0; height: 100%; background: #181818; color: #eee; font: 13px/1.4 ui-sans-serif, system-ui, sans-serif; }
  body { display: flex; flex-direction: column; }
  header { padding: 8px 12px; border-bottom: 1px solid #2f2f34; color: #a1a1aa; }
  header p { margin: 0 0 4px; }
  .stream-body { position: relative; flex: 1; min-height: 0; }
  .stream-scroll { position: absolute; inset: 0; overflow: auto; padding: 8px 12px; }
  pre { margin: 0; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
  .stream-arrived { color: #999; } .stream-queued { color: #edab57; } .stream-resolved { color: #eee; }
  .stream-rejected { color: #ff8080; text-decoration: underline wavy; }
  .stream-cue { font-size: .8em; margin-right: 3px; user-select: none; }
  .stream-follow { position: absolute; right: 16px; bottom: 12px; font: inherit; color: #e4e4e7; background: #1d4ed8; border: 1px solid #3b82f6; border-radius: 999px; padding: 4px 12px; cursor: pointer; }
  [hidden] { display: none !important; }
`;

/** Build the coloured, iconed spans in whichever document will hold them (main page or pop-out). */
function streamNodes(doc: Document, segments: ReturnType<StreamSession["segments"]>): Node[] {
  return segments.map((part) => {
    const span = doc.createElement("span");
    span.className = `stream-${part.state}`;
    span.dataset.state = part.state;
    span.title = part.message ?? part.state;
    const cue = doc.createElement("span");
    cue.className = "stream-cue";
    cue.textContent = STREAM_CUES[part.state];
    cue.setAttribute("aria-label", part.message ?? part.state);
    span.append(cue, doc.createTextNode(part.text));
    return span;
  });
}

function atBottom(element: Element): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= 4;
}

function renderStream(): void {
  if (!stream) { lastStreamSegments = null; lastPopoutSegments = null; return; }
  const o = stream.observation;
  put($("stream-summary"), [
    `${stream.cursor}/${stream.source.length} characters · ${o.receivedBytes} UTF-8 bytes`,
    `${o.parsedUnits} declaration units · ${o.pendingCompileDeltas} compile deltas pending · ${o.queuedRuntimeDeltas} runtime deltas queued`,
    `revision ${o.appliedRevision} · sealed ${o.sealedThroughMs} ms · playhead ${o.playheadMs.toFixed(0)} ms`,
    `${o.playbackState} · waiting ${stream.waitingMs.toFixed(0)} ms`,
    stream.done ? "arrival complete" : stream.paused ? "arrival paused" : performance.now() < stream.stallUntil ? "scheduled arrival stall" : "simulated arrival",
  ].join(" | "));
  const segments = stream.segments();
  // Scrolling up freezes the view (no re-render, no jump) until Jump to latest.
  if (streamFollow && segments !== lastStreamSegments) {
    lastStreamSegments = segments;
    $("stream-source").replaceChildren(...streamNodes(document, segments));
  }
  ui.streamFollow.hidden = streamFollow;
  if (streamFollow && !atBottom(ui.streamScroll)) ui.streamScroll.scrollTop = ui.streamScroll.scrollHeight;
  if (popout && !popout.closed) {
    const doc = popout.document;
    const pre = doc.getElementById("stream-source");
    const scroller = doc.getElementById("stream-scroll");
    const follow = doc.getElementById("stream-follow");
    const summary = doc.getElementById("stream-summary");
    if (summary) summary.textContent = $("stream-summary").textContent;
    if (pre && popoutFollow && segments !== lastPopoutSegments) {
      lastPopoutSegments = segments;
      pre.replaceChildren(...streamNodes(doc, segments));
    }
    if (follow) follow.hidden = popoutFollow;
    if (scroller && popoutFollow && !atBottom(scroller)) scroller.scrollTop = scroller.scrollHeight;
  }
}

function openPopout(): void {
  popout = window.open("", "gvr-arrived-source", "width=800,height=600");
  if (!popout) return;
  const doc = popout.document;
  doc.title = "Arrived source · GVR Studio";
  const style = doc.createElement("style");
  style.textContent = POPOUT_CSS;
  doc.head.replaceChildren(style);
  const header = doc.createElement("header");
  const summary = doc.createElement("p");
  summary.id = "stream-summary";
  const legend = doc.createElement("p");
  legend.textContent = STREAM_LEGEND;
  header.append(summary, legend);
  const body = doc.createElement("div");
  body.className = "stream-body";
  const scroller = doc.createElement("div");
  scroller.id = "stream-scroll";
  scroller.className = "stream-scroll";
  const pre = doc.createElement("pre");
  pre.id = "stream-source";
  scroller.append(pre);
  const follow = doc.createElement("button");
  follow.id = "stream-follow";
  follow.className = "stream-follow";
  follow.type = "button";
  follow.textContent = "↓ Jump to latest";
  follow.hidden = true;
  body.append(scroller, follow);
  doc.body.replaceChildren(header, body);
  popoutFollow = true;
  lastPopoutSegments = null;
  scroller.addEventListener("scroll", () => {
    const bottom = atBottom(scroller);
    if (bottom !== popoutFollow) { popoutFollow = bottom; render(); }
  });
  follow.addEventListener("click", () => { popoutFollow = true; lastPopoutSegments = null; render(); });
}

function renderStatus(): void {
  const size = canvasSize();
  put(ui.status, [
    loaded ? loaded.label : "no program",
    outcome ? outcome.state : loaded ? "not run" : "",
    runtime ? runtime.scene.sceneId : "",
    runtime && !isStill() ? (clock.isPlaying ? "playing" : audioHold ? "holding for audio" : "paused") : "",
    audioNote,
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
    sourceOpen: settings.sourceOpen && !generateMode,
    generateMode,
    generateRunning: generate.state.running,
    generateMessages: generate.state.messages.length,
    split,
    comparison: split && ui.splitCompare.checked,
    comparisonSceneId: comparisonRuntime?.scene.sceneId ?? "",
    panelOpen: settings.panelOpen,
    panelTab: settings.panelTab,
    diagnostics: (outcome?.diagnostics ?? []).map((item) => item.text),
    audio: audio
      ? {
          voices: [...audio.runningVoices],
          holding: audioHold,
          note: audioNote,
          context: audioBackend.running ? "running" : "suspended",
          diagnostics: audio.diagnostics.map((item) => `${item.code} ${item.message}`),
          log: [...audioBackend.log],
        }
      : undefined,
    tape: { ...tape.stats },
    canvas: {
      cssWidth: ui.canvas.clientWidth,
      cssHeight: ui.canvas.clientHeight,
      backingWidth: ui.canvas.width,
      backingHeight: ui.canvas.height,
    },
  };
}

/** Smoke/preview helper: one user turn plus an in-flight director model turn. */
function seedGeneratePreview(user: string, director: string, output: string, expand = false): void {
  if (!generateMode) enterGenerateMode();
  const userMessage = generate.state.messages.find((message) => message.id === "seed-user") ?? {
    id: "seed-user",
    role: "user" as const,
    text: user,
  };
  userMessage.text = user;
  const model = generate.state.messages.find((message) => message.id === "seed-model") ?? {
    id: "seed-model",
    role: "model" as const,
    text: "",
    approach: "director" as const,
  };
  model.text = output;
  model.pending = true;
  model.phase = "implement";
  model.approach = "director";
  model.directorRaw = director;
  model.source = output;
  generate.state.messages = [userMessage, model];
  generate.state.running = true;
  generate.state.lastStatus = "Implementing MotionScript…";
  if (expand) {
    if (generate.state.detailId !== "seed-model" || generate.state.detailShare <= 0) generate.openDetail("seed-model");
    generate.setDetailShare(1);
  }
  render();
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
    stream: stream ? { ...stream.observation, receivedCharacters: stream.cursor, totalCharacters: stream.source.length, arrivalPaused: stream.paused, arrivalDone: stream.done, waitingMs: stream.waitingMs, resolvedThroughMs: stream.clock.timeMs } : undefined,
    runStream,
    run,
    open: openKey,
    exportAudio,
    seedGeneratePreview,
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

$("stream").addEventListener("click", runStream);
$("arrival-pause").addEventListener("click", () => {
  if (!stream || stream.done) return;
  stream.paused = !stream.paused;
  arrival?.postMessage({ pause: stream.paused }); render();
});
$("arrival-step").addEventListener("click", () => {
  if (!stream || stream.done) return;
  stream.paused = true;
  arrival?.postMessage({ step: true }); render();
});
$("stream-popout").addEventListener("click", () => { openPopout(); render(); });
ui.streamScroll.addEventListener("scroll", () => {
  // Only a visible pane can be scrolled by the user; hidden panes report zero sizes.
  if (ui.streamScroll.clientHeight === 0) return;
  const bottom = atBottom(ui.streamScroll);
  if (bottom !== streamFollow) { streamFollow = bottom; render(); }
});
ui.streamFollow.addEventListener("click", () => {
  streamFollow = true;
  lastStreamSegments = null;
  render();
});
window.addEventListener("pagehide", () => { stopStream(); stopAudio(); input?.dispose(); input = null; });
ui.run.addEventListener("click", run);
ui.readyRun.addEventListener("click", run);
ui.sourceRun.addEventListener("click", run);
ui.failedDiagnostics.addEventListener("click", () => selectTab("diagnostics", true));
ui.toggleSource.addEventListener("click", () => setSourceOpen(!(settings.sourceOpen && !generateMode)));
ui.sourceClose.addEventListener("click", () => setSourceOpen(false));
ui.generate.addEventListener("click", () => toggleGenerateMode());
ui.generateClose.addEventListener("click", () => leaveGenerateMode());
generateUi.transcript.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  openModelDetail(event.target);
});
generateUi.transcript.addEventListener("click", (event) => {
  openModelDetail(event.target);
});
function openModelDetail(target: EventTarget | null): void {
  if (!(target instanceof Element)) return;
  const bubble = target.closest(".generate-bubble.is-model");
  if (!(bubble instanceof HTMLElement)) return;
  const row = bubble.closest(".generate-row");
  const id = row instanceof HTMLElement ? row.dataset.id : undefined;
  if (id) generate.openDetail(id);
}
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

function inputOverlay() {
  return input ? input.applyTo.bind(input) : undefined;
}

/** Route one host event into the input session at the presented scene time. */
function dispatchInput(build: (sceneTimeMs: number) => InputEvent): boolean {
  if (!input || !runtime || libraryVisible) return false;
  const time = isStill() ? 0 : clampTime(clock.timeMs, durationMs());
  const signals = input.process(build(time), runtime.evaluate(time, inputOverlay()));
  if (signals.length > 0) render();
  return signals.length > 0;
}

function pointerAt(event: PointerEvent | WheelEvent): { x: number; y: number } {
  const viewport = runtime?.scene.viewport ?? { width: 1, height: 1 };
  return logicalPointFromCss(viewport, ui.canvas.clientWidth, ui.canvas.clientHeight, event.offsetX, event.offsetY);
}

let canvasPointerConsumed = false;
for (const type of ["pointerdown", "pointermove", "pointerup"] as const) {
  ui.canvas.addEventListener(type, (event) => {
    if (!input) return;
    const point = pointerAt(event);
    const consumed = dispatchInput((sceneTimeMs) => ({ type, sceneTimeMs, pointerId: event.pointerId, x: point.x, y: point.y }));
    if (type === "pointerdown") {
      canvasPointerConsumed = consumed;
      if (input.capturedEntity) ui.canvas.setPointerCapture?.(event.pointerId);
    }
  });
}
ui.canvas.addEventListener("pointercancel", (event) => {
  dispatchInput((sceneTimeMs) => ({ type: "pointercancel", sceneTimeMs, pointerId: event.pointerId }));
});
ui.canvas.addEventListener(
  "wheel",
  (event) => {
    if (!input) return;
    const point = pointerAt(event);
    const consumed = dispatchInput((sceneTimeMs) => ({
      type: "wheel",
      sceneTimeMs,
      x: point.x,
      y: point.y,
      deltaY: event.deltaY,
      ctrlKey: event.ctrlKey,
    }));
    if (consumed) event.preventDefault();
  },
  { passive: false },
);
ui.canvas.addEventListener("keydown", (event) => {
  if (!input || event.metaKey || event.ctrlKey || event.altKey) return;
  const consumed = dispatchInput((sceneTimeMs) => ({ type: "keydown", sceneTimeMs, key: event.key, shiftKey: event.shiftKey }));
  // Tab past either end releases focus to the page instead of trapping it.
  const leaving = event.key === "Tab" && !input.focusedEntity;
  if (consumed && !leaving) {
    // Interaction keys win over player shortcuts while the canvas has focus.
    event.preventDefault();
    event.stopPropagation();
  }
});

let hoverTimer = 0;
function sceneIsInteractive(): boolean {
  return Boolean(runtime?.scene.interactions?.length);
}
function revealPlayback(point?: { x: number; y: number }): void {
  if (libraryVisible) return;
  if (sceneIsInteractive() && point) {
    const box = ui.playback.getBoundingClientRect();
    if (!playbackHotspotContains(true, point, box)) {
      if (!ui.playback.contains(document.activeElement)) hidePlayback();
      return;
    }
  }
  ui.playback.classList.add("is-revealed");
  ui.playback.setAttribute("aria-hidden", "false");
  window.clearTimeout(playbackIdle);
  playbackIdle = window.setTimeout(hidePlayback, PLAYBACK_IDLE_MS);
}
function hidePlayback(): void {
  if (ui.playback.contains(document.activeElement)) {
    playbackIdle = window.setTimeout(hidePlayback, PLAYBACK_IDLE_MS);
    return;
  }
  ui.playback.classList.remove("is-revealed");
  ui.playback.setAttribute("aria-hidden", "true");
}
ui.canvasArea.addEventListener("pointermove", (event) => {
  revealPlayback({ x: event.clientX, y: event.clientY });
  if (!fullscreen) return;
  ui.canvasArea.classList.add("is-hover");
  window.clearTimeout(hoverTimer);
  hoverTimer = window.setTimeout(() => ui.canvasArea.classList.remove("is-hover"), 1800);
});
ui.playback.addEventListener("focusin", () => revealPlayback());
ui.canvas.addEventListener("click", () => {
  const consumed = canvasPointerConsumed;
  canvasPointerConsumed = false;
  if (consumed || libraryVisible) return;
  togglePlay();
});

ui.play.addEventListener("click", togglePlay);
ui.frameBack.addEventListener("click", () => step("frame", -1));
ui.frameFwd.addEventListener("click", () => step("frame", 1));
ui.keyBack.addEventListener("click", () => step("key", -1));
ui.keyFwd.addEventListener("click", () => step("key", 1));
ui.speed.addEventListener("change", () => {
  clock.setRate(Number(ui.speed.value) || 1);
  render();
});
ui.fullTape.addEventListener("change", () => {
  fullTapeOverride = ui.fullTape.checked;
  render();
});

function seekFromPointer(event: PointerEvent): void {
  const rect = ui.track.getBoundingClientRect();
  const fraction = rect.width > 0 ? Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) : 0;
  seek(fraction * durationMs());
}
ui.track.addEventListener("pointerdown", (event) => {
  if (isStill()) return;
  tapeScrub = true;
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
ui.track.addEventListener("pointerleave", () => {
  if (scrubbing || !tapeScrub) return;
  tapeScrub = false;
  render();
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
    if (stream && !libraryVisible) {
      if (stream.observation.waitingForContent && !scrubbing) stream.waitingMs += delta;
      needsDraw = true;
    }
    if (!libraryVisible && clock.isPlaying && !scrubbing && runtime) {
      clock.tick(delta);
      if ((!stream || stream.done) && clock.timeMs >= durationMs()) {
        clock.seek(durationMs());
        clock.pause();
      }
      needsDraw = true;
    }
    syncAudio(delta);
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
