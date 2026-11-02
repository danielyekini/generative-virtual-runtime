import { describe, expect, it } from "vitest";
import {
  immutableValidationFactStats,
  resetImmutableValidationFactStats,
  validateSceneIR,
} from "./validate";

function pathScene(commands: unknown[]) {
  return {
    irVersion: "0.2",
    sceneId: "facts",
    viewport: { width: 100, height: 100, fit: "contain" },
    background: { type: "solid", r: 1, g: 1, b: 1, a: 1 },
    resources: [],
    cameras: [{ id: "main", position: { x: 0, y: 0 }, zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    nodes: [
      {
        id: "shape",
        name: "shape",
        parentId: null,
        space: "world",
        kind: "path",
        zIndex: 0,
        transform: {
          position: { x: 0, y: 0 },
          pivot: { x: 0, y: 0 },
          rotation: 0,
          scale: { x: 1, y: 1 },
        },
        opacity: 1,
        visible: true,
        fillRule: "nonzero",
        commands,
        fill: { type: "solid", r: 0, g: 0, b: 0, a: 1 },
      },
    ],
    timeline: { durationMs: 1000, tracks: [], steps: [] },
  };
}

describe("immutable validation fact reuse (E003)", () => {
  it("reuses successful path walks across validateSceneIR calls", () => {
    const commands = [
      { cmd: "M", x: 0, y: 0 },
      { cmd: "L", x: 10, y: 0 },
      { cmd: "Z" },
    ];
    const scene = pathScene(commands);
    resetImmutableValidationFactStats();
    expect(validateSceneIR(scene).ok).toBe(true);
    const afterFirst = immutableValidationFactStats();
    expect(afterFirst.misses).toBeGreaterThan(0);
    expect(validateSceneIR(scene).ok).toBe(true);
    const afterSecond = immutableValidationFactStats();
    expect(afterSecond.hits).toBeGreaterThan(afterFirst.hits);
  });

  it("still rejects overlapping writers on every call", () => {
    const scene = pathScene([
      { cmd: "M", x: 0, y: 0 },
      { cmd: "L", x: 10, y: 0 },
      { cmd: "Z" },
    ]) as {
      timeline: { durationMs: number; tracks: unknown[]; steps: unknown[] };
    };
    scene.timeline.tracks = [
      {
        id: "a",
        kind: "keyframe",
        target: { kind: "node", nodeId: "shape", channel: "opacity" },
        valueType: "number",
        startMs: 0,
        durationMs: 500,
        fill: { before: "none", after: "forwards" },
        keyframes: [
          { offset: 0, value: 1, easing: "linear" },
          { offset: 1, value: 0 },
        ],
      },
      {
        id: "b",
        kind: "keyframe",
        target: { kind: "node", nodeId: "shape", channel: "opacity" },
        valueType: "number",
        startMs: 0,
        durationMs: 500,
        fill: { before: "none", after: "forwards" },
        keyframes: [
          { offset: 0, value: 0.5, easing: "linear" },
          { offset: 1, value: 1 },
        ],
      },
    ];
    expect(validateSceneIR(scene).ok).toBe(false);
    expect(validateSceneIR(scene).ok).toBe(false);
  });
});
