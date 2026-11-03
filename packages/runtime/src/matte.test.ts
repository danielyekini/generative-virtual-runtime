import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "./runtime";
import { hitTest } from "./input";

const source = `scene "matte-hit" {
  version "0.2";
  viewport (400, 300);
  background #0f172a;
  duration 1s;
  requires "compositing.matte";
  requires "compositing.isolatedOpacity";
};
group Card {
  matte Hole;
  rectangle Panel { size (200, 100); fill #e2e8f0; };
};
group Hole {
  visible false;
  circle A { position (40, 50); radius 30; fill #ffffff; };
  circle B { position (140, 50); radius 30; fill #ffffff; };
};
complete;`;

describe("group matte scopes (compositing.matte)", () => {
  it("samples group-matte coverage and rejects hits in the gap", () => {
    const compiled = compileMotionScript(source);
    expect(compiled.diagnostics).toEqual([]);
    const frame = new AnimationRuntime(compiled.scene!).evaluate(0);
    const card = frame.renderTree?.kind === "scope"
      ? frame.renderTree.children.find((child) => child.kind === "scope" && child.id === "Card")
      : undefined;
    expect(card?.kind).toBe("scope");
    if (card?.kind !== "scope") return;
    expect(card.matte?.kind).toBe("scope");
    expect(frame.drawItems.some((item) => item.nodeId.startsWith("Hole"))).toBe(false);
    expect(hitTest(frame, { x: 40, y: 50 })?.nodeId).toBe("Card.Panel");
    expect(hitTest(frame, { x: 140, y: 50 })?.nodeId).toBe("Card.Panel");
    expect(hitTest(frame, { x: 100, y: 50 })).toBeUndefined();
  });

  it("samples a hidden text source", () => {
    const compiled = compileMotionScript(`scene "text-matte" {
      version "0.2"; viewport (200, 80); background #000000; duration 1s;
    };
    group Card { matte Word; rectangle Panel { size (200, 80); fill #ffffff; }; };
    text Word { position (100, 40); content "GO"; fontSize 28; align center; baseline middle; visible false; fill #ffffff; };
    complete;`);
    expect(compiled.diagnostics).toEqual([]);
    const frame = new AnimationRuntime(compiled.scene!).evaluate(0);
    const card = frame.renderTree?.kind === "scope"
      ? frame.renderTree.children.find((child) => child.kind === "scope" && child.id === "Card")
      : undefined;
    expect(card?.kind === "scope" && card.matte?.kind).toBe("leaf");
    expect(hitTest(frame, { x: 100, y: 40 })?.nodeId).toBe("Card.Panel");
    expect(hitTest(frame, { x: 4, y: 4 })).toBeUndefined();
  });
});
