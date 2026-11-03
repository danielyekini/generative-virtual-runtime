import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "./runtime";
import { hitTest } from "./input";

const source = `scene "clip-hit" {
  version "0.2";
  viewport (400, 300);
  background #0f172a;
  duration 1s;
  requires "compositing.mask";
  requires "compositing.isolatedOpacity";
};
group Card {
  clip Window;
  rectangle Panel { size (200, 120); fill #e2e8f0; };
};
circle Window {
  position (100, 60);
  radius 40;
  visible false;
  fill #000000;
};
complete;`;

describe("group clip scopes (compositing.mask)", () => {
  it("clips draw scopes and rejects hits outside the outline", () => {
    const compiled = compileMotionScript(source);
    expect(compiled.diagnostics).toEqual([]);
    const frame = new AnimationRuntime(compiled.scene!).evaluate(0);
    expect(frame.renderTree?.kind).toBe("scope");
    const card = frame.renderTree?.kind === "scope"
      ? frame.renderTree.children.find((child) => child.kind === "scope" && child.id === "Card")
      : undefined;
    expect(card).toMatchObject({
      kind: "scope",
      id: "Card",
      isolated: true,
      clip: { geometry: { kind: "circle", radius: 40 } },
    });
    // Centre of the clip circle (panel local origin is top-left of the rect; circle at 100,60).
    expect(hitTest(frame, { x: 100, y: 60 })?.nodeId).toBe("Card.Panel");
    // Corner of the panel rectangle, outside the circle.
    expect(hitTest(frame, { x: 5, y: 5 })).toBeUndefined();
  });
});
