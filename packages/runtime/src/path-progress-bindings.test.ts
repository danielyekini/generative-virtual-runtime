import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import type { NodeDefinition, SceneIR } from "@gvr/schema";
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

  it("skips attachments whose nodes are not present yet (streamed partial scenes)", () => {
    const scene = compile(`${rail}${traveller}
attach Tip along Rail { progress 0.5; };`);
    const partial: SceneIR = { ...scene, nodes: scene.nodes.filter((node) => node.id !== "Rail") };
    expect(tip(partial, 0).transform.position).toEqual({ x: 0, y: 0 });
  });
});
