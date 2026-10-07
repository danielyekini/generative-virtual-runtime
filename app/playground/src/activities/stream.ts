import { createIncrementalProgram, type IncrementalProgram } from "@gvr/compiler";
import { PlaybackClock, StreamingRuntime } from "@gvr/runtime";
import type { SceneIR } from "@gvr/schema";
import type { GvrBridge } from "../bridge";
import { button } from "../bridge";
import { describeFrame } from "../describe";
import { motionExamples, streamCaptions } from "../examples";
import type { Shell } from "../shell";
import { clampTime, collectKeyTimes, stepKey } from "../timeline";

type Phase = "idle" | "setup" | "wait" | "dwell" | "rest" | "done";

export function createStream(shell: Shell) {
  const clock = new PlaybackClock();
  let example = motionExamples[0] ?? fail("no examples");
  let program: IncrementalProgram = createIncrementalProgram();
  let runtime = new StreamingRuntime();
  let cursor = 0;
  let phase: Phase = "idle";
  let dwellUntil = 0;

  function fail(message: string): never {
    throw new Error(message);
  }

  function caption(): string {
    return streamCaptions[example.id] ?? example.caption;
  }

  function paintControls(): void {
    shell.controls.replaceChildren(
      ...motionExamples.map((item) =>
        button(item.label, item.id === example.id, () => {
          example = item;
          reset();
          paintControls();
          draw();
        }),
      ),
      button("Stream", phase !== "idle" && phase !== "done", () => {
        reset();
        phase = "setup";
        paintControls();
        draw();
      }),
    );
    shell.sourceTools.replaceChildren(
      button(shell.popoutVisible() ? "Dock source" : "Pop out", shell.popoutVisible(), () => {
        shell.setPopoutVisible(!shell.popoutVisible());
        paintControls();
      }),
    );
  }

  function reset(): void {
    program = createIncrementalProgram();
    runtime = new StreamingRuntime();
    cursor = 0;
    phase = "idle";
    clock.stop();
  }

  function publish(): void {
    for (const delta of program.drainDeltas()) runtime.enqueue(delta);
    runtime.flushCommands();
    const duration = runtime.scene?.timeline.durationMs ?? 0;
    clock.setHorizon(runtime.sealedThroughMs, duration, runtime.authoringComplete);
  }

  function feed(count: number): void {
    const chunk = example.source.slice(cursor, cursor + count);
    if (chunk.length === 0) return;
    cursor += chunk.length;
    program.push(chunk);
    publish();
  }

  function finishFeed(): void {
    program.finish();
    publish();
    if (clock.playbackState === "stopped" || clock.playbackState === "paused") clock.play();
    phase = "done";
    paintControls();
  }

  function scene(): SceneIR | undefined {
    return runtime.scene;
  }

  function bindClock(): void {
    shell.bindTransport({
      onPlay: () => {
        clock.play();
        draw();
      },
      onPause: () => {
        clock.pause();
        draw();
      },
      onSeek: (timeMs) => {
        clock.seek(timeMs);
        draw();
      },
      onRate: (rate) => {
        clock.setRate(rate);
        draw();
      },
      onStep: (step, direction) => {
        const current = scene();
        const span = current?.timeline.durationMs ?? runtime.sealedThroughMs;
        const next = step === "key"
          ? stepKey(collectKeyTimes(current, span), clock.timeMs, direction, span)
          : clampTime(clock.timeMs + direction * (1000 / 30), span);
        clock.pause();
        clock.seek(next);
        draw();
      },
    });
  }

  function draw(): void {
    const dpr = window.devicePixelRatio || 1;
    const frame = runtime.scene ? runtime.evaluate(clock.timeMs) : null;
    shell.paint("single", frame, shell.singleBox.clientWidth, shell.singleBox.clientHeight, dpr);
    const diagnostics = program.diagnostics.map((item) => item.message).join("\n");
    shell.setStreamFeed(example.source.slice(0, cursor), example.source.slice(cursor), diagnostics);
    const duration = runtime.scene?.timeline.durationMs ?? 0;
    const playing = clock.playbackState === "playing";
    shell.setTransport({
      hidden: false,
      enabled: true,
      timeMs: clock.timeMs,
      durationMs: Math.max(duration, runtime.sealedThroughMs, 1),
      playing,
      rate: clock.playbackRate,
      sync: false,
    });
    shell.setSourceMode("stream");
    shell.setSourceNote(caption());
    const pop = shell.sourceTools.querySelector("button");
    if (pop) {
      const open = shell.popoutVisible();
      pop.textContent = open ? "Dock source" : "Pop out";
      pop.setAttribute("aria-pressed", String(open));
    }
    shell.setReport(caption(), "", diagnostics ? "is-bad" : "", diagnostics);
    shell.setFlow([
      { label: "Feed", hint: `${cursor}/${example.source.length}`, state: cursor > 0 ? "done" : "idle" },
      { label: "Seal", hint: `${program.sealedThroughMs.toFixed(0)} ms`, state: program.sealedThroughMs > 0 ? "done" : "idle" },
      { label: "Play", hint: clock.playbackState, state: playing ? "live" : phase === "done" ? "done" : "idle" },
    ]);
    shell.setScene(runtime.scene ? "Scene IR accepted so far. Later units can still extend the sealed horizon." : "No scene until a complete unit is accepted.", runtime.scene ? JSON.stringify(runtime.scene, null, 2) : "");
    shell.setScript("Streaming reads MotionScript as it arrives. The full example stays in Source.", example.source);
    shell.setFrames(frame ? "Resolved frame at the sealed playback time." : "The canvas stays empty until the first accepted scene.", frame ? describeFrame(frame) : "");
    shell.setSession("The feed is simulated. Playback can run up to the sealed horizon, wait, and resume from that time.", [
      `phase ${phase}`,
      `units ${program.parsedUnits}`,
      `revision ${program.revision}`,
      `sealed ${program.sealedThroughMs.toFixed(0)} ms`,
      `playback ${clock.playbackState}`,
      `fed ${cursor}/${example.source.length}`,
    ].join("\n"));
    shell.setStatus([
      example.id,
      `units ${program.parsedUnits}`,
      `revision ${program.revision}`,
      `sealed ${program.sealedThroughMs.toFixed(0)}ms`,
      `t ${clock.timeMs.toFixed(1)}ms`,
      clock.playbackState,
      `fed ${cursor}/${example.source.length}`,
    ].join("  ·  "));
  }

  return {
    activate() {
      shell.setMode("single");
      shell.setSourceMode("stream");
      paintControls();
      bindClock();
      draw();
    },
    deactivate() {
      shell.setPopoutVisible(false);
    },
    tick(now: number, delta: number) {
      let step = delta;
      if (phase === "setup") {
        feed(40);
        if (program.sealedThroughMs > 0) {
          clock.play();
          phase = "wait";
          step = 0;
          paintControls();
        } else if (cursor >= example.source.length) finishFeed();
      } else if (phase === "wait" && clock.playbackState === "waiting_for_content") {
        phase = "dwell";
        dwellUntil = now + 900;
      } else if (phase === "dwell" && now >= dwellUntil) {
        phase = "rest";
      } else if (phase === "rest") {
        feed(24);
        if (cursor >= example.source.length) finishFeed();
      }
      if (!shell.scrubbing && (clock.playbackState === "playing" || clock.playbackState === "waiting_for_content")) {
        clock.tick(step);
      }
    },
    draw,
    key() {
      return false;
    },
    hook(): Partial<GvrBridge> {
      return {
        frame: runtime.scene ? runtime.evaluate(clock.timeMs) : undefined,
        seek: (sceneTimeMs: number) => {
          clock.seek(sceneTimeMs);
          draw();
        },
        probe: () => ({
          sceneId: runtime.scene?.sceneId ?? "",
          timeMs: clock.timeMs,
          playing: clock.playbackState === "playing",
          rate: clock.playbackRate,
          degraded: runtime.degraded,
          diagnostics: program.diagnostics.map((item) => item.message),
          origins: {},
          state: clock.playbackState,
          sealedThroughMs: program.sealedThroughMs,
          revision: program.revision,
          parsedUnits: program.parsedUnits,
          phase,
        }),
      };
    },
  };
}
