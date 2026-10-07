import { AnimationRuntime, RuntimeClock } from "@gvr/runtime";
import { containFit, transformPoint, type ResolvedFrame } from "@gvr/schema";
import { FRAME_CATALOG, buildFrames } from "../../../../fixtures/frame-cases";
import { buildRuntimeScenes, type RuntimeSceneEntry } from "../../../../fixtures/runtime-scenes";
import type { GvrBridge } from "../bridge";
import { button } from "../bridge";
import { describeFrame } from "../describe";
import type { Shell } from "../shell";
import { clampTime, collectKeyTimes, formatClock, stepKey } from "../timeline";

type FrameId = (typeof FRAME_CATALOG)[number]["id"];
type Kind = "frames" | "scenes";

const frames = buildFrames();
const scenes = buildRuntimeScenes();
const presets = [
  { id: "window", label: "Window", width: 0, height: 0 },
  { id: "16:9", label: "16:9", width: 960, height: 540 },
  { id: "ultrawide", label: "Ultrawide", width: 1200, height: 480 },
  { id: "portrait", label: "Portrait", width: 420, height: 760 },
  { id: "tiny", label: "Tiny", width: 320, height: 200 },
];

export function createFixtures(shell: Shell) {
  const clock = new RuntimeClock();
  let kind: Kind = "frames";
  let frameId: FrameId = "primitive-gallery";
  let sceneEntry: RuntimeSceneEntry = scenes[0] ?? fail("no scenes");
  let runtime = new AnimationRuntime(sceneEntry.scene);
  let presetId = "window";
  let dprMode: "device" | "1" | "2" = "device";
  let reversed = false;
  let lastFrame: ResolvedFrame | undefined;
  let logicalToDevice: ((x: number, y: number) => { x: number; y: number }) | undefined;

  function fail(message: string): never {
    throw new Error(message);
  }

  function selectedDpr(): number {
    if (dprMode === "1") return 1;
    if (dprMode === "2") return 2;
    return window.devicePixelRatio || 1;
  }

  function currentFrame(): ResolvedFrame {
    const frame = frames[frameId];
    if (!frame) throw new Error(`missing frame ${frameId}`);
    if (!reversed) return frame;
    return { ...frame, drawItems: [...frame.drawItems].reverse() };
  }

  function cssSize(): { width: number; height: number } {
    const preset = presets.find((entry) => entry.id === presetId);
    if (preset && preset.width > 0) return { width: preset.width, height: preset.height };
    return { width: shell.singleBox.clientWidth, height: shell.singleBox.clientHeight };
  }

  function paintControls(): void {
    const kindButtons = (["frames", "scenes"] as const).map((value) =>
      button(value === "frames" ? "Frames" : "Scenes", kind === value, () => {
        kind = value;
        clock.pause();
        clock.seek(0);
        paintControls();
        draw();
      }),
    );
    if (kind === "frames") {
      shell.controls.replaceChildren(
        ...kindButtons,
        ...FRAME_CATALOG.map((entry) =>
          button(entry.label, entry.id === frameId, () => {
            frameId = entry.id;
            reversed = false;
            paintControls();
            draw();
          }),
        ),
        ...presets.map((entry) =>
          button(entry.label, entry.id === presetId, () => {
            presetId = entry.id;
            paintControls();
            draw();
          }),
        ),
        ...(["device", "1", "2"] as const).map((mode) =>
          button(mode === "device" ? "Device DPR" : `${mode}×`, dprMode === mode, () => {
            dprMode = mode;
            paintControls();
            draw();
          }),
        ),
      );
      if (frameId === "z-order") {
        shell.controls.append(
          button("Reverse", reversed, () => {
            reversed = !reversed;
            paintControls();
            draw();
          }),
        );
      }
      return;
    }
    shell.controls.replaceChildren(
      ...kindButtons,
      ...scenes.map((entry) =>
        button(entry.label, entry.id === sceneEntry.id, () => {
          sceneEntry = entry;
          runtime = new AnimationRuntime(entry.scene);
          clock.pause();
          clock.seek(0);
          paintControls();
          draw();
        }),
      ),
    );
  }

  function bindClock(): void {
    shell.bindTransport({
      onPlay: () => {
        if (kind !== "scenes") return;
        if (clock.timeMs >= sceneEntry.scene.timeline.durationMs) clock.seek(0);
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
        if (kind !== "scenes") return;
        const duration = sceneEntry.scene.timeline.durationMs;
        const next = step === "key"
          ? stepKey(collectKeyTimes(sceneEntry.scene, duration), clock.timeMs, direction, duration)
          : clampTime(clock.timeMs + direction * (1000 / 30), duration);
        clock.pause();
        clock.seek(next);
        draw();
      },
    });
  }

  function draw(): void {
    const dpr = kind === "frames" ? selectedDpr() : window.devicePixelRatio || 1;
    const size = cssSize();
    if (kind === "frames") {
      const frame = currentFrame();
      lastFrame = frame;
      shell.paint("single", frame, size.width, size.height, dpr);
      const fit = containFit(frame.viewport, size.width, size.height);
      logicalToDevice = (x, y) => {
        const point = transformPoint(fit.matrix, x, y);
        return { x: point.x * dpr, y: point.y * dpr };
      };
      const catalog = FRAME_CATALOG.find((entry) => entry.id === frameId);
      shell.setTransport({ hidden: false, enabled: false, timeMs: 0, durationMs: 0, playing: false, rate: clock.playbackRate, sync: false });
      shell.setSourceMode("note");
      shell.setSourceNote("Frames are prepared pictures. There is no source text on this activity.");
      shell.setReport(catalog?.caption ?? "", "", "", "");
      shell.setFlow([]);
      shell.setScene("A resolved frame has no Scene IR.", "");
      shell.setScript("Frames are already resolved. MotionScript is not part of this picture.", "");
      shell.setFrames(
        `css ${Math.round(size.width)}×${Math.round(size.height)} · backing ${shell.canvases.single.width}×${shell.canvases.single.height} · dpr ${dpr} · fit ${fit.scale.toFixed(3)}`,
        describeFrame(frame),
      );
      shell.setSession("Renderer fixtures draw a ResolvedFrame directly. The player stays disabled because these pictures have no timeline.", [
        `frame ${frameId}`,
        reversed ? "draw order reversed" : "authored order",
        `preset ${presetId}`,
      ].join("\n"));
      shell.setStatus([
        frameId,
        `css ${Math.round(size.width)}×${Math.round(size.height)}`,
        `backing ${shell.canvases.single.width}×${shell.canvases.single.height}`,
        `dpr ${dpr}`,
        `fit ${fit.scale.toFixed(3)}`,
        `offset ${fit.offsetX.toFixed(1)}, ${fit.offsetY.toFixed(1)}`,
        reversed ? "order reversed" : "authored order",
      ].join("  ·  "));
      return;
    }
    const duration = sceneEntry.scene.timeline.durationMs;
    if (clock.timeMs >= duration) {
      clock.seek(duration);
      clock.pause();
    }
    const frame = runtime.evaluate(clock.timeMs);
    lastFrame = frame;
    const stageSize = { width: shell.singleBox.clientWidth, height: shell.singleBox.clientHeight };
    shell.paint("single", frame, stageSize.width, stageSize.height, dpr);
    const fit = containFit(frame.viewport, stageSize.width, stageSize.height);
    logicalToDevice = (x, y) => {
      const point = transformPoint(fit.matrix, x, y);
      return { x: point.x * dpr, y: point.y * dpr };
    };
    const points: string[] = [];
    for (const id of sceneEntry.watch) {
      const item = frame.drawItems.find((draw) => draw.nodeId === id);
      if (!item) continue;
      const point = transformPoint(item.logicalMatrix, 0, 0);
      points.push(`${id} ${point.x.toFixed(2)}, ${point.y.toFixed(2)}`);
    }
    shell.setTransport({
      hidden: false,
      enabled: true,
      timeMs: clock.timeMs,
      durationMs: duration,
      playing: clock.isPlaying,
      rate: clock.playbackRate,
      sync: false,
    });
    shell.setSourceMode("note");
    shell.setSourceNote("Scenes are prepared Scene IR. Open Author to edit MotionScript, or Import to bring in another format.");
    shell.setReport(sceneEntry.caption, "", "", "");
    shell.setFlow([]);
    shell.setScene("The scene currently on the canvas.", JSON.stringify(sceneEntry.scene, null, 2));
    shell.setScript("This activity plays Scene IR directly. Emit MotionScript from Author or Import.", "");
    shell.setFrames(`t ${formatClock(clock.timeMs)} · fit ${fit.scale.toFixed(3)}`, describeFrame(frame));
    shell.setSession("Runtime fixtures sample Scene IR at the player time. Seeking does not depend on playback history.", [
      sceneEntry.id,
      clock.isPlaying ? "playing" : "paused",
      `rate ${clock.playbackRate}`,
      runtime.degraded ? "degraded" : "clean",
      ...runtime.lastDiagnostics.map((item) => item.message),
    ].join("\n"));
    shell.setStatus([
      sceneEntry.id,
      `t ${clock.timeMs.toFixed(1)}ms`,
      clock.isPlaying ? "playing" : "paused",
      `rate ${clock.playbackRate}`,
      runtime.degraded ? "degraded" : "clean",
      points.join("  ·  "),
    ].filter(Boolean).join("  ·  "));
  }

  return {
    activate(extra?: string) {
      if (extra === "scenes" || extra === "frames") kind = extra;
      shell.setMode("single");
      shell.setSourceEditable(false);
      paintControls();
      bindClock();
    },
    deactivate() {
      clock.pause();
    },
    tick(_now: number, delta: number) {
      if (kind !== "scenes" || !clock.isPlaying || shell.scrubbing) return;
      clock.tick(delta);
    },
    draw,
    key() {
      return false;
    },
    hook(): Partial<GvrBridge> {
      const origins: Record<string, { x: number; y: number }> = {};
      if (kind === "scenes" && lastFrame) {
        for (const id of sceneEntry.watch) {
          const item = lastFrame.drawItems.find((draw) => draw.nodeId === id);
          if (!item) continue;
          origins[id] = transformPoint(item.logicalMatrix, 0, 0);
        }
      }
      return {
        frame: lastFrame,
        logicalToDevice,
        seek: (sceneTimeMs: number) => {
          if (kind !== "scenes") return;
          clock.seek(sceneTimeMs);
          draw();
        },
        probe: () => ({
          sceneId: kind === "scenes" ? sceneEntry.id : frameId,
          timeMs: kind === "scenes" ? clock.timeMs : 0,
          playing: kind === "scenes" && clock.isPlaying,
          rate: clock.playbackRate,
          degraded: kind === "scenes" ? runtime.degraded : false,
          diagnostics: kind === "scenes" ? runtime.lastDiagnostics.map((item) => item.message) : [],
          origins,
        }),
      };
    },
  };
}
