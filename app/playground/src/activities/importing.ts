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
import type { GvrBridge, GvrCompare } from "../bridge";
import { button } from "../bridge";
import { describeFrame, describeScene } from "../describe";
import { fixtureExamples, lottieExamples, svgExamples, type SourceExample } from "../examples";
import type { Shell } from "../shell";
import { clampTime, collectKeyTimes, isStaticScene, readFrameMs, stepKey } from "../timeline";

interface RoundTrip {
  sceneA?: SceneIR;
  sceneB?: SceneIR;
  script: string;
  compileOk: boolean;
  compileDiagnostics: string;
}

const catalogs: Record<string, SourceExample[]> = {
  fixture: fixtureExamples,
  lottie: lottieExamples,
  svg: svgExamples,
};

const formatLabels: Record<string, string> = {
  fixture: "Fixture",
  lottie: "Lottie",
  svg: "SVG",
};

const registry = new ImportRegistry();
registry.register(fixtureAdapter);
registry.register(lottieAdapter);
registry.register(svgAdapter);

export function createImport(shell: Shell) {
  const clock = new RuntimeClock();
  let formatId = "fixture";
  let source = fixtureExamples[0]?.source ?? "";
  let sourceName = fixtureExamples[0]?.file ?? "source";
  let custom = false;
  const index: Record<string, number> = { fixture: 0, lottie: 0, svg: 0 };
  let split = false;
  let result: ImportResult | undefined;
  let roundTrip: RoundTrip | undefined;
  let shown: SceneIR | undefined;
  let attempted = source;
  let attemptedFixtureId = sourceName;
  let displayedSceneId = "";
  let importFailed = false;
  let importedFormat = formatId;
  let runtimeA: AnimationRuntime | undefined;
  let runtimeB: AnimationRuntime | undefined;
  let frameMs = 1000 / 30;

  function catalog(): SourceExample[] {
    return catalogs[formatId] ?? fixtureExamples;
  }

  function currentIndex(): number {
    return index[formatId] ?? 0;
  }

  function editorDirty(): boolean {
    return shell.sourceValue() !== attempted || formatId !== importedFormat;
  }

  function counts(imported: ImportResult): string {
    const fidelity = imported.fidelity;
    return `exact ${fidelity.exact.length} · approximated ${fidelity.approximated.length} · dropped ${fidelity.dropped.length} · unsupported ${fidelity.unsupported.length}`;
  }

  function summary(): string {
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
    const detail = counts(result);
    if (result.fidelity.overall === "exact") return `Every reported feature came through unchanged. ${detail}.`;
    if (result.fidelity.overall === "degraded") return `The scene is playable. ${detail}. The report lists what was approximated.`;
    if (result.fidelity.overall === "partial") return `The scene is playable. ${detail}. The report lists what was dropped.`;
    return "This import produced no Scene IR. The canvas is clear.";
  }

  function buildRoundTrip(imported: ImportResult): RoundTrip {
    if (!imported.scene) return { script: "", compileOk: false, compileDiagnostics: "Import produced no Scene IR." };
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
      roundTrip = shown ? buildRoundTrip(imported) : { script: "", compileOk: false, compileDiagnostics: "Import produced no Scene IR." };
      runtimeA = shown ? new AnimationRuntime(shown) : undefined;
      runtimeB = roundTrip?.sceneB ? new AnimationRuntime(roundTrip.sceneB) : undefined;
    }
    displayedSceneId = shown?.sceneId ?? "";
    frameMs = formatId === "lottie" ? readFrameMs(text) : 1000 / 30;
    clock.pause();
    if (!retained.heldPrevious) clock.seek(0);
    if (autoplay && shown && !importFailed && !isStaticScene(shown)) clock.play();
  }

  function loadExample(nextIndex: number, autoplay: boolean): void {
    const items = catalog();
    if (items.length === 0) return;
    const wrapped = (nextIndex + items.length) % items.length;
    index[formatId] = wrapped;
    const item = items[wrapped];
    if (!item) return;
    custom = false;
    source = item.source;
    shell.setSourceValue(source);
    applyImport(item.source, item.file, autoplay);
    paintControls();
    draw();
  }

  function onPlay(): void {
    const text = shell.sourceValue();
    source = text;
    if (text === attempted && formatId === importedFormat && result?.ok && shown) {
      if (clock.timeMs >= shown.timeline.durationMs) clock.seek(0);
      clock.play();
      draw();
      return;
    }
    const fromCatalog = catalog().some((item) => item.source === text);
    custom = !fromCatalog;
    if (!fromCatalog) sourceName = "pasted";
    applyImport(text, sourceName, true);
    paintControls();
    draw();
  }

  function paintControls(): void {
    const format = document.createElement("select");
    format.setAttribute("aria-label", "Format");
    for (const adapter of registry.formats()) {
      const option = document.createElement("option");
      option.value = adapter.formatId;
      option.textContent = formatLabels[adapter.formatId] ?? adapter.formatId;
      format.append(option);
    }
    format.value = formatId;
    format.addEventListener("change", () => {
      formatId = format.value;
      paintControls();
      draw();
    });
    const formatLabel = document.createElement("label");
    formatLabel.className = "modes";
    formatLabel.append("Format ", format);
    const items = catalog();
    const at = currentIndex();
    const item = items[at];
    const navigation = formatId === "fixture"
      ? items.map((example, exampleIndex) =>
        button(example.label, !custom && example.source === shell.sourceValue(), () => loadExample(exampleIndex, false)),
      )
      : [
        button("‹", false, () => loadExample(at - 1, false)),
        labelSpan(custom ? sourceName : item ? `${at + 1} / ${items.length}  ${item.label}` : ""),
        button("›", false, () => loadExample(at + 1, false)),
      ];
    shell.controls.replaceChildren(
      formatLabel,
      button("Open", false, () => shell.openFile(".json,.svg,application/json,image/svg+xml")),
      ...navigation,
      button("Split", split, () => {
        split = !split;
        paintControls();
        draw();
      }),
      button("Play", false, () => onPlay()),
      button("Clear", false, () => {
        clock.pause();
        shown = undefined;
        runtimeA = undefined;
        runtimeB = undefined;
        attempted = shell.sourceValue();
        roundTrip = undefined;
        draw();
      }),
    );
  }

  function bindClock(): void {
    shell.bindTransport({
      onPlay: () => {
        if (!shown) {
          onPlay();
          return;
        }
        if (isStaticScene(shown)) return;
        if (clock.timeMs >= shown.timeline.durationMs) clock.seek(0);
        clock.play();
        draw();
      },
      onPause: () => {
        clock.pause();
        draw();
      },
      onSeek: (timeMs) => {
        if (!shown || isStaticScene(shown)) return;
        clock.seek(clampTime(timeMs, shown.timeline.durationMs));
        draw();
      },
      onRate: (rate) => {
        clock.setRate(rate);
        draw();
      },
      onStep: (step, direction) => {
        if (!shown || isStaticScene(shown)) return;
        const span = shown.timeline.durationMs;
        const next = step === "key"
          ? stepKey(collectKeyTimes(shown, span), clock.timeMs, direction, span)
          : clampTime(clock.timeMs + direction * frameMs, span);
        clock.pause();
        clock.seek(next);
        draw();
      },
    });
  }

  function draw(): void {
    const dirty = editorDirty();
    const still = isStaticScene(shown);
    const span = shown?.timeline.durationMs ?? 0;
    if (clock.isPlaying && shown && clock.timeMs >= span) {
      clock.seek(span);
      clock.pause();
    }
    const time = still ? 0 : clampTime(clock.timeMs, span);
    if (still) clock.seek(0);
    const dpr = window.devicePixelRatio || 1;
    const frameA = runtimeA ? runtimeA.evaluate(time) : null;
    const frameB = runtimeB ? runtimeB.evaluate(time) : null;
    shell.setMode(split ? "split" : "single");
    if (split) {
      shell.paint("a", frameA, shell.paneA.clientWidth, shell.paneA.clientHeight, dpr);
      shell.paint("b", frameB, shell.paneB.clientWidth, shell.paneB.clientHeight, dpr);
      shell.setPaneEmpty("a", frameA ? null : "Import produced no Scene IR.");
      shell.setPaneEmpty("b", frameB ? null : roundTrip?.compileDiagnostics || "Round-trip unavailable.");
      shell.setPanes(
        "Imported Scene IR",
        shown ? `${shown.sceneId} · ${shown.timeline.durationMs.toFixed(0)} ms` : "Imported Scene IR, played directly",
        "MotionScript round-trip",
        roundTrip?.sceneB
          ? `${roundTrip.sceneB.sceneId} · ${roundTrip.sceneB.timeline.durationMs.toFixed(0)} ms`
          : "Emitted MotionScript, compiled and played",
      );
    } else {
      shell.paint("single", frameA, shell.singleBox.clientWidth, shell.singleBox.clientHeight, dpr);
    }
    shell.setTransport({
      hidden: false,
      enabled: Boolean(shown) && !still,
      timeMs: time,
      durationMs: still ? 0 : span,
      playing: clock.isPlaying,
      rate: clock.playbackRate,
      sync: split,
    });
    shell.setSourceMode("editor");
    shell.setSourceEditable(true);
    shell.setSourceNote(dirty
      ? "This text is waiting for Play. The canvas is unchanged until Play succeeds."
      : "Paste source or open a file. Play imports this text into Scene IR. Split plays the MotionScript round-trip beside it.");
    const showReport = Boolean(result) && (!dirty || importFailed);
    const tone = !result || (dirty && !importFailed) ? "" : result.fidelity.overall;
    const reportBody = [
      showReport && result ? formatImportReport(result) : "",
      !importFailed && roundTrip && !roundTrip.compileOk ? `ROUND_TRIP\n${roundTrip.compileDiagnostics}` : "",
    ].filter(Boolean).join("\n\n");
    shell.setReport(sourceName, summary(), tone, reportBody);
    shell.setFlow([
      { label: "Source", hint: formatLabels[formatId] ?? formatId, state: shell.sourceValue().length > 0 ? "done" : "idle" },
      { label: "Import", hint: "Scene IR A", state: importFailed ? "failed" : !result || dirty ? "idle" : shown ? "done" : "failed" },
      { label: "Report", hint: showReport && result ? result.fidelity.overall : "diagnostics", state: showReport ? "done" : "idle" },
      { label: "Play", hint: split ? "both panes" : "canvas", state: shown ? (clock.isPlaying ? "live" : "done") : "idle" },
    ]);
    shell.setScene(
      shown
        ? importFailed
          ? `Scene IR A is still ${shown.sceneId}. The report is the failed import of ${attemptedFixtureId}.`
          : "Scene IR A is the import. Scene IR B is the round-trip."
        : "Play a valid source to inspect Scene IR.",
      [describeScene(shown, "Scene IR A"), describeScene(roundTrip?.sceneB, "Scene IR B")].filter(Boolean).join("\n\n"),
    );
    shell.setScript(
      roundTrip?.script ? (roundTrip.compileOk ? "Emitted from the imported scene. Compiling it produces Scene IR B." : "Emitted from the imported scene. Compiling it failed.") : "Play a valid source to emit MotionScript.",
      roundTrip?.script ?? "",
    );
    shell.setFrames(frameA ? "Resolved draw items for the imported scene at the shared time." : "Import a scene to inspect frames.", frameA ? describeFrame(frameA) : "");
    shell.setSession("Import and Split share this source. The left picture is Scene IR A. The right picture is Scene IR B.", [
      `format ${formatId}`,
      `attempted ${attemptedFixtureId}`,
      `displayed ${displayedSceneId || "none"}`,
      importFailed ? "import failed" : dirty ? "editor changed" : result?.fidelity.overall ?? "waiting",
      split ? "split" : "single",
      still ? "static, player disabled" : "",
    ].filter(Boolean).join("\n"));
    shell.setStatus([
      importFailed ? "failed" : dirty ? "waiting" : shown && result ? result.fidelity.overall : result ? "cleared" : "waiting",
      `attempted ${attemptedFixtureId || "none"}`,
      `displayed ${displayedSceneId || "none"}`,
      shown ? `t ${time.toFixed(1)}ms` : "",
      dirty ? "editor changed" : "",
      shown ? (clock.isPlaying ? "playing" : "paused") : "",
      split ? "split" : "single",
      formatId,
    ].filter(Boolean).join("  ·  "));
  }

  function compareHook(): GvrCompare {
    const items = catalog();
    const at = currentIndex();
    const item = items[at];
    return {
      index: at,
      id: custom ? sourceName : item?.id ?? sourceName,
      file: sourceName,
      overall: result?.fidelity.overall ?? "",
      durationMs: shown?.timeline.durationMs ?? 0,
      timeMs: clock.timeMs,
      hasImported: Boolean(runtimeA),
      hasRoundTrip: Boolean(runtimeB),
      report: result ? formatImportReport(result) : "",
      seek: (sceneTimeMs: number) => {
        clock.pause();
        clock.seek(sceneTimeMs);
        draw();
      },
      next: () => loadExample(currentIndex() + 1, false),
      prev: () => loadExample(currentIndex() - 1, false),
      openText: (name: string, text: string) => {
        custom = true;
        source = text;
        sourceName = name;
        shell.setSourceValue(text);
        applyImport(text, name, false);
        draw();
      },
    };
  }

  return {
    activate(extra?: string) {
      if (extra === "split") {
        split = true;
        if (!result) formatId = "lottie";
      }
      shell.setMode(split ? "split" : "single");
      shell.setSourceMode("editor");
      shell.setSourceEditable(true);
      shell.setSourceValue(source);
      shell.onSourceInput(() => {
        source = shell.sourceValue();
        draw();
      });
      shell.onFile((file) => {
        void file.text().then((text) => {
          if (file.name.endsWith(".svg")) formatId = "svg";
          else if (file.name.endsWith(".json") && formatId === "svg") formatId = "lottie";
          custom = true;
          source = text;
          sourceName = file.name;
          shell.setSourceValue(text);
          applyImport(text, file.name, false);
          paintControls();
          draw();
        });
      });
      paintControls();
      bindClock();
      if (!result) loadExample(currentIndex(), false);
    },
    deactivate() {
      source = shell.sourceValue();
      clock.pause();
    },
    tick(_now: number, delta: number) {
      if (!clock.isPlaying || shell.scrubbing || !shown || isStaticScene(shown)) return;
      clock.tick(delta);
    },
    draw,
    key(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey || event.altKey)) return false;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        loadExample(currentIndex() - 1, false);
        return true;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        loadExample(currentIndex() + 1, false);
        return true;
      }
      return false;
    },
    hook(): Partial<GvrBridge> {
      const compare = compareHook();
      return {
        frame: runtimeA?.evaluate(isStaticScene(shown) ? 0 : clock.timeMs),
        report: compare.report,
        overall: compare.overall,
        sceneId: displayedSceneId,
        attemptedFixtureId,
        displayedSceneId,
        editor: shell.sourceValue(),
        script: roundTrip?.script ?? "",
        scriptCompiles: roundTrip?.compileOk ?? false,
        dirty: editorDirty(),
        formatId,
        detail: result ? formatImportReport(result) : "",
        compare,
        seek: compare.seek,
      };
    },
  };
}

function labelSpan(text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.textContent = text;
  span.className = "carousel-label";
  return span;
}
