import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { transformPoint, validateSceneIR, type NodeDefinition, type SceneIR } from "@gvr/schema";
import { buildResolvedFrame } from "./frame";
import { sampleScene } from "./sample";

const header = `scene "attach" {version "0.2"; viewport (400,300); background #ffffff; duration 2s;};`;

function compile(body: string): SceneIR {
  const result = compileMotionScript(`${header}\n${body}\ncomplete;`);
  expect(result.diagnostics, body).toEqual([]);
  expect(result.ok).toBe(true);
  return result.scene!;
}

function tip(scene: SceneIR, timeMs: number, id = "Tip"): NodeDefinition {
  return sampleScene(scene, timeMs).nodes.find((node) => node.id === id)!;
}

// Rail: 200 along +x, then 100 along +y. Total drawn length 300.
const rail = `path Rail { stroke #334155 width 2; move (0, 0); line (200, 0); line (200, 100); };`;
const traveller = `circle Tip { radius 6; fill #f97316; rotation 0.25; };`;

describe("path attachments sampling (geometry.pathProgress, compile -> sample)", () => {
  it("places the node from the base progress and from a path.progress track", () => {
    const scene = compile(`${rail}${traveller}
attach Tip along Rail { progress 0.5; };`);
    expect(tip(scene, 0).transform.position).toEqual({ x: 150, y: 0 });
    // No track: the base holds at every time.
    expect(tip(scene, 1500).transform.position).toEqual({ x: 150, y: 0 });

    const animated = compile(`${rail}${traveller}
attach Tip along Rail { progress 0; };
animate Tip.path.progress { from 0; to 1; duration 2s; };`);
    expect(tip(animated, 0).transform.position).toEqual({ x: 0, y: 0 });
    expect(tip(animated, 1000).transform.position.x).toBeCloseTo(150, 5);
    expect(tip(animated, 1000).transform.position.y).toBeCloseTo(0, 5);
    expect(tip(animated, 2000).transform.position.x).toBeCloseTo(200, 5);
    expect(tip(animated, 2000).transform.position.y).toBeCloseTo(100, 5);
    // The authored scene is left unchanged.
    expect(animated.nodes.find((node) => node.id === "Tip")!.transform.position).toEqual({ x: 0, y: 0 });
  });

  it("orient writes tangent rotation; position-only leaves rotation alone", () => {
    const plain = compile(`${rail}${traveller}
attach Tip along Rail { progress 0.9; };`);
    expect(tip(plain, 0).transform.rotation).toBe(0.25);

    const oriented = compile(`${rail}${traveller}
attach Tip along Rail { progress 0.9; orient true; };`);
    // Second leg heads along +y.
    expect(tip(oriented, 0).transform.rotation).toBeCloseTo(Math.PI / 2, 9);
    const first = compile(`${rail}${traveller}
attach Tip along Rail { progress 0.25; orient true; };`);
    expect(tip(first, 0).transform.rotation).toBeCloseTo(0, 9);

    const off = compile(`${rail}${traveller}
attach Tip along Rail { progress 0.9; orient false; };`);
    expect(tip(off, 0).transform.rotation).toBe(0.25);
  });

  it("rollRadius alone writes distance / radius and orient alone is not rolling", () => {
    const rolling = compile(`${rail}${traveller}
attach Tip along Rail { progress 0.5; rollRadius 10; };`);
    // Distance 150 along the first leg; no tangent term even though the tangent angle is 0.
    expect(tip(rolling, 0).transform.rotation).toBeCloseTo(150 / 10, 9);

    const late = compile(`${rail}${traveller}
attach Tip along Rail { progress 0.9; rollRadius 10; };`);
    expect(tip(late, 0).transform.rotation).toBeCloseTo(270 / 10, 9);

    const both = compile(`${rail}${traveller}
attach Tip along Rail { progress 0.9; orient true; rollRadius 10; };`);
    expect(tip(both, 0).transform.rotation).toBeCloseTo(Math.PI / 2 + 270 / 10, 9);

    const orientOnly = compile(`${rail}${traveller}
attach Tip along Rail { progress 0.9; orient true; };`);
    const orientRotation = tip(orientOnly, 0).transform.rotation;
    expect(orientRotation).toBeCloseTo(Math.PI / 2, 9);
    expect(orientRotation).not.toBeCloseTo(270 / 10, 1);
  });

  it("tracks a morphing path tip without rebaking attachment progress", () => {
    const scene = compile(`path Rail { stroke #334155 width 2; move (0, 0); line (100, 0); };
${traveller}
attach Tip along Rail { progress 1; };
keyframes Rail.commands {
  duration 2s;
  0% path { move (0, 0); line (100, 0); };
  100% path { move (0, 0); line (100, 40); };
};`);
    expect(tip(scene, 0).transform.position).toEqual({ x: 100, y: 0 });
    const mid = tip(scene, 1000).transform.position;
    expect(mid.x).toBeCloseTo(100, 5);
    expect(mid.y).toBeCloseTo(20, 5);
    const end = tip(scene, 2000).transform.position;
    expect(end.y).toBeCloseTo(40, 5);
    // The stored attachment never changed.
    expect(scene.pathAttachments![0]!.progress).toBe(1);
  });

  it("tracks a trimmed path tip (animated trim and static trim) after morph", () => {
    const animated = compile(`path Rail { stroke #334155 width 2; move (0, 0); line (100, 0); };
${traveller}
operators Rail { trim 0, 0.5, 0; };
attach Tip along Rail { progress 1; };
keyframes Rail.trim.end {
  duration 2s;
  0% 0.5;
  100% 1;
};`);
    expect(tip(animated, 0).transform.position.x).toBeCloseTo(50, 5);
    expect(tip(animated, 1000).transform.position.x).toBeCloseTo(75, 5);
    expect(tip(animated, 2000).transform.position.x).toBeCloseTo(100, 5);

    // Morph first, then trim: the tip rides the trimmed end of the morphed outline.
    const both = compile(`path Rail { stroke #334155 width 2; move (0, 0); line (100, 0); };
${traveller}
operators Rail { trim 0, 0.5, 0; };
attach Tip along Rail { progress 1; };
keyframes Rail.commands {
  duration 2s;
  0% path { move (0, 0); line (100, 0); };
  100% path { move (0, 0); line (100, 40); };
};`);
    const mid = tip(both, 1000).transform.position;
    expect(mid.x).toBeCloseTo(50, 5);
    expect(mid.y).toBeCloseTo(10, 5);
    expect(both.pathAttachments![0]!.progress).toBe(1);
  });

  it("agrees with the trimmed geometry the frame draws", () => {
    const scene = compile(`${rail}${traveller}
operators Rail { trim 0, 0.5, 0; };
attach Tip along Rail { progress 1; };`);
    const sampled = sampleScene(scene, 0);
    const frame = buildResolvedFrame(scene, sampled, 0);
    const drawn = frame.drawItems.find((item) => item.nodeId === "Rail")!;
    expect(drawn.geometry.kind).toBe("path");
    const last = drawn.geometry.kind === "path" ? drawn.geometry.commands[drawn.geometry.commands.length - 1]! : undefined;
    const position = sampled.nodes.find((node) => node.id === "Tip")!.transform.position;
    expect(last).toMatchObject({ cmd: "L", x: position.x, y: position.y });
  });

  it("places a traveller on a transformed rail, including a different parent", () => {
    const moved = compile(`path Rail { position (40, 15); stroke #334155 width 2; move (0, 0); line (100, 0); };
${traveller}
attach Tip along Rail { progress 1; orient true; };`);
    expect(tip(moved, 0).transform.position).toEqual({ x: 140, y: 15 });
    expect(tip(moved, 0).transform.rotation).toBeCloseTo(0, 9);

    const turned = compile(`path Rail { rotation 90deg; stroke #334155 width 2; move (0, 0); line (100, 0); };
${traveller}
attach Tip along Rail { progress 1; orient true; };`);
    const turnedTip = tip(turned, 0);
    expect(turnedTip.transform.position.x).toBeCloseTo(0, 6);
    expect(turnedTip.transform.position.y).toBeCloseTo(100, 6);
    expect(turnedTip.transform.rotation).toBeCloseTo(Math.PI / 2, 6);

    const stretched = compile(`path Rail { scale (2, 1); stroke #334155 width 2; move (0, 0); line (100, 100); };
${traveller}
attach Tip along Rail { progress 0.5; orient true; rollRadius 10; };`);
    const stretchedTip = tip(stretched, 0);
    expect(stretchedTip.transform.position.x).toBeCloseTo(100, 5);
    expect(stretchedTip.transform.position.y).toBeCloseTo(50, 5);
    expect(stretchedTip.transform.rotation).toBeCloseTo(Math.atan2(1, 2) + Math.hypot(100, 100) / 2 / 10, 5);

    const nested = compile(`group Wagon { position (0, 40);
      path Rail { stroke #334155 width 2; move (0, 0); line (100, 0); };
    };
    ${traveller}
    attach Tip along Wagon.Rail { progress 1; };`);
    expect(tip(nested, 0).transform.position).toEqual({ x: 100, y: 40 });

    const child = compile(`path Rail { position (30, 5); rotation 90deg; stroke #334155 width 2; move (0, 0); line (80, 0); };
    circle Tip { transformParent Rail; radius 4; fill #f97316; };
    attach Tip along Rail { progress 1; orient true; };`);
    const childTip = tip(child, 0);
    expect(childTip.transform.position.x).toBeCloseTo(80, 6);
    expect(childTip.transform.position.y).toBeCloseTo(0, 6);
    expect(childTip.transform.rotation).toBeCloseTo(0, 6);

    const sampled = sampleScene(nested, 0);
    const frame = buildResolvedFrame(nested, sampled, 0);
    const railItem = frame.drawItems.find((item) => item.nodeId === "Wagon.Rail")!;
    const tipItem = frame.drawItems.find((item) => item.nodeId === "Tip")!;
    const onPath = transformPoint(railItem.logicalMatrix, 100, 0);
    const atTip = transformPoint(tipItem.logicalMatrix, 0, 0);
    expect(atTip.x).toBeCloseTo(onPath.x, 5);
    expect(atTip.y).toBeCloseTo(onPath.y, 5);
  });

  it("keeps path-local placement when geometry.pathSpace is not required", () => {
    const scene = compile(`path Rail { position (40, 15); stroke #334155 width 2; move (0, 0); line (100, 0); };
${traveller}
attach Tip along Rail { progress 1; };`);
    scene.requiredCapabilities = scene.requiredCapabilities?.filter((name) => name !== "geometry.pathSpace");
    expect(tip(scene, 0).transform.position).toEqual({ x: 100, y: 0 });
  });

  it("skips a singular parent, a space mismatch and an attachment cycle", () => {
    const singular = compile(`group Wagon { scale (0, 1);
      path Rail { stroke #334155 width 2; move (0, 0); line (10, 0); };
      circle Tip { radius 4; fill #f97316; position (3, 4); };
    };
    attach Wagon.Tip along Wagon.Rail { progress 1; };`);
    const singularSample = sampleScene(singular, 0);
    expect(singularSample.nodes.find((node) => node.id === "Wagon.Tip")!.transform.position).toEqual({ x: 3, y: 4 });
    expect(singularSample.diagnostics.some((item) => item.code === "RUNTIME_DEGRADED")).toBe(true);

    const mismatch = compile(`${rail}${traveller}
attach Tip along Rail { progress 1; };`);
    const railNode = mismatch.nodes.find((node) => node.id === "Rail")!;
    railNode.space = "screen";
    const mismatchSample = sampleScene(mismatch, 0);
    expect(mismatchSample.nodes.find((node) => node.id === "Tip")!.transform.position).toEqual({ x: 0, y: 0 });
    expect(mismatchSample.diagnostics.some((item) => item.code === "SPACE_VIOLATION")).toBe(true);

    const cycle = compile(`path A { stroke #334155 width 2; move (0, 0); line (10, 0); position (1, 2); };
    path B { stroke #334155 width 2; move (0, 0); line (0, 10); position (3, 4); };
    attach A along B { progress 1; };`);
    cycle.pathAttachments = [
      { nodeId: "A", pathId: "B", progress: 1 },
      { nodeId: "B", pathId: "A", progress: 1 },
    ];
    expect(validateSceneIR(cycle).ok).toBe(false);
    const cycled = sampleScene(cycle, 0);
    expect(cycled.nodes.find((node) => node.id === "A")!.transform.position).toEqual({ x: 1, y: 2 });
    expect(cycled.nodes.find((node) => node.id === "B")!.transform.position).toEqual({ x: 3, y: 4 });
    expect(cycled.diagnostics.some((item) => item.code === "CYCLE")).toBe(true);
  });

  it("skips attachments whose nodes are not present yet (streamed partial scenes)", () => {
    const scene = compile(`${rail}${traveller}
attach Tip along Rail { progress 0.5; };`);
    const partial: SceneIR = { ...scene, nodes: scene.nodes.filter((node) => node.id !== "Rail") };
    expect(tip(partial, 0).transform.position).toEqual({ x: 0, y: 0 });
  });
});
