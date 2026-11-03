/** E045: Scene IR 0.24.0 image sampling and sprite frame validation. */
import { compileMotionScript } from "@gvr/compiler";
import { describe, expect, it } from "vitest";
import type { SceneIR } from "./types";
import { validateSceneIR } from "./validate";

function base(): SceneIR {
  const result = compileMotionScript(`scene "s" {version "0.2"; viewport (320,180); background #ffffff; duration 2s;};
image Walker { href "walk.png"; size (64, 64); sampling pixelated; frames (4, 2); frame 2; position (0, 0); };
animate Walker.frame { from 0; to 8; duration 800ms; };
complete;`);
  expect(result.diagnostics).toEqual([]);
  return structuredClone(result.scene!);
}
const codes = (scene: unknown) => {
  const result = validateSceneIR(scene);
  return result.ok ? [] : result.diagnostics.map((item) => `${item.code} ${item.message}`);
};
const without = (scene: SceneIR, capability: string) => ({
  ...scene,
  requiredCapabilities: (scene.requiredCapabilities ?? []).filter((item) => item !== capability),
});

describe("resources.imageSampling / resources.spriteFrames validator (E045)", () => {
  it("accepts a compiled sprite scene", () => {
    expect(codes(base())).toEqual([]);
  });

  it("gates sampling, grids, frames and frame tracks on their capabilities", () => {
    expect(codes(without(base(), "resources.imageSampling"))).toEqual([expect.stringContaining("resources.imageSampling")]);
    const frames = codes(without(base(), "resources.spriteFrames"));
    expect(frames.length).toBe(3);
    expect(frames.every((message) => message.startsWith("MISSING_REQUIRED") && message.includes("resources.spriteFrames"))).toBe(true);
  });

  it("rejects bad grids, unknown sampling and out-of-range frames", () => {
    const grid = base();
    (grid.resources[0] as { frames: unknown }).frames = { columns: 0, rows: 2 };
    expect(codes(grid).some((message) => message.includes("frames columns must be a whole number"))).toBe(true);
    const extra = base();
    (extra.resources[0] as { frames: unknown }).frames = { columns: 2, rows: 2, width: 8 };
    expect(codes(extra).some((message) => message.startsWith("UNSUPPORTED_PROPERTY") || message.includes("width"))).toBe(true);
    const sampling = base();
    (sampling.nodes[0] as { sampling: unknown }).sampling = "blurry";
    expect(codes(sampling)).toEqual([expect.stringContaining('sampling must be "smooth" or "pixelated"')]);
    const frame = base();
    (frame.nodes[0] as { frame: unknown }).frame = 8;
    expect(codes(frame)).toEqual([expect.stringContaining("from 0 to 7")]);
  });

  it("requires a grid for a static frame and for frame tracks", () => {
    const scene = base();
    delete (scene.resources[0] as { frames?: unknown }).frames;
    const messages = codes(scene);
    expect(messages.some((message) => message.includes("frame needs a frames grid"))).toBe(true);
    expect(messages.some((message) => message.startsWith("INVALID_TRACK_TARGET"))).toBe(true);
  });
});
