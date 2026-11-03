import { describe, expect, it } from "vitest";
import { transformPoint, type NodeDefinition, type SceneIR, type TrackDefinition } from "@gvr/schema";
import { AnimationRuntime } from "./runtime";

const fill = { before: "none" as const, after: "forwards" as const };

function bare(nodes: NodeDefinition[], tracks: TrackDefinition[], durationMs = 1000): SceneIR {
  return {
    irVersion: "0.1",
    sceneId: "bare",
    viewport: { width: 1280, height: 720, fit: "contain" },
    background: { type: "solid", r: 0, g: 0, b: 0, a: 1 },
    resources: [],
    cameras: [{ id: "main", position: { x: 640, y: 360 }, zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    timeline: { durationMs, tracks, steps: [] },
    nodes,
  };
}

function box(): NodeDefinition {
  return {
    id: "box",
    name: "box",
    parentId: null,
    space: "world",
    kind: "rectangle",
    zIndex: 0,
    transform: { position: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
    opacity: 1,
    visible: true,
    size: { x: 10, y: 10 },
    fill: { type: "solid", r: 1, g: 0, b: 0, a: 1 },
  };
}

function xAt(runtime: AnimationRuntime, timeMs: number): number {
  const item = runtime.evaluate(timeMs).drawItems.find((entry) => entry.nodeId === "box");
  if (!item) throw new Error("missing box");
  return transformPoint(item.logicalMatrix, 0, 0).x;
}

describe("E017 last-key hold", () => {
  it("holds the last authored key when progress is past its offset but below 1", () => {
    const track: TrackDefinition = {
      id: "t",
      kind: "keyframe",
      target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
      valueType: "number",
      startMs: 0,
      durationMs: 1000,
      fill,
      keyframes: [
        { offset: 0, value: 0, easing: "linear" },
        { offset: 0.3, value: 30, easing: "linear" },
        { offset: 0.5, value: 50 },
      ],
    };
    const runtime = new AnimationRuntime(bare([box()], [track]));
    expect(xAt(runtime, 0)).toBeCloseTo(0, 6);
    expect(xAt(runtime, 250)).toBeCloseTo(25, 6);
    expect(xAt(runtime, 500)).toBeCloseTo(50, 6);
    expect(xAt(runtime, 600)).toBeCloseTo(50, 6);
    expect(xAt(runtime, 999)).toBeCloseTo(50, 6);
    expect(xAt(runtime, 1000)).toBeCloseTo(50, 6);
  });

  it("keeps normal end-to-end keyframe interpolation", () => {
    const track: TrackDefinition = {
      id: "t",
      kind: "keyframe",
      target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
      valueType: "number",
      startMs: 0,
      durationMs: 1000,
      fill,
      keyframes: [
        { offset: 0, value: 0, easing: "linear" },
        { offset: 0.5, value: 50, easing: "linear" },
        { offset: 1, value: 100 },
      ],
    };
    const runtime = new AnimationRuntime(bare([box()], [track]));
    expect(xAt(runtime, 0)).toBeCloseTo(0, 6);
    expect(xAt(runtime, 250)).toBeCloseTo(25, 6);
    expect(xAt(runtime, 500)).toBeCloseTo(50, 6);
    expect(xAt(runtime, 750)).toBeCloseTo(75, 6);
    expect(xAt(runtime, 1000)).toBeCloseTo(100, 6);
  });
});
