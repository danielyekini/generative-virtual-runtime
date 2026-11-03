import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { describe, expect, it } from "vitest";
import { emitMotionScript } from "./emit";

/** timing.cyclicScopes (MotionScript 0.24.0, E043): period, repeat and scoped steps survive emission. */

describe("emitting timing.cyclicScopes", () => {
  it("round-trips the cyclic test frame with identical timing scopes, steps and samples", () => {
    const source = readFileSync(resolve(__dirname, "../../../fixtures/motionscript/frames/cyclic-scopes.ms"), "utf8");
    const first = compileMotionScript(source);
    expect(first.ok).toBe(true);
    const emitted = emitMotionScript(first.scene!);
    expect(emitted).toContain("period 500ms;");
    expect(emitted).toContain("repeat 4;");
    expect(emitted).toContain("timing blink;");
    const second = compileMotionScript(emitted);
    expect(second.diagnostics.map((item) => item.message)).toEqual([]);
    expect(second.scene!.timingScopes).toEqual(first.scene!.timingScopes);
    expect(second.scene!.timeline.steps).toEqual(first.scene!.timeline.steps);
    expect(second.scene!.requiredCapabilities).toEqual(first.scene!.requiredCapabilities);
    const a = new AnimationRuntime(first.scene!);
    const b = new AnimationRuntime(second.scene!);
    for (const ms of [0, 999, 1_000, 1_300, 2_600, 3_100, 5_900]) {
      expect(b.evaluate(ms).drawItems).toEqual(a.evaluate(ms).drawItems);
    }
  });
});
