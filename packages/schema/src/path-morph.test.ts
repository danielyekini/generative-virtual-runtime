import { describe, expect, it } from "vitest";
import { acceptScene } from "./accept";
import { lerpPathCommands } from "./path-morph";
import { pathsShareTopology } from "./spatial";
import type { PathCommand, SceneIR } from "./types";
import { validateSceneIR } from "./validate";

const squareA: PathCommand[] = [
  { cmd: "M", x: 0, y: 0 },
  { cmd: "C", c1x: 10, c1y: 0, c2x: 10, c2y: 0, x: 10, y: 0 },
  { cmd: "C", c1x: 10, c1y: 10, c2x: 10, c2y: 10, x: 10, y: 10 },
  { cmd: "Z" },
];

const squareB: PathCommand[] = [
  { cmd: "M", x: 0, y: 0 },
  { cmd: "C", c1x: 20, c1y: 0, c2x: 20, c2y: 0, x: 20, y: 0 },
  { cmd: "C", c1x: 20, c1y: 20, c2x: 20, c2y: 20, x: 20, y: 20 },
  { cmd: "Z" },
];

function morphScene(): SceneIR {
  return {
    irVersion: "0.2",
    sceneId: "morph",
    viewport: { width: 100, height: 100, fit: "contain" },
    background: { type: "solid", r: 0, g: 0, b: 0, a: 1 },
    resources: [],
    cameras: [{ id: "main", position: { x: 50, y: 50 }, zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    nodes: [
      {
        id: "blob",
        name: "blob",
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
        commands: squareA,
        fillRule: "nonzero",
        fill: { type: "solid", r: 1, g: 0, b: 0, a: 1 },
      },
    ],
    timeline: {
      durationMs: 1000,
      tracks: [
        {
          id: "track1",
          kind: "keyframe",
          target: { kind: "node", nodeId: "blob", channel: "commands" },
          valueType: "path",
          startMs: 0,
          durationMs: 1000,
          fill: { before: "none", after: "forwards" },
          keyframes: [
            { offset: 0, value: squareA, easing: "linear" },
            { offset: 1, value: squareB },
          ],
        },
      ],
      steps: [],
    },
    compositions: [],
    instances: [],
    timingScopes: [{ id: "root", parentId: null, offsetMs: 0, stretch: 1 }],
    requiredCapabilities: ["geometry.pathMorph"],
    geometryOperators: [],
  };
}

describe("geometry.pathMorph", () => {
  it("lerps matching cubic topology at midpoints", () => {
    expect(pathsShareTopology(squareA, squareB)).toBe(true);
    const mid = lerpPathCommands(squareA, squareB, 0.5);
    expect(mid).toBeDefined();
    expect(mid![1]).toMatchObject({ cmd: "C", x: 15, y: 0 });
    expect(mid![2]).toMatchObject({ cmd: "C", x: 15, y: 15 });
    expect(mid![3]).toEqual({ cmd: "Z" });
    expect(lerpPathCommands(squareA, [{ cmd: "M", x: 0, y: 0 }, { cmd: "Z" }], 0.5)).toBeUndefined();
  });

  it("validates path morph tracks and accepts with geometry.pathMorph", () => {
    const scene = morphScene();
    const validated = validateSceneIR(scene);
    expect(validated.ok).toBe(true);
    const accepted = acceptScene(scene, { consumer: "0.2", enabled: ["geometry.pathMorph"] });
    expect(accepted.ok).toBe(true);

    const bad = morphScene();
    const track = bad.timeline.tracks[0];
    if (track?.kind !== "keyframe") throw new Error("expected keyframe track");
    track.keyframes[1]!.value = [{ cmd: "M", x: 0, y: 0 }, { cmd: "L", x: 1, y: 1 }];
    expect(validateSceneIR(bad).ok).toBe(false);
  });
});
