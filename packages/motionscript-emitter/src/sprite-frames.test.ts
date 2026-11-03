/** E045: the Studio sprite test frame round-trips through the emitter. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { describe, expect, it } from "vitest";
import { emitMotionScript } from "./emit";

describe("sprite frames emission (E045)", () => {
  it("re-emits sampling, frames and frame with identical sampled cells", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../../../fixtures/motionscript/frames/sprite-frames.ms"), "utf8");
    const first = compileMotionScript(source);
    expect(first.diagnostics).toEqual([]);
    const emitted = emitMotionScript(first.scene!);
    expect(emitted).toContain("sampling pixelated;");
    expect(emitted).toContain("frames (4, 2);");
    expect(emitted).toContain("frame 5;");
    const second = compileMotionScript(emitted);
    expect(second.diagnostics).toEqual([]);
    expect(second.scene!.resources).toEqual(first.scene!.resources);
    const a = new AnimationRuntime(first.scene!);
    const b = new AnimationRuntime(second.scene!);
    for (let t = 0; t <= 4000; t += 50) {
      const left = a.evaluate(t).drawItems.map((item) => item.geometry);
      const right = b.evaluate(t).drawItems.map((item) => item.geometry);
      expect(right).toEqual(left);
    }
  });
});
