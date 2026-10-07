import { compileMotionScript } from "@gvr/compiler";
import { emitMotionScript } from "@gvr/motionscript-emitter";
import { AnimationRuntime, RuntimeClock } from "@gvr/runtime";
import { validateSceneIR, type SceneIR } from "@gvr/schema";
import type { GvrBridge } from "../bridge";
import { button } from "../bridge";
import { describeFrame, describeScene, sameItems } from "../describe";
import { motionExamples } from "../examples";
import type { Shell } from "../shell";
import { clampTime, collectKeyTimes, stepKey } from "../timeline";

type View = "compiled" | "roundtrip" | "both";

export function createAuthor(shell: Shell) {
  const clock = new RuntimeClock();
  let example = motionExamples[0] ?? fail("no examples");
  let source = example.source;
  let compiledText = "";
  let view: View = "compiled";
  let sceneA: SceneIR | undefined;
  let sceneB: SceneIR | undefined;
  let script = "";
  let compileMessages: string[] = [];
  let compileOk = false;
  let roundTripNote = "Press Compile to build Scene IR.";
  let failedStep: string | null = null;
  let runtimeA: AnimationRuntime | undefined;
  let runtimeB: AnimationRuntime | undefined;

  function fail(message: string): never {
    throw new Error(message);
  }

  function shownRuntime(): AnimationRuntime | undefined {
    if (view === "roundtrip") return runtimeB;
    return runtimeA;
  }

  function duration(): number {
    return sceneA?.timeline.durationMs ?? sceneB?.timeline.durationMs ?? 0;
  }

  function dirty(): boolean {
    return shell.sourceValue() !== compiledText;
  }

  function paintControls(): void {
    shell.controls.replaceChildren(
      ...motionExamples.map((item) =>
        button(item.label, item.id === example.id, () => {
          example = item;
          source = item.source;
          shell.setSourceValue(source);
          paintControls();
          compile();
        }),
      ),
      button("Compile", false, () => compile()),
      button("Compiled", view === "compiled", () => setView("compiled")),
      button("Round-trip", view === "roundtrip", () => setView("roundtrip")),
      button("Both", view === "both", () => setView("both")),
    );
  }

  function setView(next: View): void {
    view = next;
    paintControls();
    draw();
  }

  function compare(left: SceneIR, right: SceneIR): string {
    const before = new AnimationRuntime(left);
    const after = new AnimationRuntime(right);
    const times = [0, left.timeline.durationMs / 2, left.timeline.durationMs];
    for (const time of times) {
      const mismatch = sameItems(before.evaluate(time).drawItems, after.evaluate(time).drawItems);
      if (mismatch) return `${mismatch} at ${time}ms`;
    }
    return "";
  }

  function compile(): void {
    source = shell.sourceValue();
    compiledText = source;
    const result = compileMotionScript(source);
    compileMessages = result.diagnostics.map((item) => item.message);
    compileOk = result.ok;
    sceneA = result.scene && validateSceneIR(result.scene).ok ? result.scene : undefined;
    runtimeA = sceneA ? new AnimationRuntime(sceneA) : undefined;
    script = "";
    sceneB = undefined;
    runtimeB = undefined;
    failedStep = sceneA ? null : "ira";
    if (!sceneA) {
      roundTripNote = "The source did not produce a Scene IR, so nothing was emitted.";
    } else {
      script = emitMotionScript(sceneA);
      const again = compileMotionScript(script);
      if (!again.ok || !again.scene) {
        failedStep = "irb";
        roundTripNote = "The emitted MotionScript did not compile back into Scene IR.";
        compileMessages = [...compileMessages, ...again.diagnostics.map((item) => item.message)];
      } else {
        sceneB = again.scene;
        runtimeB = new AnimationRuntime(sceneB);
        const mismatch = compare(sceneA, sceneB);
        if (mismatch) {
          failedStep = "play";
          roundTripNote = `Scene IR B drifted from Scene IR A: ${mismatch}.`;
        } else {
          failedStep = null;
          roundTripNote = "Scene IR A and Scene IR B draw the same frames.";
        }
      }
    }
    clock.pause();
    clock.seek(0);
    draw();
  }

  function bindClock(): void {
    shell.bindTransport({
      onPlay: () => {
        const span = duration();
        if (!shownRuntime() && view !== "both") return;
        if (clock.timeMs >= span) clock.seek(0);
        clock.play();
        draw();
      },
      onPause: () => {
        clock.pause();
        draw();
      },
      onSeek: (timeMs) => {
        clock.seek(clampTime(timeMs, duration()));
        draw();
      },
      onRate: (rate) => {
        clock.setRate(rate);
        draw();
      },
      onStep: (step, direction) => {
        const span = duration();
        const scene = sceneA ?? sceneB;
        const next = step === "key"
          ? stepKey(collectKeyTimes(scene, span), clock.timeMs, direction, span)
          : clampTime(clock.timeMs + direction * (1000 / 30), span);
        clock.pause();
        clock.seek(next);
        draw();
      },
    });
  }

  function flowState(id: string): "idle" | "done" | "live" | "failed" {
    const order = ["source", "ira", "script", "irb", "play"];
    if (failedStep === id) return "failed";
    const stop = failedStep ? order.indexOf(failedStep) : order.length;
    const index = order.indexOf(id);
    if (id === "play" && clock.isPlaying && index < stop) return "live";
    if (index < stop && compiledText.length > 0) return "done";
    if (id === "source" && source.length > 0) return "done";
    return "idle";
  }

  function draw(): void {
    const span = duration();
    if (span > 0 && clock.timeMs >= span) {
      clock.seek(span);
      clock.pause();
    }
    const time = clampTime(clock.timeMs, span);
    const dpr = window.devicePixelRatio || 1;
    const frameA = runtimeA?.evaluate(time);
    const frameB = runtimeB?.evaluate(time);
    shell.setMode(view === "both" ? "split" : "single");
    if (view === "both") {
      shell.paint("a", frameA ?? null, shell.paneA.clientWidth, shell.paneA.clientHeight, dpr);
      shell.paint("b", frameB ?? null, shell.paneB.clientWidth, shell.paneB.clientHeight, dpr);
      shell.setPaneEmpty("a", frameA ? null : "Compile a program to see Scene IR A.");
      shell.setPaneEmpty("b", frameB ? null : "Round-trip is unavailable.");
      shell.setPanes(
        "Compiled Scene IR",
        sceneA ? `${sceneA.sceneId} · ${sceneA.timeline.durationMs.toFixed(0)} ms` : "Scene IR A",
        "MotionScript round-trip",
        sceneB ? `${sceneB.sceneId} · ${sceneB.timeline.durationMs.toFixed(0)} ms` : "Scene IR B",
      );
    } else {
      const frame = view === "roundtrip" ? frameB : frameA;
      shell.paint("single", frame ?? null, shell.singleBox.clientWidth, shell.singleBox.clientHeight, dpr);
    }
    const shown = view === "roundtrip" ? sceneB : sceneA;
    const waiting = dirty();
    shell.setTransport({
      hidden: false,
      enabled: span > 0 && !isStatic(shown),
      timeMs: time,
      durationMs: span,
      playing: clock.isPlaying,
      rate: clock.playbackRate,
      sync: view === "both",
    });
    shell.setSourceMode("editor");
    shell.setSourceEditable(true);
    shell.setSourceNote(waiting ? "This text is waiting for Compile. The canvas stays on the last compile." : example.caption);
    shell.setReport(
      example.caption,
      roundTripNote,
      failedStep ? "is-bad" : compiledText ? "exact" : "",
      compileMessages.join("\n"),
    );
    shell.setFlow([
      { label: "Source", hint: "MotionScript", state: flowState("source") },
      { label: "Scene IR A", hint: "compile", state: flowState("ira") },
      { label: "MotionScript", hint: "emit", state: flowState("script") },
      { label: "Scene IR B", hint: "compile again", state: flowState("irb") },
      { label: "Play", hint: view === "roundtrip" ? "Scene IR B" : view === "both" ? "both" : "Scene IR A", state: flowState("play") },
    ]);
    shell.setScene(
      sceneB ? "Scene IR A is the compile. Scene IR B is the emit compiled again." : "Scene IR from the last compile.",
      [describeScene(sceneA, "Scene IR A"), describeScene(sceneB, "Scene IR B")].filter(Boolean).join("\n\n"),
    );
    shell.setScript(script ? "Canonical MotionScript emitted from Scene IR A." : "Compile a scene to emit MotionScript.", script);
    const frame = view === "roundtrip" ? frameB : frameA;
    shell.setFrames(frame ? "Resolved draw items at the player time." : "Compile a scene to inspect frames.", frame ? describeFrame(frame) : "");
    shell.setSession("Author compiles MotionScript, emits it, and compiles that text again. Both views share one clock.", [
      shown?.sceneId ?? "no scene",
      compileOk ? "compiled" : compiledText ? "partial" : "waiting",
      `${compileMessages.length} diagnostics`,
      view,
      waiting ? "editor changed" : "editor matches compile",
    ].join("\n"));
    shell.setStatus([
      shown?.sceneId ?? "no scene",
      waiting ? "editor changed" : compileOk ? "compiled" : compiledText ? "partial" : "waiting",
      `${compileMessages.length} diagnostics`,
      span ? `t ${time.toFixed(1)}ms` : "",
      clock.isPlaying ? "playing" : "paused",
      view,
    ].filter(Boolean).join("  ·  "));
  }

  return {
    activate() {
      shell.setMode(view === "both" ? "split" : "single");
      shell.setSourceMode("editor");
      shell.setSourceEditable(true);
      shell.setSourceValue(source);
      shell.onSourceInput(() => draw());
      paintControls();
      bindClock();
      if (!compiledText) compile();
    },
    deactivate() {
      source = shell.sourceValue();
      clock.pause();
    },
    tick(_now: number, delta: number) {
      if (!clock.isPlaying || shell.scrubbing) return;
      clock.tick(delta);
    },
    draw,
    key() {
      return false;
    },
    hook(): Partial<GvrBridge> {
      const scene = view === "roundtrip" ? sceneB : sceneA;
      const runtime = view === "roundtrip" ? runtimeB : runtimeA;
      return {
        frame: runtime?.evaluate(clampTime(clock.timeMs, duration())),
        compileOk,
        sourceDiagnostics: compileMessages,
        script,
        scriptCompiles: Boolean(sceneB),
        editor: shell.sourceValue(),
        dirty: dirty(),
        sceneId: scene?.sceneId ?? "",
        seek: (sceneTimeMs: number) => {
          clock.seek(clampTime(sceneTimeMs, duration()));
          draw();
        },
        probe: () => ({
          sceneId: scene?.sceneId ?? "",
          timeMs: clock.timeMs,
          playing: clock.isPlaying,
          rate: clock.playbackRate,
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

function isStatic(scene: SceneIR | undefined): boolean {
  if (!scene) return true;
  return scene.timeline.tracks.length === 0 && scene.timeline.steps.length === 0;
}
