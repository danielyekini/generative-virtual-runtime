import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { listLoadingScreens, pickLoadingScreen } from "./loading-screens";

describe("Generate loading screens (P023)", () => {
  it("packages at least three compiling MotionScript presets", () => {
    const presets = listLoadingScreens();
    expect(presets.length).toBeGreaterThanOrEqual(3);
    for (const preset of presets) {
      expect(preset.id).toBeTruthy();
      expect(preset.caption).toBeTruthy();
      const compiled = compileMotionScript(preset.source);
      expect(compiled.ok, `${preset.id}: ${compiled.diagnostics.map((d) => d.message).join("; ")}`).toBe(true);
    }
  });

  it("picks deterministically from the packaged set", () => {
    const presets = listLoadingScreens();
    expect(pickLoadingScreen(() => 0).id).toBe(presets[0]!.id);
    expect(pickLoadingScreen(() => 0.999).id).toBe(presets[presets.length - 1]!.id);
  });
});
