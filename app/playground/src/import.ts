import { CanvasRenderer } from "@gvr/canvas-renderer";
import { compileMotionScript } from "@gvr/compiler";
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
import { AnimationRuntime, RuntimeClock } from "@gvr/runtime";
import type { SceneIR } from "@gvr/schema";
import type { GvrBridge } from "./bridge";
import degradedSource from "../../../fixtures/import/fixture/degraded.json?raw";
import exactSource from "../../../fixtures/import/fixture/exact.json?raw";
import failedSource from "../../../fixtures/import/fixture/failed.json?raw";
import partialSource from "../../../fixtures/import/fixture/partial.json?raw";
import unsupportedSource from "../../../fixtures/import/fixture/unsupported.json?raw";

interface Example {
  id: string;
  label: string;
  file: string;
  source: string;
}

type DetailView = "report" | "ir" | "script";

const examples: Example[] = [
  { id: "exact", label: "Exact", file: "fixtures/import/fixture/exact.json", source: exactSource },
  { id: "degraded", label: "Degraded", file: "fixtures/import/fixture/degraded.json", source: degradedSource },
  { id: "partial", label: "Partial", file: "fixtures/import/fixture/partial.json", source: partialSource },
  { id: "failed", label: "Failed", file: "fixtures/import/fixture/failed.json", source: failedSource },
  { id: "unsupported", label: "Unsupported", file: "fixtures/import/fixture/unsupported.json", source: unsupportedSource },
];

const registry = new ImportRegistry();
registry.register(fixtureAdapter);
registry.register(lottieAdapter);
registry.register(svgAdapter);

const canvas = document.querySelector<HTMLCanvasElement>("#view");
const stage = document.querySelector<HTMLElement>("#stage");
const status = document.querySelector<HTMLElement>("#status");
const slider = document.querySelector<HTMLInputElement>("#time");
const sourceBox = document.querySelector<HTMLTextAreaElement>("#source");
const sourceNote = document.querySelector<HTMLElement>("#source-note");
const detail = document.querySelector<HTMLElement>("#detail");
const detailTitle = document.querySelector<HTMLElement>("#detail-title");
const detailNote = document.querySelector<HTMLElement>("#detail-note");
const resultBox = document.querySelector<HTMLElement>("#result");
const formatSelect = document.querySelector<HTMLSelectElement>("#format");
const openButton = document.querySelector<HTMLButtonElement>("#open");
const fileInput = document.querySelector<HTMLInputElement>("#file");
if (
  !canvas ||
  !stage ||
  !status ||
  !slider ||
  !sourceBox ||
  !sourceNote ||
  !detail ||
  !detailTitle ||
  !detailNote ||
  !resultBox ||
  !formatSelect ||
  !openButton ||
  !fileInput
) {
  throw new Error("import markup missing");
}

const renderer = new CanvasRenderer(canvas);
const clock = new RuntimeClock();
let shown: SceneIR | undefined;
let runtime: AnimationRuntime | undefined;
let result: ImportResult | undefined;
let attemptedText: string | undefined;
let attemptedFixtureId = "";
let displayedSceneId = "";
let importFailed = false;
let loadedName = examples[0]!.file;
let detailView: DetailView = "report";
let scrubbing = false;
let lastWall = performance.now();
let scriptCache: { scene: SceneIR; text: string; compileOk: boolean; diagnostics: string } | undefined;

formatSelect.replaceChildren(
  ...registry.formats().map((adapter) => {
    const option = document.createElement("option");
    option.value = adapter.formatId;
    option.textContent = adapter.formatId;
    return option;
  }),
);

sourceBox.value = examples[0]!.source;

function button(label: string, pressed: boolean, onClick: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.setAttribute("aria-pressed", String(pressed));
  element.addEventListener("click", onClick);
  return element;
}

function mark(id: string, state: "idle" | "done" | "live" | "failed"): void {
  const element = document.querySelector(id);
  element?.classList.toggle("is-done", state === "done" || state === "live");
  element?.classList.toggle("is-live", state === "live");
  element?.classList.toggle("is-failed", state === "failed");
}

function editorDirty(): boolean {
  return attemptedText !== undefined && sourceBox.value !== attemptedText;
}

function counts(imported: ImportResult): string {
  const fidelity = imported.fidelity;
  return `exact ${fidelity.exact.length} · approximated ${fidelity.approximated.length} · dropped ${fidelity.dropped.length} · unsupported ${fidelity.unsupported.length}`;
}

function sentence(): string {
  const dirty = editorDirty();
  if (importFailed) {
    const failed = shown
      ? `This import failed. The canvas is still showing ${shown.sceneId}.`
      : result && result.fidelity.exact.length === 0 && result.fidelity.approximated.length === 0
        ? `This import is not playable. ${counts(result)}. The canvas is clear.`
        : "This import produced no Scene IR. The canvas is clear.";
    return dirty ? `The editor has changed. ${failed}` : failed;
  }
  if (dirty) {
    return shown
      ? "The editor has changed. Press Play to import it. The canvas is still showing the current scene."
      : "The editor has changed. Press Play to import it.";
  }
  if (!result) return "Press Play to import this source into Scene IR.";
  if (!shown) return "This import produced no Scene IR. The canvas is clear.";
  const summary = counts(result);
  if (result.fidelity.overall === "exact") return `Every reported feature came through unchanged. ${summary}. The canvas draws this Scene IR.`;
  if (result.fidelity.overall === "degraded") return `The scene is playable. ${summary}. The report lists what was approximated.`;
  if (result.fidelity.overall === "partial") return `The scene is playable. ${summary}. The report lists what was dropped.`;
  return "This import produced no Scene IR. The canvas is clear.";
}

function scriptFor(scene: SceneIR): { text: string; compileOk: boolean; diagnostics: string } {
  if (scriptCache?.scene === scene) return scriptCache;
  const text = emitMotionScript(scene);
  const again = compileMotionScript(text);
  scriptCache = {
    scene,
    text,
    compileOk: again.ok,
    diagnostics: again.diagnostics.map((item) => `${item.code}\t${item.message}`).join("\n"),
  };
  return scriptCache;
}

function renderDetail(): void {
  if (detailView === "ir") {
    detailTitle.textContent = "Scene IR A";
    detailNote.textContent = shown
      ? "The canvas draws this imported scene."
      : "Play a valid source to inspect Scene IR.";
    detail.textContent = shown ? JSON.stringify(shown, null, 2) : "";
    return;
  }
  if (detailView === "script") {
    detailTitle.textContent = "MotionScript";
    if (!shown) {
      detailNote.textContent = "Play a valid source, then open MotionScript for that scene.";
      detail.textContent = "";
      return;
    }
    const script = scriptFor(shown);
    detailNote.textContent = script.compileOk
      ? "Written from the scene on the canvas. Compiling this text produces Scene IR B. The canvas still draws the imported scene."
      : "Written from the scene on the canvas. Compiling this text failed.";
    detail.textContent = script.compileOk ? script.text : `${script.text}\n${script.diagnostics}`;
    return;
  }
  detailTitle.textContent = "Import report";
  detailNote.textContent = result
    ? importFailed
      ? `Failed import of ${attemptedFixtureId || loadedName}. Displayed scene: ${displayedSceneId || "none"}.`
      : "From the last Play. The CLI prints this same text."
    : "Press Play to produce a report.";
  detail.textContent = result && (!editorDirty() || importFailed) ? formatImportReport(result) : "";
}

function paintChoices(): void {
  const examplesHost = document.querySelector("#examples");
  const transport = document.querySelector("#transport");
  const views = document.querySelector("#views");
  if (!examplesHost || !transport || !views) return;
  examplesHost.replaceChildren(
    ...examples.map((item) =>
      button(item.label, sourceBox.value === item.source, () => {
        sourceBox.value = item.source;
        loadedName = item.file;
        formatSelect.value = "fixture";
        refresh();
      }),
    ),
  );
  transport.replaceChildren(
    button("Play", clock.isPlaying, () => onPlay()),
    button("Pause", !clock.isPlaying && shown !== undefined, () => {
      clock.pause();
      refresh();
    }),
    button("Clear canvas", false, () => {
      clock.pause();
      shown = undefined;
      runtime = undefined;
      displayedSceneId = "";
      importFailed = false;
      attemptedText = undefined;
      attemptedFixtureId = "";
      refresh();
    }),
  );
  views.replaceChildren(
    button("Report", detailView === "report", () => {
      detailView = "report";
      refresh();
    }),
    button("Scene IR", detailView === "ir", () => {
      detailView = "ir";
      refresh();
    }),
    button("MotionScript", detailView === "script", () => {
      detailView = "script";
      refresh();
    }),
  );
}

function refresh(): void {
  const dirty = editorDirty();
  sourceNote.textContent = dirty
    ? "This text is waiting for Play. The canvas is unchanged until Play succeeds."
    : "Paste a fixture, or open a file. Play imports this text into Scene IR.";
  resultBox.textContent = sentence();
  resultBox.className = !result || (dirty && !importFailed) ? "" : result.fidelity.overall;
  mark("#step-source", sourceBox.value.length > 0 ? "done" : "idle");
  mark("#step-import", importFailed ? "failed" : !result || dirty ? "idle" : shown ? "done" : "failed");
  mark("#step-report", result && (!dirty || importFailed) ? "done" : "idle");
  mark("#step-play", shown ? (clock.isPlaying ? "live" : "done") : "idle");
  renderDetail();
  paintChoices();
  draw();
}

function onPlay(): void {
  const text = sourceBox.value;
  if (text === attemptedText && result?.ok && shown) {
    if (clock.timeMs >= shown.timeline.durationMs) clock.seek(0);
    lastWall = performance.now();
    clock.play();
    refresh();
    return;
  }
  const adapter = registry.get(formatSelect.value) ?? fixtureAdapter;
  const imported = importSource(adapter, text, { sourceName: loadedName });
  result = imported;
  attemptedText = text;
  attemptedFixtureId = loadedName;
  const retained = retainedScene(shown, imported);
  importFailed = retained.importFailed;
  if (!retained.heldPrevious) {
    shown = retained.shown;
    if (shown) runtime = new AnimationRuntime(shown);
    else runtime = undefined;
  }
  displayedSceneId = shown?.sceneId ?? "";
  clock.pause();
  if (!retained.heldPrevious) {
    clock.seek(0);
    slider.value = "0";
  }
  if (shown && !importFailed) {
    slider.max = String(shown.timeline.durationMs);
    if (!retained.heldPrevious) {
      lastWall = performance.now();
      clock.play();
    }
  }
  detailView = "report";
  refresh();
}

function draw(): void {
  const cssWidth = stage.clientWidth;
  const cssHeight = stage.clientHeight;
  renderer.resize(cssWidth, cssHeight, window.devicePixelRatio || 1);
  if (shown && runtime) renderer.render(runtime.evaluate(clock.timeMs));
  else blankCanvas();
  mark("#step-play", shown ? (clock.isPlaying ? "live" : "done") : "idle");
  slider.value = shown ? String(Math.min(shown.timeline.durationMs, Math.max(0, clock.timeMs))) : "0";
  const parts = [
    importFailed ? "failed" : editorDirty() ? "waiting" : shown && result ? result.fidelity.overall : result ? "cleared" : "waiting",
    `attempted ${attemptedFixtureId || "none"}`,
    `displayed ${displayedSceneId || "none"}`,
    shown ? `t ${clock.timeMs.toFixed(1)}ms` : "",
    editorDirty() ? "editor changed" : "",
    shown ? (clock.isPlaying ? "playing" : "paused") : "",
  ];
  status.textContent = parts.filter(Boolean).join("  ·  ");
  (window as Window & { __gvr?: GvrBridge }).__gvr = {
    activity: "import",
    canvas,
    report: result ? formatImportReport(result) : "",
    overall: result?.fidelity.overall ?? "",
    sceneId: displayedSceneId,
    attemptedFixtureId,
    displayedSceneId,
    editor: sourceBox.value,
    script: shown ? scriptFor(shown).text : "",
    scriptCompiles: shown ? scriptFor(shown).compileOk : false,
    view: detailView,
    dirty: editorDirty(),
    formatId: formatSelect.value,
    detail: detail.textContent ?? "",
    seek: (sceneTimeMs: number) => {
      clock.seek(sceneTimeMs);
      draw();
    },
  };
}

function blankCanvas(): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function tick(now: number): void {
  const delta = Math.min(100, now - lastWall);
  lastWall = now;
  if (clock.isPlaying && !scrubbing && shown) {
    clock.tick(delta);
    if (clock.timeMs >= shown.timeline.durationMs) {
      clock.seek(shown.timeline.durationMs);
      clock.pause();
      paintChoices();
    }
    draw();
  }
  requestAnimationFrame(tick);
}

openButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (!file) return;
  void file.text().then((text) => {
    sourceBox.value = text;
    loadedName = file.name;
    refresh();
  });
});
formatSelect.addEventListener("change", () => refresh());
sourceBox.addEventListener("input", () => refresh());
slider.addEventListener("input", () => {
  clock.seek(Number(slider.value));
  draw();
});
slider.addEventListener("pointerdown", () => {
  scrubbing = true;
});
window.addEventListener("pointerup", () => {
  scrubbing = false;
  lastWall = performance.now();
});

new ResizeObserver(() => draw()).observe(stage);
refresh();
requestAnimationFrame(tick);
