import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compileIncrementally, compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "./runtime";
import { PlaybackClock } from "./playback";
import { StreamingRuntime } from "./streaming";

const program = `scene "frontier" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 4s;
};
rectangle box { position (0, 300); size (20, 20); fill #ff0000; };
animate box.position.x { from 0; to 100; duration 1s; };
seal 1s;
animate box.position.x { from 0; to 80; start 1s; duration 1s; };
seal 2s;
complete;
`;

function apply(source: string): StreamingRuntime {
  const compiled = compileIncrementally([source]);
  const runtime = new StreamingRuntime();
  for (const delta of compiled.deltas) runtime.enqueue(delta);
  runtime.flushCommands();
  return runtime;
}

describe("streaming runtime", () => {
  it("replays the offline scene from deltas", () => {
    const whole = compileMotionScript(program);
    const runtime = apply(program);
    expect(runtime.scene).toEqual(whole.scene);
    expect(runtime.authoringComplete).toBe(true);
    const offline = new AnimationRuntime(whole.scene!);
    for (const time of [0, 500, 1000, 1500, 4000]) {
      expect(runtime.evaluate(time).drawItems).toEqual(offline.evaluate(time).drawItems);
    }
  });

  it("holds the left edge of the horizon, then resumes without a time jump", () => {
    const first = program.slice(0, program.indexOf("animate box.position.x { from 0; to 80"));
    const compiled = compileIncrementally([first]);
    const runtime = new StreamingRuntime();
    for (const delta of compiled.deltas) runtime.enqueue(delta);
    runtime.flushCommands();
    expect(runtime.sealedThroughMs).toBe(1000);
    expect(runtime.authoringComplete).toBe(false);

    const clock = new PlaybackClock();
    clock.setHorizon(runtime.sealedThroughMs, runtime.scene?.timeline.durationMs ?? 0, false);
    clock.play();
    clock.tick(2500);
    expect(clock.playbackState).toBe("waiting_for_content");
    expect(clock.timeMs).toBe(1000);
    const held = runtime.evaluate(clock.timeMs);
    const box = held.drawItems.find((item) => item.nodeId === "box");
    expect(box?.logicalMatrix[6]).toBeCloseTo(100, 6);

    const rest = compileIncrementally([program]);
    const live = new StreamingRuntime();
    for (const delta of rest.deltas) live.enqueue(delta);
    live.flushCommands();
    clock.setHorizon(live.sealedThroughMs, live.scene?.timeline.durationMs ?? 0, live.authoringComplete);
    expect(clock.timeMs).toBe(1000);
    expect(clock.playbackState).toBe("playing");
    const resumed = live.evaluate(clock.timeMs);
    const moved = resumed.drawItems.find((item) => item.nodeId === "box");
    expect(moved?.logicalMatrix[6]).toBeCloseTo(0, 6);
    clock.tick(100);
    expect(clock.timeMs).toBeCloseTo(1100, 6);
  });
});

describe("diagram path", () => {
  it("keeps the sample on the quadratic the path draws", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../../../fixtures/motionscript/diagram.ms"), "utf8");
    const compiled = compileMotionScript(source);
    expect(compiled.ok, compiled.diagnostics.map((item) => item.message).join("\n")).toBe(true);
    const runtime = new AnimationRuntime(compiled.scene!);
    const quadratic = (u: number, start: number, control: number, end: number) => {
      const remain = 1 - u;
      return remain * remain * start + 2 * remain * u * control + u * u * end;
    };
    const point = (timeMs: number) => {
      const seconds = timeMs / 1000;
      const first = Math.min(1, Math.max(0, seconds / 2));
      const second = Math.min(1, Math.max(0, seconds / 2 - 1));
      return {
        x: quadratic(first, 200, 480, 640) + quadratic(second, 640, 800, 1080) - 640,
        y: quadratic(first, 520, 520, 200) + quadratic(second, 200, -120, 520) - 200,
      };
    };
    for (const timeMs of [0, 500, 1000, 2000, 2500, 3000, 4000]) {
      const expected = point(timeMs);
      const sample = runtime.evaluate(timeMs).drawItems.find((item) => item.nodeId === "sample");
      expect(sample?.logicalMatrix[6], `x at ${timeMs}`).toBeCloseTo(expected.x, 4);
      expect(sample?.logicalMatrix[7], `y at ${timeMs}`).toBeCloseTo(expected.y, 4);
    }
  });
});
