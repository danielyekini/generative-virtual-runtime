import { describe, expect, it, vi } from "vitest";
import { AnimationRuntime } from "@gvr/runtime";
import { installedPrograms } from "./programs";
import { runProgram } from "./run";
import { compareScene } from "./comparison";
import * as emitter from "@gvr/motionscript-emitter";

describe("opt-in Player comparison", () => {
  it("ordinary native and import Runs never emit MotionScript", () => {
    const emit = vi.spyOn(emitter, "emitMotionScript");
    try {
      for (const key of ["sample:ball", "import:lottie:animated_position", "import:svg:static_primitives", "import:fixture:exact"]) {
        const entry = installedPrograms().find((item) => item.key === key);
        expect(entry, key).toBeDefined();
        expect(runProgram(entry!.source, entry!.format, entry!.label).scene).toBeDefined();
      }
      expect(emit).not.toHaveBeenCalled();
    } finally { emit.mockRestore(); }
  });

  it("compares sampled native motion using emitted/recompiled Scene IR and states its scope", () => {
    const entry = installedPrograms().find((item) => item.key === "sample:ball")!;
    const scene = runProgram(entry.source, entry.format, entry.label).scene!;
    const comparison = compareScene(scene);
    expect(comparison.script.length).toBeGreaterThan(0);
    expect(comparison.outcome?.state).toBe("ok");
    expect(comparison.report).toContain("not comparison with an original SVG/Lottie renderer");
    const a = new AnimationRuntime(scene);
    const b = new AnimationRuntime(comparison.outcome!.scene!);
    for (const time of [0, 250, 750, 1500]) expect(b.evaluate(time)).toEqual(a.evaluate(time));
  });

  it("reports an emitter failure without replacing the original scene", () => {
    const entry = installedPrograms().find((item) => item.key === "sample:ball")!;
    const scene = runProgram(entry.source, entry.format, entry.label).scene!;
    const emit = vi.spyOn(emitter, "emitMotionScript").mockImplementation(() => { throw new Error("test emission failure"); });
    try {
      const comparison = compareScene(scene);
      expect(comparison.outcome).toBeUndefined();
      expect(comparison.report).toContain("test emission failure");
      expect(new AnimationRuntime(scene).evaluate(0).drawItems.length).toBeGreaterThan(0);
    } finally { emit.mockRestore(); }
  });
});
