import { describe, expect, it } from "vitest";
import { acceptScene, validateSceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

const header = `scene "matte" {version "0.2"; viewport (400,300); background #ffffff; duration 1s;};`;

function compile(body: string) {
  return compileMotionScript(`${header}\n${body}\ncomplete;`);
}

describe("group matte (MotionScript 0.19.0 compositing.matte)", () => {
  it("lowers matte onto group compositing and gates compositing.matte", () => {
    const result = compile(`group Card {
  matte Window;
  rectangle Panel { size (200, 120); fill #334155; };
};
group Window { visible false;
  circle Left { position (40, 60); radius 30; fill #ffffff; };
  text Word { position (100, 60); content "GO"; fontSize 24; fill #ffffff; };
};`);
    expect(result.diagnostics).toEqual([]);
    const scene = result.scene!;
    expect(scene.requiredCapabilities).toEqual(expect.arrayContaining(["compositing.matte", "compositing.isolatedOpacity"]));
    const card = scene.nodes.find((node) => node.id === "Card");
    expect(card).toMatchObject({
      kind: "group",
      compositing: { isolated: true, matte: { nodeId: "Window" } },
    });
    expect(acceptScene(scene, { consumer: "0.2", enabled: ["compositing.matte", "compositing.isolatedOpacity"] }).ok).toBe(true);
    expect(acceptScene(scene, { consumer: "0.2", enabled: ["compositing.isolatedOpacity"] }).ok).toBe(false);

    const missing = validateSceneIR({ ...scene, requiredCapabilities: ["compositing.isolatedOpacity"] });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.diagnostics.some((item) => item.message.includes("compositing.matte"))).toBe(true);
  });

  it("rejects unknown, contained and cyclic matte sources", () => {
    expect(compile(`group Card { matte Missing; rectangle Panel { size (10, 10); fill #000000; }; };`).diagnostics.map((d) => d.code)).toContain(
      "UNKNOWN_TARGET",
    );
    const child = compile(`group Card { matte Hole; circle Hole { radius 4; fill #ffffff; }; };`);
    expect(child.ok).toBe(false);
    expect(child.diagnostics.some((item) => item.code === "INVALID_PARENT")).toBe(true);
    const deadlock = compile(`group A { matte B; rectangle P { size (10, 10); fill #000000; }; };
group B { matte A; rectangle Q { size (10, 10); fill #ffffff; }; };`);
    expect(deadlock.ok).toBe(false);
    expect(deadlock.diagnostics.some((item) => item.code === "CYCLE")).toBe(true);
    const base = compile(`group A { rectangle P { size (10, 10); fill #000000; }; };
group B { rectangle Q { size (10, 10); fill #ffffff; }; };`);
    const scene = structuredClone(base.scene!);
    for (const node of scene.nodes) {
      if (node.kind === "group" && node.id === "A") node.compositing = { isolated: true, matte: { nodeId: "B" } };
      if (node.kind === "group" && node.id === "B") node.compositing = { isolated: true, matte: { nodeId: "A" } };
    }
    scene.requiredCapabilities = ["compositing.matte", "compositing.isolatedOpacity"];
    const cyclic = validateSceneIR(scene);
    expect(cyclic.ok).toBe(false);
    if (!cyclic.ok) expect(cyclic.diagnostics.some((item) => item.code === "CYCLE")).toBe(true);
  });

  it("does not claim compositing.matte without the property", () => {
    const result = compile(`rectangle Panel { size (10, 10); fill #000000; };`);
    expect(result.ok).toBe(true);
    expect(result.scene!.requiredCapabilities ?? []).not.toContain("compositing.matte");
  });
});
