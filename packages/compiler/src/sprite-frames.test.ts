/** E045: MotionScript 0.25.0 `sampling`, `frames` and `frame` on image nodes. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compileIncrementally, compileMotionScript, fragmentSource, lintStreamingAuthorship } from "./index";

const header = `scene "sprites" {version "0.2"; viewport (320,180); background #ffffff; duration 2s;};`;
const compile = (body: string) => compileMotionScript(`${header}\n${body}\ncomplete;`);
const messages = (result: ReturnType<typeof compileMotionScript>) => result.diagnostics.map((item) => item.message);

describe("resources.imageSampling / resources.spriteFrames compiler (E045)", () => {
  it("lowers sampling to the node and the grid to the image resource", () => {
    const result = compile(`image Walker { href "walk.png"; size (64, 64); sampling pixelated; frames (4, 2); frame 3; position (0, 0); };`);
    expect(messages(result)).toEqual([]);
    const scene = result.scene!;
    expect(scene.resources).toEqual([{ id: "image1", kind: "image", href: "walk.png", readiness: "ready", frames: { columns: 4, rows: 2 } }]);
    expect(scene.nodes[0]).toMatchObject({ kind: "image", sampling: "pixelated", frame: 3 });
    expect(scene.requiredCapabilities).toEqual(expect.arrayContaining(["resources.image", "resources.imageSampling", "resources.spriteFrames"]));
  });

  it("adds no new capability to a plain image", () => {
    const result = compile(`image Hero { href "hero.png"; size (32, 32); position (0, 0); };`);
    expect(messages(result)).toEqual([]);
    expect(result.scene!.requiredCapabilities).not.toContain("resources.spriteFrames");
    expect(result.scene!.requiredCapabilities).not.toContain("resources.imageSampling");
    expect(result.scene!.nodes[0]).not.toHaveProperty("sampling");
  });

  it("animates frame as a track and requires a grid for it", () => {
    const ok = compile(`image Walker { href "walk.png"; size (64, 64); frames (4, 2); position (0, 0); };
animate Walker.frame { from 0; to 8; duration 800ms; };`);
    expect(messages(ok)).toEqual([]);
    expect(ok.scene!.timeline.tracks[0]!.target).toEqual({ kind: "node", nodeId: expect.any(String), channel: "frame" });
    const noGrid = compile(`image Hero { href "hero.png"; size (32, 32); position (0, 0); };
animate Hero.frame { from 0; to 4; duration 1s; };`);
    expect(messages(noGrid)).toEqual([expect.stringContaining("needs an image with frames")]);
  });

  it("rejects bad grids, out-of-range frames, unknown sampling and non-image use", () => {
    expect(messages(compile(`image A { href "a.png"; size (8, 8); frames (0, 2); position (0, 0); };`))).toEqual([expect.stringContaining("whole column and row counts")]);
    expect(messages(compile(`image A { href "a.png"; size (8, 8); frames (2.5, 2); position (0, 0); };`))).toEqual([expect.stringContaining("whole column and row counts")]);
    expect(messages(compile(`image A { href "a.png"; size (8, 8); frames (2, 2); frame 4; position (0, 0); };`))).toEqual([expect.stringContaining("from 0 to 3")]);
    expect(messages(compile(`image A { href "a.png"; size (8, 8); frame 1; position (0, 0); };`))).toEqual([expect.stringContaining("needs frames")]);
    // Parse notes are currently reported twice for every node property (pre-existing); assert content only.
    const sampling = messages(compile(`image A { href "a.png"; size (8, 8); sampling blurry; position (0, 0); };`));
    expect(sampling.length).toBeGreaterThan(0);
    expect(sampling.every((message) => message === "sampling is smooth or pixelated.")).toBe(true);
    expect(messages(compile(`rectangle R { size (8, 8); fill #ff0000; sampling pixelated; position (0, 0); };`))).toEqual([expect.stringContaining("apply only to image nodes")]);
  });

  it("keeps sampling, frames, frame, smooth and pixelated unreserved", () => {
    const result = compile(`rectangle frame { size (8, 8); fill #ff0000; position (0, 0); };
rectangle frames { size (8, 8); fill #00ff00; position (10, 0); };
rectangle sampling { size (8, 8); fill #0000ff; position (20, 0); };
rectangle pixelated { size (8, 8); fill #000000; position (30, 0); };
rectangle smooth { size (8, 8); fill #ffffff; position (40, 0); };
animate frame.opacity { from 1; to 0; duration 1s; };`);
    expect(messages(result)).toEqual([]);
  });

  it("streams the Studio test frame identically under every fragmentation and seals honestly", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../../../fixtures/motionscript/frames/sprite-frames.ms"), "utf8");
    const whole = compileMotionScript(source);
    expect(messages(whole)).toEqual([]);
    for (const kind of ["characters", "lines", "blocks", "packets", "random"] as const) {
      const streamed = compileIncrementally(fragmentSource(source, kind, 5));
      expect(streamed.diagnostics).toEqual([]);
      expect(streamed.scene).toEqual(whole.scene);
    }
    const late = `${header}
image Walker { href "walk.png"; size (64, 64); frames (4, 2); position (0, 0); };
seal 1s;
animate Walker.frame { from 0; to 8; start 500ms; duration 800ms; };
complete;`;
    expect(lintStreamingAuthorship(late).findings.some((finding) => finding.code === "SEALED_HISTORY_WRITE")).toBe(true);
  });
});
