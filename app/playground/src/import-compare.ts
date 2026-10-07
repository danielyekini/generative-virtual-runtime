import { CanvasRenderer } from "@gvr/canvas-renderer";
import { compileMotionScript } from "@gvr/compiler";
import { formatImportReport, importSource, retainedScene, type ImportResult } from "@gvr/format-import-core";
import { lottieAdapter } from "@gvr/format-lottie";
import { emitMotionScript } from "@gvr/motionscript-emitter";
import { AnimationRuntime, RuntimeClock } from "@gvr/runtime";
import type { SceneIR } from "@gvr/schema";
import animatedOpacity from "../../../fixtures/import/lottie/animated_opacity.json?raw";
import animatedPosition from "../../../fixtures/import/lottie/animated_position.json?raw";
import animatedScale from "../../../fixtures/import/lottie/animated_scale.json?raw";
import centredRect from "../../../fixtures/import/lottie/centred_rect.json?raw";
import easingBezier from "../../../fixtures/import/lottie/easing_bezier.json?raw";
import holdKeyframe from "../../../fixtures/import/lottie/hold_keyframe.json?raw";
import inPoint from "../../../fixtures/import/lottie/in_point.json?raw";
import malformed from "../../../fixtures/import/lottie/malformed.json?raw";
import nestedShapeGroup from "../../../fixtures/import/lottie/nested_shape_group.json?raw";
import parentListedLater from "../../../fixtures/import/lottie/parent_listed_later.json?raw";
import parentedTransform from "../../../fixtures/import/lottie/parented_transform.json?raw";
import rotationAnchor from "../../../fixtures/import/lottie/rotation_anchor.json?raw";
import siblingFill from "../../../fixtures/import/lottie/sibling_fill.json?raw";
import solidLayer from "../../../fixtures/import/lottie/solid_layer.json?raw";
import staticShape from "../../../fixtures/import/lottie/static_shape.json?raw";
import unsupportedMask from "../../../fixtures/import/lottie/unsupported_mask.json?raw";
import unsupportedSkew from "../../../fixtures/import/lottie/unsupported_skew.json?raw";

interface CompareItem {
  id: string;
  label: string;
  file: string;
  source: string;
}

interface RoundTrip {
  sceneA?: SceneIR;
  sceneB?: SceneIR;
  script: string;
  compileOk: boolean;
  compileDiagnostics: string;
}

const items: CompareItem[] = [
  { id: "static_shape", label: "static shape", file: "fixtures/import/lottie/static_shape.json", source: staticShape },
  { id: "solid_layer", label: "solid layer", file: "fixtures/import/lottie/solid_layer.json", source: solidLayer },
  { id: "parented_transform", label: "parented", file: "fixtures/import/lottie/parented_transform.json", source: parentedTransform },
  { id: "nested_shape_group", label: "nested group", file: "fixtures/import/lottie/nested_shape_group.json", source: nestedShapeGroup },
  { id: "animated_position", label: "position", file: "fixtures/import/lottie/animated_position.json", source: animatedPosition },
  { id: "animated_scale", label: "scale", file: "fixtures/import/lottie/animated_scale.json", source: animatedScale },
  { id: "rotation_anchor", label: "rotation", file: "fixtures/import/lottie/rotation_anchor.json", source: rotationAnchor },
  { id: "animated_opacity", label: "opacity", file: "fixtures/import/lottie/animated_opacity.json", source: animatedOpacity },
  { id: "hold_keyframe", label: "hold", file: "fixtures/import/lottie/hold_keyframe.json", source: holdKeyframe },
  { id: "easing_bezier", label: "bezier", file: "fixtures/import/lottie/easing_bezier.json", source: easingBezier },
  { id: "in_point", label: "in-point", file: "fixtures/import/lottie/in_point.json", source: inPoint },
  { id: "sibling_fill", label: "sibling fill", file: "fixtures/import/lottie/sibling_fill.json", source: siblingFill },
  { id: "parent_listed_later", label: "parent later", file: "fixtures/import/lottie/parent_listed_later.json", source: parentListedLater },
  { id: "centred_rect", label: "centred rect", file: "fixtures/import/lottie/centred_rect.json", source: centredRect },
  { id: "unsupported_skew", label: "skew (unsup.)", file: "fixtures/import/lottie/unsupported_skew.json", source: unsupportedSkew },
  { id: "unsupported_mask", label: "mask (unsup.)", file: "fixtures/import/lottie/unsupported_mask.json", source: unsupportedMask },
  { id: "malformed", label: "malformed", file: "fixtures/import/lottie/malformed.json", source: malformed },
];

const irNote = document.querySelector<HTMLElement>("#ir-note");
const irStage = document.querySelector<HTMLElement>("#ir-stage");
const irView = document.querySelector<HTMLCanvasElement>("#ir-view");
const irEmpty = document.querySelector<HTMLElement>("#ir-empty");
const msNote = document.querySelector<HTMLElement>("#ms-note");
const msStage = document.querySelector<HTMLElement>("#ms-stage");
const msView = document.querySelector<HTMLCanvasElement>("#ms-view");
const msEmpty = document.querySelector<HTMLElement>("#ms-empty");
const resultBox = document.querySelector<HTMLElement>("#result");
const diag = document.querySelector<HTMLElement>("#diag");
const diagNote = document.querySelector<HTMLElement>("#diag-note");
const status = document.querySelector<HTMLElement>("#status");
const slider = document.querySelector<HTMLInputElement>("#time");
const clockLabel = document.querySelector<HTMLElement>("#clock-label");
const speedSelect = document.querySelector<HTMLSelectElement>("#speed");
const stepBack = document.querySelector<HTMLButtonElement>("#step-back");
const stepFwd = document.querySelector<HTMLButtonElement>("#step-fwd");
const frameBack = document.querySelector<HTMLButtonElement>("#frame-back");
const frameFwd = document.querySelector<HTMLButtonElement>("#frame-fwd");
const openButton = document.querySelector<HTMLButtonElement>("#open");
const fileInput = document.querySelector<HTMLInputElement>("#file");
if (
  !irNote ||
  !irStage ||
  !irView ||
  !irEmpty ||
  !msNote ||
  !msStage ||
  !msView ||
  !msEmpty ||
  !resultBox ||
  !diag ||
  !diagNote ||
  !status ||
  !slider ||
  !clockLabel ||
  !speedSelect ||
  !stepBack ||
  !stepFwd ||
  !frameBack ||
  !frameFwd ||
  !openButton ||
  !fileInput
) {
  throw new Error("import-compare markup missing");
}

const irRenderer = new CanvasRenderer(irView);
const msRenderer = new CanvasRenderer(msView);
const clock = new RuntimeClock();
let index = 0;
let openedName: string | undefined;
let result: ImportResult | undefined;
let roundTrip: RoundTrip | undefined;
let importFailed = false;
let attemptedFixtureId = "";
let displayedSceneId = "";
let runtimeA: AnimationRuntime | undefined;
let runtimeB: AnimationRuntime | undefined;
let durationMs = 1000;
let frameMs = 1000 / 30;
let keyTimesMs: number[] = [0];
let scrubbing = false;
let lastWall = performance.now();

function button(label: string, pressed: boolean, onClick: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.setAttribute("aria-pressed", String(pressed));
  element.addEventListener("click", onClick);
  return element;
}

function formatClock(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`;
}

function counts(imported: ImportResult): string {
  const fidelity = imported.fidelity;
  return `exact ${fidelity.exact.length} · approximated ${fidelity.approximated.length} · dropped ${fidelity.dropped.length} · unsupported ${fidelity.unsupported.length}`;
}

function readFrameMs(source: string): number {
  try {
    const data = JSON.parse(source) as { fr?: unknown };
    if (typeof data.fr === "number" && data.fr > 0) return 1000 / data.fr;
  } catch {
    /* fall through */
  }
  return 1000 / 30;
}

function collectKeyTimes(scene: SceneIR | undefined, fallbackDuration: number): number[] {
  const times = new Set<number>([0, fallbackDuration]);
  if (scene) {
    times.add(Math.min(fallbackDuration, scene.timeline.durationMs));
    for (const track of scene.timeline.tracks) {
      times.add(track.startMs);
      times.add(track.startMs + track.durationMs);
      if (track.kind === "keyframe") {
        for (const keyframe of track.keyframes) {
          times.add(track.startMs + keyframe.offset * track.durationMs);
        }
      }
    }
    for (const step of scene.timeline.steps) times.add(step.timeMs);
  }
  return [...times].filter((t) => t >= -1e-6 && t <= fallbackDuration + 1e-6).sort((a, b) => a - b);
}

function buildRoundTrip(imported: ImportResult): RoundTrip {
  if (!imported.scene) {
    return { script: "", compileOk: false, compileDiagnostics: "Import produced no Scene IR." };
  }
  const script = emitMotionScript(imported.scene);
  const again = compileMotionScript(script);
  return {
    sceneA: imported.scene,
    sceneB: again.ok ? again.scene : undefined,
    script,
    compileOk: again.ok,
    compileDiagnostics: again.diagnostics.map((item) => `${item.code}\t${item.message}`).join("\n"),
  };
}

function currentLabel(): { id: string; label: string; file: string } {
  if (openedName) return { id: openedName, label: openedName, file: openedName };
  const item = items[index]!;
  return { id: item.id, label: item.label, file: item.file };
}

function sentence(): string {
  const label = currentLabel().label;
  if (!result) return `Open ${label} to compare the imported Scene IR with the MotionScript compile.`;
  const summary = counts(result);
  if (importFailed) {
    return displayedSceneId
      ? `Import of ${attemptedFixtureId || label} failed. ${summary}. The panes are still showing ${displayedSceneId}.`
      : `Import failed. ${summary}. Neither pane plays until the Lottie file imports.`;
  }
  if (!roundTrip?.compileOk) {
    return `Import is ${result.fidelity.overall}. The left pane is the imported Scene IR. Emitted MotionScript did not compile. ${summary}.`;
  }
  if (result.fidelity.overall === "exact") {
    return `Exact import. ${summary}. Left is Lottie → Scene IR. Right is MotionScript → Scene IR.`;
  }
  if (result.fidelity.overall === "degraded") {
    return `Degraded import. ${summary}. The right pane can differ where the report lists approximations.`;
  }
  return `Partial import. ${summary}. The right pane can differ where the report lists unsupported features.`;
}

function blank(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPane(
  renderer: CanvasRenderer,
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
  runtime: AnimationRuntime | undefined,
  empty: HTMLElement,
  emptyText: string,
): void {
  renderer.resize(stage.clientWidth, stage.clientHeight, window.devicePixelRatio || 1);
  if (runtime) {
    renderer.render(runtime.evaluate(clock.timeMs));
    empty.hidden = true;
    return;
  }
  blank(canvas);
  empty.hidden = false;
  empty.textContent = emptyText;
}

function seekBoth(sceneTimeMs: number): void {
  clock.seek(Math.min(durationMs, Math.max(0, sceneTimeMs)));
  drawPane(irRenderer, irView, irStage, runtimeA, irEmpty, "Import produced no Scene IR.");
  drawPane(
    msRenderer,
    msView,
    msStage,
    runtimeB,
    msEmpty,
    roundTrip?.compileDiagnostics || "MotionScript did not compile.",
  );
}

function paintChrome(): void {
  const dataset = document.querySelector("#dataset");
  const transport = document.querySelector("#transport");
  if (!dataset || !transport) return;
  const shown = currentLabel();
  const counter = document.createElement("span");
  counter.textContent = openedName ? "file" : `${index + 1} / ${items.length}`;
  counter.style.cssText = "align-self:center;color:#a1a1aa;font-variant-numeric:tabular-nums;padding:0 4px";
  const title = document.createElement("span");
  title.textContent = shown.label;
  title.style.cssText = "align-self:center;padding:0 6px";
  dataset.replaceChildren(
    button("‹ Prev", false, () => loadItem(index - 1)),
    counter,
    button("Next ›", false, () => loadItem(index + 1)),
    title,
  );
  transport.replaceChildren(
    button("Play", clock.isPlaying, () => {
      if (clock.timeMs >= durationMs) clock.seek(0);
      lastWall = performance.now();
      clock.play();
      paintChrome();
    }),
    button("Pause", !clock.isPlaying, () => {
      clock.pause();
      paintChrome();
    }),
  );
}

function refreshLabels(): void {
  const shown = currentLabel();
  if (roundTrip?.sceneA) {
    irNote.textContent = `Scene IR A · ${roundTrip.sceneA.sceneId} · ${roundTrip.sceneA.timeline.durationMs.toFixed(0)} ms`;
  } else {
    irNote.textContent = "Imported Scene IR, played directly";
  }
  if (roundTrip?.sceneB) {
    msNote.textContent = `Scene IR B · ${roundTrip.sceneB.sceneId} · ${roundTrip.sceneB.timeline.durationMs.toFixed(0)} ms`;
  } else if (result?.scene) {
    msNote.textContent = "Imported Scene IR exists, but emitted MotionScript did not compile.";
  } else {
    msNote.textContent = "Emitted MotionScript, compiled and played";
  }

  resultBox.textContent = sentence();
  resultBox.className = result?.fidelity.overall ?? "";
  diagNote.textContent = `attempted ${attemptedFixtureId || shown.file} · displayed ${displayedSceneId || "none"} · Sync: ON · shared clock`;
  diag.textContent = [
    result ? formatImportReport(result) : "No import yet.",
    roundTrip && !roundTrip.compileOk ? `\nROUND_TRIP\n${roundTrip.compileDiagnostics}` : "",
    roundTrip?.script ? `\n--- MotionScript ---\n${roundTrip.script}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  slider.max = String(durationMs);
  slider.value = String(Math.min(durationMs, Math.max(0, clock.timeMs)));
  clockLabel.textContent = formatClock(clock.timeMs);
  status.textContent = [
    `attempted ${attemptedFixtureId || shown.id}`,
    `displayed ${displayedSceneId || "none"}`,
    importFailed ? "failed" : result?.fidelity.overall ?? "waiting",
    `t ${clock.timeMs.toFixed(1)}ms`,
    clock.isPlaying ? "playing" : "paused",
    `${clock.playbackRate}×`,
    runtimeA ? "scene-ir-a" : "no-scene-a",
    runtimeB ? "scene-ir-b" : "no-scene-b",
  ].join("  ·  ");

  window.__gvrCompare = {
    index,
    id: shown.id,
    file: shown.file,
    overall: result?.fidelity.overall ?? "",
    durationMs,
    timeMs: clock.timeMs,
    hasImported: Boolean(runtimeA),
    hasRoundTrip: Boolean(runtimeB),
    report: result ? formatImportReport(result) : "",
    seek: (sceneTimeMs: number) => {
      clock.pause();
      seekBoth(sceneTimeMs);
      paintChrome();
      refreshLabels();
    },
    next: () => loadItem(index + 1),
    prev: () => loadItem(index - 1),
    openText: (name: string, source: string) => loadSource(name, source, true),
  };
}

function loadSource(file: string, source: string, fromFile: boolean): void {
  openedName = fromFile ? file : undefined;
  clock.pause();
  const imported = importSource(lottieAdapter, source, { sourceName: file });
  result = imported;
  attemptedFixtureId = file;
  const retained = retainedScene(roundTrip?.sceneA, imported);
  importFailed = retained.importFailed;
  if (!retained.heldPrevious) {
    roundTrip = retained.shown ? buildRoundTrip(imported) : { script: "", compileOk: false, compileDiagnostics: "Import produced no Scene IR." };
    runtimeA = roundTrip.sceneA ? new AnimationRuntime(roundTrip.sceneA) : undefined;
    runtimeB = roundTrip.sceneB ? new AnimationRuntime(roundTrip.sceneB) : undefined;
  }
  displayedSceneId = roundTrip?.sceneA?.sceneId ?? "";
  durationMs = roundTrip?.sceneA?.timeline.durationMs ?? roundTrip?.sceneB?.timeline.durationMs ?? 1000;
  frameMs = readFrameMs(source);
  keyTimesMs = collectKeyTimes(roundTrip?.sceneA ?? roundTrip?.sceneB, durationMs);
  if (!retained.heldPrevious) {
    clock.seek(0);
    seekBoth(0);
  } else {
    seekBoth(clock.timeMs);
  }
  paintChrome();
  refreshLabels();
}

function loadItem(nextIndex: number): void {
  index = (nextIndex + items.length) % items.length;
  const item = items[index]!;
  loadSource(item.file, item.source, false);
}

function stepKey(direction: -1 | 1): void {
  const t = clock.timeMs;
  const target =
    direction > 0
      ? (keyTimesMs.find((k) => k > t + 1e-3) ?? durationMs)
      : ([...keyTimesMs].reverse().find((k) => k < t - 1e-3) ?? 0);
  clock.pause();
  seekBoth(target);
  paintChrome();
  refreshLabels();
}

function stepFrame(direction: -1 | 1): void {
  clock.pause();
  seekBoth(clock.timeMs + direction * frameMs);
  paintChrome();
  refreshLabels();
}

function tick(now: number): void {
  const delta = Math.min(100, now - lastWall);
  lastWall = now;
  if (clock.isPlaying && !scrubbing) {
    clock.tick(delta);
    if (clock.timeMs >= durationMs) {
      clock.seek(durationMs);
      clock.pause();
      paintChrome();
    }
    seekBoth(clock.timeMs);
    refreshLabels();
  }
  requestAnimationFrame(tick);
}

slider.addEventListener("input", () => {
  seekBoth(Number(slider.value));
  refreshLabels();
});
slider.addEventListener("pointerdown", () => {
  scrubbing = true;
});
window.addEventListener("pointerup", () => {
  scrubbing = false;
  lastWall = performance.now();
});
speedSelect.addEventListener("change", () => {
  clock.setRate(Number(speedSelect.value) || 1);
  refreshLabels();
});
stepBack.addEventListener("click", () => stepKey(-1));
stepFwd.addEventListener("click", () => stepKey(1));
frameBack.addEventListener("click", () => stepFrame(-1));
frameFwd.addEventListener("click", () => stepFrame(1));
openButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (!file) return;
  void file.text().then((text) => loadSource(file.name, text, true));
});
window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }
  if (event.key === "ArrowLeft" && (event.metaKey || event.ctrlKey || event.altKey)) {
    event.preventDefault();
    loadItem(index - 1);
  } else if (event.key === "ArrowRight" && (event.metaKey || event.ctrlKey || event.altKey)) {
    event.preventDefault();
    loadItem(index + 1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    stepKey(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    stepKey(1);
  } else if (event.key === " ") {
    event.preventDefault();
    if (clock.isPlaying) clock.pause();
    else {
      if (clock.timeMs >= durationMs) clock.seek(0);
      lastWall = performance.now();
      clock.play();
    }
    paintChrome();
    refreshLabels();
  }
});

declare global {
  interface Window {
    __gvrCompare?: {
      index: number;
      id: string;
      file: string;
      overall: string;
      durationMs: number;
      timeMs: number;
      hasImported: boolean;
      hasRoundTrip: boolean;
      report: string;
      seek: (sceneTimeMs: number) => void;
      next: () => void;
      prev: () => void;
      openText: (name: string, source: string) => void;
    };
  }
}

new ResizeObserver(() => {
  seekBoth(clock.timeMs);
}).observe(irStage);
new ResizeObserver(() => {
  seekBoth(clock.timeMs);
}).observe(msStage);

loadItem(0);
requestAnimationFrame(tick);
