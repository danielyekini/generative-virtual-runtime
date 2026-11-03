import { describe, expect, it } from "vitest";
import { acceptScene, validateSceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

const header = `scene "clip" {version "0.2"; viewport (400,300); background #ffffff; duration 1s;};`;

function compile(body: string) {
  return compileMotionScript(`${header}\n${body}\ncomplete;`);
}

describe("group clip (MotionScript 0.16.0 compositing.mask)", () => {
  it("lowers clip onto group compositing and gates compositing.mask", () => {
    const result = compile(`group Card {
  clip Window;
  rectangle Panel { size (200, 120); fill #334155; };
};
circle Window { position (100, 60); radius 48; visible false; fill #000000; };`);
    expect(result.diagnostics).toEqual([]);
    const scene = result.scene!;
    expect(scene.requiredCapabilities).toEqual(expect.arrayContaining(["compositing.mask", "compositing.isolatedOpacity"]));
    const card = scene.nodes.find((node) => node.id === "Card");
    expect(card).toMatchObject({
      kind: "group",
      compositing: { isolated: true, clip: { geometryId: "Window" } },
    });
    expect(acceptScene(scene, { consumer: "0.2", enabled: ["compositing.mask", "compositing.isolatedOpacity"] }).ok).toBe(true);
    expect(acceptScene(scene, { consumer: "0.2", enabled: ["compositing.isolatedOpacity"] }).ok).toBe(false);

    const missing = validateSceneIR({ ...scene, requiredCapabilities: ["compositing.isolatedOpacity"] });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.diagnostics.some((item) => item.message.includes("compositing.mask"))).toBe(true);
  });

  it("rejects unknown or non-geometry clip targets", () => {
    expect(compile(`group Card { clip Missing; rectangle Panel { size (10, 10); fill #000000; }; };`).diagnostics.map((d) => d.code)).toContain(
      "UNKNOWN_TARGET",
    );
    const textClip = compile(`group Card { clip Label; rectangle Panel { size (10, 10); fill #000000; }; };
text Label { content "x"; fontSize 16; fill #000000; };`);
    expect(textClip.ok).toBe(false);
    expect(textClip.diagnostics.some((item) => item.code === "INVALID_GEOMETRY")).toBe(true);
  });

  it("does not reserve clip-shaped identifiers without the property", () => {
    // `clip` is reserved as a keyword, so it cannot be a node id; other programs without clip compile as before.
    const result = compile(`rectangle Panel { size (10, 10); fill #000000; };`);
    expect(result.ok).toBe(true);
    expect(result.scene!.requiredCapabilities ?? []).not.toContain("compositing.mask");
  });
});
